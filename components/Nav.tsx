"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function Nav() {
  return (
    <nav className="flex items-center gap-4 border-b border-border pb-3">
      <Link href="/" className="font-mono text-lg tracking-tight">
        planifier<span className="text-accent">.</span>
      </Link>
      <div className="flex flex-1 gap-3 text-sm text-muted">
        <Link href="/" className="hover:text-ink">Plan</Link>
        <Link href="/plans" className="hover:text-ink">My plans</Link>
      </div>
      <span className="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted">
        NFA · paper-trade first
      </span>
      <UserButton afterSignOutUrl="/sign-in" />
    </nav>
  );
}
