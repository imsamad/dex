"use client";

import { useCtx } from "@/ctx/ctx";
import {
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  ExtensionType,
  getMintLen,
  LENGTH_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";
import {
  Keypair,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { Button } from "./button";
import { useState } from "react";

export const GenerateMints = () => {
  const { amm_state, set_amm_state } = useCtx();
  const create_mints = async (mint_a: Keypair) => {
    if (!amm_state.connection) {
      alert("Connection not established with validator");
      return;
    }
    try {
      // const mint_a = Keypair.generate();
      // const mint_b = Keypair.generate();

      const maxMetadata: TokenMetadata = {
        mint: mint_a.publicKey,
        name: "SamDex - MintA",
        symbol: "SamDEX-A",
        uri: "htpp:..",
        additionalMetadata: [
          ["description", "Metadata stored on mint account"],
        ],
      };
      const mintSpace = getMintLen([ExtensionType.MetadataPointer]);
      const metadataSpace = TYPE_SIZE + LENGTH_SIZE + pack(maxMetadata).length;
      const mintRent =
        await amm_state.connection.getMinimumBalanceForRentExemption(
          mintSpace + metadataSpace,
        );

      const tx = new Transaction().add(
        // Create mint account
        SystemProgram.createAccount({
          fromPubkey: amm_state.funder!.publicKey,
          newAccountPubkey: mint_a.publicKey,
          lamports: mintRent,
          space: mintSpace + metadataSpace,
          programId: TOKEN_2022_PROGRAM_ID,
        }),

        // MetadataPointer -> mint itself
        createInitializeMetadataPointerInstruction(
          mint_a.publicKey,
          amm_state.mint_a_authority!.publicKey,
          mint_a.publicKey,
          TOKEN_2022_PROGRAM_ID,
        ),

        // Initialize Token-2022 mint
        createInitializeMintInstruction(
          mint_a.publicKey,
          6,
          amm_state.mint_a_authority!.publicKey,
          amm_state.mint_a_authority!.publicKey,
          TOKEN_2022_PROGRAM_ID,
        ),

        // Initialize TokenMetadata on the mint account
        createInitializeInstruction({
          programId: TOKEN_2022_PROGRAM_ID,
          metadata: mint_a.publicKey,
          updateAuthority: amm_state.mint_a_authority!.publicKey,
          mint: mint_a.publicKey,
          mintAuthority: amm_state.mint_a_authority!.publicKey,
          name: maxMetadata.name,
          symbol: maxMetadata.symbol,
          uri: maxMetadata.uri,
        }),
      );

      await sendAndConfirmTransaction(amm_state.connection!, tx, [
        amm_state.funder!,
        amm_state.mint_a_authority!,
        mint_a,
      ]);

      //       const mintSpace = getMintLen([ExtensionType.MetadataPointer]);
      //
      //       const maxMetadata = getMintLen([ExtensionType.MetadataPointer]);
      //       const metadataSpace = TYPE_SIZE + LENGTH_SIZE + pack(maxMetadata).length;
      //       const mintRent = await connection.getMinimumBalanceForRentExemption(
      //         mintSpace + metadataSpace
      //       );
    } catch (err) {}
  };

  const [is_creating_mint_a, set_is_creating_mint_a] = useState(false);

  const create_mint_a = async () => {
    try {
      set_is_creating_mint_a(true);
      // TODO: Generate it from derive path too
      const mint_a = Keypair.generate();

      await create_mints(mint_a);
      set_amm_state((p) => ({ ...p, mint_a: mint_a.publicKey }));
    } catch (err) {
    } finally {
      set_is_creating_mint_a(false);
    }
  };
  const [is_creating_mint_b, set_is_creating_mint_b] = useState(false);

  const create_mint_b = async () => {
    try {
      set_is_creating_mint_b(true);

      // TODO: Generate it from derive path too
      const mint_b = Keypair.generate();

      await create_mints(mint_b);
      set_amm_state((p) => ({ ...p, mint_b: mint_b.publicKey }));
    } catch (err) {
    } finally {
      set_is_creating_mint_b(false);
    }
  };

  return (
    <div className="border p-2">
      <h1 className="font-semibold text-lg text-center">Generate mints</h1>

      <Button isLoading={is_creating_mint_a} onClick={create_mint_a}>
        Create MintA
      </Button>
      <Button isLoading={is_creating_mint_b} onClick={create_mint_b}>
        Create MintB
      </Button>
      {/*Add Supply*/}
      {/*Show Supply and refresh supply*/}
    </div>
  );
};
