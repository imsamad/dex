// Converting between base units (bigint) and the decimal strings people read.
// Done with string/bigint math so large u64 amounts stay exact.

// 12500000n with 6 decimals → "12.5"
export function formatUnits(value: bigint, decimals: number, maxFraction = 4) {
  const negative = value < BigInt(0);
  const abs = negative ? -value : value;
  const base = BigInt(10) ** BigInt(decimals);
  const whole = abs / base;
  const fraction = (abs % base)
    .toString()
    .padStart(decimals, "0")
    .slice(0, maxFraction)
    .replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

export const formatSigned = (value: bigint, decimals: number) =>
  `${value > BigInt(0) ? "+" : ""}${formatUnits(value, decimals)}`;

export const shortAddress = (address: string) =>
  `${address.slice(0, 4)}…${address.slice(-4)}`;

// "12.5" -> 12500000n for 6 decimals. Returns null for invalid or zero input.
export function parseUnits(input: string, decimals: number): bigint | null {
  const match = input.trim().match(/^(\d*)(?:\.(\d*))?$/);
  if (!match || (!match[1] && !match[2])) return null;
  const [, whole = "", fraction = ""] = match;
  if (fraction.length > decimals) return null;
  const value = BigInt((whole || "0") + fraction.padEnd(decimals, "0"));
  return value > BigInt(0) ? value : null;
}
