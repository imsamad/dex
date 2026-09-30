"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { useSandbox, type StepStatus } from "@/sandbox/store";
import { STEPS } from "@/sandbox/steps";
import { ACTOR_LABELS } from "@/sandbox/keys";

const ICON: Record<StepStatus, string> = {
  idle: "○",
  running: "◌",
  done: "✓",
  failed: "✕",
};

export const StepsPanel = () => {
  const { ctx, steps, runStep, runAll } = useSandbox();
  const [runningAll, setRunningAll] = useState(false);
  const busy = runningAll || Object.values(steps).includes("running");

  const onRunAll = async () => {
    setRunningAll(true);
    try {
      await runAll();
    } finally {
      setRunningAll(false);
    }
  };

  return (
    <section className="border rounded-md p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Steps</h2>
        <Button isLoading={runningAll} disabled={!ctx || busy} onClick={onRunAll}>
          Run all
        </Button>
      </div>

      <ol className="flex flex-col gap-2">
        {STEPS.map((step, i) => {
          const status = steps[step.id];
          const unlocked = i === 0 || steps[STEPS[i - 1].id] === "done";
          return (
            <li key={step.id} className="flex items-start gap-3 border rounded-md p-2">
              <span className="w-5 text-center" aria-label={status}>
                {ICON[status]}
              </span>
              <div className="flex-1">
                <div className="font-medium">
                  {i + 1}. {step.title}
                </div>
                <div className="text-sm opacity-75">{step.description}</div>
                <div className="text-xs opacity-60">
                  Signed by {step.signers.map((a) => ACTOR_LABELS[a].name).join(" + ")}
                </div>
              </div>
              <Button
                isLoading={status === "running"}
                disabled={!ctx || busy || !unlocked || status === "done"}
                onClick={() => runStep(step.id)}
              >
                {status === "failed" ? "Retry" : "Run"}
              </Button>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
