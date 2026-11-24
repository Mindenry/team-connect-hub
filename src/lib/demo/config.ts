/**
 * Demo mode configuration.
 *
 * Demo mode runs the entire Team Connect frontend against an in-browser
 * mock backend (see ./api.ts). No database, no NestJS server, no WebSocket
 * server and no LiveKit server are required.
 *
 * Enable it by setting VITE_DEMO_MODE=true at build time, or by running
 * `npm run dev:demo` / `npm run build:demo` (Vite mode "demo"). It is also
 * enabled automatically on common static hosts such as Netlify.
 */

declare const __TC_DEMO_MODE__: boolean | undefined;

const envFlag = String(import.meta.env.VITE_DEMO_MODE ?? "").toLowerCase();
const viteModeDemo = typeof __TC_DEMO_MODE__ !== "undefined" ? !!__TC_DEMO_MODE__ : false;

function detectHostedDemo(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host.endsWith(".netlify.app") ||
    host.endsWith(".netlify.com") ||
    host.endsWith(".github.io") ||
    host.endsWith(".vercel.app")
  );
}

export const DEMO_MODE: boolean =
  envFlag === "true" || envFlag === "1" || viteModeDemo || detectHostedDemo();

export const DEMO_STORAGE_KEY = "teamconnect_demo_db_v1";
export const DEMO_SESSION_KEY = "teamconnect_demo_session_v1";

/** The account used by the "Enter demo" button. */
export const DEMO_ACCOUNT = {
  email: "demo@siamdigital.co.th",
  password: "demo1234",
  userId: "u1",
};
