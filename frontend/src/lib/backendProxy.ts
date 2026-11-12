/**
 * Universal backend proxy helper for Next.js API routes.
 *
 * Designed to ensure seamless operation both on local development and when hosted on Vercel:
 * - If BACKEND_URL or NEXT_PUBLIC_API_URL is configured, attempts to forward with a strict timeout.
 * - In local dev (non-Vercel, non-production), falls back to 127.0.0.1:8000.
 * - On Vercel / serverless without an external backend, avoids hanging connections to dead localhost ports.
 */

export async function forwardToBackend<T = any>(
  endpoint: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    timeoutMs?: number;
  } = {}
): Promise<T | null> {
  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
  const isProd = process.env.NODE_ENV === "production";

  // Determine backend base URL (must be an absolute HTTP/HTTPS URL)
  let backendBase = process.env.BACKEND_URL;
  if (!backendBase && process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith("http")) {
    backendBase = process.env.NEXT_PUBLIC_API_URL;
  }

  // Only allow localhost:8000 if running locally (NOT on Vercel and NOT in production without explicit URL)
  if (!backendBase && !isVercel && !isProd) {
    backendBase = "http://127.0.0.1:8000";
  }

  // If no backend is configured or running on Vercel without BACKEND_URL, return null immediately
  if (!backendBase || !backendBase.startsWith("http")) {
    return null;
  }

  const cleanBase = backendBase.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const targetUrl = `${cleanBase}/api/v1${cleanEndpoint}`;

  const timeoutMs = options.timeoutMs ?? (isVercel ? 2000 : 3500);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    const res = await fetch(targetUrl, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (res.ok) {
      return (await res.json()) as T;
    }
  } catch {
    // Timeout or network unreachable: gracefully return null to trigger serverless fallback
  }

  return null;
}

