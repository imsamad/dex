import { AnchorError } from "@anchor-lang/core";

export type ErrorInfo = { message: string; logs?: string[] };

// Turns Anchor / RPC errors into one readable line plus the program logs.
export function describeError(err: unknown): ErrorInfo {
  if (err instanceof AnchorError) {
    return {
      message: `${err.error.errorCode.code}: ${err.error.errorMessage}`,
      logs: err.logs,
    };
  }
  const e = err as { message?: string; logs?: string[]; transactionLogs?: string[] };
  const logs = e?.logs ?? e?.transactionLogs;
  // Other programs (e.g. the token program) log a readable reason, such as
  // "Error: insufficient funds", next to an opaque "custom program error: 0x1".
  const logged = logs
    ?.map((l) => l.match(/^Program log: Error: (.+)$/)?.[1])
    .findLast(Boolean);
  const message =
    logged ??
    (e?.message ?? String(err)).replace(/^Simulation failed\.\s*Message:\s*/i, "").split("\n")[0];
  return { message, logs };
}
