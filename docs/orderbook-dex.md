# Orderbook DEX

## In one sentence

An orderbook DEX works like a traditional exchange: people post buy and sell orders at prices
they choose, and trades happen when a buy and a sell meet.

## How it differs from an AMM

| AMM | Orderbook |
|-----|-----------|
| You trade against a pool | You trade against other people's orders |
| Price comes from a formula | Price comes from the best buy and sell orders |
| LPs deposit and wait | Market makers actively place and update orders |
| Simple, always has liquidity | More precise prices, but needs active traders |

## How it works

- **Bids** are buy orders ("I'll buy 10 SOL at $149").
- **Asks** are sell orders ("I'll sell 5 SOL at $151").
- The gap between the best bid and the best ask is the **spread**.

```
ASKS (sell)
  $152   8 SOL
  $151   5 SOL   ← best ask
------------------  spread = $2
  $149  10 SOL   ← best bid
  $148   4 SOL
BIDS (buy)
```

**Maker** orders sit on the book waiting (a limit order below the ask, for example). Makers
usually pay lower fees or even get a rebate.

**Taker** orders match immediately against existing orders (a market buy, for example). Takers
pay a higher fee.

## How it works on Solana specifically

A central matching engine is hard to run on a blockchain, so Solana orderbooks use a few
tricks:

- **Order book accounts** store bids and asks in a sorted data structure (often a "critbit"
  tree) inside a fixed-size account.
- **Event queue:** when a trade happens, the program writes a "fill" event instead of paying
  both sides right away. That keeps each transaction small.
- **Crank:** a separate transaction, sent by anyone (often a bot), reads the event queue and
  settles the balances.
- **Open orders account:** each user has an account holding their locked funds and open orders.

## Important ideas

- **Price-time priority:** the best price fills first. At the same price, the oldest order
  fills first.
- **Order types:** limit, market, post-only (only rest on the book, never take), IOC
  (fill what you can now, cancel the rest).
- **Self-trade prevention:** stop a user's buy from matching their own sell.
- **Tick size and lot size:** the smallest price step and smallest order size allowed.

## What building one teaches

- Sorted data structures inside fixed-size accounts, with zero-copy deserialization
- The event queue and crank pattern
- Locking and unlocking funds while orders are open

## Sandbox roles

- A market maker placing orders on both sides
- A taker hitting those orders
- A cranker settling fills, so the UI shows the queue emptying

## Real examples

OpenBook v2 and Phoenix (Solana), dYdX (its own chain).
