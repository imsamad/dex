// The explanation at the top of the page, for someone seeing the project for the first time.

import { TokenBadge } from "@/components/sandbox/token-badge";

export const Intro = () => (
  <section className="border rounded-md p-4 flex flex-col gap-2">
    <h1 className="text-xl font-semibold">
      A constant-product AMM on Solana, with every participant played by you
    </h1>
    <p>
      SamDEX is an <span className="font-mono">x · y = k</span> liquidity pool written in
      Anchor. This sandbox makes a throwaway seed phrase and derives one keypair for each role
      in the protocol: a faucet, two token issuers, a pool creator, a liquidity provider and two
      traders. You don&apos;t need a wallet, an extension or any real funds.
    </p>
    <p>
      Go through the steps in order, or press <strong>Run all</strong>. Two issuers create{" "}
      <TokenBadge token="a" /> and <TokenBadge token="b" /> as Token-2022 mints with on-chain
      metadata. The pool gets created and funded, and a trader swaps. After each transaction,
      the log shows exactly whose balances changed and how the pool&apos;s reserves moved. Then
      use the swap form to trade any amount as any actor, including trades the program should
      reject.
    </p>
  </section>
);
