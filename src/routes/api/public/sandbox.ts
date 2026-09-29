import { createFileRoute } from "@tanstack/react-router";
import { sandboxVector } from "@/lib/sandbox.server";

/**
 * The conformance test vector.
 *
 * Free and unauthenticated like everything else public here. A developer curls
 * this, runs their verifier against it, and knows their integration works before
 * they ever meet a real agent.
 */
export const Route = createFileRoute("/api/public/sandbox")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const vector = await sandboxVector(origin);
        return new Response(JSON.stringify(vector, null, 2), {
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
            // Deterministic, so it is safe to cache hard.
            "cache-control": "public, max-age=3600",
            "x-infinity-sandbox": "true",
          },
        });
      },
    },
  },
});
