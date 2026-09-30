"use client";

// One entry per action (step or custom swap): who signed, what changed, and
// either the transaction links or the program error with its logs.

import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useSandbox, type TxRecord } from "@/sandbox/store";
import { ACTOR_LABELS } from "@/sandbox/keys";
import { TOKENS } from "@/sandbox/tokens";
import { DECIMALS, explorerUrl } from "@/sandbox/config";
import { formatSigned, formatUnits, shortAddress } from "@/sandbox/format";

const SOL_DECIMALS = Math.log10(LAMPORTS_PER_SOL);
const zero = BigInt(0);

export const TxLog = () => {
  const { log } = useSandbox();

  return (
    <section className="border rounded-md p-3 flex flex-col gap-2">
      <h2 className="font-semibold text-lg">Transaction log</h2>
      {log.length === 0 ? (
        <div className="text-sm opacity-60">Run a step to see what it changed.</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {log.map((record) => (
            <TxEntry key={record.id} record={record} />
          ))}
        </ul>
      )}
    </section>
  );
};

const TxEntry = ({ record }: { record: TxRecord }) => {
  const { diff, error } = record;
  const pool = diff?.pool;
  const poolChanged =
    pool && (pool.before.a !== pool.after.a || pool.before.b !== pool.after.b);

  return (
    <li className={`border rounded-md p-2 text-sm ${error ? "border-red-500" : ""}`}>
      <div className="flex justify-between gap-2">
        <span className="font-medium">
          {error ? "✕" : "✓"} {record.title}
        </span>
        <span className="opacity-60">{new Date(record.at).toLocaleTimeString()}</span>
      </div>

      {error && (
        <div className="text-red-600">
          {error.message}
          {error.logs && error.logs.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer">Program logs</summary>
              <pre className="whitespace-pre-wrap">{error.logs.join("\n")}</pre>
            </details>
          )}
        </div>
      )}

      {diff && diff.actors.length > 0 && (
        <ul className="font-mono text-xs mt-1">
          {diff.actors.map((d) => (
            <li key={d.actor}>
              {ACTOR_LABELS[d.actor].name}:{" "}
              {[
                d.tokenA !== zero && `${formatSigned(d.tokenA, DECIMALS)} ${TOKENS.a.symbol}`,
                d.tokenB !== zero && `${formatSigned(d.tokenB, DECIMALS)} ${TOKENS.b.symbol}`,
                d.sol !== zero && `${formatSigned(d.sol, SOL_DECIMALS)} SOL`,
              ]
                .filter(Boolean)
                .join(", ")}
            </li>
          ))}
        </ul>
      )}

      {poolChanged && (
        <div className="font-mono text-xs">
          pool: {formatUnits(pool.before.a ?? zero, DECIMALS)}/
          {formatUnits(pool.before.b ?? zero, DECIMALS)} →{" "}
          {formatUnits(pool.after.a ?? zero, DECIMALS)}/
          {formatUnits(pool.after.b ?? zero, DECIMALS)}
        </div>
      )}

      {record.signatures.length > 0 && (
        <div className="text-xs flex flex-wrap gap-2 mt-1">
          {record.signatures.map((sig) => (
            <a
              key={sig}
              className="underline font-mono"
              target="_blank"
              rel="noreferrer"
              href={explorerUrl("tx", sig)}
            >
              {shortAddress(sig)}
            </a>
          ))}
        </div>
      )}
    </li>
  );
};
