
export const showTurnstile = async function (sitekey: string, containerElement?: HTMLElement): Promise<string> {
    if (!containerElement) {
        containerElement = document.body;
    }
    const tryShowTurnstile = async (): Promise<string> => {
        return new Promise(async (resolve, reject) => {
            const randomId = `turnstile${(Math.floor(Math.random() * 1e15)).toString(36)}`;
            const turnstileHtml = `
            <div id="${randomId}" class="my-4">
              <div class="w-fit mx-auto">
                <div class="cf-turnstile"></div>
              </div>
            </div>
          `;

            const container = document.createElement('div');
            container.innerHTML = turnstileHtml;
            containerElement.appendChild(container);

            (window as any)[randomId] = function () {
                try {
                    if ((window as any).turnstile) {
                        (window as any).turnstile.render(`#${randomId} .cf-turnstile`, {
                            sitekey: sitekey,
                            "error-callback": function (error: any) {
                                console.log("error window.turnstile.render");
                                console.log(error);
                                containerElement.removeChild(container);
                                if (error.toString() === "300030") {
                                    // Error 300030 is generic Client Execution Error.
                                    // Retry on 300030 error
                                    resolve(showTurnstile(sitekey));
                                } else {
                                    reject(error);
                                }
                            },
                            callback: function (token: string) {
                                containerElement.removeChild(container);
                                resolve(token);
                            },
                        });
                    }
                } catch (e) {
                    console.log("error window.turnstile.render");
                    console.log(e);
                    containerElement.removeChild(container);
                    reject(e);
                }
            };

            const script = document.createElement('script');
            script.src = `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=${randomId}`;
            document.head.appendChild(script);
            setTimeout(() => {
                script.remove();
            });
        });
    };

    return tryShowTurnstile();
};