"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  HeadlineTapeGroup,
  HeadlineTapeSnapshot,
} from "@/lib/news/rss";

const REFRESH_MS = 5 * 60 * 1000;

export default function LiveHeadlineBanner() {
  const [snapshot, setSnapshot] = useState<HeadlineTapeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/headlines", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as HeadlineTapeSnapshot;
        if (!cancelled) {
          setSnapshot(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Headline feed unavailable"
          );
        }
      }
    }

    load();
    const timer = window.setInterval(load, REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const items = useMemo(
    () => flattenGroups(snapshot?.groups ?? []),
    [snapshot]
  );

  if (items.length === 0) {
    return (
      <div className="border-b border-border bg-panel/90 px-3 py-2 text-[11px] text-muted">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <span className="epv-kicker !text-[10px]">
            Live context
          </span>
          <span>
            {error
              ? "Headline sources are unavailable right now."
              : "Loading public market headlines..."}
          </span>
        </div>
      </div>
    );
  }

  const repeatedItems = [...items, ...items];

  return (
    <section
      aria-label="Live market headline context"
      className="overflow-hidden border-b border-border bg-panel/90 shadow-[inset_0_-1px_0_rgba(242,184,75,0.12)]"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2">
        <div className="epv-kicker shrink-0 !text-[10px]">
          Live context
        </div>
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="headline-marquee-track flex w-max items-center gap-2">
            {repeatedItems.map((item, index) => (
              <a
                key={`${item.url}-${index}`}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="group flex max-w-[360px] shrink-0 items-center gap-2 border border-border bg-bg/80 px-3 py-1.5 text-[11px] text-ink hover:border-accent/60"
              >
                <span className="border border-amber/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber">
                  {item.assetLabel}
                </span>
                <span className="truncate">{item.title}</span>
                <span className="shrink-0 text-[10px] text-muted">
                  {item.source}
                </span>
              </a>
            ))}
          </div>
        </div>
        <div className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted sm:block">
          context only
        </div>
      </div>
    </section>
  );
}

function flattenGroups(groups: HeadlineTapeGroup[]) {
  return groups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      assetLabel: item.assetLabel || group.label,
    }))
  );
}
