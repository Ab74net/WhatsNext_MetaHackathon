// Public builds always use local fixtures. This is deliberately not an environment flag.
export const DEMO_MODE = true as const;
export const DEMO_STORAGE_KEY = "concept-demo-claims-v1";
export const DEMO_VIDEO_URL = ""; // Add your submission video URL; it is opened only on click.
export const GITHUB_URL = "https://github.com/Ab74net/Meta2026Hackathon";
export const CONCEPT_NOTICE = "Concept demo. Everything here is simulated. Nothing you do is saved or sent anywhere.";
export const CSP = "default-src 'self'; connect-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self'; worker-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-src 'none'";
