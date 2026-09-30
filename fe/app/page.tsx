import { ActorsPanel } from "@/components/sandbox/actors-panel";
import { Intro } from "@/components/sandbox/intro";
import { SandboxBar } from "@/components/sandbox/sandbox-bar";
import { StepsPanel } from "@/components/sandbox/steps-panel";
import { SwapPanel } from "@/components/sandbox/swap-panel";
import { TokensPanel } from "@/components/sandbox/tokens-panel";
import { TxLog } from "@/components/sandbox/tx-log";

export default function Home() {
  return (
    <div className="flex flex-col gap-4 max-w-6xl mx-auto w-full">
      <Intro />
      <SandboxBar />
      <div className="grid gap-4 md:grid-cols-2 items-start">
        <div className="flex flex-col gap-4">
          <StepsPanel />
          <SwapPanel />
        </div>
        <div className="flex flex-col gap-4">
          <TokensPanel />
          <ActorsPanel />
          <TxLog />
        </div>
      </div>
    </div>
  );
}
