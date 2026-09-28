"use client";

import { useCtx } from "@/ctx/ctx";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { Button } from "./button";

export const GenerateKeypairs = () => {
  const { amm_state } = useCtx();
  return (
    <div className="border p-2">
      <h1 className="font-semibold text-lg text-center">Keypairs</h1>
      <p>
        Keypairs for all actors needed to interact with the AMM program(except
        `Funder`).
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        {amm_state.funder && (
          <AccountInfoPill keypair={amm_state.funder} label="Funder" />
        )}
        {amm_state.mint_a_authority && (
          <AccountInfoPill
            keypair={amm_state.mint_a_authority}
            label="Mint A Authority"
          />
        )}
        {amm_state.mint_b_authority && (
          <AccountInfoPill
            keypair={amm_state.mint_b_authority}
            label="Mint B Authority"
          />
        )}
        {amm_state.pool_authority && (
          <AccountInfoPill
            keypair={amm_state.pool_authority}
            label="Pool Authority"
          />
        )}
        {amm_state.users_n_atas?.map((u, i) => (
          <AccountInfoPill
            keypair={u.keypair}
            key={`User ${i}`}
            label={`User ${i}`}
          />
        ))}
        {amm_state.pool_authority && <AccountInfoPill keypair={amm_state.pool_authority} label="Pool Authority" />}
      </div>
    </div>
  );
};

const AccountInfoPill = ({
  keypair,
  label,
}: {
  keypair: Keypair;
  label: string;
}) => {
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const { amm_state } = useCtx();
  const [balance, setBalance] = useState(0);
  const fetch_account_balance = async () => {
    try {
      setIsLoadingBalance(true);
      const account_balance = await amm_state.connection?.getBalance(keypair.publicKey,"confirmed");
      setBalance((account_balance || 0) / LAMPORTS_PER_SOL);
    } catch (err) {
      console.error(
        "Error occured while fetching balance of account: ",
        label,
        " with address",
        keypair.publicKey,
      );
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    fetch_account_balance().finally(() => {});
  }, []);
  return (
    <div>
      <h2>{label}</h2>
      <p>
        Pub Key:
        <a
          target="_blank"
          href={`https://explorer.solana.com/address/${keypair.publicKey}?cluster=custom`}
        >
          {keypair.publicKey.toBase58()}
        </a>
      </p>
      <p>Pvt Key: {keypair.secretKey}</p>
      <p>
        Balance: {isLoadingBalance ? "Fetching..." : balance}{" "}

      </p>
      <AirdropBtn pubKey={keypair.publicKey} />
      <Button
        isLoading={isLoadingBalance}
        onClick={fetch_account_balance}
        className="text-blue-600 ml-2 underline italic p-2"
      >
        Refresh Balance
      </Button>
    </div>
  );
};

const AirdropBtn = ({ pubKey }: { pubKey: PublicKey }) => {
  const [is_aidropping, set_is_airdropping] = useState(false);
  const { amm_state } = useCtx();
  const airdrop = async () => {
    console.log("connection: ",amm_state.connection)
    if (!amm_state.connection) {
      alert("Connection not established with validator!");
      return;
    }
    try {
      set_is_airdropping(true);
      const airdrop_sign = await amm_state.connection?.requestAirdrop(
        pubKey,
        1 * LAMPORTS_PER_SOL,
      );
      await amm_state.connection?.confirmTransaction(airdrop_sign, "confirmed");
    } catch (err) {
      console.error(
        "Error occured while airdropping account with address",
        pubKey,
      );
    } finally {
      set_is_airdropping(false);
    }
  };

  return (
    <Button isLoading={is_aidropping} onClick={airdrop}>
      Airdrop 1 Sol
    </Button>
  );
};
