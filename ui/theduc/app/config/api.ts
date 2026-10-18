const configuredApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

export const API_BASE_URL = (configuredApiUrl || "http://localhost:8080/api").replace(/\/+$/, "");
