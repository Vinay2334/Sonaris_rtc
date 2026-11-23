// Styles for the signed-out gate inside the subtitle window.
// `.is-signed-out` is toggled on .sonaris-panel by content-script.js.
(function () {
  const NS = (window.SonarisOverlay = window.SonarisOverlay || {});

  NS.signInGateCss = `
    .sonaris-auth-gate {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; text-align: center; gap: 8px;
      padding: 20px 22px 22px; flex: 1;
    }
    .sonaris-auth-gate[hidden] { display: none; }
    .auth-gate-title { font-size: 16px; font-weight: 600; color: #fff; }
    .auth-gate-message {
      margin: 0; font-size: 13px; line-height: 1.5;
      color: rgba(255,255,255,0.65); max-width: 420px;
    }
    .auth-gate-btn { width: auto; min-width: 150px; margin-top: 6px; }
    .auth-gate-error {
      margin: 0; font-size: 12px; line-height: 1.4; max-width: 300px;
      color: #fda4af;
    }
    .auth-gate-error[hidden] { display: none; }

    /* Signed out: no captions, no transport controls — sign-in only. */
    .sonaris-panel.is-signed-out .sonaris-body,
    .sonaris-panel.is-signed-out .sonaris-statusbar { display: none; }
    .sonaris-panel.is-signed-out .dd-field {
      opacity: 0.45; pointer-events: none;
    }
    .sonaris-panel.is-signed-out .resize-handle { display: none; }
  `;
})();
