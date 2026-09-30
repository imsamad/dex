// The glue between the sandbox keypairs and the Anchor client, plus the
// address helpers that steps and the snapshot share.

import { AnchorProvider, Program, type Idl } from "@anchor-lang/core";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { Swap } from "../ctx/swap";
import type { Sandbox } from "./keys";
import { TOKEN_PROGRAM } from "./config";

export type StepContext = {
  connection: Connection;
  sandbox: Sandbox;
  programId: PublicKey;
  // Each actor signs and pays for its own transactions.
  programFor: (signer: Keypair) => Program<Swap>;
};

// Anchor expects a wallet (like Phantom) that can sign transactions. In the
// sandbox the "wallet" is just a keypair we hold, so this signs in memory.
const keypairWallet = (kp: Keypair) => ({
  publicKey: kp.publicKey,
  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T) {
    if (tx instanceof Transaction) tx.partialSign(kp);
    else tx.sign([kp]);
    return tx;
  },
  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[],
  ) {
    for (const tx of txs) await this.signTransaction(tx);
    return txs;
  },
});

// The IDL is passed in (not imported) so this file also runs outside Next.
export function makeStepContext(
  connection: Connection,
  sandbox: Sandbox,
  idl: Idl,
): StepContext {
  return {
    connection,
    sandbox,
    programId: new PublicKey(idl.address),
    programFor: (signer) =>
      new Program<Swap>(
        idl as Swap,
        new AnchorProvider(connection, keypairWallet(signer), {
          commitment: "confirmed",
        }),
      ),
  };
}

// The pool vault for a mint: a PDA with the same seeds as the program uses in
// lib.rs. Keep the two in sync.
export const vaultAddress = (programId: PublicKey, mint: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("samad-dex-vault"), mint.toBuffer()],
    programId,
  )[0];

// An owner's associated token account. The token program is part of the
// derivation, so a Token-2022 mint's ATA differs from a classic mint's.
export const ataAddress = (mint: PublicKey, owner: PublicKey) =>
  getAssociatedTokenAddressSync(mint, owner, false, TOKEN_PROGRAM);
