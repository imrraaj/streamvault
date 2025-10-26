"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Music, Wallet } from "lucide-react";
import Link from "next/link";
import { BalanceCard } from "./balance-card";

export function Header() {
  const { login, logout, authenticated, user } = usePrivy();

  return (
    <header className="z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <Music className="h-6 w-6" />
          StreamVault
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
            Browse
          </Link>
          {authenticated && (
            <Link href="/artist" className="text-sm font-medium hover:text-primary transition-colors">
              Artist Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {authenticated && <BalanceCard />}
          <Button onClick={authenticated ? logout : login}>
            <Wallet className="h-4 w-4 mr-2" />
            {authenticated ? `${user?.wallet?.address?.slice(0, 6)}...${user?.wallet?.address?.slice(-4)}` : "Connect Wallet"}
          </Button>
        </div>
      </div>
    </header>
  );
}
