// Every tunable number of the sandbox in one place: network, token settings
// and the amounts the guided steps use.

import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

export const RPC_URL =
  process.env.NEXT_PUBLIC_VALIDATOR_URL || "http://localhost:8899";

// localStorage key for the sandbox mnemonic
export const STORAGE_KEY = "samdex:mnemonic";

// Both mints use Token-2022 so they can carry on-chain metadata. The swap
// program accepts either token program through Anchor's token_interface.
export const TOKEN_PROGRAM = TOKEN_2022_PROGRAM_ID;
export const DECIMALS = 6;

// Kept small so the whole sandbox fits in one devnet airdrop.
export const LAMPORTS_PER_ACTOR = 0.25 * LAMPORTS_PER_SOL;
export const FUNDER_FEE_BUFFER = 0.01 * LAMPORTS_PER_SOL;

// Amounts in whole tokens
export const LP_SUPPLY = 1000;
export const TRADER_SUPPLY = 100;
export const LP_DEPOSIT = 1000;
export const SWAP_AMOUNT = 10;
export const SLIPPAGE_BPS = 100; // 1%

// Solana Explorer can show a local validator too ("custom" cluster).
export const explorerUrl = (kind: "tx" | "address", id: string) => {
  const cluster = RPC_URL.includes("devnet")
    ? "cluster=devnet"
    : `cluster=custom&customUrl=${encodeURIComponent(RPC_URL)}`;
  return `https://explorer.solana.com/${kind}/${id}?${cluster}`;
};
