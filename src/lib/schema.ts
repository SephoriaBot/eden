import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const plants = sqliteTable(
  "plants",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    location: text("location"),
    notes: text("notes"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    userIdx: index("plants_user_idx").on(t.userId),
  })
);

export const aiUsage = sqliteTable(
  "ai_usage",
  {
    userId: text("user_id").notNull(),
    day: text("day").notNull(),
    count: integer("count").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.day] }),
  })
);
