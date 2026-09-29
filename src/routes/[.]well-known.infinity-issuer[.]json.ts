import { createFileRoute } from "@tanstack/react-router";
import { issuerMetadata, issuerOrigin } from "@/lib/issuer.server";

/** Issuer discovery: lets a verifier resolve our key set from the `iss` claim alone. */
export const Route = createFileRoute("/.well-known/infinity-issuer.json")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = issuerOrigin(request.url);
        const metadata = await issuerMetadata(origin);
        return new Response(JSON.stringify(metadata, null, 2), {
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
