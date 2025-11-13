import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type JsonError = {
  error?: string;
  message?: string;
};

export async function fetcher<T = unknown>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, {
    credentials: "same-origin",
    ...init,
  });

  if (!response.ok) {
    let reason: string | undefined;
    try {
      const payload = (await response.json()) as JsonError;
      reason = payload.error ?? payload.message;
    } catch {
      reason = undefined;
    }
    throw new Error(reason || "No se pudo obtener la información solicitada.");
  }

  return response.json() as Promise<T>;
}
