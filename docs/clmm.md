# CLMM (Concentrated Liquidity Market Maker)

## In one sentence

A CLMM is an AMM where each LP chooses the **price range** their money works in, instead of
spreading it across every possible price.

## The problem it solves

In a normal AMM (see [amm.md](amm.md)), liquidity is spread from price 0 to infinity. If SOL
trades between $100 and $200 all year, the money set aside for "SOL at $3" or "SOL at $50,000"
never gets used and never earns fees.

A CLMM lets an LP say: "only use my money while the price is between $100 and $200."

## How it works

- **Positions.** Each LP deposit is a *position* with a lower price and an upper price.
- **Inside the range**, the position acts like a normal AMM pool, but a much deeper one. The
  same money gives far less price impact, so it earns more fees per dollar.
- **Outside the range**, the position stops trading. It is now 100% one token: all of the
  token that went down in price. It earns nothing until the price comes back.
- **Ticks.** The price line is split into small steps called *ticks* (each tick is about 0.01%
  apart). Ranges must start and end on ticks.
- **Crossing ticks.** When a swap moves the price past a tick where some position starts or
  ends, the pool updates its total active liquidity and keeps going.

### Simple picture

```
price →   $50     $100          $200     $400
LP 1:              [=============]
LP 2:                  [====]
LP 3:     [===============================]
```

At $150, all three LPs are active. At $300, only LP 3 is.

## Important ideas

**Capital efficiency.** A narrow range can be many times more efficient than a normal pool,
but it also stops earning as soon as the price leaves the range.

**Active management.** LPs often have to move their range as the price moves. That is a lot of
work, so there are "vault" products that do it automatically.

**Positions are unique.** Two LPs with different ranges cannot share one LP token, so positions
are usually NFTs or separate accounts.

**Math.** The pool works with the *square root* of the price, stored as a fixed-point number,
because it makes the swap math simpler and more precise. This is the hardest part to build.

## What building one teaches

- Fixed-point math and rounding direction (always round in the pool's favour)
- Tick arrays: storing many ticks in a few accounts, because Solana accounts have a size limit
- Swaps that loop across ticks, and staying inside the compute budget
- Per-position fee tracking

## Sandbox roles

- Several LPs, each choosing a different range
- One big trader who pushes the price across ranges, so the UI can show positions turning on
  and off

## Real examples

Uniswap v3 (Ethereum), Orca Whirlpools and Raydium CLMM (Solana).
