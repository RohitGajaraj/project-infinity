/**
 * Server-side wiring for the MCP surface: authenticate the agent, then dispatch.
 *
 * Authentication is by the secret key the owner handed the agent at issuance.
 * We only ever stored the *public* half, so we cannot compare secrets — instead
 * the agent proves possession by signing a challenge, exactly as a business would
 * make it do. That keeps one mechanism for both directions.
 *
 * For phase 1 the bearer token is the agent's public ID. It identifies which
 * public record to load, but it authorizes nothing by itself. Read-only tools
 * expose only public verification material; every private or state-changing tool
 * additionally requires a fresh, request-bound Ed25519 proof which is consumed
 * atomically before dispatch.
 */

import {
  issueAgentCredential,
  issueMcpChallenge,
  issuerOrigin,
  verifyMcpChallenge,
} from "./issuer.server";
import { lookupAgent } from "./verify.server";
import type { AgentView, McpContext } from "./mcp";

export type AuthOutcome =
  | { ok: true; agentPublicId: string }
  | { ok: false; status: 401 | 403; error: string; description: string };

/**
 * Resolve the calling agent from the Authorization header.
 *
 * Deliberately conservative: an Agent ID identifies but does not authorise. This
 * step establishes only which public record the caller names and whether it is
 * live. The route must call `authorizeMcpToolCall` before dispatching any private
 * or state-changing tool; keeping that check at the transport boundary prevents
 * a future dispatcher branch from accidentally treating a public ID as a secret.
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

/**
 * Stateless, issuer-authenticated challenge issuance. Persistence happens only
 * after a valid agent signature, when the database records the challenge as
 * consumed. Anonymous callers cannot allocate rows or lock agent records.
 */
export async function createMcpChallenge(agentPublicId: string, now = Date.now()) {
  const issued = await issueMcpChallenge(agentPublicId, now);
  return { nonce: issued.challenge, expiresAt: issued.expiresAt };
}

const PROTECTED_TOOLS = new Set([
  "get_limits",
  "record_spend",
  "request_approval",
  "check_approval",
]);

export function protectedMcpTool(message: {
  method?: string;
  params?: Record<string, unknown>;
}): string | null {
  if (message.method !== "tools/call") return null;
  const name = typeof message.params?.["name"] === "string" ? message.params["name"] : "";
  return PROTECTED_TOOLS.has(name) ? name : null;
}

export type McpAuthorizationOutcome =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "proof_required"
        | "bad_signature"
        | "challenge_invalid_or_replayed"
        | "unknown_or_unusable_agent"
        | "failed";
    };

type SignedActionFailure =
  "unknown_or_unusable_agent" | "bad_signature" | "challenge_invalid_or_replayed" | "failed";

type SignedActionRecorder = (
  input: unknown,
) => Promise<
  { ok: true; eventId: number; hash: string } | { ok: false; reason: SignedActionFailure }
>;

/**
 * Authorize one protected MCP call with a fresh proof over the exact HTTP body.
 * The database consumes the nonce before dispatch, so retries must obtain a new
 * challenge and a captured request cannot be replayed.
 */
export async function authorizeMcpToolCall(
  input: {
    publicId: string;
    toolName: string;
    nonce: string | null;
    signature: string | null;
    requestUrl: string;
    requestBody: string;
  },
  injectedRecorder?: SignedActionRecorder,
): Promise<McpAuthorizationOutcome> {
  if (!input.nonce || !input.signature) return { ok: false, reason: "proof_required" };
  if (!(await verifyMcpChallenge(input.nonce, input.publicId))) {
    return { ok: false, reason: "challenge_invalid_or_replayed" };
  }

  const recorder =
    injectedRecorder ?? (await import("./actions.functions")).recordAgentSignedAction;
  const result = await recorder({
    publicId: input.publicId,
    nonce: input.nonce,
    kind: "mcp_authorized",
    detail: `Authorized MCP ${input.toolName}`,
    signature: input.signature,
    method: "POST",
    url: input.requestUrl,
    body: input.requestBody,
  });

  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}
