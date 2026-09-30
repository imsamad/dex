"use client";

// Free-form swap: any actor, any amount, any slippage. The quote is recomputed
// on every render from the pool reserves in the snapshot, so nothing is fetched
// while typing.

import { useState } from "react";
import { Button } from "@/components/button";
import { TokenBadge } from "@/components/sandbox/token-badge";
import { useSandbox } from "@/sandbox/store";
import { ACTOR_LABELS, ACTORS, type ActorId } from "@/sandbox/keys";
import { quoteOut, withSlippage } from "@/sandbox/amm";
import { DECIMALS, SLIPPAGE_BPS } from "@/sandbox/config";
import { TOKENS } from "@/sandbox/tokens";
import { formatUnits, parseUnits } from "@/sandbox/format";

const SLIPPAGE_OPTIONS = [10, 50, 100, 500]; // bps
// The faucet is excluded: its only job is funding the other actors.
const TRADERS = ACTORS.filter((id) => id !== "funder");
const A = TOKENS.a.symbol;
const B = TOKENS.b.symbol;

export const SwapPanel = () => {
  const { snapshot, runSwap } = useSandbox();
  const [trader, setTrader] = useState<ActorId>("trader_1");
  const [amount, setAmount] = useState("10");
  const [slippageBps, setSlippageBps] = useState(SLIPPAGE_BPS);
  const [swapping, setSwapping] = useState(false);

  const reserveA = snapshot?.pool.a ?? null;
  const reserveB = snapshot?.pool.b ?? null;
  const poolReady = !!reserveA && !!reserveB;
  const amountIn = parseUnits(amount, DECIMALS);
  const balance = snapshot?.tokenA[trader] ?? BigInt(0);

  const quote = poolReady && amountIn ? quoteOut(reserveA, reserveB, amountIn) : null;
  const minOut = quote !== null ? withSlippage(quote, slippageBps) : null;
  // Spot price: what an infinitely small trade would get. Execution price: what
  // this trade gets on average. Price impact is how much worse the second is,
  // and it grows with the trade's size relative to the reserves.
  // (Number is fine here: these are only for display.)
  const spotPrice = poolReady ? Number(reserveB) / Number(reserveA) : null;
  const executionPrice = quote !== null && amountIn ? Number(quote) / Number(amountIn) : null;
  const priceImpact =
    spotPrice && executionPrice !== null ? (1 - executionPrice / spotPrice) * 100 : null;

  const onSwap = async () => {
    if (!amountIn || minOut === null) return;
    setSwapping(true);
    try {
      await runSwap({ trader, amountIn, minOut });
    } finally {
      setSwapping(false);
    }
  };

  return (
    <section className="border rounded-md p-3 flex flex-col gap-3 text-sm">
      <div>
        <h2 className="font-semibold text-lg">Swap</h2>
        <p className="opacity-60 text-xs">
          Any actor can trade. Pick one without <TokenBadge token="a" /> to see the program
          reject it. The program only supports this direction for now.
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="opacity-60">Trader</span>
        <select
          className="border rounded-md p-2 bg-transparent"
          value={trader}
          onChange={(e) => setTrader(e.target.value as ActorId)}
        >
          {TRADERS.map((id) => (
            <option key={id} value={id}>
              {ACTOR_LABELS[id].name}: {formatUnits(snapshot?.tokenA[id] ?? BigInt(0), DECIMALS)}{" "}
              {A}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="flex justify-between opacity-60">
          <span>You pay</span>
          <button
            type="button"
            className="underline"
            onClick={() => setAmount(formatUnits(balance, DECIMALS, DECIMALS))}
          >
            Max {formatUnits(balance, DECIMALS)}
          </button>
        </span>
        <div className="flex items-center border rounded-md p-2 gap-2">
          <input
            className="flex-1 bg-transparent outline-none font-mono"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
          />
          <TokenBadge token="a" size={20} />
        </div>
      </label>

      <div className="flex flex-col gap-1">
        <span className="opacity-60">You receive (estimated)</span>
        <div className="flex items-center border rounded-md p-2 gap-2">
          <span className="flex-1 font-mono">
            {quote !== null ? formatUnits(quote, DECIMALS, DECIMALS) : "–"}
          </span>
          <TokenBadge token="b" size={20} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="opacity-60">Slippage</span>
        {SLIPPAGE_OPTIONS.map((bps) => (
          <button
            key={bps}
            type="button"
            className={`border rounded-md px-2 py-1 ${bps === slippageBps ? "bg-sky-400" : ""}`}
            onClick={() => setSlippageBps(bps)}
          >
            {bps / 100}%
          </button>
        ))}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-xs font-mono">
        <dt className="opacity-60 font-sans">Spot price</dt>
        <dd>{spotPrice !== null ? `1 ${A} = ${spotPrice.toFixed(6)} ${B}` : "–"}</dd>
        <dt className="opacity-60 font-sans">Your price</dt>
        <dd>{executionPrice !== null ? `1 ${A} = ${executionPrice.toFixed(6)} ${B}` : "–"}</dd>
        <dt className="opacity-60 font-sans">Price impact</dt>
        <dd className={priceImpact !== null && priceImpact > 5 ? "text-red-600" : ""}>
          {priceImpact !== null ? `${priceImpact.toFixed(2)}%` : "–"}
        </dd>
        <dt className="opacity-60 font-sans">Minimum received</dt>
        <dd>{minOut !== null ? `${formatUnits(minOut, DECIMALS, DECIMALS)} ${B}` : "–"}</dd>
      </dl>

      {!poolReady && <div className="text-xs opacity-60">The pool has no liquidity yet.</div>}
      {amount && !amountIn && <div className="text-xs text-red-600">Enter a valid amount.</div>}
      {amountIn && amountIn > balance && (
        <div className="text-xs text-red-600">
          {ACTOR_LABELS[trader].name} only has {formatUnits(balance, DECIMALS)} {A}. You can
          still send it and watch the program reject it.
        </div>
      )}

      <Button
        isLoading={swapping}
        disabled={!poolReady || !amountIn || minOut === null}
        onClick={onSwap}
      >
        Swap
      </Button>
    </section>
  );
};
