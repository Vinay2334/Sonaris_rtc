// Shared constants for the caption overlay (classic script, no imports/exports).
(function () {
  const NS = (window.SonarisOverlay = window.SonarisOverlay || {});
  NS.constants = {
  CONTAINER_ID: "__sonaris-caption-container",
  MAX_LINES: 2,

  LANGUAGES: [
    ["en", "English"],
    ["es", "Spanish"],
    ["fr", "French"],
    ["de", "German"],
    ["it", "Italian"],
    ["pt", "Portuguese"],
    ["nl", "Dutch"],
    ["pl", "Polish"],
    ["ru", "Russian"],
    ["uk", "Ukrainian"],
    ["ar", "Arabic"],
    ["tr", "Turkish"],
    ["zh", "Chinese (Mandarin)"],
    ["ja", "Japanese"],
    ["ko", "Korean"],
    ["hi", "Hindi"],
    ["bn", "Bengali"],
    ["ta", "Tamil"],
    ["te", "Telugu"],
    ["mr", "Marathi"],
    ["ur", "Urdu"],
    ["fa", "Persian"],
  ],

  MODES: [
    ["translation", "Translation"],
    ["transcription", "Transcription"],
  ],

  MODEL_TIERS: [
    ["base", "Base"],
    ["pro", "Pro"],
  ],

  CONNECT_WATCHDOG_MS: 20000,
  };
})();
