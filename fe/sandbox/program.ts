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

export const vaultAddress = (programId: PublicKey, mint: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("samad-dex-vault"), mint.toBuffer()],
    programId,
  )[0];

export const ataAddress = (mint: PublicKey, owner: PublicKey) =>
  getAssociatedTokenAddressSync(mint, owner, false, TOKEN_PROGRAM);
