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

        await app.RunAsync();
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
            _ => new List<CheckResult>()
        };
    }

    internal static string GetHint(string starterId, List<CheckResult> checks)
    {
        return starterId switch
        {
            "week-01-lesson-1" => Week01Lesson1Hint(checks),
            "week-01-lab-1" => Week01Lab1Hint(checks),
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

        // Check 2: Has at least one Console.WriteLine
        var hasWriteLine = programCs.Contains("Console.WriteLine");
        checks.Add(new CheckResult(
            Name: "HasConsoleWriteLine",
            Passed: hasWriteLine,
            Message: hasWriteLine
                ? "Found Console.WriteLine statement."
                : "You need at least one Console.WriteLine statement."));

        // Check 3: Has 4 Console.WriteLine statements
        var writeLineCount = Regex.Matches(programCs, @"Console\.WriteLine").Count;
        var hasFourWriteLines = writeLineCount >= 4;
        checks.Add(new CheckResult(
            Name: "HasFourWriteLines",
            Passed: hasFourWriteLines,
            Message: hasFourWriteLines
                ? $"Found {writeLineCount} Console.WriteLine statements. Perfect!"
                : $"You need 4 Console.WriteLine statements for the 4 lines of output. Found {writeLineCount}."));

        // Check 4: Has actual content (not just the starter template)
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
    <Nullable>enable</Nullable>
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
