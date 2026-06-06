"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeletePlanButton({ planId }: { planId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "deleting" | "error">("idle");

  async function deletePlan() {
    const confirmed = window.confirm(
      "Delete this saved plan and its journal entries? This cannot be undone."
    );
    if (!confirmed) return;

    setState("deleting");
    const response = await fetch(`/api/plans/${planId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setState("error");
      return;
    }

    router.push("/plans");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void deletePlan()}
        disabled={state === "deleting"}
        className="rounded border border-danger/50 bg-danger/10 px-3 py-2 text-xs font-medium text-danger hover:border-danger disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "deleting" ? "Deleting..." : "Delete plan"}
      </button>
      {state === "error" && (
        <p className="text-[11px] text-danger">
          Could not delete this plan. Try again.
        </p>
      )}
    </div>
  );
}
