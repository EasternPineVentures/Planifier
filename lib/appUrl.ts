export const PLANIFIER_DEFAULT_APP_URL = "https://planifier.cloud";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function normalizeAppUrl(raw?: string | null): URL {
  const trimmed = raw?.trim();
  const candidate =
    trimmed && trimmed.length > 0 ? trimmed : PLANIFIER_DEFAULT_APP_URL;
  const withProtocol = /^https?:\/\//i.test(candidate)
    ? candidate
    : `https://${candidate}`;

  try {
    const url = new URL(withProtocol);
    const isLocal = LOCAL_HOSTS.has(url.hostname);

    if (url.protocol === "http:" && !isLocal) {
      url.protocol = "https:";
    }

    url.pathname = "/";
    url.search = "";
    url.hash = "";

    return url;
  } catch {
    return new URL(PLANIFIER_DEFAULT_APP_URL);
  }
}

export function getAppUrl(): URL {
  return normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);
}

export function getAppOrigin(): string {
  return getAppUrl().origin;
}
