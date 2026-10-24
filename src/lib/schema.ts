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
    category: text("category"),
    careSummary: text("care_summary"),
    wateringIntervalDays: integer("watering_interval_days")
      .notNull()
      .default(7),
    recommendedWateringIntervalDays: integer(
      "recommended_watering_interval_days"
    ),
    wateringRecommendationVersion: integer(
  "watering_recommendation_version"
).notNull().default(0),
    lastWateredAt: integer("last_watered_at"),
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

export const plantGuides = sqliteTable("plant_guides", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  sections: text("sections").notNull(),
  source: text("source").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    userIdx: index("push_subscriptions_user_idx").on(t.userId),
  })
);