"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { Connection } from "@solana/web3.js";
import { generateMnemonic, validateMnemonic } from "bip39";
import type { Idl } from "@anchor-lang/core";
import idl from "../ctx/swap_idl.json";
import { RPC_URL, STORAGE_KEY } from "./config";
import { ACTOR_LABELS, deriveSandbox, type ActorId, type Sandbox } from "./keys";
import { makeStepContext, type StepContext } from "./program";
import { diffSnapshots, takeSnapshot, type Diff, type Snapshot } from "./snapshot";
import { STEP_BY_ID, STEPS, swapAToB, type StepId, type SwapParams } from "./steps";
import { describeError, type ErrorInfo } from "./errors";

export type StepStatus = "idle" | "running" | "done" | "failed";

export type TxRecord = {
  id: number;
  title: string;
  step?: StepId; // unset for free actions such as a custom swap
  signers: ActorId[];
  at: number;
  signatures: string[];
  diff?: Diff;
  error?: ErrorInfo;
};

type State = {
  sandbox?: Sandbox;
  snapshot?: Snapshot;
  steps: Record<StepId, StepStatus>;
  log: TxRecord[]; // newest first
};

type Action =
  | { type: "loaded"; sandbox: Sandbox }
  | { type: "synced"; snapshot: Snapshot }
  | { type: "step_started"; step: StepId }
  | { type: "finished"; record: TxRecord };

const idleSteps = () =>
  Object.fromEntries(STEPS.map((s) => [s.id, "idle"])) as Record<StepId, StepStatus>;

const initialState: State = { steps: idleSteps(), log: [] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loaded":
      // A new sandbox (first load or reset) starts from a clean slate.
      return { ...initialState, steps: idleSteps(), sandbox: action.sandbox };

    case "synced": {
      // Chain state is the source of truth for which steps are done,
      // but a running step keeps its status until it finishes.
      const steps = { ...state.steps };
      for (const step of STEPS) {
        if (steps[step.id] === "running") continue;
        if (step.isDone(action.snapshot)) steps[step.id] = "done";
        else if (steps[step.id] === "done") steps[step.id] = "idle";
      }
      return { ...state, snapshot: action.snapshot, steps };
    }

    case "step_started":
      return { ...state, steps: { ...state.steps, [action.step]: "running" } };

    case "finished": {
      const { record } = action;
      const steps = record.step
        ? { ...state.steps, [record.step]: record.error ? "failed" : "done" }
        : state.steps;
      return { ...state, steps, log: [record, ...state.log] };
    }
  }
}

function loadOrCreateMnemonic(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && validateMnemonic(saved)) return saved;
  } catch {}
  const mnemonic = generateMnemonic();
  try {
    localStorage.setItem(STORAGE_KEY, mnemonic);
  } catch {}
  return mnemonic;
}

type SandboxValue = State & {
  ctx?: StepContext;
  refresh: () => Promise<void>;
  runStep: (id: StepId) => Promise<boolean>;
  runSwap: (params: SwapParams) => Promise<boolean>;
  runAll: () => Promise<void>;
  reset: () => void;
};

const SandboxCtx = createContext<SandboxValue | null>(null);

let nextRecordId = 1;

export function SandboxProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const connection = useMemo(() => new Connection(RPC_URL, "confirmed"), []);
  const ctx = useMemo(
    () => state.sandbox && makeStepContext(connection, state.sandbox, idl as Idl),
    [connection, state.sandbox],
  );

  // localStorage only exists in the browser, so the sandbox loads after mount.
  useEffect(() => {
    dispatch({ type: "loaded", sandbox: deriveSandbox(loadOrCreateMnemonic()) });
  }, []);

  const refresh = useCallback(async () => {
    if (!ctx) return;
    dispatch({ type: "synced", snapshot: await takeSnapshot(ctx) });
  }, [ctx]);

  useEffect(() => {
    refresh().catch((err) => console.error("sandbox refresh failed", err));
  }, [refresh]);

  // Runs one action, and logs its signatures, error and balance diff.
  const execute = useCallback(
    async (
      meta: Pick<TxRecord, "title" | "signers" | "step">,
      run: (ctx: StepContext) => Promise<string[]>,
    ) => {
      if (!ctx) return false;
      if (meta.step) dispatch({ type: "step_started", step: meta.step });

      const before = await takeSnapshot(ctx).catch(() => undefined);
      const record: TxRecord = { ...meta, id: nextRecordId++, at: Date.now(), signatures: [] };
      try {
        record.signatures = await run(ctx);
      } catch (err) {
        record.error = describeError(err);
      }
      const after = await takeSnapshot(ctx).catch(() => undefined);
      if (before && after) record.diff = diffSnapshots(before, after);

      dispatch({ type: "finished", record });
      if (after) dispatch({ type: "synced", snapshot: after });
      return !record.error;
    },
    [ctx],
  );

  const runStep = useCallback(
    (id: StepId) => {
      const step = STEP_BY_ID[id];
      return execute({ title: step.title, signers: step.signers, step: id }, step.run);
    },
    [execute],
  );

  const runSwap = useCallback(
    (params: SwapParams) =>
      execute(
        { title: `Swap by ${ACTOR_LABELS[params.trader].name}`, signers: [params.trader] },
        (ctx) => swapAToB(ctx, params),
      ),
    [execute],
  );

  // Runs every step that is not done yet, in order, and stops at the first failure.
  const runAll = useCallback(async () => {
    if (!ctx) return;
    const snapshot = await takeSnapshot(ctx);
    for (const step of STEPS) {
      if (step.isDone(snapshot)) continue;
      if (!(await runStep(step.id))) return;
    }
  }, [ctx, runStep]);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    dispatch({ type: "loaded", sandbox: deriveSandbox(loadOrCreateMnemonic()) });
  }, []);

  const value = useMemo(
    () => ({ ...state, ctx, refresh, runStep, runSwap, runAll, reset }),
    [state, ctx, refresh, runStep, runSwap, runAll, reset],
  );

  return <SandboxCtx value={value}>{children}</SandboxCtx>;
}

export function useSandbox() {
  const value = useContext(SandboxCtx);
  if (!value) throw new Error("useSandbox must be used inside <SandboxProvider>");
  return value;
}
