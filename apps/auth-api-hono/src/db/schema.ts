import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { generateKey } from "../utils/generateKey";

export const userTable = sqliteTable("user", {
	id: text("id").notNull().primaryKey().unique().$defaultFn(() => generateKey('u')),
	email: text("email").notNull().unique(),
	isEmailVerified: integer("is_email_verified", { mode: "boolean" }).notNull().default(false),
});

export const sessionTable = sqliteTable("session", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => userTable.id),
	expiresAt: integer("expires_at").notNull(), // milliseconds are included, full timestamp using Date object
	hostname: text("hostname").notNull(),
});
