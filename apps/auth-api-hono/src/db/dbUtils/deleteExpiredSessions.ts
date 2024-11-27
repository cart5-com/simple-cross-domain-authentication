import { lte } from "drizzle-orm";
import db from "../drizzle";
import { sessionTable } from "../schema";

export async function deleteExpiredSessions() {
    return (
        await db
            .delete(sessionTable)
            .where(lte(sessionTable.expiresAt, Date.now()))
    ).rowsAffected;
}
