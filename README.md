# Swap: a learn-DeFi-by-building AMM on Solana

A constant-product AMM (the `x * y = k` kind), written in Anchor, with a browser "sandbox" UI
where anyone can try the whole flow without installing a wallet.

This is the first project in a series about learning DeFi by building it: swap/AMM, CLMM,
DLMM, orderbook DEX and perp DEX. The projects are for self-learning and for my portfolio.

---

## What we're going to do

### The idea

Most DeFi portfolio projects lose their visitors at step one: install a wallet, switch to
devnet, find a working faucet. Few reviewers get that far.

So the UI will have a **sandbox mode**. It generates a throwaway mnemonic and derives several
keypairs from it. Each keypair plays one role in the protocol, so a visitor (or an
interviewer) can act as every participant and see how they interact. A normal single-wallet
UI hides that.

### Roles in this project

| Keypair | Role | What it does |
|---------|------|--------------|
| 0 | Funder | Receives the devnet SOL airdrop, then sends SOL to the others |
| 1 | Token A issuer | Creates mint A (Token-2022, with chosen extensions) and mints supply |
| 2 | Token B issuer | Creates mint B the same way |
| 3 | Pool creator | Initializes the A/B pool |
| 4 | Liquidity provider | Deposits A and B, and later withdraws |
| 5+ | Traders | Swap A → B and B → A |

### Step by step

**Phase 1: finish the contract.** See [Contract to-do list](#contract-to-do-list) below.

**Phase 2: build the sandbox UI.**

1. Key manager: generate or import a mnemonic, derive keypairs, show balances, reset button.
2. Funding: one airdrop to keypair 0, then send SOL from it to the other keypairs.
3. Token factory: create Token-2022 mints with selectable extensions, then mint and distribute.
4. Pool screens: init pool, add liquidity, swap, remove liquidity.
5. Transaction log: after every transaction, show what changed.
6. "Connect wallet" option via `@solana/wallet-adapter`, next to sandbox mode.

**Phase 3: ship it.**

1. Deploy the program to devnet and host the UI.
2. Record a short demo video.
3. Polish this README: screenshots, design decisions, security notes.

**Phase 4: next project.** Pull the sandbox shell into a shared package and start the CLMM,
reusing the same theme (see [Series plan](#series-plan)).

### Guided mode and free-play mode

**Guided mode** walks through the full lifecycle in order:

1. Generate mnemonic → derive keypairs → fund them
2. Create token A (keypair 1) and token B (keypair 2)
3. Mint and distribute tokens to the LP and traders
4. Initialize the pool (keypair 3)
5. Add liquidity (keypair 4)
6. Swap (keypairs 5+)
7. Remove liquidity and compare what the LP got back

**Free-play mode** lets the user do any action with any key in any order, including ones that
should fail (for example, swapping on an empty pool). Seeing the program reject bad input is
part of the demo.

### What the UI shows after every transaction

- Balance changes for every keypair involved
- Pool reserves before and after, and the value of `k`
- Spot price, execution price, and price impact
- Fees charged, and fees earned by the LP
- A Solana Explorer link for the transaction

---

## Key management

- **Derivation path:** `m/44'/501'/i'/0'`, the same one Phantom and Solflare use, so a visitor
  can import the sandbox mnemonic into a real wallet and see the tokens there.
- **Storage:** in memory, or `localStorage` if the session should survive a refresh. Nothing is
  sent to a server.
- **Warning:** the UI clearly labels the mnemonic as **devnet only, never use it for real funds**.
- **Reset:** one button wipes the sandbox and starts again.

## Funding

Devnet airdrops are heavily rate-limited, so the UI does **not** airdrop to every keypair.

1. Airdrop once to keypair 0, or ask the user to use [faucet.solana.com](https://faucet.solana.com).
2. Send SOL from keypair 0 to the other keypairs in a single transaction.
3. Optional, for the hosted demo: a tiny backend faucet with a pre-funded treasury key and
   per-IP limits, so the demo still works when the public faucet is down.

## Token-2022 extensions

The token factory lets the issuer pick extensions. Some are useful for a pool, some are
dangerous, and the program should handle both. Details in
[docs/token-2022-extensions.md](docs/token-2022-extensions.md).

---

## Contract

Program ID (localnet): `81TraMMrLeWqbk6Vz5WyRP3R1JcVJ3bzKoiKWcwnXtgE`

The program uses Anchor's `token_interface` (`InterfaceAccount<Mint>`, `transfer_checked`), so
it works with both the classic SPL Token program and Token-2022.

### Instructions today

| Instruction | Signer | What it does |
|-------------|--------|--------------|
| `init_pool` | Pool creator | Creates the vault token accounts (PDAs) for mint A and mint B |
| `add_liquidity` | LP | Moves `amount_a` and `amount_b` from the LP into the vaults |
| `swap_a_b` | Trader | Sends `amount_in` of A to the pool, receives B, with a `min_amount_out` slippage check |

### Contract to-do list

- [ ] **Fix the swap formula:** `swap_a_b` uses `reserve_a * in / (reserve_b + in)`. For
      A → B it should be `reserve_b * in / (reserve_a + in)` (output reserve on top, input
      reserve on the bottom). The current version only looks right when both reserves are equal.
- [ ] **Pool account:** vaults are seeded by one mint only (`["samad-dex-vault", mint]`), so
      every pool that uses mint A would share the same A vault. Add a `Pool` account seeded by
      both mints, and seed the vaults from the pool.
- [ ] **LP tokens:** mint LP shares on deposit, so ownership of the pool can be tracked.
- [ ] **`remove_liquidity`:** burn LP shares and return A and B pro rata.
- [ ] **Deposit ratio check:** after the first deposit, deposits must match the current
      reserve ratio.
- [ ] **B → A swaps**, or one `swap` instruction that takes a direction.
- [ ] **Swap fee** (for example 0.3%) that stays in the pool for LPs.
- [ ] **Transfer-fee mints:** compute the swap from the amount the vault actually *received*,
      not the amount sent.
- [ ] **Reject unsafe extensions** (permanent delegate, freeze authority, non-transferable) at
      `init_pool`.
- [ ] Tests for each of the above, including the failure cases.

---

## Series plan

| # | Project | Status | Concept doc |
|---|---------|--------|-------------|
| 1 | **Swap / AMM** (this repo) | Contract in progress, UI next | [docs/amm.md](docs/amm.md) |
| 2 | CLMM (concentrated liquidity) | Planned | [docs/clmm.md](docs/clmm.md) |
| 3 | DLMM (bin-based liquidity) | Planned | [docs/dlmm.md](docs/dlmm.md) |
| 4 | Orderbook DEX | Planned | [docs/orderbook-dex.md](docs/orderbook-dex.md) |
| 5 | Perp DEX | Planned | [docs/perp-dex.md](docs/perp-dex.md) |

All projects share the same sandbox shell (key manager, token factory, funding, transaction
log). Each protocol plugs into it and adds its own roles:

- **AMM:** issuers, pool creator, LP, traders
- **CLMM / DLMM:** LPs picking price ranges or bins, and a trader who moves the price across them
- **Orderbook DEX:** a maker, a taker, and a "cranker" that processes the event queue
- **Perp DEX:** traders going long and short, a mock oracle key that moves the price, and a
  liquidator who closes unhealthy positions

The order is deliberate: each project reuses the math and account patterns of the one before.
The rule is one polished, deployed, tested project at a time, not five half-finished ones.

---

## Getting started

```bash
pnpm install
anchor build
anchor test          # spins up a local validator and runs tests/swap.ts
```

## Repo layout

```
programs/swap/   Anchor program
tests/           TypeScript integration tests
app/             Sandbox UI (next)
docs/            Concept docs for each project in the series
```
