import { SESSION_ACTIVE_PERIOD_EXPIRATION_IN, SESSION_EXPIRES_IN } from "../consts";
import deleteSession from "../db/dbUtils/deleteSession";
import { getSessionAndUser } from "../db/dbUtils/getSessionAndUser";
import updateSessionExpiration from "../db/dbUtils/updateSessionExpiration";
import type { Session } from "../types/SessionType";
import type { User } from "../types/UserType";
import isWithinExpirationDate from "../utils/isWithinExpirationDate";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";

export const validateSessionCookie = async (
    sessionCookieValue: string,
    hostname: string
): Promise<{ user: User; session: Session } | { user: null; session: null }> => {
    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(sessionCookieValue)));
    const [databaseSession, databaseUser] = await getSessionAndUser(sessionId);
    if (!databaseSession) {
        return { session: null, user: null };
    }
    if (databaseSession.hostname !== hostname) {
        await deleteSession(databaseSession.id);
        return { session: null, user: null };
    }
    if (!databaseUser) {
        await deleteSession(databaseSession.id);
        return { session: null, user: null };
    }
    if (!isWithinExpirationDate(databaseSession.expiresAt)) {
        await deleteSession(databaseSession.id);
        return { session: null, user: null };
    }
    const activePeriodExpirationDate = new Date(
        databaseSession.expiresAt.getTime() - SESSION_ACTIVE_PERIOD_EXPIRATION_IN
    );
    const session: Session = {
        hostname: databaseSession.hostname,
        id: databaseSession.id,
        userId: databaseSession.userId,
        fresh: false,
        expiresAt: databaseSession.expiresAt
    };
    if (!isWithinExpirationDate(activePeriodExpirationDate)) {
        session.fresh = true;
        session.expiresAt = new Date(Date.now() + SESSION_EXPIRES_IN);
        await updateSessionExpiration(databaseSession.id, session.expiresAt);
    }
    return { user: databaseUser, session };
}