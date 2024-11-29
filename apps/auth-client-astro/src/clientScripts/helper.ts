import { createAuthApiClient } from "../../../auth-api-hono/src/authApiClient";
// this only provides the hono/client with typing
// https://hono.dev/docs/guides/rpc
// it does not include any server code, 
// run pnpm build to see the generated codes, (astro.config.vite.build.minify=false)

import { showTurnstile } from "./turnstile";
const authApiClient = createAuthApiClient(`${window.location.origin}/__p_auth/`);

const otpForm = document.getElementById("otp-form") as HTMLFormElement;
otpForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(otpForm);
    const verifyEmail = formData.get("verifyEmail") as string;
    const code = formData.get("code") as string;
    let req;
    if (code) {
        req = authApiClient.api.otp.verify.$post({
            form: {
                verifyEmail,
                code,
                turnstile: await showTurnstile(import.meta.env.PUBLIC_TURNSTILE_SITE_KEY)
            },
        });
    } else {
        req = authApiClient.api.otp.otp.$post({
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
        const codeInput = otpForm.querySelector("[name=code]") as HTMLInputElement;
        if (code) {
            whoAmI();
            codeInput.type = "hidden";
        } else {
            codeInput.type = "text";
        }
    }
});

const registerForm = document.getElementById("register-form") as HTMLFormElement;
registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(registerForm);
    const { data, error } = await (await authApiClient.api.email_password.register.$post({
        form: {
            name: formData.get("name") as string,
            email: formData.get("email") as string,
            password: formData.get("password") as string,
            turnstile: await showTurnstile(import.meta.env.PUBLIC_TURNSTILE_SITE_KEY)
        },
    })).json();
    if (error) {
        console.error(error);
        alert(JSON.stringify(error, null, 2));
    }
});
const loginForm = document.getElementById("login-form") as HTMLFormElement;
loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const { data, error } = await (await authApiClient.api.email_password.login.$post({
        form: {
            email: formData.get("email") as string,
            password: formData.get("password") as string,
            turnstile: await showTurnstile(import.meta.env.PUBLIC_TURNSTILE_SITE_KEY)
        },
    })).json();
    if (error) {
        console.error(error);
        alert(JSON.stringify(error, null, 2));
    } else {
        whoAmI();
    }
});

const winUri = new URL(window.location.href);
const redirect = decodeURIComponent(winUri.searchParams.get('redirect') || "");
const redirectButton = document.getElementById("redirect-button") as HTMLButtonElement;
if (redirect) {
    const redirectUrl = new URL(redirect);
    redirectButton.innerHTML = `Continue to <strong>${redirectUrl.host}</strong> ▶️`;
}
redirectButton.addEventListener("click", async () => {
    if (!redirect) {
        alert("redirect is not found");
        return;
    }
    const turnstile = await showTurnstile(import.meta.env.PUBLIC_TURNSTILE_SITE_KEY);
    const postActionUrl = authApiClient.api.cross_domain.redirector.$url();
    const newForm = document.createElement("form");
    newForm.method = "POST";
    newForm.action = postActionUrl.toString();
    const inputRedirectUrl = document.createElement("input");
    inputRedirectUrl.name = "redirectUrl";
    inputRedirectUrl.value = redirect;
    const inputTurnstile = document.createElement("input");
    inputTurnstile.name = "turnstile";
    inputTurnstile.value = turnstile;
    newForm.appendChild(inputRedirectUrl);
    newForm.appendChild(inputTurnstile);
    document.querySelector("div#redirect-form-container")?.appendChild(newForm);
    newForm.submit();
});



const googleOAuthButton = document.querySelector("#google-oauth-button") as HTMLAnchorElement;
const googleRedirectUrl = authApiClient.api.google_oauth.redirect.$url();
googleRedirectUrl.searchParams.set("redirect_uri", encodeURIComponent(window.location.href));
googleOAuthButton.href = googleRedirectUrl.toString();

const whoAmI = async () => {
    const { data, error } = await (await authApiClient.api.user.whoami.$post()).json();
    console.log(data, error);
    const whoamiResult = document.getElementById("whoami-result") as HTMLPreElement;
    whoamiResult.textContent = JSON.stringify(data, null, 2);
    if (data) {
        logoutButton.classList.remove("hidden");
        redirectButton.classList.remove("hidden");
        otpForm.classList.add("hidden");
        registerForm.classList.add("hidden");
        loginForm.classList.add("hidden");
        googleOAuthButton.classList.add("hidden");
        getNewTwoFactorAuthButton.classList.remove("hidden");
        twoFactorVerifyForm.classList.add("hidden");
    } else {
        logoutButton.classList.add("hidden");
        otpForm.classList.remove("hidden");
        registerForm.classList.remove("hidden");
        loginForm.classList.remove("hidden");
        googleOAuthButton.classList.remove("hidden");
        getNewTwoFactorAuthButton.classList.add("hidden");
        twoFactorVerifyForm.classList.remove("hidden");
    }
}

whoAmI();

const whoamiButton = document.getElementById("whoami-button") as HTMLButtonElement;
whoamiButton.addEventListener("click", whoAmI);

const logoutButton = document.getElementById("logout-button") as HTMLButtonElement;
logoutButton.addEventListener("click", async () => {
    const { data, error } = await (await authApiClient.api.user.logout.$post()).json();
    console.log(data, error);
    window.location.reload();
});



const twoFactorAuthResult = document.getElementById("two-factor-auth-result") as HTMLDivElement;
const twoFactorAuthForm = document.getElementById("two-factor-auth-form") as HTMLFormElement;

const getNewTwoFactorAuthButton = document.querySelector("#get-new-two-factor-auth-button") as HTMLButtonElement;
getNewTwoFactorAuthButton.addEventListener("click", async () => {
    const { data, error } = await (await authApiClient.api["two-factor-auth"].new.$post()).json();
    console.log(data, error);
    twoFactorAuthResult.innerHTML = "";
    const qrContainerDiv = document.createElement("div");
    qrContainerDiv.style.maxWidth = "300px";
    qrContainerDiv.innerHTML = data.qrCodeSVG;
    twoFactorAuthResult.appendChild(qrContainerDiv);

    twoFactorAuthForm.classList.remove("hidden");

    const encodedTOTPKeyInput = twoFactorAuthForm.querySelector("[name=encodedTOTPKey]") as HTMLInputElement;
    if (encodedTOTPKeyInput) {
        encodedTOTPKeyInput.value = data.encodedTOTPKey;
    }
});

twoFactorAuthForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(twoFactorAuthForm);
    const { data, error } = await (await authApiClient.api["two-factor-auth"].save.$post({
        form: {
            encodedTOTPKey: formData.get("encodedTOTPKey") as string,
            userProvidedCode: formData.get("userProvidedCode") as string,
        },
    })).json();
    console.log(data, error);
    if (error) {
        alert(JSON.stringify(error, null, 2));
    } else if (data) {
        twoFactorAuthResult.innerHTML = `Recovery code: ${data.recoveryCode}`;
    }
});

const twoFactorVerifyForm = document.getElementById("two-factor-verify-form") as HTMLFormElement;
twoFactorVerifyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(twoFactorVerifyForm);
    const { data, error } = await (await authApiClient.api["two-factor-auth"].verify.$post({
        form: {
            userProvidedCode: formData.get("userProvidedCode") as string,
            turnstile: await showTurnstile(import.meta.env.PUBLIC_TURNSTILE_SITE_KEY)
        },
    })).json();
    console.log(data, error);
    if (error) {
        alert(JSON.stringify(error, null, 2));
    } else {
        whoAmI();
    }
});