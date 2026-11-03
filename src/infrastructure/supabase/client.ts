import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export function validPublicConfig(url: unknown, key: unknown): boolean {
  if (
    typeof url !== "string" ||
    typeof key !== "string" ||
    !key.startsWith("sb_publishable_")
  )
    return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "jhweepsclnottxqgppqf.supabase.co" &&
      parsed.pathname === "/"
    );
  } catch {
    return false;
  }
}
export const supabase =
  import.meta.env.VITE_AUTH_MODE !== "local" && validPublicConfig(url, key)
    ? createClient(url!, key!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storageKey: "ciao-auth-v1",
        },
        global: {
          headers: { "X-Client-Info": "ciao-pizza-web" },
          fetch: async (input, init) => {
            const controller = new AbortController();
            const abort = () => controller.abort();
            if (init?.signal?.aborted) controller.abort();
            else init?.signal?.addEventListener("abort", abort, { once: true });
            const timeout = setTimeout(abort, 20000);
            try {
              return await fetch(input, { ...init, signal: controller.signal });
            } finally {
              clearTimeout(timeout);
              init?.signal?.removeEventListener("abort", abort);
            }
          },
        },
      })
    : null;
