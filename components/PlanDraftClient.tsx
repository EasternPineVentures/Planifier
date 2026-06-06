"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PlanView from "@/components/PlanView";
import {
  PLAN_DRAFT_STORAGE_KEY,
  type StoredPlanDraft,
} from "@/lib/plan/draftStorage";

type DraftState =
  | { status: "loading"; draft: null; message: null }
  | { status: "ready"; draft: StoredPlanDraft; message: null }
  | { status: "missing"; draft: null; message: string }
  | { status: "error"; draft: null; message: string };

export default function PlanDraftClient() {
  const [state, setState] = useState<DraftState>({
    status: "loading",
    draft: null,
    message: null,
  });

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(PLAN_DRAFT_STORAGE_KEY);
      if (!raw) {
        setState({
          status: "missing",
          draft: null,
          message: "No finished draft is loaded in this browser session.",
        });
        return;
      }

      const parsed = JSON.parse(raw) as Partial<StoredPlanDraft>;
      if (!parsed.plan || typeof parsed.createdAt !== "string") {
        throw new Error("Draft data is incomplete.");
      }

      setState({
        status: "ready",
        draft: {
          id: typeof parsed.id === "string" ? parsed.id : "",
          plan: parsed.plan,
          createdAt: parsed.createdAt,
          source: parsed.source === "saved" ? "saved" : "unsaved",
        },
        message: null,
      });
    } catch (error) {
      setState({
        status: "error",
        draft: null,
        message:
          error instanceof Error
            ? error.message
            : "The finished draft could not be opened.",
      });
    }
  }, []);

  if (state.status === "loading") {
    return (
      <section className="epv-panel p-4">
        <p className="text-sm text-muted">Opening finished draft...</p>
      </section>
    );
  }

  if (state.status !== "ready") {
    return (
      <section className="epv-panel-strong p-5">
        <p className="epv-kicker">Finished draft</p>
        <h1 className="font-display mt-2 text-3xl font-semibold leading-none text-ink">
          There is no draft to review yet.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {state.message} Build a structured plan from the chart, then Planifier
          will open it here.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/plan/new"
            className="epv-button-primary text-sm"
          >
            Build from chart
          </Link>
          <Link
            href="/plans"
            className="epv-button-ghost text-sm"
          >
            My plans
          </Link>
        </div>
      </section>
    );
  }

  const draft = state.draft;
  const saved = draft.source === "saved" && draft.id.trim().length > 0;

  function clearDraft() {
    window.sessionStorage.removeItem(PLAN_DRAFT_STORAGE_KEY);
    setState({
      status: "missing",
      draft: null,
      message: "The finished draft was cleared from this browser session.",
    });
  }

  return (
    <div className="space-y-4">
      <section className="epv-panel-strong p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="epv-kicker">Finished draft</p>
            <h1 className="font-display mt-2 text-4xl font-semibold leading-none text-ink">
              Review the plan without the builder crowding it.
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
              This page is for reading the checklist, invalidation, scenarios,
              and beginner translation before any paper practice.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href="/plan/new"
              className="epv-button-ghost min-h-10 px-3 text-xs"
            >
              Back to builder
            </Link>
            {saved && (
              <Link
                href={`/plans/${draft.id}`}
                className="epv-button-primary min-h-10 px-3 text-xs"
              >
                Open saved journal
              </Link>
            )}
            <button
              type="button"
              onClick={clearDraft}
              className="epv-button-ghost min-h-10 px-3 text-xs text-muted hover:text-ink"
            >
              Clear draft
            </button>
          </div>
        </div>

        <div className="mt-3 rounded border border-border bg-bg p-3 text-xs leading-relaxed text-muted">
          {saved
            ? "This draft was saved to My Plans. Use the journal page after the plan plays out."
            : "This draft is stored only in this browser session because saving did not complete."}
        </div>
      </section>

      <PlanView plan={draft.plan} planId={saved ? draft.id : undefined} />
    </div>
  );
}
