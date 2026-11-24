import { DEMO_MODE, DEMO_ACCOUNT } from "./config";
import { handleDemoRequest } from "./api";
import { getDemoDb, resetDemoDb } from "./db";
import { DEMO_USER_ID } from "./seed";

const NON_API_SAME_ORIGIN_PREFIXES = ["/users", "/channels", "/organizations", "/notifications", "/storage"];

function isBackendHost(host: string) {
  return host === "localhost" || host === "127.0.0.1";
}

function shouldHandle(url: URL, path: string): boolean {
  if (path.startsWith("/api/")) return true;
  if (isBackendHost(url.hostname) && (url.port === "3000" || url.port === "3001")) return true;
  if (url.origin === window.location.origin) {
    return NON_API_SAME_ORIGIN_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  }
  return false;
}

async function readBody(input: RequestInfo | URL, init?: RequestInit): Promise<{ json: any; form: FormData | null }> {
  const body: any = init?.body;
  if (body) {
    if (typeof FormData !== "undefined" && body instanceof FormData) return { json: null, form: body };
    if (typeof body === "string") {
      try {
        return { json: JSON.parse(body), form: null };
      } catch {
        return { json: null, form: null };
      }
    }
    if (body instanceof URLSearchParams) return { json: Object.fromEntries(body.entries()), form: null };
    return { json: body, form: null };
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    try {
      const clone = input.clone();
      const contentType = clone.headers.get("content-type") || "";
      if (contentType.includes("multipart/form-data")) {
        return { json: null, form: await clone.formData() };
      }
      const text = await clone.text();
      if (!text) return { json: null, form: null };
      try {
        return { json: JSON.parse(text), form: null };
      } catch {
        return { json: null, form: null };
      }
    } catch {
      return { json: null, form: null };
    }
  }

  return { json: null, form: null };
}

function toResponse(status: number, body: any): Response {
  const payload = body === undefined ? {} : body;
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Demo-Mode": "true",
    },
  });
}

/**
 * Patch window.fetch once, before the app renders.
 * All /api requests are answered from the in-browser demo database.
 */
export function installDemoMode() {
  if (!DEMO_MODE || typeof window === "undefined") return;
  const w = window as any;
  if (w.__TEAMCONNECT_DEMO_INSTALLED__) return;
  w.__TEAMCONNECT_DEMO_INSTALLED__ = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let rawUrl = "";
    let method = (init?.method || "GET").toUpperCase();

    if (typeof input === "string") rawUrl = input;
    else if (typeof URL !== "undefined" && input instanceof URL) rawUrl = input.toString();
    else if (typeof Request !== "undefined" && input instanceof Request) {
      rawUrl = input.url;
      if (!init?.method) method = input.method.toUpperCase();
    }

    let url: URL;
    try {
      url = new URL(rawUrl, window.location.origin);
    } catch {
      return originalFetch(input as any, init);
    }

    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (!shouldHandle(url, path)) return originalFetch(input as any, init);

    // Normalise paths that hit the backend host without the /api prefix.
    const apiPath = path.startsWith("/api") ? path : `/api${path}`;

    const { json, form } = await readBody(input, init);
    try {
      const result = await handleDemoRequest({ method, path: apiPath, url, json, form });
      if (!result) return originalFetch(input as any, init);
      return toResponse(result.status, result.body);
    } catch (err) {
      console.error("[demo] mock request failed", apiPath, err);
      return toResponse(500, { message: "Demo request failed", detail: String(err) });
    }
  };

  console.info(
    "%cTeam Connect · DEMO MODE%c\nAll data is stored in this browser. Nothing is sent to a server.",
    "background:#2563eb;color:#fff;padding:2px 6px;border-radius:4px;font-weight:700",
    "color:#64748b",
  );
  w.__TEAMCONNECT_DEMO__ = {
    reset() {
      resetDemoDb();
      window.location.reload();
    },
    account: DEMO_ACCOUNT,
  };
}

/** Auth payload for the demo account (matches the seeded organization). */
export function getDemoAuthUser() {
  const db = getDemoDb();
  const user = db.users.find((u: any) => u.id === DEMO_USER_ID) || db.users[0];
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
    avatar: user.avatar,
    status: user.status,
    activity: user.activity,
  };
}
