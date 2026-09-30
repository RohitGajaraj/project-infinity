import { createFileRoute } from "@tanstack/react-router";
import { attestationFromRow } from "@/lib/identity";
import { lookupAgent, keyLifecycle, mandateLifecycle } from "@/lib/verify.server";

export const Route = createFileRoute("/api/public/verify/$agentId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.agentId.slice(0, 64);
        const a = await lookupAgent(id);
        const headers = {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
          "cache-control": "no-store, max-age=0, must-revalidate",
        };
        if (!a)
          return new Response(JSON.stringify({ agent_id: id, status: "unknown" }), {
            status: 404,
            headers,
          });
        const lifecycle = mandateLifecycle(a);
        const key = keyLifecycle(a);
        if (!lifecycle || !key) {
          return new Response(
            JSON.stringify({
              agent_id: id,
              status: "unavailable",
              usable: false,
              error: !lifecycle ? "mandate_lifecycle_unavailable" : "agent_key_lifecycle_unavailable",
            }),
            { status: 503, headers },
          );
        }
        const expired = new Date(a.expires_at).getTime() <= Date.now();
        const status = expired ? "expired" : a.status;
        const attestation = attestationFromRow(a);
        return new Response(
          JSON.stringify({
            agent_id: a.public_id,
            status,
            usable: status === "valid" && key.recoveryHoldVersion !== key.version,
            name: a.name,
            source: a.source,
            owner: {
              name: a.owner_name ?? "Unnamed owner",
              name_source: "self_declared",
              identity_verified: attestation.assurance !== "none",
              attestation,
            },
            permissions: a.permissions,
            monthly_spend_limit_usd: a.monthly_spend_limit,
            approval_above_usd: a.approval_above,
            public_key: a.public_key,
            key_version: key.version,
            key_activated_at: key.activatedAt,
            key_fingerprint: key.fingerprint,
            key_authorization_method: key.authorizationMethod,
            key_continuity_proven: key.continuityProven,
            key_possession_proven: key.possessionProven,
            key_recovery_hold: key.recoveryHoldVersion === key.version,
            mandate_version: lifecycle.version,
            mandate_issued_at: lifecycle.issuedAt,
            credential_revision: lifecycle.revision,
            agent_created_at: a.created_at,
            issued_at: key.stateIssuedAt,
            expires_at: a.expires_at,
            log_head: a.last_hash,
          }),
          { headers },
        );
      },
    },
  },
});
