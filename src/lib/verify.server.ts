import { publicClient } from "./supabase-public.server";
import type { Database } from "@/integrations/supabase/types";

export type VerifiedAgent = Database["public"]["Functions"]["verify_agent"]["Returns"][number];

/**
 * The single read path for public verification.
 *
 * Goes through the security-definer `verify_agent` function rather than the
 * tables, so anonymous callers can learn an agent's status without any table
 * being readable by `anon`.
 */
export async function lookupAgent(publicId: string): Promise<VerifiedAgent | null> {
  const { data, error } = await publicClient().rpc("verify_agent", { _public_id: publicId });
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}
