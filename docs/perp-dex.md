# Perp DEX (Perpetual Futures Exchange)

## In one sentence

A perp DEX lets you bet on a token's price going up or down, with borrowed money (leverage),
without ever owning the token, and with no expiry date.

## Key words first

- **Long:** you profit if the price goes up.
- **Short:** you profit if the price goes down.
- **Collateral / margin:** the money you put down, usually USDC.
- **Leverage:** trading a position bigger than your collateral. $100 at 10x = a $1,000
  position.
- **Perpetual:** unlike normal futures, the position never expires. You keep it until you close
  it or get liquidated.

## How it works

1. You deposit $100 USDC as collateral.
2. You open a 10x long on SOL at $100. Your position is worth $1,000 (10 SOL).
3. SOL goes to $110. Your position is worth $1,100, so you made $100 (100% of your collateral).
4. If SOL had gone to $90, you'd have lost $100, which is all of your collateral.

That last case is why **liquidation** exists.

## Important ideas

**Oracle.** The exchange needs a trustworthy outside price for SOL. It reads it from an
*oracle* such as Pyth or Switchboard. If the oracle is wrong, everything is wrong, so this is
the most security-sensitive piece.

**Liquidation.** When your losses get close to your collateral, anyone (a *liquidator*) can
close your position before it goes negative. The liquidator gets a small reward. This protects
the exchange from bad debt.

**Maintenance margin.** The minimum collateral you must keep, for example 5% of the position
size. Fall below it and you can be liquidated.

**Funding rate.** Perps have no expiry, so something must keep the perp price close to the
real price. Every hour or so:
- If the perp trades *above* the real price, longs pay shorts.
- If the perp trades *below*, shorts pay longs.

This pushes traders to bring the perp price back in line.

**Where the other side comes from.** Two common designs:
- **Orderbook perps:** longs are matched with shorts (see
  [orderbook-dex.md](orderbook-dex.md)).
- **Pool perps:** a liquidity pool takes the other side of every trade. LPs earn fees and
  trader losses, but pay out trader profits.

**PnL (profit and loss).** Unrealized PnL changes with the price. Realized PnL is locked in
when you close.

## What building one teaches

- Reading and validating oracle prices (staleness checks, confidence intervals)
- Margin and health calculations
- Liquidation logic that can't be gamed
- Funding rate accounting over time
- The most "things can go wrong" contract in the series, so good tests really matter

## Sandbox roles

- Trader 1 goes long, trader 2 goes short
- **A mock oracle controlled by a keypair**, so the visitor can move the price by hand
- A liquidator who closes positions once they become unhealthy

Moving the price with the mock oracle and watching a position get liquidated is the best demo
in the whole series.

## Real examples

Drift, Jupiter Perps and Zeta (Solana), Hyperliquid (its own chain), GMX (Arbitrum).
