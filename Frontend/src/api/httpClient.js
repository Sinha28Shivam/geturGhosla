export function createHttpClient({ getBaseUrl, getToken }) {
  return async function httpClient(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const body = options.body;

    if (!(body instanceof URLSearchParams) && body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${getBaseUrl()}${path}`, {
      ...options,
      headers,
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const detail =
        typeof payload === "string"
          ? payload
          : payload.detail || payload.message || JSON.stringify(payload);

      throw new Error(detail);
    }

    return payload;
  };
}
