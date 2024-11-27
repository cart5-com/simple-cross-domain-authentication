import { createAuthApiClient } from "../../../auth-api-hono/src/export/authApiClient";
// this only provides the hono/client with typing
// https://hono.dev/docs/guides/rpc
// it does not include any server code, 
// run pnpm build to see the generated codes, (astro.config.vite.build.minify=false)

import { showTurnstile } from "./turnstile";
const client = createAuthApiClient();

const form = document.getElementById("otp-form") as HTMLFormElement;
form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const verifyEmail = formData.get("verifyEmail") as string;
    const code = formData.get("code") as string;
    let req;
    if (code) {
        req = client.api.otp.verify.$post({
            form: {
                verifyEmail,
                code,
                turnstile: await showTurnstile(import.meta.env.PUBLIC_TURNSTILE_SITE_KEY)
            },
        });
    } else {
        req = client.api.otp.otp.$post({
            form: {
                verifyEmail,
                turnstile: await showTurnstile(import.meta.env.PUBLIC_TURNSTILE_SITE_KEY)
            },
        });
    }
    const { data, error } = await (await req).json();
    if (error) {
        console.error(error);
        alert(JSON.stringify(error, null, 2));
    } else {
        const codeInput = form.querySelector("[name=code]") as HTMLInputElement;
        if (code) {
            whoAmI();
            codeInput.type = "hidden";
        } else {
            codeInput.type = "text";
        }
    }
});

const whoAmI = async () => {
    const { data, error } = await (await client.api.user.whoami.$post()).json();
    console.log(data, error);
    const whoamiResult = document.getElementById("whoami-result") as HTMLPreElement;
    whoamiResult.textContent = JSON.stringify(data, null, 2);
    if (data) {
        logoutButton.classList.remove("hidden");
        form.classList.add("hidden");
    } else {
        logoutButton.classList.add("hidden");
        form.classList.remove("hidden");
    }
}

whoAmI();

const whoamiButton = document.getElementById("whoami-button") as HTMLButtonElement;
whoamiButton.addEventListener("click", whoAmI);

const logoutButton = document.getElementById("logout-button") as HTMLButtonElement;
logoutButton.addEventListener("click", async () => {
    const { data, error } = await (await client.api.user.logout.$post()).json();
    console.log(data, error);
    window.location.reload();
}); 