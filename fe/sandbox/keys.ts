// Turns one mnemonic into every keypair the sandbox uses: one per actor
// (role in the protocol) plus the two mint accounts.
//
// Keys are never stored, only the mnemonic. Deriving is deterministic, so the
// same mnemonic always gives the same addresses, and a refresh finds the same
// accounts on chain.

import { mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Keypair } from "@solana/web3.js";

// Array index is the derivation index, so the order must never change.
export const ACTORS = [
  "funder",
  "issuer_a",
  "issuer_b",
  "pool_creator",
  "lp",
  "trader_1",
  "trader_2",
] as const;
export type ActorId = (typeof ACTORS)[number];

export const ACTOR_LABELS: Record<ActorId, { name: string; role: string }> = {
  funder: { name: "Faucet", role: "Funds the other actors with SOL" },
  issuer_a: { name: "Nexa Labs", role: "Issues token A (NEX)" },
  issuer_b: { name: "Lumo Labs", role: "Issues token B (LUM)" },
  pool_creator: { name: "Pat", role: "Creates the NEX/LUM pool" },
  lp: { name: "Lena", role: "Liquidity provider" },
  trader_1: { name: "Tom", role: "Trader, swaps NEX → LUM" },
  trader_2: { name: "Tara", role: "Trader, holds LUM" },
};

// Mints are derived too, so a page refresh finds the same mint accounts.
const MINT_INDEX = { a: 100, b: 101 } as const;

export type Sandbox = {
  mnemonic: string;
  actors: Record<ActorId, Keypair>;
  mints: { a: Keypair; b: Keypair };
};

// The path Phantom and Solflare use, so the mnemonic can be imported into a
// real wallet to look at the sandbox accounts there.
export const derivationPath = (index: number) => `m/44'/501'/${index}'/0'`;

// derivePath gives a 32-byte ed25519 seed; Keypair.fromSeed expands it to a keypair.
const deriveKeypair = (seedHex: string, index: number) =>
  Keypair.fromSeed(derivePath(derivationPath(index), seedHex).key);

export function deriveSandbox(mnemonic: string): Sandbox {
  const seedHex = mnemonicToSeedSync(mnemonic).toString("hex");
  const actors = Object.fromEntries(
    ACTORS.map((id, i) => [id, deriveKeypair(seedHex, i)]),
  ) as Record<ActorId, Keypair>;

  return {
    mnemonic,
    actors,
    mints: {
      a: deriveKeypair(seedHex, MINT_INDEX.a),
      b: deriveKeypair(seedHex, MINT_INDEX.b),
    },
  };
}
