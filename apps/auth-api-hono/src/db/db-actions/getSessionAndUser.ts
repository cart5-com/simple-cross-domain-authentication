import { eq } from "drizzle-orm";
import type { Session } from "../../types/SessionType";
import type { User } from "../../types/UserType";
import db from "../drizzle";
import { sessionTable, userTable } from "../schema";

export const getSessionAndUser = async (
    sessionId: string
): Promise<[session: Session | null, user: User | null]> => {
    const [databaseSession, databaseUser] = await Promise.all([
        getSession(sessionId),
        getUserFromSessionId(sessionId)
    ]);
    return [databaseSession, databaseUser];
}

const getSession = async (sessionId: string): Promise<Session | null> => {
    const result = await db
        .select()
        .from(sessionTable)
        .where(eq(sessionTable.id, sessionId));
    if (result.length !== 1) return null;
    return {
        id: result[0].id,
        userId: result[0].userId,
        hostname: result[0].hostname,
        fresh: false,
        expiresAt: new Date(result[0].expiresAt)
    } as Session;
}

const getUserFromSessionId = async (sessionId: string): Promise<User | null> => {
    const result = await db
        .select({
            id: userTable.id,
            email: userTable.email,
            isEmailVerified: userTable.isEmailVerified,
            name: userTable.name
        })
        .from(sessionTable)
        .innerJoin(userTable, eq(sessionTable.userId, userTable.id))
        .where(eq(sessionTable.id, sessionId));
    if (result.length !== 1) return null;
    return result[0] as User;
}