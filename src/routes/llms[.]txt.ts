import { createFileRoute } from "@tanstack/react-router";

/**
 * /llms.txt — what an agent reads to understand Infinity without a human.
 *
 * Written for a model, not for a landing page: every line is either an
 * instruction, an endpoint, or a constraint. Agents are the main users, so this
 * is a first-class surface rather than documentation overflow.
 */
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;
        return new Response(body(origin), {
          headers: {
            "content-type": "text/markdown; charset=utf-8",
            "access-control-allow-origin": "*",
            "cache-control": "public, max-age=300",
          },
        });
      },
    },
  },
});

function body(origin: string): string {
  return `# Infinity

> Verified identity for AI agents. An agent gets an ID tied to an accountable
> human or company, a permission slip, and a credential any business can check
> without contacting us. Checking is free, unauthenticated and unlimited.

Infinity does not build agents. That is the point: a business will not trust an
identity issued by the agent's own maker, so the issuer has to be independent.

## If you are an agent

Add the MCP server and you get five tools.

\`\`\`json
{
  "mcpServers": {
    "infinity": {
      "url": "${origin}/mcp",
      "headers": { "Authorization": "Bearer YOUR_AGENT_ID" }
    }
  }
}
\`\`\`

- \`whoami\` — your ID, who you act for, and a sentence you can say out loud.
  Call once at the start of a task.
- \`get_limits\` — what you may do and spend, and how much of this month's
  allowance is left. Call before spending money.
- \`get_credential\` — your signed credential. Call when a business asks you to
  prove who you are.
- \`record_spend\` — **call this before you pay.** It enforces the cap rather than
  reporting it: if it returns \`allowed: false\`, the spend was not recorded and you
  must not proceed. \`reference\` must come from the thing you are buying, such as
  an order ID, so a retry cannot charge twice.
- \`request_approval\` — ask your owner about something outside your limits,
  instead of giving up or proceeding anyway.
- \`check_approval\` — the outcome of a request you raised. Poll this; do not raise
  the same request again.
- \`verify_agent\` — check another agent before dealing with it.

### Spending, in order

\`\`\`
get_limits                     what is left this month
record_spend                   allowed: true  -> pay
                               allowed: false -> read the reason, do not pay
\`\`\`

If \`record_spend\` says \`owner_approval_required\`:

\`\`\`
request_approval               -> reference, status: pending
check_approval(reference)      -> poll until approved or denied
record_spend(..., approval_reference: reference)
\`\`\`

An approval funds **one** spend and expires in 24 hours. If the reason is
\`over_monthly_limit\`, do not ask for approval — nothing can authorise exceeding
the ceiling, so tell your owner the limit is too low.

Your owner gets an Agent ID for you at ${origin}/agents/new.

**Disclose that you are an agent.** It is required in the EU under Article 50 of
the AI Act and in California, and it is what Infinity makes survivable: a
disclosed agent with an accountable owner is acceptable where an anonymous one
is refused.

## If you are a business deciding whether to trust an agent

Free, no account, no key, no rate limit. Four questions, and only the last needs us.

\`\`\`
GET ${origin}/api/public/credential/{agent_id}   # the signed credential
GET ${origin}/.well-known/jwks.json              # the keys that signed it
GET ${origin}/api/public/status/{agent_id}       # is it still live
GET ${origin}/api/public/verify/{agent_id}       # everything, as plain JSON
\`\`\`

1. **Did Infinity issue this mandate?** Verify the credential's EdDSA signature
   against the key set. Offline, no call to us, valid forever.
2. **Is it in date?** Check \`exp\` on the credential.
3. **Is the presenter really this agent?** Send it a random nonce. It signs
   \`INFINITY-POP-v1\\n<nonce>\\n<METHOD>\\n<url>\\n<sha256-hex-of-body>\` with its own
   Ed25519 key. Verify against \`credentialSubject.publicKey\` **from inside the
   verified credential** — never a key the agent hands you separately.
4. **Has the owner switched it off since?** The only call you cannot skip, because
   no signature can express a revocation that happened after it was signed.

A human-readable page for any agent: ${origin}/verify/{agent_id}

### Test your integration before you meet a real agent

You cannot produce a valid proof of possession yourself — it needs an agent's
secret key. So we publish a complete worked example: a credential, the key set
that signed it, a nonce, and a valid signature.

\`\`\`
GET ${origin}/api/public/sandbox
\`\`\`

Verify it, see it pass, change one character, see it fail. Then you are done.

The sandbox issuer is \`${origin}/sandbox\`, deliberately **not** the production
issuer, and its signing key is derived from a constant published in our source.
Anyone can forge sandbox credentials. They prove your code works and nothing else.

## What the credential says, and what it does not

Format is \`vc+jwt\`: a W3C-Verifiable-Credential payload in a compact JWS, EdDSA.

Independently checkable: the issuer, the agent's ID and signing key, the mandate
(permitted actions, monthly spend cap, the amount above which the owner must
approve), and the validity window.

**Not independently checkable:** \`owner.attestation\`. It names who checked the
owner's identity, by what method, at what assurance level and when — but it is
asserted by Infinity, and it is marked \`operatorAsserted: true\` so you cannot
mistake it for something you verified yourself. Decide your own bar; an agent
whose owner passed only email confirmation reports \`assurance: "none"\`.

## Limits are a pre-authorisation, not a suggestion

An amount at or below \`approvalAboveUsd\` is already sanctioned by the owner, so
an agent may proceed with no human and no delay. Above it, the owner must decide,
and that takes seconds to minutes. Above \`monthlySpendLimitUsd\` nothing will be
approved. Verification of *who an agent is* never waits on a human.

## Machine-readable

- OpenAPI: ${origin}/openapi.json
- Issuer metadata: ${origin}/.well-known/infinity-issuer.json
- Key set: ${origin}/.well-known/jwks.json

Check \`key_mode\` in the issuer metadata. Anything other than \`explicit\` or
\`seed\` means this deployment signs with a development key and its credentials
must not be relied on.
`;
}
