/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
declare namespace App {
    interface Locals {
        user: import("../../auth-api-hono/src/export/authApiClient").User | null;
    }
}
