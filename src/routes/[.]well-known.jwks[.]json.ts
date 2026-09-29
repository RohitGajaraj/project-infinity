import { createFileRoute } from "@tanstack/react-router";
import { publicJwks } from "@/lib/issuer.server";

/**
 * Infinity's published signing keys.
 *
 * A verifier fetches this once, caches it, and can then check every credential
 * we have ever issued without calling us again.
 */
export const Route = createFileRoute("/.well-known/jwks.json")({
  server: {
    handlers: {
      GET: async () => {
        const jwks = await publicJwks();
        return new Response(JSON.stringify(jwks, null, 2), {
          headers: {
            "content-type": "application/jwk-set+json",
            "access-control-allow-origin": "*",
            // Long-lived but revalidated: rotation adds a key before retiring one.
            "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
          },
        });
      },
    },
  },
});
