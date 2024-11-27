import { eq } from "drizzle-orm";
import { sessionTable } from "../schema";
import db from "../drizzle";

export default async function deleteSession(sessionId: string): Promise<void> {
    await db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
}

