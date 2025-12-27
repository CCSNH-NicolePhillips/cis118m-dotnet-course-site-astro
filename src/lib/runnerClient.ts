export type RunnerPayload = {
  starterId: string;
  files: { "Program.cs": string };
  stdin: string;
};

export const resolveRunnerUrl = (publicUrl?: string, origin?: string): string => {
  const trimmed = (publicUrl ?? "").trim();
  const normalized = trimmed.replace(/\/+$/, "");
  if (normalized) return normalized;
  const fallback = (origin ?? "").trim();
  return fallback ? fallback.replace(/\/+$/, "") : "";
};

export const buildRunnerPayload = (starterId: string, code: string, stdin?: string): RunnerPayload => ({
  starterId,
  files: { "Program.cs": code },
  stdin: stdin ?? "",
});
