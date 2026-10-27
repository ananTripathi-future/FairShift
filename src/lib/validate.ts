import { z } from "zod";

// Strip control characters and trim; React already escapes output, this keeps stored data clean.
// eslint-disable-next-line no-control-regex -- intentionally strips control chars
export const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, " ").trim();

export const disputeInput = z.object({
  text: z
    .string()
    .transform(clean)
    .pipe(z.string().min(10, "Please describe the problem (at least 10 characters).").max(500)),
});

export const safetyInput = z.object({
  category: z.string().min(1).max(60),
  severity: z.enum(["Low", "Medium", "High"]),
  location: z.string().transform(clean).pipe(z.string().min(2, "Add a location.").max(120)),
  text: z
    .string()
    .transform(clean)
    .pipe(z.string().min(10, "Describe what you saw (at least 10 characters).").max(1000)),
});

export const replyInput = z
  .string()
  .transform(clean)
  .pipe(z.string().min(5, "Add an explanation for the worker.").max(500));

/** Returns first error message or the parsed data. */
export function check<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  v: unknown,
): { ok: true; data: T } | { ok: false; error: string } {
  const r = schema.safeParse(v);
  return r.success
    ? { ok: true, data: r.data }
    : { ok: false, error: r.error.issues[0]?.message ?? "Invalid input" };
}

// Shape check for saved browser data so tampered or corrupt storage can't crash the app.
export const savedState = z.object({
  workers: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        site: z.string(),
        ratePaise: z.number().int().nonnegative(),
        deductionsPaise: z.number().int().nonnegative(),
        skills: z.array(z.string()),
      }),
    )
    .min(1),
  attendance: z.array(
    z.object({
      id: z.string(),
      workerId: z.string(),
      checkIn: z.number(),
      checkOut: z.number().optional(),
    }),
  ),
  disputes: z.array(
    z.object({
      id: z.string(),
      workerId: z.string(),
      text: z.string(),
      status: z.enum(["Open", "Resolved", "Rejected"]),
      reply: z.string().optional(),
      at: z.number(),
    }),
  ),
  safety: z.array(
    z.object({
      id: z.string(),
      workerId: z.string().nullable(),
      category: z.string(),
      severity: z.enum(["Low", "Medium", "High"]),
      location: z.string(),
      text: z.string(),
      status: z.enum(["Submitted", "Under Review", "In Progress", "Resolved"]),
      note: z.string().optional(),
      at: z.number(),
    }),
  ),
  audit: z.array(z.object({ at: z.number(), who: z.string(), what: z.string() })),
  payApproved: z.record(z.boolean()),
});
