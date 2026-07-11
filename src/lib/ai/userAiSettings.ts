export type UserAiProvider = "google" | "openai";

export type UserAiSettings = {
  provider: UserAiProvider;
  apiKey: string;
};

const storageKey = "pet-user-ai-settings-v1";

export function loadUserAiSettings(): UserAiSettings | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const value = window.sessionStorage.getItem(storageKey);
    if (!value) return undefined;
    const parsed = JSON.parse(value) as Partial<UserAiSettings>;
    if (
      (parsed.provider !== "google" && parsed.provider !== "openai") ||
      typeof parsed.apiKey !== "string" ||
      !parsed.apiKey.trim()
    ) {
      return undefined;
    }
    return { provider: parsed.provider, apiKey: parsed.apiKey };
  } catch {
    return undefined;
  }
}

export function saveUserAiSettings(settings: UserAiSettings): void {
  window.sessionStorage.setItem(storageKey, JSON.stringify(settings));
}

export function clearUserAiSettings(): void {
  window.sessionStorage.removeItem(storageKey);
}

export function createUserAiHeaders(
  settings: UserAiSettings | undefined,
): Record<string, string> {
  if (!settings) return { "content-type": "application/json" };
  return {
    "content-type": "application/json",
    "x-pet-ai-provider": settings.provider,
    "x-pet-ai-key": settings.apiKey,
  };
}
