"use client";
import React, {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useLayoutEffect,
  useState,
} from "react";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import nacl from "tweetnacl";
import swap_idl from "./swap_idl.json";
import type { Swap } from "./swap";
import * as anchor from "@anchor-lang/core";
import { Account } from "@solana/spl-token";
import { solanaDerivationPath } from "@/utils";

const Ctx = createContext<{
  amm_state: Partial<AmmState>,
  set_amm_state:Dispatch<SetStateAction<Partial<AmmState>>>,
  mnemonic_seed_phrase: string | undefined;
  connection: Connection | undefined;
  handleGenerateRootKeypair: () => void;
  keyPairs: Record<keyof typeof KeyPairs_indices, Keypair> | undefined;
  anchor_program: anchor.Program<Swap> | undefined;
}>({
  mnemonic_seed_phrase: undefined,
  handleGenerateRootKeypair: () => {},
  keyPairs: undefined,
  connection: undefined,
  anchor_program: undefined,
  amm_state: {},
  set_amm_state :() => {}
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
const NEXT_PUBLIC_VALIDATOR_URL = process.env
  .NEXT_PUBLIC_VALIDATOR_URL as string;

const NEXT_PUBLIC_MNEMONIC_SEED_PHRASE = process.env
  .NEXT_PUBLIC_MNEMONIC_SEED_PHRASE as string;

type AmmState = {
  connection: Connection;
  mnemonic_seed_phrase: string;
  anchor_program: anchor.Program<Swap>;

  funder: Keypair;
  mint_a: PublicKey;
  mint_b: PublicKey;

  mint_a_authority: Keypair;
  mint_b_authority: Keypair;
  mint_a_authority_ata: Account;
  mint_b_authority_ata: Account;

  pool_authority: Keypair;
  pool_authority_mint_a_ata: Account;
  pool_authority_mint_b_ata: Account;

  users_n_atas: { keypair: Keypair; ata: Account }[];
}

export const CtxWrapper = ({ children }: { children: React.ReactNode }) => {
  const [amm_state, set_amm_state] = useState<
    Partial<AmmState>
  >({});

  const [connection, setConnection] = useState<Connection>();
  const [anchor_program, set_anchor_program] = useState<anchor.Program<Swap>>();

  useLayoutEffect(() => {
    try {
      if (!NEXT_PUBLIC_VALIDATOR_URL) {
        alert("Provide validator URL");
        return;
      }

      if (amm_state.connection) return;
      const connection = new Connection(NEXT_PUBLIC_VALIDATOR_URL, "confirmed");

      // const mnemonic = localStorage.getItem(NEXT_PUBLIC_MNEMONIC_SEED_PHRASE);

      set_amm_state((p) => ({
        ...p,
        connection,
      }));
    } catch (err) {
      console.error("error establishing link with solana validators", err);
    }
  }, []);

  const [mnemonic_seed_phrase, set_mnemonic_seed_phrase] = useState(() => {
    const mnemonic = localStorage.getItem("samdex_mnemonic" + Math.random());
    return mnemonic || undefined;
  });

  const [keyPairs, setKeypairs] =
    useState<Record<keyof typeof KeyPairs_indices, Keypair>>();

  const load_amm_program = async () => {};

  const handleGenerateRootKeypair = () => {
    try {
      let mnemonic_seed_phrase = localStorage.getItem("samdex_mnemonic");
      mnemonic_seed_phrase = !mnemonic_seed_phrase
        ? generateMnemonic()
        : mnemonic_seed_phrase;
      localStorage.setItem("samdex_mnemonic", mnemonic_seed_phrase);

      // same mnemoic would be used to generate all required set of keypairs,
      // root keypair would be the initially funded with SOL enough for rent-exemption or funding the gas fees for required ops

      const seed = mnemonicToSeedSync(mnemonic_seed_phrase);
      set_mnemonic_seed_phrase(mnemonic_seed_phrase);

      const keyPairs: Partial<Record<keyof typeof KeyPairs_indices, Keypair>> =
        {};
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
          tx: T,
        ): Promise<T> {
          if (tx instanceof Transaction) {
            tx.partialSign(keyPairs.pool_owner!);
          } else {
            tx.sign([keyPairs.pool_owner!]);
          }

          return tx;
        },

        async signAllTransactions<T extends Transaction | VersionedTransaction>(
          txs: T[],
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
        commitment: "confirmed",
      });

      const program = new anchor.Program<Swap>(swap_idl, anchor_);
      set_anchor_program(program);
    } catch (err) {
      console.error("error in setting mnemonic and keypairs", err);
    }
  };

  return (
    <Ctx
      value={{
        mnemonic_seed_phrase,
        handleGenerateRootKeypair,
        keyPairs,
        connection,
        anchor_program,
        amm_state,
        set_amm_state
      }}
    >
      {children}
    </Ctx>
  );
};

export const useCtx = () => useContext(Ctx);
