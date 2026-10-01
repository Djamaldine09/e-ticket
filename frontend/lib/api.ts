import { ApiResponse } from "@/types";

const BASE_URL = "/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function parseResponse<T>(res: Response): Promise<ApiResponse<T> | null> {
  const raw = await res.text();

  if (!raw.trim()) {
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    return null;
  }

  try {
    return JSON.parse(raw) as ApiResponse<T>;
  } catch {
    const body = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const preview = body.slice(0, 180);

    if (!res.ok) {
      throw new Error(
        preview
          ? `HTTP ${res.status}: ${preview}`
          : `HTTP error ${res.status}`
      );
    }

    throw new Error(
      preview
        ? `Réponse serveur invalide (HTTP ${res.status}): ${preview}`
        : `Réponse serveur invalide (HTTP ${res.status})`
    );
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const json = await parseResponse<T>(res);

  if (!res.ok) {
    throw new Error(json?.message || `HTTP error ${res.status}`);
  }

  if (!json) {
    throw new Error(`Réponse serveur vide (HTTP ${res.status})`);
  }

  return json;
}

async function uploadFile<T>(
  path: string,
  file: File,
  fieldName = "file"
): Promise<ApiResponse<T>> {
  const token = getToken();
  const formData = new FormData();
  formData.append(fieldName, file);

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const json = await parseResponse<T>(res);

  if (!res.ok) {
    throw new Error(json?.message || `HTTP error ${res.status}`);
  }

  if (!json) {
    throw new Error(`Réponse serveur vide (HTTP ${res.status})`);
  }

  return json;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  uploadFile: <T>(path: string, file: File, fieldName?: string) =>
    uploadFile<T>(path, file, fieldName),
};
