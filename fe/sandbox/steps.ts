import {
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createMintToCheckedInstruction,
  ExtensionType,
  getMintLen,
  LENGTH_SIZE,
  TYPE_SIZE,
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  pack,
  type TokenMetadata,
} from "@solana/spl-token-metadata";
import { BN } from "@anchor-lang/core";
import { TOKENS } from "./tokens";
import { ACTORS, type ActorId } from "./keys";
import { ataAddress, vaultAddress, type StepContext } from "./program";
import type { Snapshot } from "./snapshot";
import { quoteOut, toBaseUnits, withSlippage } from "./amm";
import {
  DECIMALS,
  FUNDER_FEE_BUFFER,
  LAMPORTS_PER_ACTOR,
  LP_DEPOSIT,
  LP_SUPPLY,
  SLIPPAGE_BPS,
  SWAP_AMOUNT,
  TOKEN_PROGRAM,
  TRADER_SUPPLY,
} from "./config";

export type StepId =
  | "fund"
  | "create_mint_a"
  | "create_mint_b"
  | "mint_supply"
  | "init_pool"
  | "add_liquidity"
  | "swap";

export type Step = {
  id: StepId;
  title: string;
  description: string;
  signers: ActorId[];
  // Returns the signatures of the transactions it sent.
  run: (ctx: StepContext) => Promise<string[]>;
  // Lets the UI restore progress from chain state after a refresh.
  isDone: (s: Snapshot) => boolean;
};

const bn = (v: bigint) => new BN(v.toString());
const units = (tokens: number) => toBaseUnits(tokens, DECIMALS);

async function fund({ connection, sandbox }: StepContext) {
  const { funder } = sandbox.actors;
  const recipients = ACTORS.filter((id) => id !== "funder").map(
    (id) => sandbox.actors[id].publicKey,
  );
  const balances = await connection.getMultipleAccountsInfo(recipients);
  const topUps = recipients
    .map((pubkey, i) => ({
      pubkey,
      lamports: LAMPORTS_PER_ACTOR - (balances[i]?.lamports ?? 0),
    }))
    .filter((t) => t.lamports > 0);
  if (topUps.length === 0) return [];

  const signatures: string[] = [];
  const needed =
    topUps.reduce((sum, t) => sum + t.lamports, 0) + FUNDER_FEE_BUFFER;
  const funderBalance = await connection.getBalance(funder.publicKey);
  if (funderBalance < needed) {
    const sig = await connection.requestAirdrop(
      funder.publicKey,
      needed - funderBalance,
    );
    await connection.confirmTransaction(
      { signature: sig, ...(await connection.getLatestBlockhash()) },
      "confirmed",
    );
    signatures.push(sig);
  }

  const tx = new Transaction().add(
    ...topUps.map((t) =>
      SystemProgram.transfer({
        fromPubkey: funder.publicKey,
        toPubkey: t.pubkey,
        lamports: t.lamports,
      }),
    ),
  );
  signatures.push(await sendAndConfirmTransaction(connection, tx, [funder]));
  return signatures;
}

// Token-2022 mint with the metadata stored on the mint account itself.
async function createMint(ctx: StepContext, which: "a" | "b") {
  const { connection, sandbox } = ctx;
  const mint = sandbox.mints[which];
  const issuer = sandbox.actors[which === "a" ? "issuer_a" : "issuer_b"];
  const token = TOKENS[which];

  const metadata: TokenMetadata = {
    mint: mint.publicKey,
    updateAuthority: issuer.publicKey,
    name: token.name,
    symbol: token.symbol,
    uri: token.uri,
    additionalMetadata: [["description", token.description]],
  };

  // The account is created with room for the mint + extensions only; the
  // metadata instructions grow it, so the lamports must already cover both.
  const mintLen = getMintLen([ExtensionType.MetadataPointer]);
  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
  const lamports = await connection.getMinimumBalanceForRentExemption(
    mintLen + metadataLen,
  );

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: issuer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_PROGRAM,
    }),
    createInitializeMetadataPointerInstruction(
      mint.publicKey,
      issuer.publicKey,
      mint.publicKey,
      TOKEN_PROGRAM,
    ),
    createInitializeMintInstruction(
      mint.publicKey,
      DECIMALS,
      issuer.publicKey,
      issuer.publicKey,
      TOKEN_PROGRAM,
    ),
    createInitializeInstruction({
      programId: TOKEN_PROGRAM,
      metadata: mint.publicKey,
      updateAuthority: issuer.publicKey,
      mint: mint.publicKey,
      mintAuthority: issuer.publicKey,
      name: token.name,
      symbol: token.symbol,
      uri: token.uri,
    }),
    createUpdateFieldInstruction({
      programId: TOKEN_PROGRAM,
      metadata: mint.publicKey,
      updateAuthority: issuer.publicKey,
      field: "description",
      value: token.description,
    }),
  );
  return [await sendAndConfirmTransaction(connection, tx, [issuer, mint])];
}

// Each issuer creates the recipients' ATAs and mints to them in one tx.
async function mintSupply({ connection, sandbox }: StepContext) {
  const { actors, mints } = sandbox;
  const plans: {
    issuer: ActorId;
    mint: PublicKey;
    to: [ActorId, number][];
  }[] = [
    {
      issuer: "issuer_a",
      mint: mints.a.publicKey,
      to: [
        ["lp", LP_SUPPLY],
        ["trader_1", TRADER_SUPPLY],
      ],
    },
    {
      issuer: "issuer_b",
      mint: mints.b.publicKey,
      to: [
        ["lp", LP_SUPPLY],
        ["trader_2", TRADER_SUPPLY],
      ],
    },
  ];

  return Promise.all(
    plans.map(({ issuer, mint, to }) => {
      const authority = actors[issuer];
      const tx = new Transaction();
      for (const [actor, amount] of to) {
        const owner = actors[actor].publicKey;
        const ata = ataAddress(mint, owner);
        tx.add(
          createAssociatedTokenAccountIdempotentInstruction(
            authority.publicKey,
            ata,
            owner,
            mint,
            TOKEN_PROGRAM,
          ),
          createMintToCheckedInstruction(
            mint,
            ata,
            authority.publicKey,
            units(amount),
            DECIMALS,
            [],
            TOKEN_PROGRAM,
          ),
        );
      }
      return sendAndConfirmTransaction(connection, tx, [authority]);
    }),
  );
}

async function initPool({ sandbox, programFor }: StepContext) {
  const creator = sandbox.actors.pool_creator;
  const sig = await programFor(creator)
    .methods.initPool()
    .accounts({
      owner: creator.publicKey,
      tokenAMint: sandbox.mints.a.publicKey,
      tokenBMint: sandbox.mints.b.publicKey,
      tokenProgram: TOKEN_PROGRAM,
    })
    .rpc();
  return [sig];
}

async function addLiquidity({ sandbox, programFor }: StepContext) {
  const lp = sandbox.actors.lp;
  const { a, b } = sandbox.mints;
  const sig = await programFor(lp)
    .methods.addLiquidity(bn(units(LP_DEPOSIT)), bn(units(LP_DEPOSIT)))
    .accounts({
      owner: lp.publicKey,
      ownerAAta: ataAddress(a.publicKey, lp.publicKey),
      ownerBAta: ataAddress(b.publicKey, lp.publicKey),
      tokenAMint: a.publicKey,
      tokenBMint: b.publicKey,
      tokenProgram: TOKEN_PROGRAM,
    })
    .rpc();
  return [sig];
}

export type SwapParams = { trader: ActorId; amountIn: bigint; minOut: bigint };

export async function getReserves({ connection, sandbox, programId }: StepContext) {
  const { a, b } = sandbox.mints;
  const [vaultA, vaultB] = await Promise.all([
    connection.getTokenAccountBalance(vaultAddress(programId, a.publicKey)),
    connection.getTokenAccountBalance(vaultAddress(programId, b.publicKey)),
  ]);
  return { a: BigInt(vaultA.value.amount), b: BigInt(vaultB.value.amount) };
}

export async function swapAToB(
  { sandbox, programFor }: StepContext,
  { trader, amountIn, minOut }: SwapParams,
) {
  const user = sandbox.actors[trader];
  const sig = await programFor(user)
    .methods.swapAB(bn(amountIn), bn(minOut))
    .accounts({
      user: user.publicKey,
      tokenAMint: sandbox.mints.a.publicKey,
      tokenBMint: sandbox.mints.b.publicKey,
      tokenProgram: TOKEN_PROGRAM,
    })
    .rpc();
  return [sig];
}

// The guided step: a fixed amount, with min output from a fresh quote.
async function guidedSwap(ctx: StepContext) {
  const reserves = await getReserves(ctx);
  const amountIn = units(SWAP_AMOUNT);
  const minOut = withSlippage(quoteOut(reserves.a, reserves.b, amountIn), SLIPPAGE_BPS);
  return swapAToB(ctx, { trader: "trader_1", amountIn, minOut });
}

const zero = BigInt(0);

export const STEPS: Step[] = [
  {
    id: "fund",
    title: "Fund the actors",
    description:
      "One airdrop to the faucet, then a single transaction sends SOL to every other actor.",
    signers: ["funder"],
    run: fund,
    isDone: (s) =>
      ACTORS.every((id) => id === "funder" || s.sol[id] > zero),
  },
  {
    id: "create_mint_a",
    title: `Create ${TOKENS.a.symbol}`,
    description: `Token-2022 mint with on-chain metadata (name, symbol, uri, description).`,
    signers: ["issuer_a"],
    run: (ctx) => createMint(ctx, "a"),
    isDone: (s) => s.mints.a !== null,
  },
  {
    id: "create_mint_b",
    title: `Create ${TOKENS.b.symbol}`,
    description: `Same as above, issued by a different authority.`,
    signers: ["issuer_b"],
    run: (ctx) => createMint(ctx, "b"),
    isDone: (s) => s.mints.b !== null,
  },
  {
    id: "mint_supply",
    title: "Mint supply",
    description: `Both issuers mint to the LP (${LP_SUPPLY} each) and to the traders (${TRADER_SUPPLY}).`,
    signers: ["issuer_a", "issuer_b"],
    run: mintSupply,
    isDone: (s) => s.tokenB.trader_2 > zero,
  },
  {
    id: "init_pool",
    title: "Create the pool",
    description: "Creates the two vault token accounts (PDAs) that hold the reserves.",
    signers: ["pool_creator"],
    run: initPool,
    isDone: (s) => s.pool.a !== null,
  },
  {
    id: "add_liquidity",
    title: "Add liquidity",
    description: `The LP deposits ${LP_DEPOSIT} ${TOKENS.a.symbol} + ${LP_DEPOSIT} ${TOKENS.b.symbol}.`,
    signers: ["lp"],
    run: addLiquidity,
    isDone: (s) => (s.pool.a ?? zero) > zero,
  },
  {
    id: "swap",
    title: `Swap ${TOKENS.a.symbol} → ${TOKENS.b.symbol}`,
    description: `The trader swaps ${SWAP_AMOUNT} ${TOKENS.a.symbol}, with min output from a quote minus ${SLIPPAGE_BPS / 100}% slippage.`,
    signers: ["trader_1"],
    run: guidedSwap,
    isDone: (s) => s.tokenB.trader_1 > zero,
  },
];

export const STEP_BY_ID = Object.fromEntries(STEPS.map((s) => [s.id, s])) as Record<
  StepId,
  Step
>;
