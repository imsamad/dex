// Pool math on the client, used to show a quote before sending a swap.
// All amounts are bigint base units: u64 values don't fit in a JS number
// without losing precision.

// Mirrors the constant-product math in programs/swap/src/lib.rs (swap_a_b):
// keeping x·y = k constant gives out = reserveOut·in / (reserveIn + in).
// Integer division rounds down, the same as on chain, so the quote matches
// the program to the last unit.
export const quoteOut = (
  reserveIn: bigint,
  reserveOut: bigint,
  amountIn: bigint,
): bigint => (reserveOut * amountIn) / (reserveIn + amountIn);

// The lowest output the trader accepts. bps = basis points, 100 bps = 1%.
export const withSlippage = (amount: bigint, bps: number): bigint =>
  (amount * BigInt(10_000 - bps)) / BigInt(10_000);

export const toBaseUnits = (tokens: number, decimals: number): bigint =>
  BigInt(tokens) * BigInt(10) ** BigInt(decimals);
