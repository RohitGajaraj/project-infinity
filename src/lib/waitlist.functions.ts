import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  note: z.string().trim().max(500).optional(),
  source: z.string().trim().max(40).default("home"),
});

export type JoinWaitlistResult =
  { ok: true; alreadyJoined: boolean } | { ok: false; reason: "not_configured" | "failed" };

/**
 * Record a waitlist signup.
 *
 * Returns a discriminated result rather than throwing, because the home page
 * needs to tell the truth when this fails instead of showing a fake success —
 * an unpersisted "you're on the list" is the defect this replaces.
 */
export const joinWaitlist = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<JoinWaitlistResult> => {
    const { publicClient } = await import("./supabase-public.server");

    const { error } = await publicClient()
      .from("waitlist")
      .insert({ email: data.email, note: data.note ?? "", source: data.source });

    if (!error) return { ok: true, alreadyJoined: false };

    // 23505 = unique violation: the address is already on the list, which is success.
    if (error.code === "23505") return { ok: true, alreadyJoined: true };

    // 42P01 = undefined_table: migration not applied yet. Say so rather than lie.
    if (error.code === "42P01") {
      console.error(
        "[waitlist] table missing — apply supabase/migrations/20260929173000_waitlist.sql",
      );
      return { ok: false, reason: "not_configured" };
    }

    console.error("[waitlist] insert failed", { code: error.code, message: error.message });
    return { ok: false, reason: "failed" };
  });
