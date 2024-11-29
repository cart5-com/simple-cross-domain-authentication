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
                twoFactorAuthKey: null,
                twoFactorAuthRecoveryCode: null,
            }).returning();
        existingUser = newUser[0];
    }
    return existingUser;
}

export async function updateTwoFactorAuthKey(userId: string, key: Uint8Array) {
    await db.update(userTable).set({ twoFactorAuthKey: key }).where(eq(userTable.id, userId));
}

export async function getTwoFactorAuthKey(userId: string) {
    const user = await db.select({
        twoFactorAuthKey: userTable.twoFactorAuthKey
    }).from(userTable).where(eq(userTable.id, userId));
    return user[0]?.twoFactorAuthKey;
}

export async function updateTwoFactorAuthRecoveryCode(userId: string, code: Uint8Array) {
    await db.update(userTable).set({ twoFactorAuthRecoveryCode: code }).where(eq(userTable.id, userId));
}

export async function getTwoFactorAuthRecoveryCode(userId: string) {
    const user = await db.select({
        twoFactorAuthRecoveryCode: userTable.twoFactorAuthRecoveryCode
    }).from(userTable).where(eq(userTable.id, userId));
    return user[0]?.twoFactorAuthRecoveryCode;
}


// TODO: remove updateRequiredFields function
// revert back to old one, which was more easier to understand
// use updateUserName, updateUserPictureUrl, markEmailAsVerified instead of 'updateRequiredFields'
export async function updateRequiredFields(
    savedUserData: typeof userTable.$inferSelect,
    attributes: {
        name: string | null,
        pictureUrl: string | null,
        isEmailVerified: boolean
    }
) {
    const promises: Promise<void>[] = [];

    // only update if it is null
    // if savedUserData.name is null and attributes.name is provided, update it
    if (attributes.name !== null && savedUserData.name === null) {
        promises.push(updateUserName(savedUserData.id, attributes.name));
    }

    // only update if it is different
    // if savedUserData.pictureUrl is different from attributes.pictureUrl, update it
    if (attributes.pictureUrl !== null && savedUserData.pictureUrl !== attributes.pictureUrl) {
        promises.push(updateUserPictureUrl(savedUserData.id, attributes.pictureUrl));
    }

    // only update if it is a must
    // if savedUserData.isEmailVerified is false and attributes.isEmailVerified is true, mark it as verified
    if (savedUserData.isEmailVerified === false && attributes.isEmailVerified) {
        promises.push(markEmailAsVerified(savedUserData.email));
    }
    await Promise.all(promises);
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