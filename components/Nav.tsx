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
    <nav className="epv-app-header">
      <Link
        href="/"
        className="epv-brand"
      >
        <span className="epv-brand-sigil" aria-hidden="true">
          EP
        </span>
        <span className="epv-brand-title">
          <span>Planifier</span>
          <small>Eastern Pine Ventures</small>
        </span>
      </Link>
      <div className="epv-nav-links">
        <Link href="/">Desk</Link>
        <Link href="/chart">Chart</Link>
        <Link href="/plan/new">Build</Link>
        <Link href="/plans">Notebook</Link>
        <Link
          href="https://easternpineventures.com/trading-school"
          target="_blank"
          rel="noreferrer"
        >
          School
        </Link>
      </div>
      <span className="epv-nav-badge hidden lg:inline-flex">
        Free / save unlock
      </span>
      <SignedOut>
        <div className="flex items-center gap-2">
          <SignInButton mode="modal">
            <button className="epv-button-ghost min-h-10 px-3 text-xs">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="epv-button-primary min-h-10 px-3 text-xs">
              Start free
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
