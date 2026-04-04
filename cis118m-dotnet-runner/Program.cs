using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.RegularExpressions;

[assembly: InternalsVisibleTo("cis118m-dotnet-runner.Tests")]

public class Program
{
    public static WebApplication App { get; private set; } = null!; // exposed for tests if needed

    public static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Bind to PORT environment variable (required by most hosting platforms)
        var port = Environment.GetEnvironmentVariable("PORT") ?? "8787";
        builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

        // CORS: allow configured origins plus localhost for dev
        var allowedOrigins = (Environment.GetEnvironmentVariable("ALLOWED_ORIGINS") ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();
        if (builder.Environment.IsDevelopment() && !allowedOrigins.Contains("http://localhost:4321"))
        {
            allowedOrigins.Add("http://localhost:4321");
        }

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("runner", policy =>
            {
                if (allowedOrigins.Count > 0)
                {
                    policy.WithOrigins(allowedOrigins.ToArray());
                }
                else
                {
                    policy.AllowAnyOrigin();
                }

                policy.WithMethods("GET", "POST")
                      .WithHeaders("Content-Type");
            });
        });

        var app = builder.Build();
        App = app;

        app.UseCors("runner");

        // Helper to validate x-runner-key header
        bool HasKey(HttpRequest httpReq)
        {
            var runnerKey = app.Configuration["RUNNER_KEY"];
            if (string.IsNullOrEmpty(runnerKey)) return true; // If no key configured, allow all
            return httpReq.Headers.TryGetValue("x-runner-key", out var val) && val == runnerKey;
        }

        app.MapGet("/health", () => Results.Ok(new { ok = true, service = "cis118m-dotnet-runner" }));
        
        app.MapPost("/compile", async (HttpRequest httpReq, RunnerRequest req) => 
        {
            if (!HasKey(httpReq)) return Results.Unauthorized();
            return await HandleRequest(req, runAfterCompile: false);
        });
        
        app.MapPost("/run", async (HttpRequest httpReq, RunnerRequest req) => 
        {
            if (!HasKey(httpReq)) return Results.Unauthorized();
            return await HandleRequest(req, runAfterCompile: true);
        });
        
        app.MapPost("/check", async (HttpRequest httpReq, RunnerRequest req) => 
        {
            if (!HasKey(httpReq)) return Results.Unauthorized();
            return await HandleCheck(req);
        });

        // WebSocket endpoint for interactive terminal
        // Note: No auth required - endpoint is self-limiting (30s timeout, one process at a time per connection)
        app.UseWebSockets();
        app.Map("/ws/run", async (HttpContext context) =>
        {
            if (!context.WebSockets.IsWebSocketRequest)
            {
                context.Response.StatusCode = 400;
                return;
            }

            using var ws = await context.WebSockets.AcceptWebSocketAsync();
            await HandleInteractiveSession(ws);
        });

        await app.RunAsync();
    }

    private static async Task HandleInteractiveSession(System.Net.WebSockets.WebSocket ws)
    {
        var buffer = new byte[4096];
        string? code = null;
        string? starterId = null;
        Process? proc = null;
        string? jobRoot = null;

        try
        {
            // First message should be JSON with code
            var result = await ws.ReceiveAsync(buffer, CancellationToken.None);
            if (result.MessageType == System.Net.WebSockets.WebSocketMessageType.Text)
            {
                var json = Encoding.UTF8.GetString(buffer, 0, result.Count);
                var jsonOptions = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var initMsg = System.Text.Json.JsonSerializer.Deserialize<InteractiveInitMessage>(json, jsonOptions);
                code = initMsg?.Code;
                starterId = initMsg?.StarterId ?? "interactive";
            }

            if (string.IsNullOrEmpty(code))
            {
                await SendWsMessage(ws, new { type = "error", message = "No code provided" });
                return;
            }

            // Set up project
            var jobId = $"job-{Guid.NewGuid():N}";
            jobRoot = Path.Combine(Path.GetTempPath(), jobId);
            Directory.CreateDirectory(jobRoot);

            var projectFile = Path.Combine(jobRoot, "App.csproj");
            var programFile = Path.Combine(jobRoot, "Program.cs");
            await File.WriteAllTextAsync(projectFile, RunnerUtilities.CsprojText);
            await File.WriteAllTextAsync(programFile, code);

            // Compile
            await SendWsMessage(ws, new { type = "status", message = "Compiling..." });
            var compile = await RunnerUtilities.RunProcess("dotnet", "build -c Release", jobRoot, TimeSpan.FromSeconds(30));
            
            if (compile.ExitCode != 0 || compile.TimedOut)
            {
                var diagnostics = RunnerUtilities.ParseDiagnostics(compile.Stdout + "\n" + compile.Stderr);
                await SendWsMessage(ws, new { type = "compile_error", diagnostics, stderr = compile.Stderr });
                return;
            }

            await SendWsMessage(ws, new { type = "status", message = "Running..." });
            await SendWsMessage(ws, new { type = "started" });

            // Start process with interactive I/O
            var psi = new ProcessStartInfo
            {
                FileName = "dotnet",
                Arguments = "run -c Release --no-build",
                WorkingDirectory = jobRoot,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                RedirectStandardInput = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            
            // Set US culture so currency formatting shows $ instead of ¤
            psi.Environment["DOTNET_SYSTEM_GLOBALIZATION_INVARIANT"] = "false";
            psi.Environment["LC_ALL"] = "en_US.UTF-8";
            psi.Environment["LANG"] = "en_US.UTF-8";

            proc = new Process { StartInfo = psi, EnableRaisingEvents = true };
            var exitTcs = new TaskCompletionSource<int>();
            proc.Exited += (_, _) => exitTcs.TrySetResult(proc.ExitCode);

            proc.Start();

            // Use character-by-character reading so Console.Write() without newline shows immediately
            var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            
            // Read stdout character by character
            var stdoutTask = Task.Run(async () =>
            {
                var buffer = new char[256];
                try
                {
                    while (!cts.Token.IsCancellationRequested && !proc.HasExited)
                    {
                        var count = await proc.StandardOutput.ReadAsync(buffer, 0, buffer.Length);
                        if (count == 0) break;
                        var text = new string(buffer, 0, count);
                        // Convert \n to \r\n for terminal
                        text = text.Replace("\r\n", "\n").Replace("\n", "\r\n");
                        try { await SendWsMessage(ws, new { type = "stdout", data = text }); } catch { }
                    }
                }
                catch { }
            });

            // Read stderr character by character
            var stderrTask = Task.Run(async () =>
            {
                var buffer = new char[256];
                try
                {
                    while (!cts.Token.IsCancellationRequested && !proc.HasExited)
                    {
                        var count = await proc.StandardError.ReadAsync(buffer, 0, buffer.Length);
                        if (count == 0) break;
                        var text = new string(buffer, 0, count);
                        text = text.Replace("\r\n", "\n").Replace("\n", "\r\n");
                        try { await SendWsMessage(ws, new { type = "stderr", data = text }); } catch { }
                    }
                }
                catch { }
            });

            // Handle incoming WebSocket messages (stdin from user)
            var receiveTask = Task.Run(async () =>
            {
                var inputBuffer = new byte[1024];
                while (!cts.Token.IsCancellationRequested && ws.State == System.Net.WebSockets.WebSocketState.Open)
                {
                    try
                    {
                        var receiveResult = await ws.ReceiveAsync(inputBuffer, cts.Token);
                        if (receiveResult.MessageType == System.Net.WebSockets.WebSocketMessageType.Close)
                            break;

                        if (receiveResult.MessageType == System.Net.WebSockets.WebSocketMessageType.Text)
                        {
                            var inputJson = Encoding.UTF8.GetString(inputBuffer, 0, receiveResult.Count);
                            var inputOptions = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                            var inputMsg = System.Text.Json.JsonSerializer.Deserialize<InteractiveInputMessage>(inputJson, inputOptions);
                            if (inputMsg?.Type == "stdin" && inputMsg.Data != null && !proc.HasExited)
                            {
                                await proc.StandardInput.WriteAsync(inputMsg.Data);
                                await proc.StandardInput.FlushAsync();
                            }
                        }
                    }
                    catch (OperationCanceledException) { break; }
                    catch { break; }
                }
            });

            // Wait for process to exit or timeout
            var completed = await Task.WhenAny(exitTcs.Task, Task.Delay(TimeSpan.FromSeconds(30)));
            
            if (completed != exitTcs.Task)
            {
                try { proc.Kill(entireProcessTree: true); } catch { }
                await SendWsMessage(ws, new { type = "timeout", message = "Program timed out (30s limit)" });
            }
            else
            {
                // Give output tasks a moment to flush
                await Task.Delay(100);
                await SendWsMessage(ws, new { type = "exited", exitCode = proc.ExitCode });
            }

            cts.Cancel();
        }
        catch (Exception ex)
        {
            try { await SendWsMessage(ws, new { type = "error", message = ex.Message }); } catch { }
        }
        finally
        {
            if (proc != null && !proc.HasExited)
            {
                try { proc.Kill(entireProcessTree: true); } catch { }
            }
            proc?.Dispose();

            // Cleanup job folder
            if (jobRoot != null)
            {
                try { Directory.Delete(jobRoot, true); } catch { }
            }

            if (ws.State == System.Net.WebSockets.WebSocketState.Open)
            {
                try { await ws.CloseAsync(System.Net.WebSockets.WebSocketCloseStatus.NormalClosure, "Done", CancellationToken.None); } catch { }
            }
        }
    }

    private static async Task SendWsMessage(System.Net.WebSockets.WebSocket ws, object message)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(message);
        var bytes = Encoding.UTF8.GetBytes(json);
        await ws.SendAsync(bytes, System.Net.WebSockets.WebSocketMessageType.Text, true, CancellationToken.None);
    }

    private static async Task<IResult> HandleRequest(RunnerRequest req, bool runAfterCompile)
    {
        var jobId = $"job-{Guid.NewGuid():N}";
        var root = Path.Combine(Path.GetTempPath(), jobId);
        Directory.CreateDirectory(root);

        try
        {
            var projectFile = Path.Combine(root, "App.csproj");
            var programFile = Path.Combine(root, "Program.cs");

            await File.WriteAllTextAsync(projectFile, RunnerUtilities.CsprojText);
            var programText = req.Files != null && req.Files.TryGetValue("Program.cs", out var val)
                ? val
                : RunnerUtilities.GenericProgram(req.StarterId);
            await File.WriteAllTextAsync(programFile, programText);

            var compile = await RunnerUtilities.RunProcess("dotnet", "build -c Release", root, TimeSpan.FromSeconds(30));
            var diagnostics = RunnerUtilities.ParseDiagnostics(compile.Stdout + "\n" + compile.Stderr);
            var compileOk = !compile.TimedOut && compile.ExitCode == 0;

            if (!runAfterCompile)
            {
                return Results.Json(new RunnerResponse(
                    Ok: compileOk,
                    CompileOk: compileOk,
                    RunOk: false,
                    CompileTimedOut: compile.TimedOut,
                    RunTimedOut: false,
                    Stdout: compile.Stdout,
                    Stderr: compile.Stderr,
                    Diagnostics: diagnostics));
            }

            if (!compileOk)
            {
                return Results.Json(new RunnerResponse(
                    Ok: false,
                    CompileOk: false,
                    RunOk: false,
                    CompileTimedOut: compile.TimedOut,
                    RunTimedOut: false,
                    Stdout: compile.Stdout,
                    Stderr: compile.Stderr,
                    Diagnostics: diagnostics));
            }

            var run = await RunnerUtilities.RunProcess("dotnet", "run -c Release --no-build", root, TimeSpan.FromSeconds(3), req.Stdin);
            var runDiagnostics = diagnostics; // reuse compile diagnostics if any
            var runOk = !run.TimedOut && run.ExitCode == 0;

            return Results.Json(new RunnerResponse(
                Ok: runOk,
                CompileOk: true,
                RunOk: runOk,
                CompileTimedOut: false,
                RunTimedOut: run.TimedOut,
                Stdout: run.Stdout,
                Stderr: run.Stderr,
                Diagnostics: runDiagnostics));
        }
        catch (Exception ex)
        {
            return Results.Json(new RunnerResponse(
                Ok: false,
                CompileOk: false,
                RunOk: false,
                CompileTimedOut: false,
                RunTimedOut: false,
                Stdout: string.Empty,
                Stderr: ex.Message,
                Diagnostics: new()));
        }
        finally
        {
            try { Directory.Delete(root, recursive: true); } catch { }
        }
    }

    private static async Task<IResult> HandleCheck(RunnerRequest req)
    {
        var jobId = $"check-{Guid.NewGuid():N}";
        var root = Path.Combine(Path.GetTempPath(), jobId);
        Directory.CreateDirectory(root);

        try
        {
            var projectFile = Path.Combine(root, "App.csproj");
            var programFile = Path.Combine(root, "Program.cs");

            await File.WriteAllTextAsync(projectFile, RunnerUtilities.CsprojText);
            var programText = req.Files != null && req.Files.TryGetValue("Program.cs", out var val)
                ? val
                : RunnerUtilities.GenericProgram(req.StarterId);
            await File.WriteAllTextAsync(programFile, programText);

            // Compile first
            var compile = await RunnerUtilities.RunProcess("dotnet", "build -c Release", root, TimeSpan.FromSeconds(30));
            var diagnostics = RunnerUtilities.ParseDiagnostics(compile.Stdout + "\n" + compile.Stderr);
            var compileOk = !compile.TimedOut && compile.ExitCode == 0;

            if (!compileOk)
            {
                return Results.Json(new CheckResponse(
                    Ok: false,
                    CompileOk: false,
                    Checks: new List<CheckResult>(),
                    Hint: "Fix compile errors first.",
                    Stdout: compile.Stdout,
                    Stderr: compile.Stderr,
                    Diagnostics: diagnostics));
            }

            // Run checks based on starterId
            var checks = CheckRunner.RunChecks(req.StarterId, programText);
            var allPassed = checks.All(c => c.Passed);
            var hint = allPassed ? "" : CheckRunner.GetHint(req.StarterId, checks);

            return Results.Json(new CheckResponse(
                Ok: allPassed,
                CompileOk: true,
                Checks: checks,
                Hint: hint,
                Stdout: compile.Stdout,
                Stderr: compile.Stderr,
                Diagnostics: diagnostics));
        }
        catch (Exception ex)
        {
            return Results.Json(new CheckResponse(
                Ok: false,
                CompileOk: false,
                Checks: new List<CheckResult>(),
                Hint: "",
                Stdout: string.Empty,
                Stderr: ex.Message,
                Diagnostics: new()));
        }
        finally
        {
            try { Directory.Delete(root, recursive: true); } catch { }
        }
    }
}

internal static class CheckRunner
{
    internal static List<CheckResult> RunChecks(string starterId, string programCs)
    {
        return starterId switch
        {
            "week-01-lesson-1" => Week01Lesson1Checks(programCs),
            "week-01-lab-1" => Week01Lab1Checks(programCs),
            "week-02-lab" => Week02LabChecks(programCs),
            "week-03-lab" => Week03LabChecks(programCs),
            "week-04-lab" => Week04LabChecks(programCs),
            "week-05-boss-fight" => Week05BossFightChecks(programCs),
            "week-06-lab" => Week06LabChecks(programCs),
            "week-07-lab" => Week07LabChecks(programCs),
            "week-08-lab" => Week08LabChecks(programCs),
            "week-09-lab" => Week09LabChecks(programCs),
            "week-10-lab" => Week10LabChecks(programCs),
            "week-11-lab" => Week11LabChecks(programCs),
            _ => new List<CheckResult>()
        };
    }

    internal static string GetHint(string starterId, List<CheckResult> checks)
    {
        return starterId switch
        {
            "week-01-lesson-1" => Week01Lesson1Hint(checks),
            "week-01-lab-1" => Week01Lab1Hint(checks),
            "week-02-lab" => Week02LabHint(checks),
            "week-03-lab" => Week03LabHint(checks),
            "week-04-lab" => Week04LabHint(checks),
            "week-05-boss-fight" => Week05BossFightHint(checks),
            "week-06-lab" => Week06LabHint(checks),
            "week-07-lab" => Week07LabHint(checks),
            "week-08-lab" => Week08LabHint(checks),
            "week-09-lab" => Week09LabHint(checks),
            "week-10-lab" => Week10LabHint(checks),
            "week-11-lab" => Week11LabHint(checks),
            _ => "Keep working on your solution."
        };
    }

    private static List<CheckResult> Week01Lab1Checks(string programCs)
    {
        var checks = new List<CheckResult>();

        // Check 1: Has a header comment with name (but not the placeholder)
        var hasNameComment = Regex.IsMatch(programCs, @"//.*Name:\s*\S+", RegexOptions.IgnoreCase);
        var isPlaceholderName = Regex.IsMatch(programCs, @"//.*Name:\s*Your\s+Name", RegexOptions.IgnoreCase);
        var hasHeaderComment = hasNameComment && !isPlaceholderName;
        checks.Add(new CheckResult(
            Name: "HasHeaderComment",
            Passed: hasHeaderComment,
            Message: hasHeaderComment
                ? "Found header comment with your name."
                : "On line 1, replace 'Your Name Here' with YOUR name (e.g., // Name: Jane Doe)"));

        // Check 2: Has assignment name comment
        var hasAssignmentComment = Regex.IsMatch(programCs, @"//.*Assignment:\s*.+", RegexOptions.IgnoreCase) ||
                                    Regex.IsMatch(programCs, @"//.*Lab\s*1", RegexOptions.IgnoreCase) ||
                                    Regex.IsMatch(programCs, @"//.*Week\s*1.*Lab", RegexOptions.IgnoreCase);
        checks.Add(new CheckResult(
            Name: "HasAssignmentComment",
            Passed: hasAssignmentComment,
            Message: hasAssignmentComment
                ? "Found assignment name in header comment."
                : "On line 2, add a comment with the assignment name (e.g., // Assignment: Lab 1 - Welcome Program)"));

        // Check 3: Has at least one Console.WriteLine
        var hasWriteLine = programCs.Contains("Console.WriteLine");
        checks.Add(new CheckResult(
            Name: "HasConsoleWriteLine",
            Passed: hasWriteLine,
            Message: hasWriteLine
                ? "Found Console.WriteLine statement."
                : "You need at least one Console.WriteLine statement."));

        // Check 4: Has 4 Console.WriteLine statements
        var writeLineCount = Regex.Matches(programCs, @"Console\.WriteLine").Count;
        var hasFourWriteLines = writeLineCount >= 4;
        checks.Add(new CheckResult(
            Name: "HasFourWriteLines",
            Passed: hasFourWriteLines,
            Message: hasFourWriteLines
                ? $"Found {writeLineCount} Console.WriteLine statements. Perfect!"
                : $"You need 4 Console.WriteLine statements for the 4 lines of output. Found {writeLineCount}."));

        // Check 5: Has actual content (not just the starter template)
        var hasCustomContent = !programCs.Contains("My name is ...") && 
                               Regex.IsMatch(programCs, @"Console\.WriteLine\s*\(\s*""[^""]+""");
        checks.Add(new CheckResult(
            Name: "HasCustomContent",
            Passed: hasCustomContent,
            Message: hasCustomContent
                ? "Your output has real content."
                : "Replace the placeholder text with your actual information."));

        return checks;
    }

    private static string Week01Lab1Hint(List<CheckResult> checks)
    {
        var firstFailed = checks.FirstOrDefault(c => !c.Passed);
        if (firstFailed == null) return "";

        return firstFailed.Name switch
        {
            "HasHeaderComment" => "Add a comment at the top like: // Name: Your Name Here",
            "HasConsoleWriteLine" => "Use Console.WriteLine(\"your text\"); to print a line.",
            "HasFourWriteLines" => "Add 4 Console.WriteLine() statements - one for your name, course, goal, and fun fact.",
            "HasCustomContent" => "Replace \"My name is ...\" with your actual name and add the other 3 lines!",
            _ => "Keep working on your solution!"
        };
    }

    private static List<CheckResult> Week01Lesson1Checks(string programCs)
    {
        var checks = new List<CheckResult>();

        // Check 1: Contains at least one Console.WriteLine
        var hasWriteLine = programCs.Contains("Console.WriteLine");
        checks.Add(new CheckResult(
            Name: "HasConsoleWriteLine",
            Passed: hasWriteLine,
            Message: hasWriteLine
                ? "Found Console.WriteLine statement."
                : "You need at least one Console.WriteLine statement."));

        // Check 2: Contains at least two Console.WriteLine calls
        var writeLineCount = Regex.Matches(programCs, @"Console\.WriteLine").Count;
        var hasTwoWriteLines = writeLineCount >= 2;
        checks.Add(new CheckResult(
            Name: "HasTwoWriteLines",
            Passed: hasTwoWriteLines,
            Message: hasTwoWriteLines
                ? $"Found {writeLineCount} Console.WriteLine statements."
                : $"You need at least 2 Console.WriteLine statements. Found {writeLineCount}."));

        // Check 3: Contains at least one string literal
        var hasStringLiteral = Regex.IsMatch(programCs, @"""[^""]*""");
        checks.Add(new CheckResult(
            Name: "HasStringLiteral",
            Passed: hasStringLiteral,
            Message: hasStringLiteral
                ? "Found string literal(s) in quotes."
                : "You need at least one string literal in quotes."));

        return checks;
    }

    private static string Week01Lesson1Hint(List<CheckResult> checks)
    {
        var firstFailed = checks.FirstOrDefault(c => !c.Passed);
        if (firstFailed == null) return "";

        return firstFailed.Name switch
        {
            "HasConsoleWriteLine" => "Try adding a Console.WriteLine() statement to print something.",
            "HasTwoWriteLines" => "Try adding a second Console.WriteLine() with your name or a greeting.",
            "HasStringLiteral" => "Make sure your WriteLine statements have text in quotes, like \"Hello!\"",
            _ => "Keep working on your solution."
        };
    }

    private static List<CheckResult> Week02LabChecks(string programCs)
    {
        var checks = new List<CheckResult>();

        // Check 1: Has header comment with name
        var hasNameComment = Regex.IsMatch(programCs, @"//.*Name:\s*\S+", RegexOptions.IgnoreCase);
        var isPlaceholderName = Regex.IsMatch(programCs, @"//.*Name:\s*Your\s+Name", RegexOptions.IgnoreCase);
        var hasHeaderComment = hasNameComment && !isPlaceholderName;
        checks.Add(new CheckResult(
            Name: "HasHeaderComment",
            Passed: hasHeaderComment,
            Message: hasHeaderComment
                ? "Found header comment with your name."
                : "Add a header comment with your name (e.g., // Name: Jane Doe)"));

        // Check 2: Has assignment comment
        var hasAssignmentComment = Regex.IsMatch(programCs, @"//.*Assignment:\s*.+", RegexOptions.IgnoreCase) ||
                                    Regex.IsMatch(programCs, @"//.*Lab\s*2", RegexOptions.IgnoreCase) ||
                                    Regex.IsMatch(programCs, @"//.*Week\s*2.*Lab", RegexOptions.IgnoreCase);
        checks.Add(new CheckResult(
            Name: "HasAssignmentComment",
            Passed: hasAssignmentComment,
            Message: hasAssignmentComment
                ? "Found assignment name in header comment."
                : "Add an assignment comment (e.g., // Assignment: Lab 2 - System Status Report)"));

        // Check 3: Has namespace SystemDiagnostics
        var hasNamespace = Regex.IsMatch(programCs, @"namespace\s+SystemDiagnostics\s*\{", RegexOptions.IgnoreCase);
        var hasPlaceholderNamespace = programCs.Contains("YourNamespaceHere");
        checks.Add(new CheckResult(
            Name: "HasNamespace",
            Passed: hasNamespace && !hasPlaceholderNamespace,
            Message: hasNamespace && !hasPlaceholderNamespace
                ? "Found namespace SystemDiagnostics."
                : "Rename the namespace to 'SystemDiagnostics' (replace YourNamespaceHere)"));

        // Check 4: Has class StatusReport
        var hasClass = Regex.IsMatch(programCs, @"class\s+StatusReport\s*\{", RegexOptions.IgnoreCase);
        var hasPlaceholderClass = programCs.Contains("YourClassHere");
        checks.Add(new CheckResult(
            Name: "HasClass",
            Passed: hasClass && !hasPlaceholderClass,
            Message: hasClass && !hasPlaceholderClass
                ? "Found class StatusReport."
                : "Rename the class to 'StatusReport' (replace YourClassHere)"));

        // Check 5: Has XML documentation (/// <summary>)
        var hasXmlDoc = Regex.IsMatch(programCs, @"///\s*<summary>", RegexOptions.IgnoreCase);
        var hasPlaceholderDoc = programCs.Contains("Describe what your program does");
        checks.Add(new CheckResult(
            Name: "HasXmlDocumentation",
            Passed: hasXmlDoc && !hasPlaceholderDoc,
            Message: hasXmlDoc && !hasPlaceholderDoc
                ? "Found XML documentation on Main method."
                : "Add an XML <summary> comment above Main describing what your program does"));

        // Check 6: Has static int Main (not void)
        var hasIntMain = Regex.IsMatch(programCs, @"static\s+int\s+Main\s*\(");
        checks.Add(new CheckResult(
            Name: "HasIntMain",
            Passed: hasIntMain,
            Message: hasIntMain
                ? "Found static int Main() - correct signature!"
                : "Use 'static int Main()' instead of 'static void Main()'"));

        // Check 7: Has return 0
        var hasReturn0 = Regex.IsMatch(programCs, @"return\s+0\s*;");
        checks.Add(new CheckResult(
            Name: "HasReturn0",
            Passed: hasReturn0,
            Message: hasReturn0
                ? "Found 'return 0;' - exit code indicates success!"
                : "Add 'return 0;' at the end of Main to indicate successful execution"));

        // Check 8: Has at least 5 Console.WriteLine statements
        var writeLineCount = Regex.Matches(programCs, @"Console\.WriteLine").Count;
        var hasFiveWriteLines = writeLineCount >= 5;
        checks.Add(new CheckResult(
            Name: "HasFiveWriteLines",
            Passed: hasFiveWriteLines,
            Message: hasFiveWriteLines
                ? $"Found {writeLineCount} Console.WriteLine statements. Great formatting!"
                : $"You need at least 5 Console.WriteLine statements for your report. Found {writeLineCount}."));

        // Check 9: Has real content (not just placeholders)
        var hasRealContent = !programCs.Contains("// TODO:") || 
                             (writeLineCount >= 3 && !programCs.Contains("YourNamespaceHere"));
        checks.Add(new CheckResult(
            Name: "HasRealContent",
            Passed: hasRealContent,
            Message: hasRealContent
                ? "Your report has real content."
                : "Complete the TODO items and add your report content"));

        return checks;
    }

    private static string Week02LabHint(List<CheckResult> checks)
    {
        var firstFailed = checks.FirstOrDefault(c => !c.Passed);
        if (firstFailed == null) return "";

        return firstFailed.Name switch
        {
            "HasHeaderComment" => "Add '// Name: Your Name' at the very top of your file.",
            "HasAssignmentComment" => "Add '// Assignment: Lab 2 - System Status Report' after your name.",
            "HasNamespace" => "Change 'namespace YourNamespaceHere' to 'namespace SystemDiagnostics'",
            "HasClass" => "Change 'class YourClassHere' to 'class StatusReport'",
            "HasXmlDocumentation" => "Above Main, add: /// <summary>Generates a system status report.</summary>",
            "HasIntMain" => "Change 'static void Main()' to 'static int Main()' so you can return an exit code.",
            "HasReturn0" => "At the end of Main, add: return 0;",
            "HasFiveWriteLines" => "Add more Console.WriteLine statements - create a formatted report with header, content, and footer.",
            "HasRealContent" => "Replace the TODO comments and placeholders with your actual report content.",
            _ => "Keep working on your solution!"
        };
    }

    // ===== WEEK 03 LAB CHECKS =====
    // Lab 3: Data Manifest - System Profile with 5 variables
    private static List<CheckResult> Week03LabChecks(string programCs)
    {
        var checks = new List<CheckResult>();

        // Check 1: Has header comment with name
        var hasNameComment = Regex.IsMatch(programCs, @"//.*Name:\s*\S+", RegexOptions.IgnoreCase);
        var isPlaceholderName = Regex.IsMatch(programCs, @"//.*Name:\s*Your\s+Name", RegexOptions.IgnoreCase);
        var hasHeaderComment = hasNameComment && !isPlaceholderName;
        checks.Add(new CheckResult(
            Name: "HasHeaderComment",
            Passed: hasHeaderComment,
            Message: hasHeaderComment
                ? "Found header comment with your name."
                : "Add a header comment with your name (e.g., // Name: Jane Doe)"));

        // Check 2: Has double variable (appVersion)
        var hasDouble = Regex.IsMatch(programCs, @"\bdouble\s+\w+\s*=");
        checks.Add(new CheckResult(
            Name: "HasDoubleVariable",
            Passed: hasDouble,
            Message: hasDouble
                ? "Found double variable (appVersion)."
                : "Declare a double variable for appVersion (e.g., double appVersion = 1.2;)"));

        // Check 3: Has int variable (userCount)
        var hasInt = Regex.IsMatch(programCs, @"\bint\s+\w+\s*=");
        checks.Add(new CheckResult(
            Name: "HasIntVariable",
            Passed: hasInt,
            Message: hasInt
                ? "Found int variable (userCount)."
                : "Declare an int variable for userCount (e.g., int userCount = 1500;)"));

        // Check 4: Has bool variable (isSystemActive)
        var hasBool = Regex.IsMatch(programCs, @"\bbool\s+\w+\s*=");
        checks.Add(new CheckResult(
            Name: "HasBoolVariable",
            Passed: hasBool,
            Message: hasBool
                ? "Found bool variable (isSystemActive)."
                : "Declare a bool variable for isSystemActive (e.g., bool isSystemActive = true;)"));

        // Check 5: Has decimal variable with 'm' suffix (serverCost)
        var hasDecimal = Regex.IsMatch(programCs, @"\bdecimal\s+\w+\s*=");
        var hasDecimalSuffix = Regex.IsMatch(programCs, @"\d+(\.\d+)?[mM]");
        checks.Add(new CheckResult(
            Name: "HasDecimalVariable",
            Passed: hasDecimal && hasDecimalSuffix,
            Message: hasDecimal && hasDecimalSuffix
                ? "Found decimal variable with 'm' suffix (serverCost)."
                : "Declare a decimal variable for serverCost with 'm' suffix (e.g., decimal serverCost = 45.99m;)"));

        // Check 6: Has string variable (systemName)
        var hasString = Regex.IsMatch(programCs, @"\bstring\s+\w+\s*=\s*""");
        checks.Add(new CheckResult(
            Name: "HasStringVariable",
            Passed: hasString,
            Message: hasString
                ? "Found string variable (systemName)."
                : "Declare a string variable for systemName (e.g., string systemName = \"Apollo\";)"));

        // Check 7: Has at least 5 Console.WriteLine statements
        var writeLineCount = Regex.Matches(programCs, @"Console\.WriteLine").Count;
        var hasFiveWriteLines = writeLineCount >= 5;
        checks.Add(new CheckResult(
            Name: "HasFiveWriteLines",
            Passed: hasFiveWriteLines,
            Message: hasFiveWriteLines
                ? $"Found {writeLineCount} Console.WriteLine statements."
                : $"Print all 5 variables using Console.WriteLine. Found {writeLineCount}."));

        return checks;
    }

    private static string Week03LabHint(List<CheckResult> checks)
    {
        var firstFailed = checks.FirstOrDefault(c => !c.Passed);
        if (firstFailed == null) return "";

        return firstFailed.Name switch
        {
            "HasHeaderComment" => "Add '// Name: Your Name' at the very top of your file.",
            "HasDoubleVariable" => "Add: double appVersion = 1.2;",
            "HasIntVariable" => "Add: int userCount = 1500;",
            "HasBoolVariable" => "Add: bool isSystemActive = true;",
            "HasDecimalVariable" => "Add: decimal serverCost = 45.99m; (the 'm' suffix is required for decimal!)",
            "HasStringVariable" => "Add: string systemName = \"Apollo\";",
            "HasFiveWriteLines" => "Print each variable with Console.WriteLine(). You need 5 output statements.",
            _ => "Keep working on your solution!"
        };
    }

    // ===== WEEK 04 LAB CHECKS =====
    // Lab 4: Text Sanitizer - Clean messy user input using string methods
    private static List<CheckResult> Week04LabChecks(string programCs)
    {
        var checks = new List<CheckResult>();

        // Check 1: Has header comment with name
        var hasNameComment = Regex.IsMatch(programCs, @"//.*Name:\s*\S+", RegexOptions.IgnoreCase);
        var isPlaceholderName = Regex.IsMatch(programCs, @"//.*Name:\s*Your\s+Name", RegexOptions.IgnoreCase);
        var hasHeaderComment = hasNameComment && !isPlaceholderName;
        checks.Add(new CheckResult(
            Name: "HasHeaderComment",
            Passed: hasHeaderComment,
            Message: hasHeaderComment
                ? "Found header comment with your name."
                : "Add a header comment with your name (e.g., // Name: Jane Doe)"));

        // Check 2: Uses Trim() method
        var hasTrim = Regex.IsMatch(programCs, @"\.Trim\s*\(\s*\)");
        checks.Add(new CheckResult(
            Name: "HasTrim",
            Passed: hasTrim,
            Message: hasTrim
                ? "Found Trim() to remove whitespace."
                : "Use .Trim() to remove extra spaces from the name and city."));

        // Check 3: Uses ToUpper() method
        var hasToUpper = Regex.IsMatch(programCs, @"\.ToUpper\s*\(\s*\)");
        checks.Add(new CheckResult(
            Name: "HasToUpper",
            Passed: hasToUpper,
            Message: hasToUpper
                ? "Found ToUpper() for capitalization."
                : "Use .ToUpper() to capitalize the state code."));

        // Check 4: Uses Replace() method
        var hasReplace = Regex.IsMatch(programCs, @"\.Replace\s*\(");
        checks.Add(new CheckResult(
            Name: "HasReplace",
            Passed: hasReplace,
            Message: hasReplace
                ? "Found Replace() to clean characters."
                : "Use .Replace() to remove parentheses and spaces from the phone number."));

        // Check 5: Uses Substring() method
        var hasSubstring = Regex.IsMatch(programCs, @"\.Substring\s*\(");
        checks.Add(new CheckResult(
            Name: "HasSubstring",
            Passed: hasSubstring,
            Message: hasSubstring
                ? "Found Substring() to extract text."
                : "Use .Substring(0, 3) to extract the area code from the phone number."));

        // Check 6: Uses Length property
        var hasLength = Regex.IsMatch(programCs, @"\.Length\b");
        checks.Add(new CheckResult(
            Name: "HasLength",
            Passed: hasLength,
            Message: hasLength
                ? "Found Length property."
                : "Use .Length to get the character count of the bio."));

        // Check 7: Uses string interpolation ($"...")
        var hasInterpolation = Regex.IsMatch(programCs, @"\$""[^""]*\{[^}]+\}");
        checks.Add(new CheckResult(
            Name: "HasInterpolation",
            Passed: hasInterpolation,
            Message: hasInterpolation
                ? "Found string interpolation for output."
                : "Use string interpolation like $\"Name: {name}\" for formatted output."));

        // Check 8: Has enough output lines
        var writeLineCount = Regex.Matches(programCs, @"Console\.WriteLine").Count;
        var hasEnoughOutput = writeLineCount >= 8;
        checks.Add(new CheckResult(
            Name: "HasEnoughOutput",
            Passed: hasEnoughOutput,
            Message: hasEnoughOutput
                ? $"Found {writeLineCount} Console.WriteLine statements."
                : $"Need more output lines to display all profile fields. Found {writeLineCount}, need at least 8."));

        return checks;
    }

    private static string Week04LabHint(List<CheckResult> checks)
    {
        var firstFailed = checks.FirstOrDefault(c => !c.Passed);
        if (firstFailed == null) return "";

        return firstFailed.Name switch
        {
            "HasHeaderComment" => "Add '// Name: Your Name' at the very top of your file.",
            "HasTrim" => "Use .Trim() on rawName and rawCity to remove extra spaces.",
            "HasToUpper" => "Use rawState.ToUpper() to convert 'ma' to 'MA'.",
            "HasReplace" => "Chain .Replace() calls: rawPhone.Replace(\"(\", \"\").Replace(\")\", \"\").Replace(\" \", \"\")",
            "HasSubstring" => "After cleaning the phone, use .Substring(0, 3) to get the first 3 characters.",
            "HasLength" => "Use rawBio.Length to get the number of characters in the bio.",
            "HasInterpolation" => "Use $\"Name: {cleanedName}\" syntax for formatted output.",
            "HasEnoughOutput" => "Print all fields: Name, Email, Phone, Area Code, City, State, Bio, and Bio Length.",
            _ => "Keep working on your solution!"
        };
    }

    // ===== WEEK 05 BOSS FIGHT CHECKS =====
    // Boss Fight: Project Budget Estimator - ReadLine, Parse, decimal, string interpolation
    private static List<CheckResult> Week05BossFightChecks(string programCs)
    {
        var checks = new List<CheckResult>();

        // Check 1: Has header comment with name
        var hasNameComment = Regex.IsMatch(programCs, @"//.*Name:\s*\S+", RegexOptions.IgnoreCase);
        var isPlaceholderName = Regex.IsMatch(programCs, @"//.*Name:\s*Your\s+Name", RegexOptions.IgnoreCase);
        var hasHeaderComment = hasNameComment && !isPlaceholderName;
        checks.Add(new CheckResult(
            Name: "HasHeaderComment",
            Passed: hasHeaderComment,
            Message: hasHeaderComment
                ? "Found header comment with your name."
                : "Replace 'Your Name Here' with your actual name in the header comment."));

        // Check 2: Uses Console.ReadLine() for input
        var readLineCount = Regex.Matches(programCs, @"Console\.ReadLine\s*\(").Count;
        var hasReadLine = readLineCount >= 3;
        checks.Add(new CheckResult(
            Name: "HasThreeReadLines",
            Passed: hasReadLine,
            Message: hasReadLine
                ? $"Found {readLineCount} Console.ReadLine() calls for user input."
                : $"Need 3 Console.ReadLine() calls (name, hours, rate). Found {readLineCount}."));

        // Check 3: Uses Console.Write() for prompts (not WriteLine)
        var hasWrite = Regex.IsMatch(programCs, @"Console\.Write\s*\(");
        checks.Add(new CheckResult(
            Name: "HasConsoleWrite",
            Passed: hasWrite,
            Message: hasWrite
                ? "Found Console.Write() for inline prompts."
                : "Use Console.Write() (not WriteLine) for prompts so input appears on the same line."));

        // Check 4: Uses double.Parse() for hours
        var hasDoubleParse = Regex.IsMatch(programCs, @"double\.Parse\s*\(");
        checks.Add(new CheckResult(
            Name: "HasDoubleParse",
            Passed: hasDoubleParse,
            Message: hasDoubleParse
                ? "Found double.Parse() for parsing estimated hours."
                : "Use double.Parse(Console.ReadLine()) to convert the hours input to a double."));

        // Check 5: Uses decimal.Parse() for hourly rate (money!)
        var hasDecimalParse = Regex.IsMatch(programCs, @"decimal\.Parse\s*\(");
        checks.Add(new CheckResult(
            Name: "HasDecimalParse",
            Passed: hasDecimalParse,
            Message: hasDecimalParse
                ? "Found decimal.Parse() for the hourly rate — correct for money!"
                : "Use decimal.Parse(Console.ReadLine()) for the hourly rate. Money = decimal!"));

        // Check 6: Has a multiplication for budget calculation
        var hasMultiplication = programCs.Contains("*");
        checks.Add(new CheckResult(
            Name: "HasCalculation",
            Passed: hasMultiplication,
            Message: hasMultiplication
                ? "Found multiplication operator for budget calculation."
                : "Calculate the total budget: total = hours * rate"));

        // Check 7: Uses string interpolation with currency format
        var hasCurrencyFormat = Regex.IsMatch(programCs, @"\$""[^""]*\{[^}]+:C\}") ||
                                 Regex.IsMatch(programCs, @"\$""[^""]*\{[^}]+:c\}");
        var hasInterpolation = Regex.IsMatch(programCs, @"\$""[^""]*\{[^}]+\}");
        checks.Add(new CheckResult(
            Name: "HasCurrencyFormat",
            Passed: hasCurrencyFormat,
            Message: hasCurrencyFormat
                ? "Found currency formatting (:C) in string interpolation."
                : hasInterpolation
                    ? "Found string interpolation, but use :C for currency format: $\"{total:C}\""
                    : "Use string interpolation with currency format: $\"requires {total:C} in funding.\""));

        // Check 8: Has real content (TODOs removed)
        var todoCount = Regex.Matches(programCs, @"//\s*TODO:").Count;
        var hasRealContent = todoCount <= 1;
        checks.Add(new CheckResult(
            Name: "HasRealContent",
            Passed: hasRealContent,
            Message: hasRealContent
                ? "TODOs completed — code looks ready!"
                : $"Still have {todoCount} TODO comments. Complete each step and remove the TODOs."));

        return checks;
    }

    private static string Week05BossFightHint(List<CheckResult> checks)
    {
        var firstFailed = checks.FirstOrDefault(c => !c.Passed);
        if (firstFailed == null) return "";

        return firstFailed.Name switch
        {
            "HasHeaderComment" => "Change '// Name: Your Name Here' to your actual name.",
            "HasThreeReadLines" => "You need Console.ReadLine() for project name, hours, and hourly rate.",
            "HasConsoleWrite" => "Use Console.Write(\"Enter project name: \"); so the cursor stays on the same line.",
            "HasDoubleParse" => "Add: double hours = double.Parse(Console.ReadLine());",
            "HasDecimalParse" => "Add: decimal rate = decimal.Parse(Console.ReadLine()); — money uses decimal!",
            "HasCalculation" => "Calculate: decimal total = (decimal)hours * rate;",
            "HasCurrencyFormat" => "Use :C for currency: Console.WriteLine($\"requires {total:C} in funding.\");",
            "HasRealContent" => "Complete each TODO step and remove the TODO comments.",
            _ => "Keep working on your solution!"
        };
    }

    // ===== WEEK 06 LAB CHECKS =====
    // Lab 6: The Security Gatekeeper - if/else if/else with && for access control
    private static List<CheckResult> Week06LabChecks(string programCs)
    {
        var checks = new List<CheckResult>();

        // Check 1: Has header comment with name
        var hasNameComment = Regex.IsMatch(programCs, @"//.*Name:\s*\S+", RegexOptions.IgnoreCase);
        var isPlaceholderName = Regex.IsMatch(programCs, @"//.*Name:\s*Your\s+Name", RegexOptions.IgnoreCase);
        var hasHeaderComment = hasNameComment && !isPlaceholderName;
        checks.Add(new CheckResult(
            Name: "HasHeaderComment",
            Passed: hasHeaderComment,
            Message: hasHeaderComment
                ? "Found header comment with your name."
                : "Replace 'Your Name Here' with your actual name in the header comment."));

        // Check 2: Uses Console.ReadLine() for input
        var readLineCount = Regex.Matches(programCs, @"Console\.ReadLine\s*\(").Count;
        var hasReadLine = readLineCount >= 2;
        checks.Add(new CheckResult(
            Name: "HasTwoReadLines",
            Passed: hasReadLine,
            Message: hasReadLine
                ? $"Found {readLineCount} Console.ReadLine() calls for user input."
                : $"Need 2 Console.ReadLine() calls (security level + password). Found {readLineCount}."));

        // Check 3: Uses int.Parse() for security level
        var hasIntParse = Regex.IsMatch(programCs, @"int\.Parse\s*\(");
        checks.Add(new CheckResult(
            Name: "HasIntParse",
            Passed: hasIntParse,
            Message: hasIntParse
                ? "Found int.Parse() for parsing security level."
                : "Use int.Parse(Console.ReadLine()) to convert security level input to an integer."));

        // Check 4: Uses if statement
        var hasIf = Regex.IsMatch(programCs, @"\bif\s*\(");
        checks.Add(new CheckResult(
            Name: "HasIfStatement",
            Passed: hasIf,
            Message: hasIf
                ? "Found if statement."
                : "Use an if statement to check credentials."));

        // Check 5: Uses else if
        var hasElseIf = Regex.IsMatch(programCs, @"\belse\s+if\s*\(");
        checks.Add(new CheckResult(
            Name: "HasElseIf",
            Passed: hasElseIf,
            Message: hasElseIf
                ? "Found else if chain for multiple access tiers."
                : "Use 'else if' to check the next access tier (don't use separate if statements)."));

        // Check 6: Uses else (final fallback)
        var hasElse = Regex.IsMatch(programCs, @"\belse\s*\{");
        checks.Add(new CheckResult(
            Name: "HasElse",
            Passed: hasElse,
            Message: hasElse
                ? "Found else block for ACCESS DENIED fallback."
                : "Add an else block at the end for ACCESS DENIED (invalid credentials)."));

        // Check 7: Uses && (logical AND) to combine checks
        var hasLogicalAnd = programCs.Contains("&&");
        checks.Add(new CheckResult(
            Name: "HasLogicalAnd",
            Passed: hasLogicalAnd,
            Message: hasLogicalAnd
                ? "Found && operator — combining level AND password checks."
                : "Use && to check BOTH level and password: if (level == 1 && password == \"guest123\")"));

        // Check 8: Checks all three access levels
        var hasGuest = Regex.IsMatch(programCs, @"""guest123""", RegexOptions.IgnoreCase);
        var hasAdmin = Regex.IsMatch(programCs, @"""admin456""", RegexOptions.IgnoreCase);
        var hasSuperuser = Regex.IsMatch(programCs, @"""superSecret""", RegexOptions.IgnoreCase);
        var hasAllLevels = hasGuest && hasAdmin && hasSuperuser;
        checks.Add(new CheckResult(
            Name: "HasAllAccessLevels",
            Passed: hasAllLevels,
            Message: hasAllLevels
                ? "Found all three password checks (guest123, admin456, superSecret)."
                : $"Need all 3 passwords: {(hasGuest ? "✅" : "❌")} guest123, {(hasAdmin ? "✅" : "❌")} admin456, {(hasSuperuser ? "✅" : "❌")} superSecret"));

        // Check 9: Uses K&R brace style (opening brace on same line)
        var hasKnRBraces = Regex.IsMatch(programCs, @"if\s*\([^)]+\)\s*\{");
        checks.Add(new CheckResult(
            Name: "HasKnRBraces",
            Passed: hasKnRBraces,
            Message: hasKnRBraces
                ? "Found K&R brace style (opening brace on same line as if)."
                : "Use K&R brace style: if (condition) { — opening brace on the SAME line."));

        // Check 10: Has real content (TODOs removed)
        var todoCount = Regex.Matches(programCs, @"//\s*TODO:").Count;
        var hasRealContent = todoCount <= 1;
        checks.Add(new CheckResult(
            Name: "HasRealContent",
            Passed: hasRealContent,
            Message: hasRealContent
                ? "TODOs completed — code looks ready!"
                : $"Still have {todoCount} TODO comments. Complete each step and remove the TODOs."));

        return checks;
    }

    private static string Week06LabHint(List<CheckResult> checks)
    {
        var firstFailed = checks.FirstOrDefault(c => !c.Passed);
        if (firstFailed == null) return "";

        return firstFailed.Name switch
        {
            "HasHeaderComment" => "Change '// Name: Your Name Here' to your actual name.",
            "HasTwoReadLines" => "You need Console.ReadLine() for both security level and password.",
            "HasIntParse" => "Convert the level input: int level = int.Parse(Console.ReadLine());",
            "HasIfStatement" => "Start with: if (level == 1 && password == \"guest123\") {",
            "HasElseIf" => "After the first if block, add: } else if (level == 2 && password == \"admin456\") {",
            "HasElse" => "After all else if blocks, add: } else { for the ACCESS DENIED case.",
            "HasLogicalAnd" => "Combine both conditions: if (level == 1 && password == \"guest123\")",
            "HasAllAccessLevels" => "Check for all 3 passwords: \"guest123\", \"admin456\", \"superSecret\"",
            "HasKnRBraces" => "Put the opening brace on the same line: if (condition) {",
            "HasRealContent" => "Complete each TODO step and remove the TODO comments.",
            _ => "Keep working on your solution!"
        };
    }

    private static List<CheckResult> Week07LabChecks(string programCs)
    {
        var checks = new List<CheckResult>();

        // Check 1: Has header comment with name
        var hasNameComment = Regex.IsMatch(programCs, @"//.*Name:\s*\S+", RegexOptions.IgnoreCase);
        var isPlaceholderName = Regex.IsMatch(programCs, @"//.*Name:\s*Your\s+Name", RegexOptions.IgnoreCase);
        var hasHeaderComment = hasNameComment && !isPlaceholderName;
        checks.Add(new CheckResult(
            Name: "HasHeaderComment",
            Passed: hasHeaderComment,
            Message: hasHeaderComment
                ? "Found header comment with your name."
                : "Replace 'Your Name Here' with your actual name in the header comment."));

        // Check 2: Uses Console.ReadLine() for all three inputs
        var readLineCount = Regex.Matches(programCs, @"Console\.ReadLine\s*\(").Count;
        var hasThreeReadLines = readLineCount >= 3;
        checks.Add(new CheckResult(
            Name: "HasThreeReadLines",
            Passed: hasThreeReadLines,
            Message: hasThreeReadLines
                ? $"Found {readLineCount} Console.ReadLine() calls for all three inputs."
                : $"Need 3 Console.ReadLine() calls (threat level, internal source, protocol). Found {readLineCount}."));

        // Check 3: Uses int.Parse() for threat level
        var hasIntParse = Regex.IsMatch(programCs, @"int\.Parse\s*\(");
        checks.Add(new CheckResult(
            Name: "HasIntParse",
            Passed: hasIntParse,
            Message: hasIntParse
                ? "Found int.Parse() for parsing threat level."
                : "Use int.Parse(Console.ReadLine()) to convert the threat level to an integer."));

        // Check 4: Uses bool.Parse() for internal source
        var hasBoolParse = Regex.IsMatch(programCs, @"bool\.Parse\s*\(");
        checks.Add(new CheckResult(
            Name: "HasBoolParse",
            Passed: hasBoolParse,
            Message: hasBoolParse
                ? "Found bool.Parse() for parsing internal source flag."
                : "Use bool.Parse(Console.ReadLine()) to convert the internal source input to a boolean."));

        // Check 5: Uses .ToUpper() on protocol input
        var hasToUpper = Regex.IsMatch(programCs, @"\.ToUpper\s*\(");
        checks.Add(new CheckResult(
            Name: "HasToUpper",
            Passed: hasToUpper,
            Message: hasToUpper
                ? "Found .ToUpper() for normalizing protocol input."
                : "Use .ToUpper() on the protocol input so \"ssh\" and \"SSH\" both match: protocol.ToUpper()"));

        // Check 6: Uses nested if or else if chain for firewall rules
        var hasElseIf = Regex.IsMatch(programCs, @"\belse\s+if\s*\(");
        checks.Add(new CheckResult(
            Name: "HasElseIf",
            Passed: hasElseIf,
            Message: hasElseIf
                ? "Found else if chain for firewall rule evaluation."
                : "Use 'else if' to chain the firewall rules — each rule should be an else if after the critical threat check."));

        // Check 7: Uses else for default deny
        var hasElse = Regex.IsMatch(programCs, @"\belse\s*\{");
        checks.Add(new CheckResult(
            Name: "HasElse",
            Passed: hasElse,
            Message: hasElse
                ? "Found else block for default deny policy."
                : "Add a final else { block for the BLOCKED — Default deny policy case."));

        // Check 8: Uses && for the internal SSH combined check
        var hasLogicalAnd = programCs.Contains("&&");
        checks.Add(new CheckResult(
            Name: "HasLogicalAnd",
            Passed: hasLogicalAnd,
            Message: hasLogicalAnd
                ? "Found && operator — combining protocol and source checks."
                : "Use && to combine checks: if (protocol == \"SSH\" && isInternal)"));

        // Check 9: Uses switch statement for protocol display
        var hasSwitch = Regex.IsMatch(programCs, @"\bswitch\s*\(");
        checks.Add(new CheckResult(
            Name: "HasSwitch",
            Passed: hasSwitch,
            Message: hasSwitch
                ? "Found switch statement for protocol-specific output."
                : "Add a switch statement on the protocol variable to display protocol details (port, encryption)."));

        // Check 10: Has real content (TODOs removed)
        var todoCount = Regex.Matches(programCs, @"//\s*TODO:").Count;
        var hasRealContent = todoCount <= 1;
        checks.Add(new CheckResult(
            Name: "HasRealContent",
            Passed: hasRealContent,
            Message: hasRealContent
                ? "TODOs completed — code looks ready!"
                : $"Still have {todoCount} TODO comments. Complete each step and remove the TODOs."));

        return checks;
    }

    private static string Week07LabHint(List<CheckResult> checks)
    {
        var firstFailed = checks.FirstOrDefault(c => !c.Passed);
        if (firstFailed == null) return "";

        return firstFailed.Name switch
        {
            "HasHeaderComment" => "Change '// Name: Your Name Here' to your actual name.",
            "HasThreeReadLines" => "You need Console.ReadLine() for threat level, internal source, and protocol — that's 3 calls.",
            "HasIntParse" => "Convert threat level: int threatLevel = int.Parse(Console.ReadLine());",
            "HasBoolParse" => "Convert internal flag: bool isInternal = bool.Parse(Console.ReadLine());",
            "HasToUpper" => "Normalize the protocol: string protocol = Console.ReadLine().ToUpper();",
            "HasElseIf" => "Chain your rules with else if: } else if (threatLevel > 4) {",
            "HasElse" => "Add a final } else { block that prints BLOCKED — Default deny policy.",
            "HasLogicalAnd" => "Combine conditions for internal SSH: if (protocol == \"SSH\" && isInternal)",
            "HasSwitch" => "After the firewall decision, add: switch (protocol) { case \"HTTP\": ... }",
            "HasRealContent" => "Complete each TODO step and remove the TODO comments.",
            _ => "Keep working on your solution!"
        };
    }

    // ===== WEEK 08 =====
    private static List<CheckResult> Week08LabChecks(string programCs)
    {
        var checks = new List<CheckResult>();

        // Check 1: Has a header comment with name
        var hasNameComment = Regex.IsMatch(programCs, @"//.*Name:\s*\S+", RegexOptions.IgnoreCase);
        var notPlaceholder = !programCs.Contains("Your Name Here");
        checks.Add(new CheckResult("HasHeaderComment", hasNameComment && notPlaceholder,
            hasNameComment && notPlaceholder ? "✅ Header comment with name found" : "❌ Add a comment with your name (replace 'Your Name Here')"));

        // Check 2: Uses a while loop
        var hasWhile = Regex.IsMatch(programCs, @"\bwhile\s*\(", RegexOptions.None);
        checks.Add(new CheckResult("HasWhileLoop", hasWhile,
            hasWhile ? "✅ while loop found" : "❌ You need a while loop for the data entry"));

        // Check 3: Uses decimal.Parse for money
        var hasDecimalParse = Regex.IsMatch(programCs, @"decimal\.Parse", RegexOptions.None);
        checks.Add(new CheckResult("HasDecimalParse", hasDecimalParse,
            hasDecimalParse ? "✅ decimal.Parse() used for money input" : "❌ Use decimal.Parse() to convert input — revenue is money!"));

        // Check 4: Uses break
        var hasBreak = Regex.IsMatch(programCs, @"\bbreak\s*;", RegexOptions.None);
        checks.Add(new CheckResult("HasBreak", hasBreak,
            hasBreak ? "✅ break statement found" : "❌ Use break to exit the loop when the sentinel value (0) is entered"));

        // Check 5: Uses continue
        var hasContinue = Regex.IsMatch(programCs, @"\bcontinue\s*;", RegexOptions.None);
        checks.Add(new CheckResult("HasContinue", hasContinue,
            hasContinue ? "✅ continue statement found" : "❌ Use continue to skip negative values"));

        // Check 6: Has negative value check (< 0)
        var hasNegativeCheck = Regex.IsMatch(programCs, @"<\s*0|<=\s*0", RegexOptions.None);
        checks.Add(new CheckResult("HasNegativeCheck", hasNegativeCheck,
            hasNegativeCheck ? "✅ Negative value validation found" : "❌ Check if the entered value is negative (< 0) before processing"));

        // Check 7: Has accumulator pattern (+=)
        var hasAccumulator = Regex.IsMatch(programCs, @"\+=\s*", RegexOptions.None);
        checks.Add(new CheckResult("HasAccumulator", hasAccumulator,
            hasAccumulator ? "✅ Accumulator pattern (+=) found" : "❌ Use += to add each revenue amount to the running total"));

        // Check 8: Has ReadLine for input
        var hasReadLine = programCs.Contains("Console.ReadLine()");
        checks.Add(new CheckResult("HasReadLine", hasReadLine,
            hasReadLine ? "✅ Console.ReadLine() found" : "❌ Use Console.ReadLine() to get user input"));

        // Check 9: Has summary output (average calculation)
        var hasDivision = Regex.IsMatch(programCs, @"/", RegexOptions.None);
        var hasSummary = Regex.IsMatch(programCs, @"(average|Average|AVERAGE|total\s*/\s*count|Total|SUMMARY)", RegexOptions.IgnoreCase);
        checks.Add(new CheckResult("HasSummary", hasDivision && hasSummary,
            hasDivision && hasSummary ? "✅ Summary with average calculation found" : "❌ After the loop, display a summary with total, count, and average (total / count)"));

        // Check 10: Has real content (TODOs removed)
        var todoCount = Regex.Matches(programCs, @"//\s*TODO", RegexOptions.IgnoreCase).Count;
        var hasRealContent = todoCount <= 1;
        checks.Add(new CheckResult("HasRealContent", hasRealContent,
            hasRealContent ? "✅ TODO comments completed" : $"❌ Complete the TODO steps — {todoCount} TODOs remaining"));

        return checks;
    }

    private static string Week08LabHint(List<CheckResult> checks)
    {
        var firstFailed = checks.FirstOrDefault(c => !c.Passed);
        if (firstFailed == null) return "";

        return firstFailed.Name switch
        {
            "HasHeaderComment" => "Change '// Name: Your Name Here' to your actual name.",
            "HasWhileLoop" => "Add a while loop: while (true) { ... } — use break to exit when done.",
            "HasDecimalParse" => "Parse revenue as money: decimal amount = decimal.Parse(Console.ReadLine());",
            "HasBreak" => "When the user enters 0, exit the loop: if (amount == 0) break;",
            "HasContinue" => "Skip negative values: if (amount < 0) { Console.WriteLine(\"Warning...\"); continue; }",
            "HasNegativeCheck" => "Check for negatives: if (amount < 0) — then print a warning and continue.",
            "HasAccumulator" => "Add each valid amount to total: totalRevenue += amount;",
            "HasReadLine" => "Read user input: string input = Console.ReadLine();",
            "HasSummary" => "After the loop, calculate: decimal average = totalRevenue / dayCount;",
            "HasRealContent" => "Complete each TODO step and remove the TODO comments.",
            _ => "Keep working on your solution!"
        };
    }

    private static List<CheckResult> Week09LabChecks(string programCs)
    {
        var checks = new List<CheckResult>();

        // Check 1: Header comment with name
        var hasNameComment = Regex.IsMatch(programCs, @"//.*Name:\s*\S+", RegexOptions.IgnoreCase);
        var notPlaceholder = !Regex.IsMatch(programCs, @"//.*Name:\s*Your\s+Name", RegexOptions.IgnoreCase);
        checks.Add(new CheckResult("HasHeaderComment", hasNameComment && notPlaceholder,
            hasNameComment && notPlaceholder ? "✅ Header comment with name found" : "❌ Replace 'Your Name Here' with your actual name in the header comment"));

        // Check 2: Uses for loops (at least 3 — one per stage)
        var forLoopCount = Regex.Matches(programCs, @"\bfor\s*\(").Count;
        var hasEnoughForLoops = forLoopCount >= 3;
        checks.Add(new CheckResult("HasForLoops", hasEnoughForLoops,
            hasEnoughForLoops ? $"✅ {forLoopCount} for loop(s) found" : $"❌ Need at least 3 for loops (one per stage). Found {forLoopCount}. Use for loops — not while loops."));

        // Check 3: Uses int.Parse for numeric input
        var hasIntParse = Regex.IsMatch(programCs, @"int\.Parse\s*\(");
        checks.Add(new CheckResult("HasIntParse", hasIntParse,
            hasIntParse ? "✅ int.Parse() used for numeric input" : "❌ Use int.Parse(Console.ReadLine()) to read numbers from the user"));

        // Check 4: Has multiplication operator (Stage I — multiplication table)
        var hasMultiplication = programCs.Contains("*");
        checks.Add(new CheckResult("HasMultiplication", hasMultiplication,
            hasMultiplication ? "✅ Multiplication operator found for Stage I" : "❌ Stage I needs multiplication: number * i to compute each table entry"));

        // Check 5: Has accumulator pattern (Stage II — sum)
        var hasAccumulator = Regex.IsMatch(programCs, @"\+=\s*");
        checks.Add(new CheckResult("HasAccumulator", hasAccumulator,
            hasAccumulator ? "✅ Accumulator pattern (+=) found for Stage II" : "❌ Stage II needs an accumulator: int sum = 0; then sum += i; inside the loop"));

        // Check 6: Has double cast for average (Stage II)
        var hasDoubleCast = Regex.IsMatch(programCs, @"\(double\)");
        checks.Add(new CheckResult("HasDoubleCast", hasDoubleCast,
            hasDoubleCast ? "✅ (double) cast found for average calculation" : "❌ Stage II needs (double) cast to prevent integer division: (double)sum / n"));

        // Check 7: Has :F2 format for average output
        var hasF2 = Regex.IsMatch(programCs, @":F2|:f2");
        checks.Add(new CheckResult("HasF2Format", hasF2,
            hasF2 ? "✅ :F2 format specifier found for average display" : "❌ Display average with 2 decimal places: $\"Average: {average:F2}\""));

        // Check 8: Has nested for loops (Stage III — at least 2 for loops)
        var hasNested = forLoopCount >= 2;
        checks.Add(new CheckResult("HasNestedForLoops", hasNested,
            hasNested ? "✅ Multiple for loops found (nested structure for Stage III)" : "❌ Stage III needs nested for loops — outer for rows, inner for columns"));

        // Check 9: Has Console.Write (Stage III — star output inside inner loop)
        var hasConsoleWrite = Regex.IsMatch(programCs, @"Console\.Write\s*\(");
        checks.Add(new CheckResult("HasConsoleWrite", hasConsoleWrite,
            hasConsoleWrite ? "✅ Console.Write() found for Stage III star output" : "❌ Stage III: use Console.Write(\"* \") inside the inner loop (no newline), then Console.WriteLine() after the inner loop"));

        // Check 10: TODOs completed
        var todoCount = Regex.Matches(programCs, @"//\s*TODO", RegexOptions.IgnoreCase).Count;
        var hasRealContent = todoCount <= 1;
        checks.Add(new CheckResult("HasRealContent", hasRealContent,
            hasRealContent ? "✅ TODO comments completed" : $"❌ Complete all TODO steps — {todoCount} TODOs remaining"));

        return checks;
    }

    private static string Week09LabHint(List<CheckResult> checks)
    {
        var firstFailed = checks.FirstOrDefault(c => !c.Passed);
        if (firstFailed == null) return "";

        return firstFailed.Name switch
        {
            "HasHeaderComment" => "Change '// Name: Your Name Here' to your actual name.",
            "HasForLoops" => "Each stage needs a for loop. Pattern: for (int i = 1; i <= limit; i++) { ... }",
            "HasIntParse" => "Read numbers with: int num = int.Parse(Console.ReadLine());",
            "HasMultiplication" => "Stage I: Console.WriteLine($\"{num} x {i} = {num * i}\");",
            "HasAccumulator" => "Stage II: Declare int sum = 0 before the loop, then sum += i; inside.",
            "HasDoubleCast" => "Stage II: double average = (double)sum / n; — the cast prevents truncation.",
            "HasF2Format" => "Stage II: Console.WriteLine($\"Average: {average:F2}\");",
            "HasNestedForLoops" => "Stage III needs two for loops — the inner one inside the outer one.",
            "HasConsoleWrite" => "Stage III: Console.Write(\"* \") inside inner loop, Console.WriteLine() after inner loop closes.",
            "HasRealContent" => "Complete each TODO step and remove the TODO comments.",
            _ => "Keep working on your solution!"
        };
    }

    private static List<CheckResult> Week10LabChecks(string programCs)
    {
        var checks = new List<CheckResult>();

        // Check 1: Header comment with name
        var hasNameComment = Regex.IsMatch(programCs, @"//.*Name:\s*\S+", RegexOptions.IgnoreCase);
        var notPlaceholder = !Regex.IsMatch(programCs, @"//.*Name:\s*Your\s+Name", RegexOptions.IgnoreCase);
        checks.Add(new CheckResult("HasHeaderComment", hasNameComment && notPlaceholder,
            hasNameComment && notPlaceholder ? "✅ Header comment with name found" : "❌ Replace 'Your Name Here' with your actual name in the header comment"));

        // Check 2: GreetUser method defined
        var hasGreetUser = Regex.IsMatch(programCs, @"static\s+void\s+GreetUser\s*\(\s*string\s+\w+\s*\)");
        checks.Add(new CheckResult("HasGreetUser", hasGreetUser,
            hasGreetUser ? "✅ GreetUser(string) method found" : "❌ Define: static void GreetUser(string name) — prints a greeting with the name"));

        // Check 3: ConvertMilesToKm method defined
        var hasConvert = Regex.IsMatch(programCs, @"static\s+void\s+ConvertMilesToKm\s*\(\s*double\s+\w+\s*\)");
        checks.Add(new CheckResult("HasConvertMilesToKm", hasConvert,
            hasConvert ? "✅ ConvertMilesToKm(double) method found" : "❌ Define: static void ConvertMilesToKm(double miles) — prints miles converted to km"));

        // Check 4: CheckBatteryStatus method defined
        var hasBattery = Regex.IsMatch(programCs, @"static\s+void\s+CheckBatteryStatus\s*\(\s*int\s+\w+\s*,\s*bool\s+\w+\s*\)");
        checks.Add(new CheckResult("HasCheckBatteryStatus", hasBattery,
            hasBattery ? "✅ CheckBatteryStatus(int, bool) method found" : "❌ Define: static void CheckBatteryStatus(int percentage, bool isCharging) — prints battery status"));

        // Check 5: Conversion factor present (1.60934)
        var hasConversionFactor = programCs.Contains("1.60934");
        checks.Add(new CheckResult("HasConversionFactor", hasConversionFactor,
            hasConversionFactor ? "✅ Miles-to-km conversion factor (1.60934) found" : "❌ Use the conversion factor: miles * 1.60934"));

        // Check 6: Has if/else for battery status
        var hasIfElse = Regex.IsMatch(programCs, @"if\s*\(") && Regex.IsMatch(programCs, @"else");
        checks.Add(new CheckResult("HasIfElse", hasIfElse,
            hasIfElse ? "✅ if/else decision structure found for battery status" : "❌ CheckBatteryStatus needs if/else to handle the four battery conditions"));

        // Check 7: GreetUser called at least twice
        var greetCalls = Regex.Matches(programCs, @"GreetUser\s*\(").Count;
        var greetCalledTwice = greetCalls >= 3; // 1 definition + 2 calls
        // Better: count calls outside the method definition
        var greetCallCount = greetCalls - (hasGreetUser ? 1 : 0);
        greetCalledTwice = greetCallCount >= 2;
        checks.Add(new CheckResult("GreetUserCalledTwice", greetCalledTwice,
            greetCalledTwice ? $"✅ GreetUser called {greetCallCount} time(s)" : $"❌ Call GreetUser at least twice with different names — found {greetCallCount} call(s)"));

        // Check 8: ConvertMilesToKm called at least twice
        var convertCalls = Regex.Matches(programCs, @"ConvertMilesToKm\s*\(").Count;
        var convertCallCount = convertCalls - (hasConvert ? 1 : 0);
        var convertCalledTwice = convertCallCount >= 2;
        checks.Add(new CheckResult("ConvertCalledTwice", convertCalledTwice,
            convertCalledTwice ? $"✅ ConvertMilesToKm called {convertCallCount} time(s)" : $"❌ Call ConvertMilesToKm at least twice with different values — found {convertCallCount} call(s)"));

        // Check 9: CheckBatteryStatus called at least twice
        var batteryCalls = Regex.Matches(programCs, @"CheckBatteryStatus\s*\(").Count;
        var batteryCallCount = batteryCalls - (hasBattery ? 1 : 0);
        var batteryCalledTwice = batteryCallCount >= 2;
        checks.Add(new CheckResult("BatteryCalledTwice", batteryCalledTwice,
            batteryCalledTwice ? $"✅ CheckBatteryStatus called {batteryCallCount} time(s)" : $"❌ Call CheckBatteryStatus at least twice with different arguments — found {batteryCallCount} call(s)"));

        // Check 10: TODOs completed
        var todoCount = Regex.Matches(programCs, @"//\s*TODO", RegexOptions.IgnoreCase).Count;
        var hasRealContent = todoCount <= 1;
        checks.Add(new CheckResult("HasRealContent", hasRealContent,
            hasRealContent ? "✅ TODO comments completed" : $"❌ Complete all TODO steps — {todoCount} TODOs remaining"));

        return checks;
    }

    private static string Week10LabHint(List<CheckResult> checks)
    {
        var firstFailed = checks.FirstOrDefault(c => !c.Passed);
        if (firstFailed == null) return "";

        return firstFailed.Name switch
        {
            "HasHeaderComment" => "Change '// Name: Your Name Here' to your actual name.",
            "HasGreetUser" => "Define the method below Main: static void GreetUser(string name) { Console.WriteLine($\"System initialized for user: {name}\"); }",
            "HasConvertMilesToKm" => "Define: static void ConvertMilesToKm(double miles) { double km = miles * 1.60934; Console.WriteLine($\"{miles:F2} miles = {km:F2} km\"); }",
            "HasCheckBatteryStatus" => "Define: static void CheckBatteryStatus(int percentage, bool isCharging) with if/else for the four conditions.",
            "HasConversionFactor" => "Inside ConvertMilesToKm, multiply: double km = miles * 1.60934;",
            "HasIfElse" => "Inside CheckBatteryStatus, use if/else to check: percentage < 20 with isCharging true/false, then the >= 20 cases.",
            "GreetUserCalledTwice" => "In Main, call GreetUser twice: GreetUser(\"Alice Chen\"); GreetUser(\"Marcus Webb\");",
            "ConvertCalledTwice" => "In Main, call ConvertMilesToKm twice: ConvertMilesToKm(5.0); ConvertMilesToKm(26.2);",
            "BatteryCalledTwice" => "In Main, call CheckBatteryStatus twice: CheckBatteryStatus(12, false); CheckBatteryStatus(85, true);",
            "HasRealContent" => "Complete each TODO step and remove the TODO comments.",
            _ => "Keep working on your solution!"
        };
    }

    // ==================== WEEK 11: RETURNING VALUES ====================

    private static List<CheckResult> Week11LabChecks(string programCs)
    {
        var checks = new List<CheckResult>();

        // Check 1: Header comment with name
        var hasNameComment = Regex.IsMatch(programCs, @"//.*Name:\s*\S+", RegexOptions.IgnoreCase);
        var notPlaceholder = !Regex.IsMatch(programCs, @"//.*Name:\s*Your\s+Name", RegexOptions.IgnoreCase);
        checks.Add(new CheckResult("HasHeaderComment", hasNameComment && notPlaceholder,
            hasNameComment && notPlaceholder ? "✅ Header comment with name found" : "❌ Replace 'Your Name Here' with your actual name in the header comment"));

        // Check 2: CalculateArea method defined with int return type
        var hasCalculateArea = Regex.IsMatch(programCs, @"static\s+int\s+CalculateArea\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*\)");
        checks.Add(new CheckResult("HasCalculateArea", hasCalculateArea,
            hasCalculateArea ? "✅ CalculateArea(int, int) method defined with int return type" : "❌ Define: static int CalculateArea(int length, int width) — must return int, not void"));

        // Check 3: CelsiusToFahrenheit method defined with double return type
        var hasCelsius = Regex.IsMatch(programCs, @"static\s+double\s+CelsiusToFahrenheit\s*\(\s*double\s+\w+\s*\)");
        checks.Add(new CheckResult("HasCelsiusToFahrenheit", hasCelsius,
            hasCelsius ? "✅ CelsiusToFahrenheit(double) method defined with double return type" : "❌ Define: static double CelsiusToFahrenheit(double celsius) — must return double"));

        // Check 4: FormatFullName method defined with string return type
        var hasFormatName = Regex.IsMatch(programCs, @"static\s+string\s+FormatFullName\s*\(\s*string\s+\w+\s*,\s*string\s+\w+\s*\)");
        checks.Add(new CheckResult("HasFormatFullName", hasFormatName,
            hasFormatName ? "✅ FormatFullName(string, string) method defined with string return type" : "❌ Define: static string FormatFullName(string firstName, string lastName) — must return string"));

        // Check 5: Has return statements (at least 3 — one per method)
        var returnCount = Regex.Matches(programCs, @"\breturn\b").Count;
        var hasReturns = returnCount >= 3;
        checks.Add(new CheckResult("HasReturnStatements", hasReturns,
            hasReturns ? "✅ Return statements found in methods" : $"❌ Each method needs a return statement — found {returnCount}, need at least 3"));

        // Check 6: CalculateArea called at least twice and results captured
        var areaCalls = Regex.Matches(programCs, @"CalculateArea\s*\(").Count;
        var areaCallCount = areaCalls - (hasCalculateArea ? 1 : 0);
        var areaCalledTwice = areaCallCount >= 2;
        checks.Add(new CheckResult("AreaCalledTwice", areaCalledTwice,
            areaCalledTwice ? "✅ CalculateArea called at least twice" : $"❌ Call CalculateArea at least twice with different arguments — found {areaCallCount} call(s)"));

        // Check 7: CelsiusToFahrenheit called at least twice
        var celsiusCalls = Regex.Matches(programCs, @"CelsiusToFahrenheit\s*\(").Count;
        var celsiusCallCount = celsiusCalls - (hasCelsius ? 1 : 0);
        var celsiusCalledTwice = celsiusCallCount >= 2;
        checks.Add(new CheckResult("CelsiusCalledTwice", celsiusCalledTwice,
            celsiusCalledTwice ? "✅ CelsiusToFahrenheit called at least twice" : $"❌ Call CelsiusToFahrenheit at least twice with different arguments — found {celsiusCallCount} call(s)"));

        // Check 8: FormatFullName called at least twice
        var nameCalls = Regex.Matches(programCs, @"FormatFullName\s*\(").Count;
        var nameCallCount = nameCalls - (hasFormatName ? 1 : 0);
        var nameCalledTwice = nameCallCount >= 2;
        checks.Add(new CheckResult("NameCalledTwice", nameCalledTwice,
            nameCalledTwice ? "✅ FormatFullName called at least twice" : $"❌ Call FormatFullName at least twice with different arguments — found {nameCallCount} call(s)"));

        // Check 9: Result capture pattern — variables assigned from method calls
        var hasResultCapture = Regex.IsMatch(programCs, @"(int|double|string|var)\s+\w+\s*=\s*(CalculateArea|CelsiusToFahrenheit|FormatFullName)\s*\(");
        checks.Add(new CheckResult("HasResultCapture", hasResultCapture,
            hasResultCapture ? "✅ Return values captured in variables" : "❌ Capture return values: int area = CalculateArea(10, 5);"));

        // Check 10: TODOs completed
        var todoCount = Regex.Matches(programCs, @"//\s*TODO", RegexOptions.IgnoreCase).Count;
        var hasRealContent = todoCount <= 1;
        checks.Add(new CheckResult("HasRealContent", hasRealContent,
            hasRealContent ? "✅ TODO comments completed" : $"❌ Complete all TODO steps — {todoCount} TODOs remaining"));

        return checks;
    }

    private static string Week11LabHint(List<CheckResult> checks)
    {
        var firstFailed = checks.FirstOrDefault(c => !c.Passed);
        if (firstFailed == null) return "";

        return firstFailed.Name switch
        {
            "HasHeaderComment" => "Change '// Name: Your Name Here' to your actual name.",
            "HasCalculateArea" => "Define the method below Main: static int CalculateArea(int length, int width) { return length * width; }",
            "HasCelsiusToFahrenheit" => "Define: static double CelsiusToFahrenheit(double celsius) { return (celsius * 9.0 / 5.0) + 32.0; }",
            "HasFormatFullName" => "Define: static string FormatFullName(string firstName, string lastName) { return $\"{lastName}, {firstName}\"; }",
            "HasReturnStatements" => "Each method must have a return statement. Example: return length * width;",
            "AreaCalledTwice" => "In Main, call CalculateArea twice: int area1 = CalculateArea(10, 5); int area2 = CalculateArea(12, 8);",
            "CelsiusCalledTwice" => "In Main, call CelsiusToFahrenheit twice: double temp1 = CelsiusToFahrenheit(100.0); double temp2 = CelsiusToFahrenheit(37.0);",
            "NameCalledTwice" => "In Main, call FormatFullName twice: string name1 = FormatFullName(\"Jordan\", \"Reyes\"); string name2 = FormatFullName(\"Alice\", \"Chen\");",
            "HasResultCapture" => "Capture the return value in a variable: int area = CalculateArea(10, 5); then use area in Console.WriteLine.",
            "HasRealContent" => "Complete each TODO step and remove the TODO comments.",
            _ => "Keep working on your solution!"
        };
    }
}

internal static class RunnerUtilities
{
    internal static string GenericProgram(string starterId) =>
        $"// Starter: {starterId}\n// Add your code below.\nusing System;\nclass Program {{ static void Main() {{ Console.WriteLine(\"Hello from {starterId}\"); }} }}\n";

    internal static readonly string CsprojText = """
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>disable</Nullable>
  </PropertyGroup>
</Project>
""";

    internal static List<Diagnostic> ParseDiagnostics(string text)
    {
        var list = new List<Diagnostic>();
        var regex = new Regex(@"(?:[\w\.-]+)?\((?<line>\d+),(?<col>\d+)\):\s+(error|warning)\s+[A-Z0-9]+:\s+(?<msg>.+)", RegexOptions.Multiline);
        foreach (Match m in regex.Matches(text))
        {
            if (int.TryParse(m.Groups["line"].Value, out var line) && int.TryParse(m.Groups["col"].Value, out var col))
            {
                list.Add(new Diagnostic(line, col, m.Groups["msg"].Value.Trim()));
            }
        }
        return list;
    }

    internal static async Task<ProcessResult> RunProcess(string fileName, string args, string workingDir, TimeSpan timeout, string? stdin = null)
    {
        const int MaxOutput = 64 * 1024;

        var psi = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = args,
            WorkingDirectory = workingDir,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            RedirectStandardInput = stdin != null,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        
        // Set US culture so currency formatting shows $ instead of ¤
        psi.Environment["DOTNET_SYSTEM_GLOBALIZATION_INVARIANT"] = "false";
        psi.Environment["LC_ALL"] = "en_US.UTF-8";
        psi.Environment["LANG"] = "en_US.UTF-8";

        using var proc = new Process { StartInfo = psi, EnableRaisingEvents = true };
        var stdout = new StringBuilder();
        var stderr = new StringBuilder();
        var tcsExit = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);

        proc.OutputDataReceived += (_, e) =>
        {
            if (e.Data == null) return;
            if (stdout.Length < MaxOutput) stdout.AppendLine(e.Data);
        };
        proc.ErrorDataReceived += (_, e) =>
        {
            if (e.Data == null) return;
            if (stderr.Length < MaxOutput) stderr.AppendLine(e.Data);
        };

        proc.Exited += (_, _) => tcsExit.TrySetResult(true);

        proc.Start();
        proc.BeginOutputReadLine();
        proc.BeginErrorReadLine();

        if (stdin != null)
        {
            await proc.StandardInput.WriteAsync(stdin);
            proc.StandardInput.Close();
        }

        var completed = await Task.WhenAny(tcsExit.Task, Task.Delay(timeout));
        var timedOut = completed != tcsExit.Task;

        if (timedOut)
        {
            try { proc.Kill(entireProcessTree: true); } catch { }
            return new ProcessResult(-1, stdout.ToString(), stderr.ToString(), true);
        }

        return new ProcessResult(proc.ExitCode, stdout.ToString(), stderr.ToString(), false);
    }
}

internal record RunnerRequest(string StarterId, Dictionary<string, string>? Files, string? Stdin);
internal record Diagnostic(int Line, int Column, string Message);
internal record RunnerResponse(bool Ok, bool CompileOk, bool RunOk, bool CompileTimedOut, bool RunTimedOut, string Stdout, string Stderr, List<Diagnostic> Diagnostics);
internal record CheckResponse(bool Ok, bool CompileOk, List<CheckResult> Checks, string Hint, string Stdout, string Stderr, List<Diagnostic> Diagnostics);
internal record CheckResult(string Name, bool Passed, string Message);
internal record ProcessResult(int ExitCode, string Stdout, string Stderr, bool TimedOut);

// WebSocket message types
internal record InteractiveInitMessage(string? Code, string? StarterId);
internal record InteractiveInputMessage(string? Type, string? Data);
