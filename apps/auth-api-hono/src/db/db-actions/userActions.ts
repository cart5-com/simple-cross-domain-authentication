import { eq } from "drizzle-orm";
import db from "../drizzle";
import { userTable } from "../schema";

export async function upsertUser(email: string, passwordHash: string | null = null) {
    let existingUser = await getUserByEmail(email);
    if (!existingUser) {
        const newUser = await db.insert(userTable)
            .values({
                email,
                isEmailVerified: false,
                name: "",
                passwordHash
            }).returning();
        existingUser = newUser[0];
    }
    return existingUser;
}

export async function isEmailExists(email: string) {
    return (await db.select().from(userTable).where(eq(userTable.email, email))).length > 0;
}

export async function markEmailAsVerified(email: string) {
    await db.update(userTable).set({ isEmailVerified: true }).where(eq(userTable.email, email));
}

export async function updateUserName(userId: string, name: string) {
    await db.update(userTable).set({ name }).where(eq(userTable.id, userId));
}

export async function getUserByEmail(email: string) {
    return (await db.select().from(userTable).where(eq(userTable.email, email)))[0];
}
