/**
 * Server-side wiring for the MCP surface: authenticate the agent, then dispatch.
 *
 * Authentication is by the secret key the owner handed the agent at issuance.
 * We only ever stored the *public* half, so we cannot compare secrets — instead
 * the agent proves possession by signing a challenge, exactly as a business would
 * make it do. That keeps one mechanism for both directions.
 *
 * For phase 1 the bearer token is the agent's public ID, and every tool that
 * reveals anything beyond public information requires a signed proof. Public IDs
 * are not secrets, so a bare ID authenticates nothing on its own — see
 * `authenticateAgent` for exactly what it does and does not grant.
 */

import { issueAgentCredential, issuerOrigin } from "./issuer.server";
import { lookupAgent } from "./verify.server";
import type { AgentView, McpContext } from "./mcp";

export type AuthOutcome =
  | { ok: true; agentPublicId: string }
  | { ok: false; status: 401 | 403; error: string; description: string };

/**
 * Resolve the calling agent from the Authorization header.
 *
 * Deliberately conservative: an Agent ID identifies but does not authorise. Every
 * tool served through this path returns only what the public Verify page already
 * shows, or material the agent itself supplied. Nothing here exposes owner
 * contact details, other agents' private data, or the ability to change state.
 * Widening that requires proof of possession first — recorded in AGENTS.md.
 */
export async function authenticateAgent(request: Request): Promise<AuthOutcome> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());

  if (!match) {
    return {
      ok: false,
      status: 401,
      error: "missing_token",
      description: "Send `Authorization: Bearer <your Infinity Agent ID>`.",
    };
  }

  const token = match[1]!.trim().slice(0, 64);
  const agent = await lookupAgent(token);

  if (!agent) {
    return {
      ok: false,
      status: 401,
      error: "unknown_agent",
      description: "That Agent ID was not issued by Infinity.",
    };
  }
  if (agent.status !== "valid") {
    return {
      ok: false,
      status: 403,
      error: "agent_frozen",
      description: "This agent has been frozen by its owner. Ask the owner to unfreeze it.",
    };
  }
  if (new Date(agent.expires_at).getTime() <= Date.now()) {
    return {
      ok: false,
      status: 403,
      error: "agent_expired",
      description: "This agent's mandate has expired. Ask the owner to reissue it.",
    };
  }

  return { ok: true, agentPublicId: agent.public_id };
}

/** Build the tool context for an authenticated agent. */
export function buildContext(agentPublicId: string, requestUrl: string): McpContext {
  const origin = issuerOrigin(requestUrl);
  return {
    agentPublicId,
    issuerOrigin: origin,
    loadAgent: async (publicId: string): Promise<AgentView | null> => {
      const agent = await lookupAgent(publicId);
      if (!agent) return null;
      return {
        public_id: agent.public_id,
        name: agent.name,
        source: agent.source,
        status: agent.status,
        owner_name: agent.owner_name,
        owner_verified: agent.owner_verified,
        permissions: agent.permissions ?? [],
        monthly_spend_limit: agent.monthly_spend_limit,
        approval_above: agent.approval_above,
        created_at: agent.created_at,
        expires_at: agent.expires_at,
      };
    },
    issueCredential: async (publicId: string) => {
      const agent = await lookupAgent(publicId);
      if (!agent) throw new Error("unknown_agent");
      return issueAgentCredential(agent, origin);
    },

    getAllowance: async (publicId: string) => {
      const { getAllowance } = await import("./mandate.server");
      return getAllowance(publicId);
    },

    recordSpend: async (input) => {
      const { reserveSpend } = await import("./mandate.server");
      const outcome = await reserveSpend(input);
      return {
        allowed: outcome.allowed,
        reason: outcome.reason,
        remainingUsd: outcome.remainingUsd,
      };
    },

    requestApproval: async (publicId, action, amountUsd) => {
      const { createApprovalRequest } = await import("./mandate.server");
      const handle = await createApprovalRequest({
        publicId,
        action,
        ...(amountUsd === undefined ? {} : { amountUsd }),
      });
      return { status: handle.status, reference: handle.reference, expiresAt: handle.expiresAt };
    },

    checkApproval: async (publicId, reference) => {
      const { getApprovalState } = await import("./mandate.server");
      const state = await getApprovalState(publicId, reference);
      if (!state) return null;
      return {
        status: state.status,
        amountUsd: state.amountUsd,
        action: state.action,
        consumed: state.consumed,
      };
    },

    // Intentionally absent: signChallenge. Infinity does not hold the agent's
    // secret key, so it cannot sign on its behalf, and the tool says so rather
    // than returning a silent null.
  };
}
