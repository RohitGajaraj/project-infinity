/**
 * Server-side Supabase client using the *publishable* key.
 *
 * Deliberately not the service-role client: everything public-facing here
 * (verification, waitlist) should be constrained by the same RLS a browser
 * would be. If a policy is wrong, we want it to fail in development rather than
 * be silently bypassed by elevated credentials.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

let cached: ReturnType<typeof create> | undefined;

export function publicClient() {
  if (cached) return cached;
  cached = create();
  return cached;
}

function create() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    const missing = [!url && "SUPABASE_URL", !key && "SUPABASE_PUBLISHABLE_KEY"].filter(Boolean);
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}.`);
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        // Newer publishable keys are opaque strings rather than bearer JWTs.
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}
