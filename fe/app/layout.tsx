import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { SandboxProvider } from "@/sandbox/store";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SamDEX sandbox",
  description: "A constant-product AMM on Solana you can try without a wallet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex flex-col min-h-screen max-h-screen overflow-hidden">
        <div  >
        <Header />
        </div>
        <div className="flex-1 overflow-y-auto p-4" >
          <SandboxProvider>{children}</SandboxProvider>
        </div>
      </body>
    </html>
  );
}
