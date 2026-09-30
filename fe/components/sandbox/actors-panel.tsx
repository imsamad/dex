"use client";

// Every actor's SOL and token balances, and the pool's reserves. All numbers
// come from the latest snapshot in the store, which refreshes after each action.

import { useState } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Button } from "@/components/button";
import { TokenBadge } from "@/components/sandbox/token-badge";
import { useSandbox } from "@/sandbox/store";
import { ACTOR_LABELS, ACTORS } from "@/sandbox/keys";
import { TOKENS } from "@/sandbox/tokens";
import { DECIMALS, explorerUrl } from "@/sandbox/config";
import { formatUnits, shortAddress } from "@/sandbox/format";

const SOL_DECIMALS = Math.log10(LAMPORTS_PER_SOL);

export const ActorsPanel = () => {
  const { sandbox, snapshot, refresh } = useSandbox();
  const [refreshing, setRefreshing] = useState(false);

  if (!sandbox) {
    return <section className="border rounded-md p-3">Preparing sandbox…</section>;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const pool = snapshot?.pool;
  const hasReserves = !!pool?.a && !!pool?.b;

  return (
    <section className="border rounded-md p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Actors</h2>
        <Button isLoading={refreshing} onClick={onRefresh}>
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left opacity-60">
            <tr>
              <th className="py-1">Actor</th>
              <th>Address</th>
              <th className="text-right">SOL</th>
              <th className="text-right">
                <TokenBadge token="a" />
              </th>
              <th className="text-right">
                <TokenBadge token="b" />
              </th>
            </tr>
          </thead>
          <tbody>
            {ACTORS.map((id) => {
              const address = sandbox.actors[id].publicKey.toBase58();
              return (
                <tr key={id} className="border-t">
                  <td className="py-1">
                    <div className="font-medium">{ACTOR_LABELS[id].name}</div>
                    <div className="text-xs opacity-60">{ACTOR_LABELS[id].role}</div>
                  </td>
                  <td>
                    <a
                      className="underline font-mono"
                      target="_blank"
                      rel="noreferrer"
                      href={explorerUrl("address", address)}
                    >
                      {shortAddress(address)}
                    </a>
                  </td>
                  <td className="text-right font-mono">
                    {snapshot ? formatUnits(snapshot.sol[id], SOL_DECIMALS) : "…"}
                  </td>
                  <td className="text-right font-mono">
                    {snapshot ? formatUnits(snapshot.tokenA[id], DECIMALS) : "…"}
                  </td>
                  <td className="text-right font-mono">
                    {snapshot ? formatUnits(snapshot.tokenB[id], DECIMALS) : "…"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t pt-2 text-sm">
        <div className="font-medium">
          Pool {TOKENS.a.symbol}/{TOKENS.b.symbol}
        </div>
        {!pool || pool.a === null || pool.b === null ? (
          <div className="opacity-60">Not created yet</div>
        ) : (
          <div className="font-mono">
            reserves {formatUnits(pool.a, DECIMALS)} {TOKENS.a.symbol} /{" "}
            {formatUnits(pool.b, DECIMALS)} {TOKENS.b.symbol}
            {hasReserves && (
              <>
                {/* k is a product of two base-unit amounts, so it has 2 × DECIMALS */}
                {" · "}k = {formatUnits(pool.a! * pool.b!, 2 * DECIMALS, 0)}
                {" · "}1 {TOKENS.a.symbol} = {(Number(pool.b) / Number(pool.a)).toFixed(4)}{" "}
                {TOKENS.b.symbol}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
