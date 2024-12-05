import { sequence } from "astro:middleware";
import { authMiddleware } from "./auth";
import { csrfMiddleware } from "./csrf";


export const onRequest = sequence(
    csrfMiddleware,
    authMiddleware,
);
