// Logo + symbol, used wherever a token is named. A server component: it only
// imports sandbox/tokens.ts, which has no Solana dependencies.

import Image from "next/image";
import { TOKENS } from "@/sandbox/tokens";

export const TokenBadge = ({
  token,
  size = 16,
}: {
  token: "a" | "b";
  size?: number;
}) => (
  <span className="inline-flex items-center gap-1 align-middle">
    <Image
      src={TOKENS[token].image}
      alt=""
      width={size}
      height={size}
      className="rounded-full"
    />
    <span>{TOKENS[token].symbol}</span>
  </span>
);
