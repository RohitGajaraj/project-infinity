/**
 * The MCP surface: how an agent actually uses Infinity.
 *
 * Until this existed, an agent could not interact with Infinity at all — §4 of the
 * brief says agents are the *main* users, and phase 1 served only humans (§9 G5).
 *
 * Two deliberate choices:
 *
 * 1. **Pure and transport-free.** This module holds the tool contracts and the
 *    dispatch logic; the route only carries JSON-RPC in and out. That makes every
 *    tool testable without a server, which matters because an agent's first
 *    experience of us is a tool call that either works or does not.
 *
 * 2. **Tool descriptions are written for a model's context window, not for docs.**
 *    Each one states what it does, when to reach for it, and what it costs, because
 *    a tool a model misuses is worse than a tool it ignores.
 */

import { decideSpend, describeMandate, type Allowance } from "./mandate";

export const MCP_PROTOCOL_VERSION = "2025-06-18";
export const SERVER_NAME = "infinity";
export const SERVER_VERSION = "0.1.0";

// ------------------------------------------------------------------ JSON-RPC

export type JsonRpcId = string | number | null;

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
};

export type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: JsonRpcId; result: unknown }
  | { jsonrpc: "2.0"; id: JsonRpcId; error: { code: number; message: string; data?: unknown } };

/** Standard JSON-RPC codes, plus the MCP convention of -32002 for "not ready". */
export const RPC = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internalError: -32603,
  unauthorized: -32002,
} as const;

export function rpcResult(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

export function rpcError(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: data === undefined ? { code, message } : { code, message, data },
  };
}

// -------------------------------------------------------------------- tools

export type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

function schema(properties: Record<string, unknown>, required: string[] = []) {
  return { type: "object", properties, required, additionalProperties: false };
}

const AGENT_ID_PROP = {
  type: "string",
  description: "An Infinity Agent ID, e.g. inf_7Q2K-9XRM-4LTB.",
  maxLength: 64,
};

/**
 * The five tools.
 *
 * `verify_agent` is listed last on purpose: it is the only one an agent uses to
 * check *someone else*, and putting it beside the self-describing tools invites a
 * model to call it on itself.
 */
export const TOOLS: ToolDefinition[] = [
  {
    name: "whoami",
    title: "Who am I",
    description:
      "Return this agent's own Infinity identity: its Agent ID, who it acts for, whether that owner passed an identity check, and its current status. Call this once at the start of a task so you can tell a business who you are. Free.",
    inputSchema: schema({}),
  },
  {
    name: "get_limits",
    title: "Get my limits",
    description:
      "Return what this agent is permitted to do: allowed actions, monthly spending cap, the amount above which the owner must approve, and the expiry date. Call this BEFORE spending money or taking an action you are unsure about, rather than attempting it and being refused. Free.",
    inputSchema: schema({}),
  },
  {
    name: "get_credential",
    title: "Get my signed credential",
    description:
      "Return this agent's signed identity credential. Call this when a business asks you to prove who you are, or refuses to deal with you until you identify yourself. Hand the credential over; the business can check the signature without contacting Infinity. If it also sent a challenge string, pass that as `challenge` to get proof you hold your own key. Free.",
    inputSchema: schema({
      challenge: {
        type: "string",
        description:
          "Optional. A nonce supplied by the business you are proving yourself to. Include it and the response carries a signature over it.",
        maxLength: 256,
      },
      method: {
        type: "string",
        description: "HTTP method of the request you are proving, e.g. POST.",
        maxLength: 16,
      },
      url: {
        type: "string",
        description: "Absolute URL of the request you are proving.",
        maxLength: 500,
      },
    }),
  },
  {
    name: "request_approval",
    title: "Ask my owner to approve something",
    description:
      "Ask the human or company accountable for this agent to approve a specific action that falls outside its limits — for example a purchase above the approval threshold. Returns a decision or a pending reference. Use this INSTEAD of abandoning a task when get_limits says you may not proceed. A human answers, so this can take seconds to minutes.",
    inputSchema: schema(
      {
        action: {
          type: "string",
          description:
            "Plain description of exactly what you want to do, as the owner will read it.",
          maxLength: 500,
        },
        amount_usd: {
          type: "number",
          description: "Amount in USD, if money is involved.",
          minimum: 0,
        },
      },
      ["action"],
    ),
  },
  {
    name: "check_approval",
    title: "Check whether my owner decided",
    description:
      "Check the outcome of an approval you requested earlier, using the reference request_approval gave you. Call this after request_approval returns `pending`. Do not proceed while the answer is still pending, and do not re-request — that just asks your owner the same question twice.",
    inputSchema: schema(
      {
        reference: {
          type: "string",
          description: "The reference from request_approval.",
          maxLength: 200,
        },
      },
      ["reference"],
    ),
  },
  {
    name: "record_spend",
    title: "Record money spent",
    description:
      "Record money you are about to spend, and find out whether you are allowed to. This ENFORCES the limit rather than reporting it: if it returns allowed=false, the spend has not been recorded and you must not proceed. Call it BEFORE paying. For an amount above your approval threshold, pass the reference of an approved request. `reference` must be derived from the thing you are paying for, never a random value, so a retry cannot double-charge.",
    inputSchema: schema(
      {
        amount_usd: { type: "number", description: "Amount in USD.", minimum: 0 },
        detail: {
          type: "string",
          description: "What the money is for, as your owner will read it.",
          maxLength: 300,
        },
        reference: {
          type: "string",
          description:
            "Stable idempotency key derived from the purchase, e.g. an order ID. The same reference is only ever charged once.",
          maxLength: 200,
        },
        approval_reference: {
          type: "string",
          description: "Required when the amount is above your approval threshold.",
          maxLength: 200,
        },
      },
      ["amount_usd", "reference"],
    ),
  },
  {
    name: "verify_agent",
    title: "Verify another agent",
    description:
      "Check whether ANOTHER agent is genuine before dealing with it: whether its ID was issued by Infinity, who it acts for, what it may do, and whether it is currently frozen. Use this when another agent contacts you. Do not call it on your own ID — use whoami for that. Free.",
    inputSchema: schema({ agent_id: AGENT_ID_PROP }, ["agent_id"]),
  },
];

// ----------------------------------------------------------------- dispatch

/**
 * Everything a tool call needs from the outside world, injected so the dispatcher
 * stays pure and fully testable.
 */
export type McpContext = {
  /** The authenticated agent's public ID, resolved from the bearer token. */
  agentPublicId: string;
  /** Current identity and mandate, as the public verify function returns it. */
  loadAgent: (publicId: string) => Promise<AgentView | null>;
  /** Mint the signed credential for an agent. */
  issueCredential: (publicId: string) => Promise<string>;
  /** Sign a challenge on the agent's behalf. Null when the agent holds its own key. */
  signChallenge?: (publicId: string, parts: ProofRequest) => Promise<string | null>;
  /** Record an approval request. Returns the decision or a pending reference. */
  requestApproval?: (
    publicId: string,
    action: string,
    amountUsd: number | undefined,
  ) => Promise<{ status: string; reference: string; expiresAt?: string }>;
  /** Read the outcome of a previously raised approval. */
  checkApproval?: (
    publicId: string,
    reference: string,
  ) => Promise<{
    status: string;
    amountUsd: number;
    action: string;
    consumed: boolean;
    mandateVersion?: number | null;
    currentMandateVersion?: number;
    keyVersion?: number | null;
    currentKeyVersion?: number;
  } | null>;
  /** Current allowance, so guidance reflects what is actually left. */
  getAllowance?: (publicId: string) => Promise<Allowance | null>;
  /** Enforce and record a spend. Atomic on the database side. */
  recordSpend?: (input: {
    publicId: string;
    amountUsd: number;
    detail: string;
    reference: string;
    approvalReference?: string;
  }) => Promise<{ allowed: boolean; reason: string; remainingUsd: number }>;
  issuerOrigin: string;
};

export type ProofRequest = { challenge: string; method: string; url: string };

export type AgentView = {
  public_id: string;
  name: string;
  source: string;
  status: string;
  owner_name: string | null;
  owner_verified: boolean;
  permissions: string[];
  monthly_spend_limit: number;
  /** null = no approval gate; 0 = every spend needs approval. */
  approval_above: number | null;
  created_at: string;
  expires_at: string;
  mandate_version?: number;
  mandate_issued_at?: string;
  key_version?: number;
  key_activated_at?: string;
  key_fingerprint?: string;
  credential_revision?: string;
};

export type ToolOutcome = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

const REFUSAL_HINTS: Record<string, string> = {
  over_monthly_limit:
    "Nothing authorises exceeding the monthly ceiling, not even owner approval. Do not call request_approval; tell your owner the limit is too low.",
  no_allowance_left: "The monthly allowance is used up. It resets at the start of next month.",
  owner_approval_required:
    "Call request_approval, wait for check_approval to return approved, then call record_spend again with approval_reference set.",
  approval_invalid:
    "That approval is missing, denied, expired, already used, or for a smaller amount than you are trying to spend.",
  agent_frozen: "Your owner has frozen you. Stop and report to your owner.",
  agent_expired: "Your mandate has expired. Ask your owner to reissue it.",
  invalid_amount: "The amount must be a number of zero or more.",
  reference_reused:
    "This reference was already used for a DIFFERENT amount. References identify one specific charge, so pick a reference that matches what you are paying for now.",
  invalid_reference: "The reference is missing or longer than 200 characters.",
  amount_not_in_cents: "Amounts must be whole cents, so at most two decimal places.",
  contention_retry:
    "Another request for this agent was in flight, so the outcome is unknown and nothing was recorded. Do not pay. Retry once with the SAME reference.",
  key_version_conflict:
    "The agent key changed after this request was authorized. Obtain a fresh credential and challenge, then retry without paying first.",
};

function text(value: unknown): ToolOutcome {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function failure(message: string, hint?: string): ToolOutcome {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ error: message, ...(hint ? { hint } : {}) }, null, 2),
      },
    ],
    isError: true,
  };
}

/** Shape an agent's own identity for a model to read and repeat aloud. */
function selfView(agent: AgentView, origin: string) {
  return {
    agent_id: agent.public_id,
    name: agent.name,
    platform: agent.source,
    status: agent.status,
    mandate_version: agent.mandate_version ?? 1,
    key_version: agent.key_version ?? 1,
    key_fingerprint: agent.key_fingerprint,
    acting_for: {
      name: agent.owner_name ?? "Unnamed owner",
      name_source: "self_declared",
      identity_verified: agent.owner_verified,
    },
    // The display label is account-controlled; the attestation applies to the
    // account holder, not to a name extracted from provider evidence.
    how_to_introduce_yourself: agent.owner_verified
      ? `I am an AI agent acting for the account labelled ${agent.owner_name ?? "Unnamed owner"} (an owner-supplied name). That account has an Infinity-asserted identity attestation. My Agent ID is ${agent.public_id}, checkable at ${origin}/verify/${agent.public_id}.`
      : `I am an AI agent acting for the account labelled ${agent.owner_name ?? "Unnamed owner"} (an owner-supplied name). My Agent ID is ${agent.public_id}, checkable at ${origin}/verify/${agent.public_id}. The account holder has not completed an identity check yet.`,
    verify_url: `${origin}/verify/${agent.public_id}`,
  };
}

function limitsView(agent: AgentView) {
  return {
    mandate_version: agent.mandate_version ?? 1,
    key_version: agent.key_version ?? 1,
    key_fingerprint: agent.key_fingerprint,
    mandate_issued_at: agent.mandate_issued_at ?? agent.created_at,
    permitted_actions: agent.permissions,
    monthly_spend_limit_usd: agent.monthly_spend_limit,
    owner_approval_required_above_usd: agent.approval_above,
    expires_at: agent.expires_at,
    status: agent.status,
    guidance:
      agent.approval_above !== null && agent.approval_above > 0
        ? `Spend up to $${agent.approval_above} without asking. Between $${agent.approval_above} and $${agent.monthly_spend_limit}, call request_approval first. Never exceed $${agent.monthly_spend_limit}.`
        : `Never exceed $${agent.monthly_spend_limit} in a month.`,
  };
}

export async function callTool(
  name: string,
  args: Record<string, unknown>,
  ctx: McpContext,
): Promise<ToolOutcome> {
  switch (name) {
    case "whoami": {
      const agent = await ctx.loadAgent(ctx.agentPublicId);
      if (!agent)
        return failure("unknown_agent", "This credential does not correspond to a live agent.");
      return text(selfView(agent, ctx.issuerOrigin));
    }

    case "get_limits": {
      const agent = await ctx.loadAgent(ctx.agentPublicId);
      if (!agent) return failure("unknown_agent");

      // Report what is actually left, not just what was granted. A limit without a
      // balance is guidance an agent cannot act on.
      const allowance = ctx.getAllowance ? await ctx.getAllowance(ctx.agentPublicId) : null;
      return text({
        ...limitsView(agent),
        ...(allowance
          ? {
              spent_this_month_usd: allowance.spentThisMonthUsd,
              remaining_this_month_usd: allowance.remainingUsd,
              period_started: allowance.periodStart,
              guidance: describeMandate(
                {
                  permissions: agent.permissions,
                  monthlySpendLimitUsd: agent.monthly_spend_limit,
                  approvalAboveUsd: agent.approval_above,
                },
                allowance,
              ),
            }
          : {}),
      });
    }

    case "record_spend": {
      const amountRaw = args["amount_usd"];
      const amountUsd =
        typeof amountRaw === "number" && Number.isFinite(amountRaw) ? amountRaw : NaN;
      const reference = typeof args["reference"] === "string" ? args["reference"].trim() : "";
      if (Number.isNaN(amountUsd) || amountUsd < 0) {
        return failure("invalid_params", "`amount_usd` must be a number of zero or more.");
      }
      if (!reference) {
        return failure(
          "invalid_params",
          "`reference` is required. Derive it from what you are paying for, e.g. an order ID, so a retry cannot double-charge.",
        );
      }
      if (!ctx.recordSpend) {
        return failure(
          "spending_not_available",
          "Spend enforcement is not enabled on this deployment. Do not proceed with a payment.",
        );
      }

      const agent = await ctx.loadAgent(ctx.agentPublicId);
      if (!agent) return failure("unknown_agent");

      // Decide locally first so a refusal that cannot be fixed by asking is named
      // as such, rather than surfacing an opaque database reason code.
      const allowance = ctx.getAllowance ? await ctx.getAllowance(ctx.agentPublicId) : null;
      if (allowance) {
        const local = decideSpend(
          {
            permissions: agent.permissions,
            monthlySpendLimitUsd: agent.monthly_spend_limit,
            approvalAboveUsd: agent.approval_above,
          },
          allowance,
          { amountUsd },
        );
        if (local.decision === "refused") {
          return text({
            allowed: false,
            reason: local.reason,
            remaining_this_month_usd: allowance.remainingUsd,
            explanation: local.explanation,
            hint: REFUSAL_HINTS[local.reason] ?? "Do not proceed with this payment.",
          });
        }
      }

      const approvalReference =
        typeof args["approval_reference"] === "string"
          ? args["approval_reference"].trim()
          : undefined;

      const outcome = await ctx.recordSpend({
        publicId: ctx.agentPublicId,
        amountUsd,
        detail: typeof args["detail"] === "string" ? args["detail"].slice(0, 300) : "",
        reference,
        ...(approvalReference ? { approvalReference } : {}),
      });

      return text({
        allowed: outcome.allowed,
        reason: outcome.reason,
        remaining_this_month_usd: outcome.remainingUsd,
        explanation: outcome.allowed
          ? outcome.reason === "already_recorded"
            ? "This reference was already recorded, so nothing was charged again. You may proceed."
            : "Recorded against your monthly allowance. You may proceed with the payment."
          : "This spend was NOT recorded. Do not proceed with the payment.",
        ...(outcome.allowed ? {} : { hint: REFUSAL_HINTS[outcome.reason] ?? "Do not proceed." }),
      });
    }

    case "check_approval": {
      const reference = typeof args["reference"] === "string" ? args["reference"].trim() : "";
      if (!reference) return failure("invalid_params", "`reference` is required.");
      if (!ctx.checkApproval) return failure("approvals_not_available");

      const state = await ctx.checkApproval(ctx.agentPublicId, reference);
      if (!state) {
        return failure(
          "unknown_approval",
          "No approval request with that reference belongs to you.",
        );
      }

      return text({
        status: state.status,
        action: state.action,
        amount_usd: state.amountUsd,
        already_used: state.consumed,
        mandate_version: state.mandateVersion ?? null,
        current_mandate_version: state.currentMandateVersion ?? null,
        key_version: state.keyVersion ?? null,
        current_key_version: state.currentKeyVersion ?? null,
        explanation:
          state.status === "superseded"
            ? "This approval belongs to an older mandate or agent-key version and cannot authorize anything. Request a new approval under the current authority."
            : state.status === "approved" && !state.consumed
              ? "Approved. Call record_spend with this reference as approval_reference. It can only be used once."
              : state.status === "approved" && state.consumed
                ? "Approved, but already used for a spend. Request a new approval if you need to spend again."
                : state.status === "pending"
                  ? "Still waiting on your owner. Do not proceed, and do not raise the request again."
                  : state.status === "denied"
                    ? "Your owner denied this. Do not proceed, and do not ask again for the same thing."
                    : "This request expired before your owner answered. Raise a new one if it is still needed.",
      });
    }

    case "get_credential": {
      const agent = await ctx.loadAgent(ctx.agentPublicId);
      if (!agent) return failure("unknown_agent");

      const credential = await ctx.issueCredential(ctx.agentPublicId);
      const challenge = typeof args["challenge"] === "string" ? args["challenge"] : undefined;

      let proof: string | null = null;
      if (challenge && ctx.signChallenge) {
        proof = await ctx.signChallenge(ctx.agentPublicId, {
          challenge,
          method: typeof args["method"] === "string" ? args["method"] : "MCP",
          url: typeof args["url"] === "string" ? args["url"] : `${ctx.issuerOrigin}/mcp`,
        });
      }

      return text({
        credential,
        format: "vc+jwt",
        jwks_uri: `${ctx.issuerOrigin}/.well-known/jwks.json`,
        status_endpoint: `${ctx.issuerOrigin}/api/public/status/${agent.public_id}?mandate_version=${agent.mandate_version ?? 1}&key_version=${agent.key_version ?? 1}&revision=${encodeURIComponent(agent.credential_revision ?? `legacy-m${agent.mandate_version ?? 1}-k${agent.key_version ?? 1}`)}`,
        ...(challenge
          ? {
              proof_of_possession: proof,
              // Say so plainly rather than returning a silent null: the agent
              // holds its own secret key, so in most setups it must sign itself.
              ...(proof
                ? {}
                : {
                    proof_of_possession_note:
                      "Infinity does not hold your secret key, so it cannot sign for you. Sign the canonical string yourself: INFINITY-POP-v1, nonce, uppercased method, url, and the SHA-256 hex of the body, joined by newlines.",
                  }),
            }
          : {}),
        how_to_present:
          "Give `credential` to the business. It can verify the signature offline against jwks_uri, and check status_endpoint for whether your owner has frozen you.",
      });
    }

    case "request_approval": {
      const action = typeof args["action"] === "string" ? args["action"].trim() : "";
      if (!action)
        return failure(
          "invalid_params",
          "`action` is required and must describe what you want to do.",
        );
      const amountRaw = args["amount_usd"];
      const amountUsd =
        typeof amountRaw === "number" && Number.isFinite(amountRaw) ? amountRaw : undefined;

      const agent = await ctx.loadAgent(ctx.agentPublicId);
      if (!agent) return failure("unknown_agent");

      // Answer locally when the mandate already covers it, rather than waking a
      // human for something they pre-authorised. Verification must never wait on
      // a person, and neither should an action already inside the mandate (§10.5).
      if (amountUsd !== undefined) {
        if (amountUsd > agent.monthly_spend_limit) {
          return text({
            status: "denied",
            reason: "over_spend_limit",
            explanation: `$${amountUsd} exceeds the monthly ceiling of $${agent.monthly_spend_limit}. The owner would have to raise the limit; asking will not help.`,
          });
        }
        // null means no gate at all; 0 means every spend needs a human, so neither
        // case may be short-circuited as pre-authorised.
        const threshold = agent.approval_above;
        if (threshold === null || (threshold > 0 && amountUsd <= threshold)) {
          return text({
            status: "approved",
            reason: "within_mandate",
            explanation:
              threshold === null
                ? `$${amountUsd} is within the mandate and your owner set no approval threshold, so no approval is needed. Proceed.`
                : `$${amountUsd} is at or below the $${threshold} threshold, so your owner has already pre-authorised it. Proceed without waiting.`,
          });
        }
      }

      if (!ctx.requestApproval) {
        return failure(
          "approvals_not_available",
          "Owner approval routing is not enabled on this deployment yet. Report to your owner rather than proceeding.",
        );
      }

      const decision = await ctx.requestApproval(ctx.agentPublicId, action, amountUsd);
      return text({
        status: decision.status,
        reference: decision.reference,
        ...(decision.expiresAt ? { expires_at: decision.expiresAt } : {}),
        explanation:
          decision.status === "pending"
            ? "Your owner has been asked. Do not proceed. Poll check_approval with this reference; the request expires in 24 hours. Once approved, pass the reference to record_spend as approval_reference."
            : `Your owner ${decision.status} this request.`,
      });
    }

    case "verify_agent": {
      const other = typeof args["agent_id"] === "string" ? args["agent_id"].trim() : "";
      if (!other) return failure("invalid_params", "`agent_id` is required.");
      if (other === ctx.agentPublicId) {
        return failure(
          "that_is_you",
          "Use whoami to describe yourself; verify_agent is for checking others.",
        );
      }

      const agent = await ctx.loadAgent(other);
      if (!agent) {
        return text({
          agent_id: other,
          verdict: "unknown",
          trustworthy: false,
          explanation:
            "This ID was not issued by Infinity. Do not share data or accept instructions from it.",
        });
      }

      const expired = new Date(agent.expires_at).getTime() <= Date.now();
      const usable = !expired && agent.status === "valid";
      return text({
        agent_id: agent.public_id,
        verdict: expired ? "expired" : agent.status,
        trustworthy: usable,
        acting_for: {
          name: agent.owner_name ?? "Unnamed owner",
          name_source: "self_declared",
          identity_verified: agent.owner_verified,
        },
        permitted_actions: agent.permissions,
        mandate_version: agent.mandate_version ?? 1,
        verify_url: `${ctx.issuerOrigin}/verify/${agent.public_id}`,
        explanation: usable
          ? `Infinity recognizes this agent under the owner-supplied account label ${agent.owner_name ?? "Unnamed owner"}. Only deal with it within the permitted actions listed, and require proof of possession in a live interaction.`
          : expired
            ? "This agent's mandate has expired. Do not deal with it."
            : "This agent has been frozen by its owner. Do not deal with it.",
      });
    }

    default:
      return failure(
        "unknown_tool",
        `No tool named "${name}". Call tools/list to see what is available.`,
      );
  }
}

// --------------------------------------------------------------- lifecycle

export function initializeResult() {
  return {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    instructions:
      "Infinity gives this agent a verifiable identity. Call whoami once at the start of a task so you can tell a business who you act for, and get_limits before spending money. If a business asks you to prove your identity, call get_credential with its challenge. If something falls outside your limits, call request_approval rather than giving up or proceeding anyway.",
  };
}

/**
 * Handle one JSON-RPC message.
 *
 * Returns null for notifications, which by JSON-RPC must not be answered.
 */
export async function handleRpc(
  message: JsonRpcRequest,
  ctx: McpContext,
): Promise<JsonRpcResponse | null> {
  const id = message.id ?? null;

  if (message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return rpcError(id, RPC.invalidRequest, "Not a valid JSON-RPC 2.0 request.");
  }

  // Notifications carry no id and expect no reply.
  if (message.id === undefined) {
    return null;
  }

  switch (message.method) {
    case "initialize":
      return rpcResult(id, initializeResult());

    case "ping":
      return rpcResult(id, {});

    case "tools/list":
      return rpcResult(id, { tools: TOOLS });

    case "tools/call": {
      const params = message.params ?? {};
      const name = typeof params["name"] === "string" ? params["name"] : "";
      const args = (params["arguments"] ?? {}) as Record<string, unknown>;
      if (!name) return rpcError(id, RPC.invalidParams, "`name` is required.");
      try {
        return rpcResult(id, await callTool(name, args, ctx));
      } catch (error) {
        return rpcError(
          id,
          RPC.internalError,
          error instanceof Error ? error.message : "Tool execution failed.",
        );
      }
    }

    default:
      return rpcError(id, RPC.methodNotFound, `Unsupported method "${message.method}".`);
  }
}
