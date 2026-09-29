import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { lookupAgent } from "./verify.server";

export const verifyAgent = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ publicId: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data }) => lookupAgent(data.publicId));
