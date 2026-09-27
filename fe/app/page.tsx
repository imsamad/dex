"use client";

import { Button } from "@/components/button";
import { useCtx } from "@/ctx/ctx";
import { BN } from "@anchor-lang/core";
import {
  Account,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintToChecked,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { useState } from "react";

// create two mints - having differenet authorities
// liq_pool_owner - supply tokens into these users token accounts
// init the pool with payer liq_pool_owner
// supply tokens into some two users token accounts
// execute swap for them

export const solanaDerivationPath = (accountIndex: number) =>
  `m/44'/501'/${accountIndex}'/0'`;

const decimals = 6;

export default function Home() {
  const { handleGenerateRootKeypair, keyPairs, connection, anchor_program } =
    useCtx();
  const [isAirdropping, setIsAirdropping] = useState(false);

  const [account_infos, set_account_infos] = useState<object>();
  const [retriving_account_infos, set_retriving_account_infos] =
    useState(false);

  const inspectBalances = async () => {
    try {
      set_retriving_account_infos(!false);
      const values = Object.entries(keyPairs);
      const account_info: any = {};
      for (let i = 0; i < 6; i++) {
        const accountInfo = await connection?.getAccountInfo(
          values[i][1].publicKey,
        );
        console.info("accountInfo: ", accountInfo);
        account_info[values[i][0]] = accountInfo!.lamports / LAMPORTS_PER_SOL;
      }
      set_account_infos(account_info);
    } catch (err) {
      console.error("account info: ", err);
    } finally {
      set_retriving_account_infos(false);
    }
  };
  const airdropFunder = async () => {
    try {
      setIsAirdropping(true);
      if (!connection) return;

      const values = Object.values(keyPairs!);
      const sign = await connection?.requestAirdrop(
        keyPairs!.funder.publicKey,
        values.length * 2 * LAMPORTS_PER_SOL,
      );
      await connection?.confirmTransaction(sign, "confirmed");
      const txn = new Transaction();

      for (let i = 1; i <= 5; i++) {
        const transfer_ixn = SystemProgram.transfer({
          toPubkey: values[i].publicKey,
          fromPubkey: keyPairs!.funder.publicKey,
          lamports: 2 * LAMPORTS_PER_SOL,
        });
        txn.add(transfer_ixn);
      }

      await sendAndConfirmTransaction(connection, txn, [keyPairs!.funder]);
    } catch (err) {
      console.log(err);
    } finally {
      setIsAirdropping(false);
    }
  };

  const [mintA, setMintA] = useState<PublicKey>();
  const [mintA_ATA, setMintA_ATA] = useState<Account>();
  const [mintB_ATA, setMintB_ATA] = useState<Account>();
  const [mintB, setMintB] = useState<PublicKey>();
  const [is_creating_mints, set_is_creating_mints] = useState(false);

  const createMints = async () => {
    try {
      alert("connection");
      if (!connection) return;
      alert("connection");
      set_is_creating_mints(true);
      const mint_a_pub_key = await createMint(
        connection,
        Keypair.fromSecretKey(keyPairs!.funder.secretKey),
        keyPairs!.mint1_authority.publicKey,
        keyPairs!.mint1_authority.publicKey,
        decimals,
      );
      setMintA(mint_a_pub_key);
      const mint_b_pub_key = await createMint(
        connection,
        Keypair.fromSecretKey(keyPairs!.funder.secretKey),
        keyPairs!.mint2_authority.publicKey,
        keyPairs!.mint2_authority.publicKey,
        decimals,
      );
      setMintB(mint_b_pub_key);
    } catch (err) {
      console.error("erring createMints: ", err);
    } finally {
      set_is_creating_mints(false);
    }
  };
  const [
    is_generating_supply_for_pool_authority,
    set_is_generating_supply_for_pool_authority,
  ] = useState(false);

  const generate_supply_for_pool_authority = async () => {
    try {
      if (!connection || !keyPairs || !mintA || !mintB) return;
      alert("generating supply!");
      set_is_generating_supply_for_pool_authority(!false);

      const mintA_ATA = await getOrCreateAssociatedTokenAccount(
        connection,
        keyPairs.mint1_authority,
        mintA,
        keyPairs.pool_owner.publicKey,
      );
      const mintB_ATA = await getOrCreateAssociatedTokenAccount(
        connection,
        keyPairs.mint2_authority,
        mintB,
        keyPairs.pool_owner.publicKey,
      );
      setMintA_ATA(mintA_ATA);
      await mintToChecked(
        connection,
        keyPairs.mint1_authority,
        mintA,
        mintA_ATA.address,
        keyPairs!.mint1_authority,
        100,
        decimals,
        [],
        {
          commitment: "confirmed",
        },
        TOKEN_PROGRAM_ID,
      );
      setMintB_ATA(mintB_ATA);
      await mintToChecked(
        connection,
        keyPairs!.mint2_authority,
        mintB,
        mintB_ATA.address,
        keyPairs!.mint2_authority,
        100,
        decimals,
        [],
        {
          commitment: "confirmed",
        },
        TOKEN_PROGRAM_ID,
      );
    } catch (err) {
      console.error("error while minting: ", err);
    } finally {
      set_is_generating_supply_for_pool_authority(false);
    }
  };
  const [initializing_pool, set_initializing_pool] = useState(false);

  const init_pool = async () => {
    try {
      if (!mintA || !mintB || !keyPairs?.pool_owner) {
        return;
      }
      set_initializing_pool(true);
      await anchor_program?.methods
        .initPool()
        .accounts({
          tokenAMint: mintA,
          tokenBMint: mintB,
          owner: keyPairs!.pool_owner.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([keyPairs.pool_owner])
        .rpc();
    } catch (err) {
      console.error("error in init pool: ", err);
    } finally {
      set_initializing_pool(false);
    }
  };

  const [is_adding_liquidty, set_is_adding_liquidity] = useState(false);

  const adding_liquidity = async () => {
    try {
      if (!mintA || !mintB || !mintA_ATA || !mintB_ATA || !keyPairs) return;

      set_is_adding_liquidity(true);
      const amountA = new BN(100);
      const amountB = new BN(100);
      await anchor_program?.methods
        .addLiquidity(amountA, amountB)
        .accounts({
          ownerAAta: mintA_ATA.address,
          ownerBAta: mintB_ATA.address,
          tokenAMint: mintA,
          tokenBMint: mintB,
          tokenProgram: TOKEN_PROGRAM_ID,
          owner: keyPairs?.pool_owner.publicKey,
        })
        .signers([keyPairs.pool_owner])
        .rpc();
    } catch (err) {
      console.error("error in adding liquidity: ", err);
    } finally {
      set_is_adding_liquidity(!true);
    }
  };
  const [is_minting_for_users, set_is_minting_for_users] = useState(false);
  const [user_a_mint_a_ata, set_user_a_mint_a_ata] = useState<Account>();
  const [user_b_mint_b_ata, set_user_b_mint_b_ata] = useState<Account>();
  const mint_for_users = async () => {
    try {
      if (!connection || !keyPairs || !mintA_ATA || !mintA || !mintB) {
        return;
      }

      set_is_minting_for_users(true);
      const user_a_mint_a_ata = await getOrCreateAssociatedTokenAccount(
        connection,
        keyPairs.mint1_authority,
        mintA,
        keyPairs.user_1.publicKey,
        false,
        "confirmed",
      );
      const user_b_mint_b_ata = await getOrCreateAssociatedTokenAccount(
        connection,
        keyPairs.mint2_authority,
        mintB,
        keyPairs.user_2.publicKey,
        false,
        "confirmed",
      );

      set_user_a_mint_a_ata(user_a_mint_a_ata);
      set_user_b_mint_b_ata(user_b_mint_b_ata);

      await mintToChecked(
        connection,
        keyPairs.mint1_authority,
        mintA,
        user_a_mint_a_ata.address,
        keyPairs.mint1_authority,
        100,
        decimals,
        [],
        {
          commitment: "confirmed",
        },
        TOKEN_PROGRAM_ID,
      );
      await mintToChecked(
        connection,
        keyPairs.mint2_authority,
        mintB,
        user_b_mint_b_ata.address,
        keyPairs.mint2_authority,
        100,
        decimals,
        [],
        {
          commitment: "confirmed",
        },
        TOKEN_PROGRAM_ID,
      );
    } catch (err) {
      console.error("mint_for_users: ", err);
    } finally {
      set_is_minting_for_users(false);
    }
  };
  const [is_swapping, set_is_swapping] = useState(false);
  const swapAtoB = async () => {
    if (!mintA || !mintB || !mintA_ATA || !mintB_ATA || !keyPairs) return;
    alert("swapping");
    try {
      set_is_swapping(true);
      const amountA = new BN(5);
      const amountB = new BN(4);
      await anchor_program?.methods
        .swapAB(amountA, amountB)
        .accounts({
          tokenAMint: mintA,
          tokenBMint: mintB,
          tokenProgram: TOKEN_PROGRAM_ID,
          user: keyPairs?.user_1.publicKey,
        })
        .signers([keyPairs.user_1])
        .rpc();
    } catch (err) {
      console.error("erroing in swapAtoB: ", err);
    } finally {
      set_is_swapping(false);
    }
  };
  return (
    <div className="flex justify-center pt-8 items-center flex-col gap-6">
      <div>Generate Mnemonic</div>
      <div>Connected: {connection ? "true" : "false"}</div>
      <Button
        onClick={handleGenerateRootKeypair}
        // disabled={!!mnemonic}
      >
        Lets do it!
      </Button>
      <Button onClick={airdropFunder}>
        {isAirdropping ? "Airdropping Funder..." : "Airdrop Funder!"}
      </Button>
      <Button onClick={inspectBalances}>
        {retriving_account_infos
          ? "retriving_account_infos..."
          : "retrive_account_infos! "}
      </Button>
      <pre>{JSON.stringify(account_infos, null, 2)}</pre>
      <Button onClick={createMints}>
        {is_creating_mints ? "creating mints..." : "createMints"}
      </Button>
      <Button onClick={generate_supply_for_pool_authority}>
        {is_generating_supply_for_pool_authority
          ? "generating supply for pool authority..."
          : "generate supply!"}
      </Button>
      <Button onClick={init_pool}>
        {initializing_pool ? "initialize pool..." : "init pool"}
      </Button>
      <Button onClick={adding_liquidity}>
        {is_adding_liquidty ? "adding liquidity..." : "add liquidity"}
      </Button>{" "}
      <Button onClick={mint_for_users}>
        {is_minting_for_users ? "mint users..." : "mint users"}
      </Button>
      <Button onClick={swapAtoB}>{is_swapping ? "swapping..." : "swap"}</Button>
    </div>
  );
}
