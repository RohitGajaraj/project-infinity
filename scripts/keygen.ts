/**
 * Mint Infinity's issuing keypair.
 *
 *   bun run keygen
 *
 * Prints the private JWK to paste into the INFINITY_ISSUER_JWK secret, and the
 * public JWK, which is safe to publish and to commit. The private key is never
 * written to disk by this script — copy it straight into the secret store.
 */

import { generateIssuerKeypair } from "../src/lib/jws";

const { privateJwk, publicJwk } = await generateIssuerKeypair();

const line = "─".repeat(74);

console.log(`\n${line}`);
console.log("  INFINITY ISSUER KEYPAIR");
console.log(`${line}\n`);

console.log("  Key ID (RFC 7638 thumbprint, derived from the key itself):");
console.log(`  ${privateJwk.kid}\n`);

console.log(`${line}`);
console.log("  1. SECRET — set this as INFINITY_ISSUER_JWK. Do not commit it.");
console.log(`${line}\n`);
console.log(JSON.stringify(privateJwk));

console.log(`\n${line}`);
console.log("  2. PUBLIC — served at /.well-known/jwks.json. Safe to share.");
console.log(`${line}\n`);
console.log(JSON.stringify({ keys: [publicJwk] }, null, 2));

console.log(`\n${line}`);
console.log("  Rotation: add the new key to the set before you stop signing with");
console.log("  the old one, or credentials already in circulation stop verifying.");
console.log(`${line}\n`);
