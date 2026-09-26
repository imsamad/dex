# Token-2022 extensions (and what they mean for a pool)

## What Token-2022 is

Solana has two token programs:

- **SPL Token:** the original. Simple, used by most older tokens.
- **Token-2022 (Token Extensions):** a newer version with optional features called
  *extensions*, which the creator turns on when making the mint.

A DEX that only supports SPL Token can't list Token-2022 tokens. Using Anchor's
`token_interface` and `transfer_checked` lets one program handle both.

## Extensions, grouped by how they affect a pool

### Useful and safe

**Metadata pointer + token metadata.** Stores the token's name, symbol and image link on the
mint itself. The UI can show "USDX" instead of a long address. Good to use in the sandbox
token factory.

**Interest-bearing.** The displayed balance grows over time, but the actual stored amount
doesn't change. It only affects the UI, and it is a nice detail to show.

### Needs special handling

**Transfer fee.** Every transfer takes a percentage for the token creator. If a trader sends
100 tokens, the pool might only receive 99.

The AMM must compute the swap from the amount **received**, not the amount **sent**. Otherwise
the pool gives out too much and slowly loses money. This makes a great interview topic.

**Transfer hook.** Every transfer calls another program the creator chose (for royalties or
allow-lists, for example). The swap must pass the extra accounts that the hook needs. This is
advanced, so leave it for later.

### Dangerous inside a pool

**Permanent delegate.** A chosen address can move or burn tokens from *any* account, including
the pool's vault. The creator could drain the pool.

**Freeze authority** (also in classic SPL Token). The creator can freeze the vault, so nobody
can trade or withdraw.

**Non-transferable.** The token can't be moved at all, so a pool makes no sense.

**Default account state = frozen.** New accounts start frozen until the creator unfreezes
them. The pool's vault might never work.

A good pool program either **rejects** these mints at `init_pool` or shows a clear warning.
Demonstrating that in the sandbox (try to create a pool with a permanent-delegate token, and
watch it fail) shows security awareness.

## What to support in this project

| Extension | Plan |
|-----------|------|
| Metadata | Support in the token factory |
| Transfer fee | Support, and make the swap math correct for it |
| Interest-bearing | Optional, UI only |
| Transfer hook | Later |
| Permanent delegate, non-transferable, frozen by default | Reject at `init_pool` |
| Freeze authority | Reject, or warn clearly |
