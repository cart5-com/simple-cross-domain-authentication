import db from "../drizzle";
import { userTable } from "../schema";

export async function upsertUser(email: string, isEmailVerified: boolean) {
    return await db.insert(userTable).values({ email, isEmailVerified }).onConflictDoUpdate({
        target: [userTable.email],
        set: { isEmailVerified }
    }).returning({ userId: userTable.id });
}
