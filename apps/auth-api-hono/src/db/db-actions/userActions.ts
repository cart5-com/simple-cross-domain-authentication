import { eq } from "drizzle-orm";
import db from "../drizzle";
import { userTable } from "../schema";
import { generateKey } from "../../utils/generateKey";

export async function upsertUser(email: string, passwordHash: string | null = null) {
    let existingUser = await getUserByEmail(email);
    if (!existingUser) {
        const id = generateKey('u');
        const newUser = await db.insert(userTable)
            .values({
                id,
                email,
                isEmailVerified: false,
                name: null,
                passwordHash,
                pictureUrl: null,
                encryptedTwoFactorAuthKey: null,
                encryptedTwoFactorAuthRecoveryCode: null,
            }).returning();
        existingUser = newUser[0];
    }
    return existingUser;
}

export async function updateEncryptedTwoFactorAuthKey(userId: string, encryptedKey: Uint8Array | null) {
    await db.update(userTable).set({ encryptedTwoFactorAuthKey: encryptedKey }).where(eq(userTable.id, userId));
}

export async function getEncryptedTwoFactorAuthKey(userId: string) {
    const user = await db.select({
        encryptedTwoFactorAuthKey: userTable.encryptedTwoFactorAuthKey
    }).from(userTable).where(eq(userTable.id, userId));
    return user[0]?.encryptedTwoFactorAuthKey;
}

export async function updateEncryptedTwoFactorAuthRecoveryCode(userId: string, encryptedCode: Uint8Array | null) {
    await db.update(userTable).set({ encryptedTwoFactorAuthRecoveryCode: encryptedCode }).where(eq(userTable.id, userId));
}

export async function getTwoFactorAuthRecoveryCode(userId: string) {
    const user = await db.select({
        encryptedTwoFactorAuthRecoveryCode: userTable.encryptedTwoFactorAuthRecoveryCode
    }).from(userTable).where(eq(userTable.id, userId));
    return user[0]?.encryptedTwoFactorAuthRecoveryCode;
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

export async function updateUserPictureUrl(userId: string, pictureUrl: string) {
    await db.update(userTable).set({ pictureUrl }).where(eq(userTable.id, userId));
}