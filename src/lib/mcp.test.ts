import { describe, expect, test } from "bun:test";

import {
  callTool,
  handleRpc,
  initializeResult,
  MCP_PROTOCOL_VERSION,
  RPC,
  TOOLS,
  type AgentView,
  type McpContext,
} from "./mcp";

const ORIGIN = "https://infinity.id";

const LIVE: AgentView = {
  public_id: "inf_MCPT-0001-AAAA",
  name: "Atlas",
  source: "Claude Code",
  status: "valid",
  owner_name: "Rohit S.",
  owner_verified: true,
  permissions: ["Send email", "Make purchases"],
  monthly_spend_limit: 200,
  approval_above: 50,
  created_at: new Date(Date.now() - 86_400_000).toISOString(),
  expires_at: new Date(Date.now() + 86_400_000).toISOString(),
};

function ctx(overrides: Partial<McpContext> = {}, agents: AgentView[] = [LIVE]): McpContext {
  return {
    agentPublicId: LIVE.public_id,
    loadAgent: async (id) => agents.find((a) => a.public_id === id) ?? null,
    issueCredential: async () => "header.payload.signature",
    issuerOrigin: ORIGIN,
    ...overrides,
  };
}

/** Tools return JSON as text; parse it the way a model's harness would. */
function parse(outcome: { content: Array<{ type: "text"; text: string }> }) {
  return JSON.parse(outcome.content[0]!.text);
}

describe("tool catalogue", () => {
  test("exposes exactly the five phase-1 tools", () => {
    expect(TOOLS.map((t) => t.name)).toEqual([
      "whoami",
      "get_limits",
      "get_credential",
      "request_approval",
      "verify_agent",
    ]);
  });

  test("every tool has a description long enough to steer a model", () => {
    for (const tool of TOOLS) {
      expect(tool.description.length).toBeGreaterThan(80);
      expect(tool.inputSchema["type"]).toBe("object");
      expect(tool.inputSchema["additionalProperties"]).toBe(false);
    }
  });

  test("descriptions say when to call the tool, not just what it does", () => {
    // A model needs a trigger condition or it will either never call or always call.
    for (const tool of TOOLS) {
      expect(tool.description).toMatch(/\b(call|use)\b/i);
    }
  });

  test("required params are declared so a model cannot omit them silently", () => {
    expect(TOOLS.find((t) => t.name === "verify_agent")!.inputSchema["required"]).toEqual([
      "agent_id",
    ]);
    expect(TOOLS.find((t) => t.name === "request_approval")!.inputSchema["required"]).toEqual([
      "action",
    ]);
    expect(TOOLS.find((t) => t.name === "whoami")!.inputSchema["required"]).toEqual([]);
  });
});

describe("whoami", () => {
  test("returns identity plus a sentence the agent can say out loud", async () => {
    const out = parse(await callTool("whoami", {}, ctx()));
    expect(out.agent_id).toBe(LIVE.public_id);
    expect(out.acting_for.name).toBe("Rohit S.");
    expect(out.acting_for.identity_verified).toBe(true);
    expect(out.how_to_introduce_yourself).toContain("AI agent");
    expect(out.how_to_introduce_yourself).toContain(LIVE.public_id);
    expect(out.verify_url).toBe(`${ORIGIN}/verify/${LIVE.public_id}`);
  });

  test("an unverified owner is disclosed in the introduction, not hidden", async () => {
    const unverified = { ...LIVE, owner_verified: false };
    const out = parse(await callTool("whoami", {}, ctx({}, [unverified])));
    expect(out.acting_for.identity_verified).toBe(false);
    expect(out.how_to_introduce_yourself).toMatch(/not completed an identity check/i);
  });

  test("reports an error when the agent no longer exists", async () => {
    const outcome = await callTool("whoami", {}, ctx({}, []));
    expect(outcome.isError).toBe(true);
    expect(parse(outcome).error).toBe("unknown_agent");
  });
});

describe("get_limits", () => {
  test("returns the mandate with usable guidance", async () => {
    const out = parse(await callTool("get_limits", {}, ctx()));
    expect(out.permitted_actions).toEqual(["Send email", "Make purchases"]);
    expect(out.monthly_spend_limit_usd).toBe(200);
    expect(out.owner_approval_required_above_usd).toBe(50);
    expect(out.guidance).toContain("$50");
    expect(out.guidance).toContain("$200");
  });

  test("guidance omits a threshold that is not set", async () => {
    const out = parse(await callTool("get_limits", {}, ctx({}, [{ ...LIVE, approval_above: 0 }])));
    expect(out.guidance).not.toMatch(/without asking/);
    expect(out.guidance).toContain("$200");
  });
});

describe("get_credential", () => {
  test("returns the credential and where to check it", async () => {
    const out = parse(await callTool("get_credential", {}, ctx()));
    expect(out.credential).toBe("header.payload.signature");
    expect(out.format).toBe("vc+jwt");
    expect(out.jwks_uri).toBe(`${ORIGIN}/.well-known/jwks.json`);
    expect(out.status_endpoint).toContain(`/status/${LIVE.public_id}`);
  });

  test("signs a challenge when the deployment can", async () => {
    const out = parse(
      await callTool(
        "get_credential",
        { challenge: "nonce-123", method: "POST", url: "https://shop.test/checkout" },
        ctx({ signChallenge: async () => "SIGNATURE" }),
      ),
    );
    expect(out.proof_of_possession).toBe("SIGNATURE");
  });

  test("when Infinity cannot sign, it explains that the agent must sign itself", async () => {
    // The agent holds its own secret key, so this is the normal case, not a failure.
    const out = parse(await callTool("get_credential", { challenge: "nonce-123" }, ctx()));
    expect(out.proof_of_possession).toBeNull();
    expect(out.proof_of_possession_note).toContain("INFINITY-POP-v1");
    expect(out.proof_of_possession_note).toMatch(/does not hold your secret key/i);
  });
});

describe("request_approval", () => {
  test("answers immediately when the amount is already pre-authorised", async () => {
    let called = false;
    const out = parse(
      await callTool(
        "request_approval",
        { action: "Book a table", amount_usd: 30 },
        ctx({
          requestApproval: async () => {
            called = true;
            return { status: "pending", reference: "r1" };
          },
        }),
      ),
    );
    expect(out.status).toBe("approved");
    expect(out.reason).toBe("within_mandate");
    // The whole point: do not wake a human for something they pre-authorised.
    expect(called).toBe(false);
  });

  test("refuses outright above the ceiling instead of escalating pointlessly", async () => {
    let called = false;
    const out = parse(
      await callTool(
        "request_approval",
        { action: "Buy a laptop", amount_usd: 5000 },
        ctx({
          requestApproval: async () => {
            called = true;
            return { status: "pending", reference: "r2" };
          },
        }),
      ),
    );
    expect(out.status).toBe("denied");
    expect(out.reason).toBe("over_spend_limit");
    expect(called).toBe(false);
  });

  test("escalates to the owner between the threshold and the ceiling", async () => {
    const out = parse(
      await callTool(
        "request_approval",
        { action: "Buy a monitor", amount_usd: 120 },
        ctx({ requestApproval: async () => ({ status: "pending", reference: "ref-9" }) }),
      ),
    );
    expect(out.status).toBe("pending");
    expect(out.reference).toBe("ref-9");
    expect(out.explanation).toMatch(/do not proceed/i);
  });

  test("requires an action description", async () => {
    const outcome = await callTool("request_approval", { amount_usd: 10 }, ctx());
    expect(outcome.isError).toBe(true);
    expect(parse(outcome).error).toBe("invalid_params");
  });

  test("says so plainly when approvals are not wired up", async () => {
    const outcome = await callTool("request_approval", { action: "Do a thing" }, ctx());
    expect(outcome.isError).toBe(true);
    expect(parse(outcome).error).toBe("approvals_not_available");
  });
});

describe("verify_agent", () => {
  const OTHER: AgentView = {
    ...LIVE,
    public_id: "inf_OTHR-0002-BBBB",
    name: "Beacon",
    owner_name: "Ada L.",
  };

  test("confirms a genuine agent and names who it acts for", async () => {
    const out = parse(
      await callTool("verify_agent", { agent_id: OTHER.public_id }, ctx({}, [LIVE, OTHER])),
    );
    expect(out.verdict).toBe("valid");
    expect(out.trustworthy).toBe(true);
    expect(out.acting_for.name).toBe("Ada L.");
  });

  test("an unknown ID is reported as untrustworthy with a clear instruction", async () => {
    const out = parse(await callTool("verify_agent", { agent_id: "inf_FAKE" }, ctx()));
    expect(out.verdict).toBe("unknown");
    expect(out.trustworthy).toBe(false);
    expect(out.explanation).toMatch(/not issued by Infinity/i);
  });

  test("a frozen agent is untrustworthy", async () => {
    const frozen = { ...OTHER, status: "frozen" };
    const out = parse(
      await callTool("verify_agent", { agent_id: frozen.public_id }, ctx({}, [LIVE, frozen])),
    );
    expect(out.verdict).toBe("frozen");
    expect(out.trustworthy).toBe(false);
  });

  test("an expired agent is untrustworthy even while marked valid", async () => {
    const expired = { ...OTHER, expires_at: new Date(Date.now() - 1000).toISOString() };
    const out = parse(
      await callTool("verify_agent", { agent_id: expired.public_id }, ctx({}, [LIVE, expired])),
    );
    expect(out.verdict).toBe("expired");
    expect(out.trustworthy).toBe(false);
  });

  test("calling it on yourself is refused and redirected to whoami", async () => {
    const outcome = await callTool("verify_agent", { agent_id: LIVE.public_id }, ctx());
    expect(outcome.isError).toBe(true);
    expect(parse(outcome).hint).toMatch(/whoami/);
  });
});

describe("JSON-RPC plumbing", () => {
  test("initialize advertises the protocol version and instructions", async () => {
    const res = await handleRpc({ jsonrpc: "2.0", id: 1, method: "initialize" }, ctx());
    expect(res).not.toBeNull();
    const result = (res as { result: ReturnType<typeof initializeResult> }).result;
    expect(result.protocolVersion).toBe(MCP_PROTOCOL_VERSION);
    expect(result.instructions).toMatch(/whoami/);
  });

  test("tools/list returns every tool", async () => {
    const res = await handleRpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }, ctx());
    expect((res as { result: { tools: unknown[] } }).result.tools).toHaveLength(5);
  });

  test("tools/call dispatches and wraps the outcome", async () => {
    const res = await handleRpc(
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "whoami", arguments: {} } },
      ctx(),
    );
    const result = (res as { result: { content: Array<{ text: string }> } }).result;
    expect(JSON.parse(result.content[0]!.text).agent_id).toBe(LIVE.public_id);
  });

  test("ping is answered", async () => {
    const res = await handleRpc({ jsonrpc: "2.0", id: 4, method: "ping" }, ctx());
    expect((res as { result: unknown }).result).toEqual({});
  });

  test("an unknown method returns methodNotFound rather than throwing", async () => {
    const res = await handleRpc({ jsonrpc: "2.0", id: 5, method: "nope/nope" }, ctx());
    expect((res as { error: { code: number } }).error.code).toBe(RPC.methodNotFound);
  });

  test("a notification (no id) gets no reply, per JSON-RPC", async () => {
    const res = await handleRpc({ jsonrpc: "2.0", method: "notifications/initialized" }, ctx());
    expect(res).toBeNull();
  });

  test("a malformed envelope is rejected", async () => {
    const res = await handleRpc({ jsonrpc: "1.0", id: 6, method: "ping" } as never, ctx());
    expect((res as { error: { code: number } }).error.code).toBe(RPC.invalidRequest);
  });

  test("tools/call without a name is invalidParams", async () => {
    const res = await handleRpc({ jsonrpc: "2.0", id: 7, method: "tools/call", params: {} }, ctx());
    expect((res as { error: { code: number } }).error.code).toBe(RPC.invalidParams);
  });

  test("a throwing tool becomes an internalError rather than a crash", async () => {
    const res = await handleRpc(
      { jsonrpc: "2.0", id: 8, method: "tools/call", params: { name: "whoami", arguments: {} } },
      ctx({
        loadAgent: async () => {
          throw new Error("database is down");
        },
      }),
    );
    expect((res as { error: { code: number; message: string } }).error.code).toBe(
      RPC.internalError,
    );
    expect((res as { error: { message: string } }).error.message).toBe("database is down");
  });

  test("an unknown tool name is an isError outcome, not a protocol error", async () => {
    // MCP convention: tool-level problems belong in the result so the model can read them.
    const res = await handleRpc(
      { jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "teleport", arguments: {} } },
      ctx(),
    );
    const result = (res as { result: { isError?: boolean } }).result;
    expect(result.isError).toBe(true);
  });
});
