// Mirrors the constant-product math in programs/swap/src/lib.rs (swap_a_b).
export const quoteOut = (
  reserveIn: bigint,
  reserveOut: bigint,
  amountIn: bigint,
): bigint => (reserveOut * amountIn) / (reserveIn + amountIn);

export const withSlippage = (amount: bigint, bps: number): bigint =>
  (amount * BigInt(10_000 - bps)) / BigInt(10_000);

export const toBaseUnits = (tokens: number, decimals: number): bigint =>
  BigInt(tokens) * BigInt(10) ** BigInt(decimals);
