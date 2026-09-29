import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type VerifiedAgent = Database["public"]["Functions"]["verify_agent"]["Returns"][number];

export async function lookupAgent(publicId: string): Promise<VerifiedAgent | null> {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await sb.rpc("verify_agent", { _public_id: publicId });
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}
