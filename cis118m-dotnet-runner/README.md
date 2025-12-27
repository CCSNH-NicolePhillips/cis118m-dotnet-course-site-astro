# cis118m-dotnet-runner

Minimal .NET 8 Web API that compiles and runs submitted C# console code for the CIS118M course editor.

## Endpoints
- `GET /health` — returns OK
- `POST /compile` — compiles the submitted Program.cs
- `POST /run` — compiles then runs the submitted Program.cs

### Request body (compile/run)
```json
{
  "starterId": "week-01-lesson-1",
  "files": { "Program.cs": "// code" },
  "stdin": "" // optional, used for run
}
```

### Response shape
```json
{
  "ok": true,
  "compileOk": true,
  "runOk": true,
  "stdout": "Hello, world!\n",
  "stderr": "",
  "diagnostics": [
    { "line": 5, "column": 10, "message": "..." }
  ]
}
```

## Running locally
```bash
# from the cis118m-dotnet-runner directory
 dotnet restore
 dotnet run
# service listens on http://localhost:8787
```

## Docker
```bash
# build
 docker build -t cis118m-dotnet-runner .
# run
 docker run -p 8787:8787 cis118m-dotnet-runner
```

## Notes
- Per-request temp folder under the OS temp path
- Timeouts: 5s compile, 3s run
- Output capped at 64KB
- Temp folders cleaned up after each request
