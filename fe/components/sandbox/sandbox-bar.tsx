"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { useSandbox } from "@/sandbox/store";
import { RPC_URL } from "@/sandbox/config";

export const SandboxBar = () => {
  const { sandbox, reset } = useSandbox();
  const [showSeed, setShowSeed] = useState(false);

  const onReset = () => {
    if (!confirm("Start over with a new mnemonic? The current sandbox keys are discarded.")) return;
    setShowSeed(false);
    reset();
  };

  return (
    <section className="border rounded-md p-3 flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span>{sandbox ? "Sandbox ready ✓" : "Preparing sandbox…"}</span>
        <span className="font-mono opacity-60">{RPC_URL}</span>
        <div className="ml-auto flex gap-2">
          <Button disabled={!sandbox} onClick={() => setShowSeed((s) => !s)}>
            {showSeed ? "Hide" : "Show"} seed phrase
          </Button>
          <Button disabled={!sandbox} onClick={onReset}>
            Reset sandbox
          </Button>
        </div>
      </div>
      {showSeed && sandbox && (
        <div className="border rounded-md p-2">
          <div className="text-red-600 font-medium">
            Sandbox only. Never send real funds to these keys.
          </div>
          <div className="font-mono">{sandbox.mnemonic}</div>
          <div className="opacity-60 text-xs">
            Derivation path m/44&apos;/501&apos;/i&apos;/0&apos;, the same as Phantom and Solflare.
          </div>
        </div>
      )}
    </section>
  );
};
