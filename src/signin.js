// Logic for the standalone sign-in window (src/signin.html).
// Classic script: shares window.SonarisOverlay, no imports.
// Reuses lib/user-store.js, so sign-in here flips the same shared state
// every tab overlay listens to; on success it tells the service worker
// which tab to start captions for, then closes itself.
(function () {
  const NS = (window.SonarisOverlay = window.SonarisOverlay || {});

  // Hand-rolled query parse: no URLSearchParams dependency, so this
  // classic script runs in any extension context (and in bare-vm tests).
  function tabIdFromQuery(location) {
    try {
      const search = String(location.search || "").replace(/^[?#]/, "");
      for (const part of search.split("&")) {
        const eq = part.indexOf("=");
        const key = eq < 0 ? part : part.slice(0, eq);
        if (decodeURIComponent(key) === "tabId") {
          const raw = eq < 0 ? "" : decodeURIComponent(part.slice(eq + 1));
          const id = raw === "" ? null : Number(raw);
          return Number.isFinite(id) ? id : null;
        }
      }
    } catch (e) {
      // Malformed query string: no tab to report back to.
    }
    return null;
  }

  function createSigninPage(deps) {
    const { document, window, location, userStore } = deps;
    const $ = (id) => document.getElementById(id);
    const form = $("signin-form");
    const emailInput = $("signin-email");
    const passwordInput = $("signin-password");
    const firstNameInput = $("signin-firstname");
    const lastNameInput = $("signin-lastname");
    const modeToggle = $("signin-toggle");
    const modeMessage = $("signin-toggle-message");
    const mNameRow = $("signin-name-row");
    const submitBtn = $("signin-submit");
    const googleBtn = $("signin-google");
    const errorLine = $("signin-error");
    const signedinBox = $("signin-signedin");
    const welcomeLine = $("signin-welcome");
    const forgotLink = $("signin-forgot");
    const forgotRow = $("signin-forgot-row");
    const tabId = tabIdFromQuery(location || {});
    let busy = false;
    let authMode = "signin";

    // Public website sign-in page, where the full forgot-password flow
    // lives (website/signin.html reset mode -> reset-password.html).
    // The extension popup stays a thin sign-in/up form: this link just
    // opens the site with the typed email prefilled. Trailing slashes
    // are stripped so a configured "https://site/" still yields a valid
    // ".../signin.html" URL; "" means unconfigured (never a broken link).
    function websiteSigninUrl(email) {
      let base = "";
      try {
        base = String(
          (NS.sonarisConfig && NS.sonarisConfig.SITE_URL) || "",
        ).replace(/\/+$/, "");
      } catch (e) {
        base = "";
      }
      if (!base) return "";
      const trimmed = String(email || "").trim();
      return trimmed
        ? `${base}/signin.html?email=${encodeURIComponent(trimmed)}`
        : `${base}/signin.html`;
    }

    function openWebsiteSignin() {
      let url = "";
      try {
        url = websiteSigninUrl(emailInput.value);
      } catch (e) {
        url = websiteSigninUrl("");
      }
      if (!url) {
        showError("Couldn't open the website sign-in right now.");
        return;
      }
      // Extension popup: open the site in a real tab. chrome.tabs is
      // available on extension pages; window.open covers any other
      // context. Neither exists in bare-vm tests — then this is a no-op.
      try {
        if (typeof chrome !== "undefined" && chrome?.tabs?.create) {
          chrome.tabs.create({ url });
          return;
        }
      } catch (e) {
        /* fall through to window.open */
      }
      try {
        window?.open?.(url, "_blank", "noopener");
      } catch (e) {
        /* no opener available */
      }
    }

    function setAuthMode(mode) {
      authMode = mode;

      const isSignup = mode === "signup";

      mNameRow.hidden = !isSignup;

      firstNameInput.disabled = !isSignup;
      lastNameInput.disabled = !isSignup;
      firstNameInput.hidden = !isSignup;
      lastNameInput.hidden = !isSignup;

      firstNameInput.required = isSignup;
      lastNameInput.required = isSignup;

      passwordInput.autocomplete = isSignup
        ? "new-password"
        : "current-password";

      submitBtn.textContent = isSignup ? "Create account" : "Sign in";

      modeToggle.textContent = isSignup ? "Sign In" : "Sign Up";

      modeMessage.textContent = isSignup
        ? "Already have an account?"
        : "Don't have an account?";

      // Password reset lives on the website: no forgot link while
      // creating an account.
      if (forgotRow) forgotRow.hidden = isSignup;

      errorLine.hidden = true;
      errorLine.textContent = "";
    }
    modeToggle.addEventListener("click", (e) => {
      e.preventDefault();
      setAuthMode(authMode === "signin" ? "signup" : "signin");
    });
    if (forgotLink) {
      forgotLink.addEventListener("click", (e) => {
        e.preventDefault();
        openWebsiteSignin();
      });
    }
    setAuthMode("signin");

    function showError(err) {
      errorLine.textContent = err?.message || String(err || "Sign-in failed.");
      errorLine.hidden = false;
    }

    // The tab login notification rides the store's own "sign-in"
    // message (originTabId registered below); here just close up.
    function closeAfterLogin() {
      try {
        window.close();
      } catch (e) {
        /* user closes manually */
      }
    }

    function refresh() {
      const s = userStore.getState();
      const signedIn = !!s.signedIn;

      // signedinBox/welcomeLine only exist in older page revisions:
      // guard so a missing node can't break the live page (or the
      // forgot-password link wiring above).
      if (signedinBox) signedinBox.hidden = !signedIn;
      if (form) form.hidden = signedIn;
      if (googleBtn) googleBtn.hidden = signedIn;
      if (forgotRow) forgotRow.hidden = signedIn || authMode === "signup";

      if (signedIn && s.user && welcomeLine) {
        welcomeLine.textContent = `Signed in as ${s.user.email || s.user.name}. Captions are unlocked.`;
      }
    }

    async function run(fn) {
      if (busy) return;

      busy = true;
      errorLine.hidden = true;

      submitBtn.disabled = true;
      googleBtn.disabled = true;

      try {
        await fn();
      } catch (e) {
        showError(e);
      } finally {
        busy = false;

        submitBtn.disabled = false;
        googleBtn.disabled = false;
      }
    }

    // Register the opener before any login attempt so the store's
    // "sign-in" notification carries this tab.
    try {
      userStore.setOriginTab?.(tabId);
    } catch (e) {
      /* optional */
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      if (!form.reportValidity()) return;

      run(async () => {
        if (authMode === "signup") {
          const res = await userStore.signUpWithPassword(
            emailInput.value.trim(),
            passwordInput.value,
            firstNameInput.value.trim(),
            lastNameInput.value.trim(),
          );

          if (res?.needsConfirmation) {
            setAuthMode("signin");
            errorLine.textContent = "Check your inbox to confirm your mail.";
            errorLine.hidden = false;
            return;
          }

          closeAfterLogin();
        } else {
          await userStore.signInWithPassword(
            emailInput.value.trim(),
            passwordInput.value,
          );

          closeAfterLogin();
        }
      });
    });
    googleBtn.addEventListener("click", () => {
      run(() => userStore.signInWithGoogle().then(closeAfterLogin));
    });

    const unsubscribe = userStore.subscribe(refresh);
    userStore.load(refresh);
    refresh();

    return { refresh, destroy: () => unsubscribe(), websiteSigninUrl, openWebsiteSignin };
  }

  NS.createSigninPage = createSigninPage;
  NS.signinTabIdFromQuery = tabIdFromQuery;
  NS.signinWebsiteSigninUrl = function (email) {
    let base = "";
    try {
      base = String(
        (NS.sonarisConfig && NS.sonarisConfig.SITE_URL) || "",
      ).replace(/\/+$/, "");
    } catch (e) {
      base = "";
    }
    if (!base) return "";
    const trimmed = String(email || "").trim();
    return trimmed
      ? `${base}/signin.html?email=${encodeURIComponent(trimmed)}`
      : `${base}/signin.html`;
  };

  // Real page boot: DOM is parsed before this classic script runs.
  try {
    if (
      typeof document !== "undefined" &&
      document.getElementById?.("signin-form")
    ) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () =>
          createSigninPage({
            document,
            window,
            location,
            userStore: NS.userStore,
          }),
        );
      } else {
        createSigninPage({
          document,
          window,
          location,
          userStore: NS.userStore,
        });
      }
    }
  } catch (e) {
    /* test harness without DOM */
  }
})();
