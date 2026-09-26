# AMM (Automated Market Maker)

## In one sentence

An AMM is a pool holding two tokens, where the price comes from a formula instead of from
buyers and sellers placing orders.

## The problem it solves

A normal exchange needs someone on the other side of every trade. If you want to sell token A,
someone must want to buy it at that moment. On a young blockchain with few users, there often
isn't anyone.

An AMM removes the need for a counterparty. You always trade against the pool.

## How it works

1. **Liquidity providers (LPs)** deposit both tokens into the pool, for example 100 A and
   10,000 B.
2. **Traders** put one token in and take the other out.
3. A **formula** decides how much comes out.

The most common formula is the **constant product**:

```
x * y = k
```

- `x` = amount of token A in the pool
- `y` = amount of token B in the pool
- `k` = a number that must not go down during a swap

### A worked example

The pool has 100 A and 10,000 B, so `k = 1,000,000`. The price is 1 A = 100 B.

A trader puts in 10 A. The pool now has 110 A. To keep `k` the same:

```
110 * y = 1,000,000   →   y ≈ 9,090.9
```

So the pool must keep about 9,090.9 B, and the trader gets `10,000 - 9,090.9 ≈ 909.1` B.

The general formula for the output is:

```
amount_out = reserve_out * amount_in / (reserve_in + amount_in)
```

## Important ideas

**Price impact.** The trader expected 1,000 B (10 A × 100) but got 909.1 B. The bigger the
trade compared to the pool, the worse the price. Deep pools mean low price impact.

**Slippage protection.** The price can move between when you sign and when your transaction
lands. `min_amount_out` says "fail the trade if I get less than this".

**Fees.** Most AMMs keep a small fee (for example 0.3%) from every swap inside the pool. That
fee is how LPs get paid.

**LP tokens.** When you deposit, you get LP tokens that represent your share of the pool. Burn
them later to withdraw your share, including the fees earned.

**Impermanent loss.** If the price of A moves a lot, LPs end up holding more of the token that
went down and less of the one that went up. Compared to just holding both tokens, they can lose
value. Fees are meant to make up for it.

**Arbitrage.** If the pool price drifts from the price on other exchanges, arbitrage traders
buy the cheap side until the prices match again. That is how an AMM "knows" the market price.

## Weakness that leads to the next project

A constant-product pool spreads liquidity across **every possible price, from zero to
infinity**. Most of that money sits at prices that will never happen, so it earns nothing.
That waste is the reason CLMMs exist. See [clmm.md](clmm.md).

## Real examples

Uniswap v2 (Ethereum), Raydium AMM v4 and Orca legacy pools (Solana).
