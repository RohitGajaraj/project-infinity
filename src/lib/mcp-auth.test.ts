import { describe, expect, test } from "bun:test";

import { authorizeMcpToolCall, createMcpChallenge, protectedMcpTool } from "./mcp.server";

function call(name: string) {
  return {
    jsonrpc: "2.0" as const,
    id: 1,
    method: "tools/call",
    params: { name, arguments: {} },
  };
}

describe("MCP proof-of-possession boundary", () => {
  test.each(["get_limits", "record_spend", "request_approval", "check_approval"])(
    "%s requires a request-bound agent proof",
    (name) => {
      expect(protectedMcpTool(call(name))).toBe(name);
    },
  );

  test.each(["whoami", "get_credential", "verify_agent"])(
    "%s remains public after agent selection",
    (name) => {
      expect(protectedMcpTool(call(name))).toBeNull();
    },
  );

  test("non-tool protocol messages do not require an agent proof", () => {
    expect(protectedMcpTool({ method: "initialize", params: {} })).toBeNull();
  });

  test("missing proof fails before the signed-action recorder can run", async () => {
    let called = false;
    const result = await authorizeMcpToolCall(
      {
        publicId: "inf_PUBLIC",
        toolName: "record_spend",
        nonce: null,
        signature: null,
        requestUrl: "https://infinity.id/mcp",
        requestBody: '{"exact":true}',
      },
      async () => {
        called = true;
        return { ok: true, eventId: 1, hash: "hash" };
      },
    );

    expect(result).toEqual({ ok: false, reason: "proof_required" });
    expect(called).toBe(false);
  });

  test("the exact URL and unmodified HTTP body reach proof verification", async () => {
    const exactBody = '{ "jsonrpc": "2.0", "id": 1, "method": "tools/call" }';
    const exactUrl = "https://infinity.id/mcp";
    const nonce = (await createMcpChallenge("inf_PUBLIC")).nonce;
    let recorded: Record<string, unknown> | undefined;

    const result = await authorizeMcpToolCall(
      {
        publicId: "inf_PUBLIC",
        toolName: "record_spend",
        nonce,
        signature: "s".repeat(86),
        requestUrl: exactUrl,
        requestBody: exactBody,
      },
      async (input) => {
        recorded = input as Record<string, unknown>;
        return { ok: true, eventId: 1, hash: "hash" };
      },
    );

    expect(result).toEqual({ ok: true });
    expect(recorded).toMatchObject({
      publicId: "inf_PUBLIC",
      nonce,
      signature: "s".repeat(86),
      method: "POST",
      url: exactUrl,
      body: exactBody,
      kind: "mcp_authorized",
      detail: "Authorized MCP record_spend",
    });
  });

  test("stateless challenge issuance is distinct for parallel calls", async () => {
    const challenges = await Promise.all(
      Array.from({ length: 50 }, () => createMcpChallenge("inf_PUBLIC")),
    );
    expect(new Set(challenges.map(({ nonce }) => nonce)).size).toBe(50);
  });

  test("a self-minted challenge is rejected before persistence", async () => {
    let called = false;
    const result = await authorizeMcpToolCall(
      {
        publicId: "inf_PUBLIC",
        toolName: "get_limits",
        nonce: `mcp1.${Date.now()}.attacker-controlled-randomness`,
        signature: "s".repeat(86),
        requestUrl: "https://infinity.id/mcp",
        requestBody: "{}",
      },
      async () => {
        called = true;
        return { ok: true, eventId: 1, hash: "hash" };
      },
    );
    expect(result).toEqual({ ok: false, reason: "challenge_invalid_or_replayed" });
    expect(called).toBe(false);
  });

  test("a challenge issued for another Agent ID is rejected", async () => {
    const challenge = await createMcpChallenge("inf_AGENT_A");
    const result = await authorizeMcpToolCall(
      {
        publicId: "inf_AGENT_B",
        toolName: "get_limits",
        nonce: challenge.nonce,
        signature: "s".repeat(86),
        requestUrl: "https://infinity.id/mcp",
        requestBody: "{}",
      },
      async () => ({ ok: true, eventId: 1, hash: "hash" }),
    );
    expect(result).toEqual({ ok: false, reason: "challenge_invalid_or_replayed" });
  });

  test("an expired challenge fails before persistence", async () => {
    let called = false;
    const expired = (await createMcpChallenge("inf_PUBLIC", Date.now() - 120_001)).nonce;
    const result = await authorizeMcpToolCall(
      {
        publicId: "inf_PUBLIC",
        toolName: "record_spend",
        nonce: expired,
        signature: "s".repeat(86),
        requestUrl: "https://infinity.id/mcp",
        requestBody: "{}",
      },
      async () => {
        called = true;
        return { ok: true, eventId: 1, hash: "hash" };
      },
    );

    expect(result).toEqual({ ok: false, reason: "challenge_invalid_or_replayed" });
    expect(called).toBe(false);
  });

  test.each([
    "bad_signature",
    "challenge_invalid_or_replayed",
    "unknown_or_unusable_agent",
  ] as const)("%s fails closed at the transport authorization boundary", async (reason) => {
    const result = await authorizeMcpToolCall(
      {
        publicId: "inf_PUBLIC",
        toolName: "request_approval",
        nonce: (await createMcpChallenge("inf_PUBLIC")).nonce,
        signature: "s".repeat(86),
        requestUrl: "https://infinity.id/mcp",
        requestBody: "{}",
      },
      async () => ({ ok: false, reason }),
    );

    expect(result).toEqual({ ok: false, reason });
  });
});
