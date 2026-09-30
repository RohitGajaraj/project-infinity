export type CredentialStatus = "current" | "superseded" | "expired" | "legacy";

export function classifyCredentialStatus(input: {
  requestedVersion: number | null;
  requestedKeyVersion: number | null;
  requestedRevision: string | null;
  currentVersion: number;
  currentKeyVersion: number;
  currentRevision: string;
  agentStatus: string;
  expiresAt: string;
  now?: number;
}) {
  const expired = new Date(input.expiresAt).getTime() <= (input.now ?? Date.now());
  const hasLegacyCurrentKey =
    input.requestedKeyVersion === null && input.currentKeyVersion === 1;
  const keyMatches =
    hasLegacyCurrentKey || input.requestedKeyVersion === input.currentKeyVersion;
  const credentialStatus: CredentialStatus =
    input.requestedVersion === null || !input.requestedRevision
      ? "legacy"
      : input.requestedVersion !== input.currentVersion ||
          !keyMatches ||
          input.requestedRevision !== input.currentRevision
        ? "superseded"
        : expired
          ? "expired"
          : "current";
  const agentStatus = expired ? "expired" : input.agentStatus;
  return {
    credentialStatus,
    agentStatus,
    usable: credentialStatus === "current" && agentStatus === "valid",
  };
}
