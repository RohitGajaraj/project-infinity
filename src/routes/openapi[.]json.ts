import { createFileRoute } from "@tanstack/react-router";

/**
 * OpenAPI 3.1 for the public surface.
 *
 * Only the endpoints a stranger may call. The console and MCP are excluded: MCP
 * is described by its own protocol, and the console is not an API.
 *
 * Generated from the same constants the handlers use, so it cannot drift into
 * describing an endpoint we do not serve.
 */
export const Route = createFileRoute("/openapi.json")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;
        return new Response(JSON.stringify(spec(origin), null, 2), {
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
            "cache-control": "public, max-age=300",
          },
        });
      },
    },
  },
});

const AGENT_ID_PARAM = {
  name: "agent_id",
  in: "path",
  required: true,
  description: "An Infinity Agent ID, e.g. inf_7Q2K-9XRM-4LTB.",
  schema: { type: "string", maxLength: 64 },
} as const;

function spec(origin: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Infinity public API",
      version: "0.1.0",
      summary: "Check whether an AI agent is genuine, who it acts for, and what it may do.",
      description:
        "Every endpoint here is free, unauthenticated and unlimited by design: a trust layer is worth only as much as the number of places its credential is accepted, so charging the party doing the checking would tax the behaviour the network needs. Verification of the credential and of the agent's proof of possession happens offline; only current status requires a call.",
      license: { name: "All rights reserved" },
    },
    servers: [{ url: origin }],
    tags: [
      {
        name: "verification",
        description: "Endpoints a business calls to decide whether to trust an agent.",
      },
      { name: "discovery", description: "Issuer metadata and signing keys." },
    ],
    paths: {
      "/api/public/verify/{agent_id}": {
        get: {
          tags: ["verification"],
          operationId: "verifyAgent",
          summary: "Everything known about an agent, as plain JSON",
          description:
            "The simplest way to check an agent. Convenient, but it requires trusting this response; prefer the credential plus status endpoints if you want a check that does not rest on our word.",
          parameters: [AGENT_ID_PARAM],
          responses: {
            "200": {
              description: "The agent exists.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/AgentSummary" } },
              },
            },
            "404": {
              description: "No agent with this ID was issued by Infinity.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/UnknownAgent" } },
              },
            },
          },
        },
      },
      "/api/public/credential/{agent_id}": {
        get: {
          tags: ["verification"],
          operationId: "getCredential",
          summary: "The agent's signed identity credential",
          description:
            "Returns a vc+jwt credential: a W3C Verifiable Credential payload in a compact JWS signed with EdDSA. Verify it against /.well-known/jwks.json with no further calls. Send `Accept: application/jwt` for the bare token.",
          parameters: [AGENT_ID_PARAM],
          responses: {
            "200": {
              description: "A freshly minted credential reflecting the current mandate.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/CredentialResponse" } },
                "application/jwt": { schema: { type: "string" } },
              },
            },
            "404": { description: "Unknown agent." },
          },
        },
      },
      "/api/public/status/{agent_id}": {
        get: {
          tags: ["verification"],
          operationId: "getStatus",
          summary: "Whether the agent is still live",
          description:
            "The one call you cannot skip. A signature cannot express a revocation that happened after it was signed, so only this endpoint can tell you the owner has hit the off switch. Never cached by us; cache it yourself for a few seconds if you want us off your hot path.",
          parameters: [
            AGENT_ID_PARAM,
            {
              name: "mandate_version",
              in: "query",
              required: true,
              schema: { type: "integer", minimum: 1 },
            },
            {
              name: "revision",
              in: "query",
              required: true,
              schema: { type: "string", minLength: 1 },
            },
          ],
          responses: {
            "200": {
              description: "Current agent status and exact credential supersession result.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Status" } } },
            },
            "404": { description: "Unknown agent." },
          },
        },
      },
      "/api/public/challenge/{agent_id}": {
        post: {
          tags: ["verification"],
          operationId: "issueAgentChallenge",
          summary: "Issue a single-use proof-of-possession challenge",
          description:
            "Returns a stateless, short-lived nonce containing no authority and revealing no agent status. Sign the canonical request with the private key matching the public key in the credential. After signature and freshness checks, Infinity records the nonce as consumed before a protected MCP call runs, so it cannot be replayed.",
          parameters: [AGENT_ID_PARAM],
          responses: {
            "200": {
              description:
                "A stateless challenge valid for two minutes. It reveals nothing about whether the supplied Agent ID exists.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/Challenge" } },
              },
            },
          },
        },
      },
      "/api/public/sandbox": {
        get: {
          tags: ["verification"],
          operationId: "getSandboxVector",
          summary: "A conformance test vector for your integration",
          description:
            "You cannot produce a valid proof of possession on your own, because it requires an agent's secret key. This returns a complete worked example — credential, key set, nonce and a valid signature — so you can prove your verifier works before meeting a real agent. Deterministic, so it is safe to commit to your own test suite. The sandbox issuer is deliberately different from production and its signing key is derived from a published constant, so anyone can forge these: they prove your code works and nothing else.",
          responses: {
            "200": {
              description: "The test vector, with expected outcomes and step-by-step instructions.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/SandboxVector" } },
              },
            },
          },
        },
      },
      "/.well-known/jwks.json": {
        get: {
          tags: ["discovery"],
          operationId: "getJwks",
          summary: "Infinity's published signing keys",
          description:
            "Fetch once and cache. `kid` is the RFC 7638 thumbprint of the key, so the key names itself rather than being labelled by us.",
          responses: {
            "200": {
              description: "A JWK Set of Ed25519 public keys.",
              content: {
                "application/jwk-set+json": { schema: { $ref: "#/components/schemas/Jwks" } },
              },
            },
          },
        },
      },
      "/.well-known/infinity-issuer.json": {
        get: {
          tags: ["discovery"],
          operationId: "getIssuerMetadata",
          summary: "Issuer metadata",
          description:
            "Resolve the key set from a credential's `iss` claim. Check `key_mode`: anything other than `explicit` or `seed` means this deployment signs with a development key and its credentials must not be relied on.",
          responses: {
            "200": {
              description: "Issuer metadata.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/IssuerMetadata" } },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Attestation: {
          type: "object",
          description:
            "What was checked about the accountable owner. OPERATOR-ASSERTED: unlike the credential signature, a third party cannot confirm this offline. Set your own minimum assurance.",
          properties: {
            issuer: {
              type: "string",
              enum: ["self_declared", "didit", "persona", "sumsub", "manual_review"],
              description: "Who performed the check. `self_declared` means nobody did.",
            },
            method: {
              type: "string",
              enum: [
                "none",
                "email_only",
                "government_id",
                "government_id_and_liveness",
                "business_registry",
                "business_registry_and_ubo",
              ],
            },
            assurance: { type: "string", enum: ["none", "basic", "substantial", "high"] },
            verifiedAt: { type: ["string", "null"], format: "date-time" },
            expiresAt: { type: ["string", "null"], format: "date-time" },
            operatorAsserted: { type: "boolean", const: true },
          },
          required: ["issuer", "method", "assurance", "operatorAsserted"],
        },
        AgentSummary: {
          type: "object",
          properties: {
            agent_id: { type: "string" },
            status: { type: "string", enum: ["valid", "frozen", "expired"] },
            usable: {
              type: "boolean",
              description: "True only when status is valid and the mandate has not expired.",
            },
            name: { type: "string" },
            source: {
              type: "string",
              description: "Platform the agent runs on, declared by its owner.",
            },
            owner: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description:
                    "Account-controlled display label; not extracted from identity evidence.",
                },
                name_source: { type: "string", const: "self_declared" },
                identity_verified: {
                  type: "boolean",
                  description: "Derived from the live attestation beside it.",
                },
                attestation: { $ref: "#/components/schemas/Attestation" },
              },
            },
            permissions: { type: "array", items: { type: "string" } },
            monthly_spend_limit_usd: { type: "number" },
            approval_above_usd: {
              type: "number",
              description:
                "At or below this, the owner has pre-authorised the spend and no human need be asked.",
            },
            public_key: {
              type: "string",
              description: "The agent's Ed25519 key, as `ed25519:<base64>`.",
            },
            mandate_version: { type: "integer", minimum: 1 },
            mandate_issued_at: { type: "string", format: "date-time" },
            credential_revision: { type: "string" },
            agent_created_at: { type: "string", format: "date-time" },
            issued_at: { type: "string", format: "date-time" },
            expires_at: { type: "string", format: "date-time" },
            log_head: {
              type: ["string", "null"],
              description: "Head of the agent's hash-chained activity log.",
            },
          },
        },
        UnknownAgent: {
          type: "object",
          properties: {
            agent_id: { type: "string" },
            status: { type: "string", const: "unknown" },
          },
        },
        CredentialResponse: {
          type: "object",
          properties: {
            format: { type: "string", const: "vc+jwt" },
            credential: { type: "string", description: "Compact JWS, EdDSA." },
            agent_id: { type: "string" },
            status: { type: "string" },
            jwks_uri: { type: "string", format: "uri" },
            status_endpoint: { type: "string", format: "uri" },
            mandate_version: { type: "integer", minimum: 1 },
            credential_revision: { type: "string" },
            key_mode: { type: "string", enum: ["explicit", "seed", "provisional", "insecure"] },
            provisional: {
              type: "boolean",
              description:
                "True when signed with a development key. Do not rely on such credentials.",
            },
          },
          required: ["format", "credential"],
        },
        Status: {
          type: "object",
          properties: {
            agent_id: { type: "string" },
            status: { type: "string", enum: ["valid", "frozen", "expired", "unknown"] },
            agent_status: { type: "string", enum: ["valid", "frozen", "expired"] },
            credential_status: {
              type: "string",
              enum: ["current", "superseded", "expired", "legacy"],
            },
            mandate_version: { type: ["integer", "null"] },
            current_mandate_version: { type: "integer", minimum: 1 },
            revision: { type: ["string", "null"] },
            current_revision: { type: "string" },
            usable: {
              type: "boolean",
              description: "True only for the exact current version/revision on a live agent.",
            },
            expires_at: { type: "string", format: "date-time" },
            log_head: { type: ["string", "null"] },
            checked_at: { type: "string", format: "date-time" },
          },
          required: ["agent_id", "status", "checked_at"],
        },
        Jwks: {
          type: "object",
          properties: {
            keys: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  kty: { type: "string", const: "OKP" },
                  crv: { type: "string", const: "Ed25519" },
                  x: { type: "string" },
                  kid: { type: "string" },
                  alg: { type: "string", const: "EdDSA" },
                  use: { type: "string", const: "sig" },
                },
              },
            },
          },
        },
        Challenge: {
          type: "object",
          properties: {
            agent_id: { type: "string" },
            nonce: { type: "string", description: "Bound to this agent and accepted once." },
            expires_at: { type: "string", format: "date-time" },
            proof: {
              type: "object",
              properties: {
                method: { type: "string", const: "POST" },
                url: { type: "string" },
                body: { type: "string" },
                canonical: { type: "string" },
              },
            },
          },
          required: ["agent_id", "nonce", "expires_at", "proof"],
        },
        SandboxVector: {
          type: "object",
          properties: {
            warning: {
              type: "string",
              description: "Read this. Sandbox credentials prove nothing.",
            },
            issuer: { type: "string", description: "Deliberately not the production issuer." },
            credential: { type: "string" },
            jwks: { $ref: "#/components/schemas/Jwks" },
            proof: {
              type: "object",
              properties: {
                nonce: { type: "string" },
                method: { type: "string" },
                url: { type: "string" },
                bodySha256: { type: "string" },
                signature: { type: "string" },
                canonical_string: {
                  type: "string",
                  description:
                    "The exact bytes that were signed. Rebuild this yourself and compare.",
                },
              },
            },
            expected: {
              type: "object",
              properties: {
                credential_valid: { type: "boolean" },
                proof_valid: { type: "boolean" },
                status_usable: { type: "boolean" },
              },
            },
            how_to_use: { type: "array", items: { type: "string" } },
          },
        },
        IssuerMetadata: {
          type: "object",
          properties: {
            issuer: { type: "string", format: "uri" },
            jwks_uri: { type: "string", format: "uri" },
            credential_endpoint: { type: "string" },
            status_endpoint: { type: "string" },
            verify_endpoint: { type: "string" },
            credential_types_supported: { type: "array", items: { type: "string" } },
            credential_formats_supported: { type: "array", items: { type: "string" } },
            signing_alg_values_supported: { type: "array", items: { type: "string" } },
            key_mode: { type: "string" },
            provisional: { type: "boolean" },
          },
        },
      },
    },
    externalDocs: { description: "Agent-facing guide", url: `${origin}/llms.txt` },
  };
}
