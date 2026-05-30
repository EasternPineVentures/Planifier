"use client";

import type { SourceLink } from "@/lib/sources/sourceLinks";

export default function TrustedSourceLinks({ links }: { links: SourceLink[] }) {
  if (!links.length) {
    return <p className="text-xs text-muted">No source links available for this plan.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        These links are provided for research and verification. Planifier may summarize context, but users should verify important details directly from source pages before making decisions.
      </p>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={`${link.label}:${link.url}`} className="rounded border border-border bg-bg p-2">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-ink">{link.label}</span>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-border px-2 py-1 text-[11px] text-muted hover:border-accent hover:text-accent"
              >
                Open
              </a>
            </div>
            <p className="mt-1 text-xs text-muted">{link.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
