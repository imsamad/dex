# DLMM (Dynamic Liquidity Market Maker)

## In one sentence

A DLMM splits the price line into separate **bins**. Each bin has one fixed price, and the
pool trades through bins one at a time.

## How it differs from a CLMM

A CLMM (see [clmm.md](clmm.md)) uses a smooth curve inside each range, so the price moves a
little with every trade.

A DLMM uses **flat steps**:

- Every bin has one exact price, for example bin 101 = $100.00, bin 102 = $100.25.
- Inside a bin there is **no price impact at all**. You get the bin's price until the bin runs
  out.
- When the active bin runs out of one token, the swap moves to the next bin, at the next price.

### Simple picture

```
price →  $99.50  $99.75  $100.00  $100.25  $100.50
bins:    [ B  ]  [ B  ]  [A + B]  [  A  ]  [  A  ]
                          ↑ active bin
```

- Bins **below** the active price hold only token B (waiting to buy A).
- Bins **above** the active price hold only token A (waiting to sell A).
- Only the **active bin** holds both.

It is a bit like an orderbook built out of pools.

## Important ideas

**Bin step.** The price gap between bins, for example 0.25%. Small steps suit stable pairs,
bigger steps suit volatile ones.

**Liquidity shapes.** LPs choose how to spread money over bins:
- *Spot:* even across a range
- *Curve:* most near the current price
- *Bid-ask:* most at the edges, to catch big moves

**Dynamic fees.** The fee goes up when the market is volatile (lots of bins crossed quickly)
and down when it is calm. This pays LPs more when they take more risk. The "dynamic" in the
name comes from these fees.

**Simpler math than CLMM.** Inside a bin the formula is linear (`price * amount_x + amount_y`),
which is easier to reason about than square-root pricing.

## What building one teaches

- Bin accounts, and moving the active bin up and down
- Tracking each LP's share of each bin
- A fee that depends on recent volatility
- Swaps that loop over bins inside the compute budget

## Sandbox roles

- LPs choosing different shapes (spot, curve, bid-ask)
- A trader who pushes the price through several bins, so the UI can show bins emptying and
  filling

## Real examples

Meteora DLMM (Solana), Trader Joe Liquidity Book (Avalanche / Arbitrum).
