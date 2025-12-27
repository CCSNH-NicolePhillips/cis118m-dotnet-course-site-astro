using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.RegularExpressions;

[assembly: InternalsVisibleTo("cis118m-dotnet-runner.Tests")]

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new { ok = true, service = "cis118m-dotnet-runner" }));

app.MapPost("/compile", async (RunnerRequest req) => await HandleRequest(req, runAfterCompile: false));
app.MapPost("/run", async (RunnerRequest req) => await HandleRequest(req, runAfterCompile: true));

app.Run();

record RunnerRequest(string StarterId, Dictionary<string, string>? Files, string? Stdin);
record Diagnostic(int Line, int Column, string Message);
record RunnerResponse(bool Ok, bool CompileOk, bool RunOk, string Stdout, string Stderr, List<Diagnostic> Diagnostics);

static async Task<IResult> HandleRequest(RunnerRequest req, bool runAfterCompile)
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

        var compile = await RunnerUtilities.RunProcess("dotnet", "build -c Release", root, TimeSpan.FromSeconds(5));
        var diagnostics = RunnerUtilities.ParseDiagnostics(compile.Stdout + "\n" + compile.Stderr);
        var compileOk = !compile.TimedOut && compile.ExitCode == 0;

        if (!runAfterCompile)
        {
            return Results.Json(new RunnerResponse(
                Ok: compileOk,
                CompileOk: compileOk,
                RunOk: false,
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
            Stdout: string.Empty,
            Stderr: ex.Message,
            Diagnostics: new()));
    }
    finally
    {
        try { Directory.Delete(root, recursive: true); } catch { }
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
        var regex = new Regex(@"\((?<line>\d+),(?<col>\d+)\):\s+(error|warning)\s+[A-Z0-9]+:\s+(?<msg>.+)", RegexOptions.Multiline);
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

record ProcessResult(int ExitCode, string Stdout, string Stderr, bool TimedOut);
