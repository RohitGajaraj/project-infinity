import { publicClient } from "./supabase-public.server";
import type { Database } from "@/integrations/supabase/types";

export type VerifiedAgent = Database["public"]["Functions"]["verify_agent"]["Returns"][number] & {
  owner_attestation_expires_at?: string | null;
  mandate_version?: number;
  mandate_issued_at?: string;
  credential_revision?: string;
};

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

export function mandateLifecycle(agent: VerifiedAgent): {
  version: number;
  issuedAt: string;
  revision: string;
} | null {
  if (
    !Number.isInteger(agent.mandate_version) ||
    (agent.mandate_version ?? 0) < 1 ||
    typeof agent.mandate_issued_at !== "string" ||
    !Number.isFinite(Date.parse(agent.mandate_issued_at)) ||
    typeof agent.credential_revision !== "string" ||
    !/^[0-9a-f]{64}$/.test(agent.credential_revision)
  ) {
    return null;
  }
  return {
    version: agent.mandate_version!,
    issuedAt: agent.mandate_issued_at,
    revision: agent.credential_revision,
  };
}
