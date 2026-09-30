"use client";

import Image from "next/image";
import { useSandbox } from "@/sandbox/store";
import { TOKENS } from "@/sandbox/tokens";
import { ACTOR_LABELS, ACTORS } from "@/sandbox/keys";
import { DECIMALS, explorerUrl } from "@/sandbox/config";
import { formatUnits, shortAddress } from "@/sandbox/format";

export const TokensPanel = () => {
  const { sandbox, snapshot } = useSandbox();
  if (!sandbox) return null;

  const actorName = (address: string | null) => {
    if (!address) return "none (fixed supply)";
    const id = ACTORS.find((a) => sandbox.actors[a].publicKey.toBase58() === address);
    return id ? ACTOR_LABELS[id].name : shortAddress(address);
  };

  return (
    <section className="border rounded-md p-3 flex flex-col gap-3">
      <h2 className="font-semibold text-lg">Tokens</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["a", "b"] as const).map((key) => {
          const mint = snapshot?.mints[key];
          const address = sandbox.mints[key].publicKey.toBase58();
          const inPool = snapshot?.pool[key];
          const description = mint?.metadata?.additionalMetadata.find(
            ([field]) => field === "description",
          )?.[1];

          return (
            <div key={key} className="border rounded-md p-2 flex gap-3 text-sm">
              <Image
                src={TOKENS[key].image}
                alt={`${TOKENS[key].name} logo`}
                width={48}
                height={48}
                className={`rounded-full h-12 w-12 ${mint ? "" : "grayscale opacity-50"}`}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  {mint?.metadata?.name ?? TOKENS[key].name}{" "}
                  <span className="opacity-60">
                    {mint?.metadata?.symbol ?? TOKENS[key].symbol}
                  </span>
                </div>
                {!mint ? (
                  <div className="opacity-60">Not created yet</div>
                ) : (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-xs">
                    {description && (
                      <dd className="col-span-2 opacity-75 mb-1">{description}</dd>
                    )}
                    <dt className="opacity-60">Supply</dt>
                    <dd className="font-mono">{formatUnits(mint.supply, mint.decimals)}</dd>
                    <dt className="opacity-60">In pool</dt>
                    <dd className="font-mono">
                      {inPool == null ? "–" : formatUnits(inPool, DECIMALS)}
                    </dd>
                    <dt className="opacity-60">Decimals</dt>
                    <dd className="font-mono">{mint.decimals}</dd>
                    <dt className="opacity-60">Mint authority</dt>
                    <dd>{actorName(mint.mintAuthority)}</dd>
                    <dt className="opacity-60">Mint</dt>
                    <dd>
                      <a
                        className="underline font-mono"
                        target="_blank"
                        rel="noreferrer"
                        href={explorerUrl("address", address)}
                      >
                        {shortAddress(address)}
                      </a>{" "}
                      <span className="opacity-60">Token-2022</span>
                    </dd>
                  </dl>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
