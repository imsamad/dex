"use client";

import { useCtx } from "@/ctx/ctx";
import { Button } from "./button";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import { solanaDerivationPath } from "@/utils";
import nacl from "tweetnacl";
import { derivePath } from "ed25519-hd-key";
import { Keypair } from "@solana/web3.js";
import { useEffect } from "react";

const NEXT_PUBLIC_MNEMONIC_SEED_PHRASE = process.env
  .NEXT_PUBLIC_MNEMONIC_SEED_PHRASE as string;

export const GenerateMnemonic = () => {
  const { amm_state, set_amm_state } = useCtx();

  const generateMnemonicUtil = () => {
    const mnemonic_seed_phrase = generateMnemonic();
    localStorage.setItem(
      NEXT_PUBLIC_MNEMONIC_SEED_PHRASE,
      mnemonic_seed_phrase,
    );

    set_amm_state((p) => ({ ...p, mnemonic_seed_phrase }));
  };

  const initialized_keypairs = async () => {
    try {
      // const keypairs = [amm_state.funder, amm_state.mint_a_authority, amm_state.mint_b_authority, amm_state.pool_authority];
      const seed = mnemonicToSeedSync(amm_state.mnemonic_seed_phrase!);
      const keypair_generator = (index: number) => {
        const funderDervPath = solanaDerivationPath(index);
        const funder_secret = nacl.sign.keyPair.fromSeed(
          derivePath(funderDervPath, seed.toString("hex")).key,
        ).secretKey;

        return Keypair.fromSecretKey(funder_secret);
      };

      const funder_keypair = keypair_generator(0);
      const mint_a_authority = keypair_generator(1);
      const mint_b_authority = keypair_generator(2);
      const pool_authority = keypair_generator(3);

      set_amm_state((p) => ({
        ...p,
        funder: funder_keypair,
        mint_a_authority,
        mint_b_authority,
        pool_authority,
      }));
    } catch (err) {
      console.log("Error occured while init keypairs for AMM interactivity");
    } finally {
    }
  };

  useEffect(() => {
    if (amm_state.mnemonic_seed_phrase) {
      initialized_keypairs()
    }
  }, [amm_state.mnemonic_seed_phrase]);

  return (
    <div className="border p-2">
      <h1 className="font-semibold text-lg text-center">Mnemonic</h1>

      {amm_state.mnemonic_seed_phrase ? (
        amm_state.mnemonic_seed_phrase
      ) : (
        <Button onClick={generateMnemonicUtil} isLoading={false}>
          Generate Mnemonic
        </Button>
      )}

      {amm_state.mnemonic_seed_phrase && !amm_state.funder && (
        <Button onClick={initialized_keypairs} isLoading={false}>
          Initialised Keypairs
        </Button>
      )}
    </div>
  );
};
