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
          parameters: [AGENT_ID_PARAM],
          responses: {
            "200": {
              description: "Current status.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Status" } } },
            },
            "404": { description: "Unknown agent." },
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
            operatorAsserted: { type: "boolean", const: true },
          },
          required: ["issuer", "method", "assurance", "operatorAsserted"],
        },
        AgentSummary: {
          type: "object",
          properties: {
            agent_id: { type: "string" },
            status: { type: "string", enum: ["valid", "frozen"] },
            name: { type: "string" },
            source: {
              type: "string",
              description: "Platform the agent runs on, declared by its owner.",
            },
            owner: {
              type: "object",
              properties: {
                name: { type: "string" },
                identity_verified: {
                  type: "boolean",
                  description: "Derived; prefer the credential's attestation.",
                },
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
            usable: { type: "boolean", description: "The single field to branch on." },
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
