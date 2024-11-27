export default function isWithinExpirationDate(date: Date): boolean {
    return Date.now() < date.getTime();
}