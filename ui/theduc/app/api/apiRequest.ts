import { getCsrfToken } from "./sessionToken";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function readError(response: Response) {
  const rawBody = await response.text();
  if (rawBody) {
    try {
      const body: unknown = JSON.parse(rawBody);
      if (body && typeof body === "object") {
        if ("detail" in body && typeof body.detail === "string") return body.detail;
        if ("message" in body && typeof body.message === "string") return body.message;
        if ("title" in body && typeof body.title === "string") return body.title;
      }
    } catch {
      return rawBody;
    }
  }
  if (response.status === 401) return "Phiên đăng nhập đã hết hạn hoặc không hợp lệ.";
  if (response.status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  return rawBody || `Yêu cầu thất bại (${response.status})`;
}

export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (method !== "GET" && method !== "HEAD" && getCsrfToken()) {
    headers.set("X-CSRF-TOKEN", getCsrfToken());
  }

  const response = await fetch(url, {
    ...init,
    method,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
