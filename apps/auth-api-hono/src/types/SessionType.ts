export interface Session {
    id: string;
    expiresAt: Date;
    fresh: boolean;
    userId: string;
    hostname: string;
}
