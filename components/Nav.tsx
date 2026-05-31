"use client";

import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export default function Nav() {
  return (
    <nav className="flex items-center gap-4 border-b border-border pb-3">
      <Link href="/" className="font-mono text-lg tracking-tight">
        planifier<span className="text-accent">.</span>
      </Link>
      <div className="flex flex-1 gap-3 text-sm text-muted">
        <Link href="/" className="hover:text-ink">Home</Link>
        <Link href="/plan/new" className="hover:text-ink">Build</Link>
        <Link href="/plans" className="hover:text-ink">My plans</Link>
      </div>
      <span className="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted">
        NFA · paper-trade first
      </span>
      <SignedOut>
        <div className="flex items-center gap-2">
          <SignInButton mode="modal">
            <button className="rounded border border-border px-3 py-2 text-xs font-medium text-ink hover:border-muted">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="rounded border border-accent/60 bg-accent/10 px-3 py-2 text-xs font-medium text-accent hover:border-accent">
              Sign up
            </button>
          </SignUpButton>
        </div>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/sign-in" />
      </SignedIn>
    </nav>
  );
}
