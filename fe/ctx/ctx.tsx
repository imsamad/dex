"use client";
import React, { createContext, useContext,  useLayoutEffect, useState } from "react";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";
import { solanaDerivationPath } from "@/app/page";
import { Connection, Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";
import nacl from "tweetnacl";
import swap_idl from "./swap_idl.json";
import type { Swap } from "./swap";
import * as anchor from "@anchor-lang/core";


const Ctx = createContext<{
  mnemonic_seed: Buffer<ArrayBufferLike> | undefined;
  connection: Connection | undefined;
  handleGenerateRootKeypair: () => void;
  keyPairs: Record<keyof typeof KeyPairs_indices, Keypair> | undefined;
  anchor_program:anchor.Program<Swap> | undefined
}>({
  mnemonic_seed: undefined,
  handleGenerateRootKeypair: () => {},
  keyPairs: undefined,
  connection: undefined,
  anchor_program:undefined
});

export const KeyPairs_indices = {
  funder: 0,
  mint1_authority: 1,
  mint2_authority: 2,
  // dex owner
  pool_owner: 3,
  user_1: 4,
  user_2: 5,
};

export const CtxWrapper = ({ children }: { children: React.ReactNode }) => {
  const [connection, setConnection] = useState<Connection>();
  const [anchor_program, set_anchor_program] = useState<anchor.Program<Swap>>();

  useLayoutEffect(() => {
    try {
      if (connection) return;
      const connection_ = new Connection("http://localhost:8899", "confirmed");
      setConnection(connection_);
    } catch (err) {
      console.error("error establishing link with solana validators", err);
    }
  }, []);

  const [mnemonic_seed, setMnemoic_seed] = useState(() => {
    const mnemonic = localStorage.getItem("samdex_mnemonic"+Math.random());
    return mnemonic ? mnemonicToSeedSync(mnemonic) : undefined;
  });

  const [keyPairs, setKeypairs] =
    useState<Record<keyof typeof KeyPairs_indices, Keypair>>();

  const handleGenerateRootKeypair = () => {
    try {
      // same mnemoic would be used to generate all required set of keypairs,
      // root keypair would be the initially funded with SOL enough for rent-exemption or funding the gas fees for required ops
      const mnemonic = generateMnemonic();
     if(!mnemonic_seed) localStorage.setItem("samdex_mnemonic", mnemonic);
      const seed = mnemonic_seed ? mnemonic_seed : mnemonicToSeedSync(mnemonic);
      setMnemoic_seed(seed);

      const keyPairs: Partial<
        Record<keyof typeof KeyPairs_indices, Keypair>
      > = {};
      Object.entries(KeyPairs_indices).forEach(([key, value]) => {
        const dervPath = solanaDerivationPath(value);

        const secret = nacl.sign.keyPair.fromSeed(
          derivePath(dervPath, seed.toString("hex")).key,
        ).secretKey;
        keyPairs[key] = Keypair.fromSecretKey(secret);
      });

      setKeypairs(keyPairs);
      if (!keyPairs.pool_owner) return;



      const wallet = {
        publicKey: keyPairs.pool_owner.publicKey,

        async signTransaction<T extends Transaction | VersionedTransaction>(
          tx: T
        ): Promise<T> {
          if (tx instanceof Transaction) {
            tx.partialSign(keyPairs.pool_owner!);
          } else {
            tx.sign([keyPairs.pool_owner!]);
          }

          return tx;
        },

        async signAllTransactions<T extends Transaction | VersionedTransaction>(
          txs: T[]
        ): Promise<T[]> {
          txs.forEach((tx) => {
            if (tx instanceof Transaction) {
              tx.partialSign(keyPairs.pool_owner!);
            } else {
              tx.sign([keyPairs.pool_owner!]);
            }
          });

          return txs;
        },
      };
      const anchor_ = new anchor.AnchorProvider(connection!, wallet, {
        commitment: "confirmed"
      });

      const program = new anchor.Program<Swap>(swap_idl, anchor_);
      set_anchor_program(program);

    } catch (err) {
      console.error("error in setting mnemonic and keypairs", err);
    }
  };

  return (
    <Ctx
      value={{ mnemonic_seed, handleGenerateRootKeypair, keyPairs, connection,anchor_program }}
    >
      {children}
    </Ctx>
  );
};

export const useCtx = () => useContext(Ctx);
