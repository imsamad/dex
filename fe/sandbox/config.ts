import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

export const RPC_URL =
  process.env.NEXT_PUBLIC_VALIDATOR_URL || "http://localhost:8899";

// localStorage key for the sandbox mnemonic
export const STORAGE_KEY = "samdex:mnemonic";

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

export const explorerUrl = (kind: "tx" | "address", id: string) => {
  const cluster = RPC_URL.includes("devnet")
    ? "cluster=devnet"
    : `cluster=custom&customUrl=${encodeURIComponent(RPC_URL)}`;
  return `https://explorer.solana.com/${kind}/${id}?${cluster}`;
};
