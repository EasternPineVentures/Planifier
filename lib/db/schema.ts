import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  numeric,
  index,
} from "drizzle-orm/pg-core";

// Clerk user id is the primary key. We don't mirror Clerk profile fields.
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ticker: text("ticker").notNull(),
    timeframe: text("timeframe").notNull(),
    holdingPeriod: text("holding_period").notNull(),
    riskPercent: numeric("risk_percent", { precision: 6, scale: 3 }).notNull(),
    chartNote: text("chart_note"),
    // Full structured plan JSON (see lib/plan/schema.ts PlanSchema).
    plan: jsonb("plan").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("plans_user_idx").on(t.userId, t.createdAt),
  })
);

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    outcome: text("outcome"), // "win" | "loss" | "scratch" | "skipped"
    followedChecklist: text("followed_checklist"), // "yes" | "partial" | "no"
    hitInvalidation: text("hit_invalidation"), // "yes" | "no" | "na"
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    planIdx: index("journal_plan_idx").on(t.planId),
    userIdx: index("journal_user_idx").on(t.userId, t.createdAt),
  })
);

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;
