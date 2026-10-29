import {
  pgTable,
  serial,
  smallserial,
  smallint,
  integer,
  bigserial,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  check,
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const countries = pgTable("countries", {
  id: smallserial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const roles = pgTable("roles", {
  id: smallserial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    fullName: text("full_name").notNull(),
    roleId: smallint("role_id")
      .notNull()
      .references(() => roles.id),
    countryId: smallint("country_id")
      .notNull()
      .references(() => countries.id),
  },
  (t) => [
    uniqueIndex("users_full_name_role_country_uq").on(t.fullName, t.roleId, t.countryId),
    index("users_country_idx").on(t.countryId),
    index("users_role_idx").on(t.roleId),
  ],
);

export const pages = pgTable(
  "pages",
  {
    id: serial("id").primaryKey(),
    parentId: integer("parent_id").references((): AnyPgColumn => pages.id, {
      onDelete: "cascade",
    }),
    segment: text("segment").notNull(),
    fullPath: text("full_path").notNull().unique(),
    depth: smallint("depth").notNull(),
    isUnavailable: boolean("is_unavailable").notNull().default(false),
  },
  (t) => [
    index("pages_parent_idx").on(t.parentId),
    index("pages_depth_idx").on(t.depth),
    index("pages_root_idx").on(sql`split_part(${t.fullPath}, '/', 1)`),
  ],
);

export const events = pgTable(
  "events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    pageId: integer("page_id")
      .notNull()
      .references(() => pages.id),
    durationSec: integer("duration_sec").notNull(),
    isOffline: boolean("is_offline").notNull(),
  },
  (t) => [
    check("events_duration_nonneg", sql`${t.durationSec} >= 0`),
    uniqueIndex("events_natural_uq").on(t.occurredAt, t.userId, t.pageId),
    index("events_occurred_idx").on(t.occurredAt),
    index("events_user_occurred_idx").on(t.userId, t.occurredAt),
    index("events_page_idx").on(t.pageId),
  ],
);

export const advColors = pgTable("adv_colors", {
  adv: text("adv").primaryKey(),
  color: text("color").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Each raw ADV listed here is reported under `target` (the group name).
export const advMerges = pgTable(
  "adv_merges",
  {
    adv: text("adv").primaryKey(),
    target: text("target").notNull(),
  },
  (t) => [index("adv_merges_target_idx").on(t.target)],
);
