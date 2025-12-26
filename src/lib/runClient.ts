const MAX_SOURCE_BYTES = 50_000;
let testRunMode: "stub" | "proxy" | null = null;

const getRunMode = (): "stub" | "proxy" => {
  if (testRunMode) return testRunMode;
  const mode = (import.meta.env.PUBLIC_RUN_MODE || "stub").toLowerCase();
  return mode === "proxy" ? "proxy" : "stub";
};

type RunOk = {
  ok: true;
  mode: "stub" | "proxy";
  stdout: string;
  stderr?: string;
};

type RunErr = {
  ok: false;
  mode: "stub" | "proxy";
  error: string;
  status?: number;
};

export type RunResult = RunOk | RunErr;

export type RunPayload = {
  starterId: string;
  source: string;
};

export const __setRunModeForTests = (mode: "stub" | "proxy" | null) => {
  testRunMode = mode;
};

export const runCode = async ({ starterId, source }: RunPayload): Promise<RunResult> => {
  const runMode = getRunMode();
  if (new TextEncoder().encode(source).length > MAX_SOURCE_BYTES) {
    return {
      ok: false,
      mode: runMode,
      error: "Source is too large (50KB limit).",
    };
  }

  if (runMode === "stub") {
    return {
      ok: true,
      mode: "stub",
      stdout: "Run is being enabled—copy your code into local Visual Studio, dotnetfiddle, or another sandbox.",
    };
  }

  try {
    const res = await fetch("/api/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ starterId, source }),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        mode: "proxy",
        status: res.status,
        error: text || "Runner rejected the request.",
      };
    }

    const data = await res.json();
    return {
      ok: true,
      mode: "proxy",
      stdout: data.stdout ?? "",
      stderr: data.stderr ?? "",
    };
  } catch (err) {
    return {
      ok: false,
      mode: "proxy",
      error: err instanceof Error ? err.message : "Failed to reach runner.",
    };
  }
};
