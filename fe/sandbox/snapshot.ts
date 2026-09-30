import { PublicKey } from "@solana/web3.js";
import {
  ExtensionType,
  getExtensionData,
  unpackAccount,
  unpackMint,
} from "@solana/spl-token";
import { unpack as unpackMetadata } from "@solana/spl-token-metadata";
import { ACTORS, type ActorId } from "./keys";
import { ataAddress, vaultAddress, type StepContext } from "./program";
import { TOKEN_PROGRAM } from "./config";

type PerActor = Record<ActorId, bigint>;

export type MintInfo = {
  supply: bigint;
  decimals: number;
  mintAuthority: string | null;
  // Read from the Token-2022 metadata extension on the mint account
  metadata?: {
    name: string;
    symbol: string;
    uri: string;
    additionalMetadata: (readonly [string, string])[];
  };
};

export type Snapshot = {
  sol: PerActor; // lamports
  tokenA: PerActor; // base units
  tokenB: PerActor;
  // null means the mint account does not exist yet
  mints: { a: MintInfo | null; b: MintInfo | null };
  // null means the vault account does not exist yet (pool not initialised)
  pool: { a: bigint | null; b: bigint | null };
};

export type ActorDiff = { actor: ActorId; sol: bigint; tokenA: bigint; tokenB: bigint };

export type Diff = {
  actors: ActorDiff[];
  pool: { before: Snapshot["pool"]; after: Snapshot["pool"] };
};

const perActor = (values: bigint[]) =>
  Object.fromEntries(ACTORS.map((id, i) => [id, values[i]])) as PerActor;

// Reads every balance the UI shows in a single RPC call.
export async function takeSnapshot(ctx: StepContext): Promise<Snapshot> {
  const { actors, mints } = ctx.sandbox;
  const owners = ACTORS.map((id) => actors[id].publicKey);
  const vaultA = vaultAddress(ctx.programId, mints.a.publicKey);
  const vaultB = vaultAddress(ctx.programId, mints.b.publicKey);

  const addresses: PublicKey[] = [
    ...owners,
    ...owners.map((o) => ataAddress(mints.a.publicKey, o)),
    ...owners.map((o) => ataAddress(mints.b.publicKey, o)),
    mints.a.publicKey,
    mints.b.publicKey,
    vaultA,
    vaultB,
  ];
  const infos = await ctx.connection.getMultipleAccountsInfo(addresses);

  const tokenAmount = (i: number): bigint | null => {
    const info = infos[i];
    if (!info) return null;
    try {
      return unpackAccount(addresses[i], info, TOKEN_PROGRAM).amount;
    } catch {
      return null;
    }
  };

  const mintInfo = (i: number): MintInfo | null => {
    const info = infos[i];
    if (!info) return null;
    try {
      const mint = unpackMint(addresses[i], info, TOKEN_PROGRAM);
      const data = getExtensionData(ExtensionType.TokenMetadata, mint.tlvData);
      const metadata = data ? unpackMetadata(data) : undefined;
      return {
        supply: mint.supply,
        decimals: mint.decimals,
        mintAuthority: mint.mintAuthority?.toBase58() ?? null,
        metadata: metadata && {
          name: metadata.name,
          symbol: metadata.symbol,
          uri: metadata.uri,
          additionalMetadata: metadata.additionalMetadata,
        },
      };
    } catch {
      return null;
    }
  };

  const n = ACTORS.length;
  const range = (start: number) => Array.from({ length: n }, (_, i) => start + i);

  return {
    sol: perActor(range(0).map((i) => BigInt(infos[i]?.lamports ?? 0))),
    tokenA: perActor(range(n).map((i) => tokenAmount(i) ?? BigInt(0))),
    tokenB: perActor(range(2 * n).map((i) => tokenAmount(i) ?? BigInt(0))),
    mints: { a: mintInfo(3 * n), b: mintInfo(3 * n + 1) },
    pool: { a: tokenAmount(3 * n + 2), b: tokenAmount(3 * n + 3) },
  };
}

export function diffSnapshots(before: Snapshot, after: Snapshot): Diff {
  const zero = BigInt(0);
  const actors = ACTORS.map((actor) => ({
    actor,
    sol: after.sol[actor] - before.sol[actor],
    tokenA: after.tokenA[actor] - before.tokenA[actor],
    tokenB: after.tokenB[actor] - before.tokenB[actor],
  })).filter((d) => d.sol !== zero || d.tokenA !== zero || d.tokenB !== zero);

  return { actors, pool: { before: before.pool, after: after.pool } };
}
