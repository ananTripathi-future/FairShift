import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";

const id = z.string().uuid();
const text = z.string();
const instant = z.string().datetime({ offset: true });
const nullableInstant = instant.nullable();
const role = z.enum(["worker", "supervisor", "manager"]);
const json: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(json),
    z.record(json.optional()),
  ]),
);
const record = { id, site_id: id, created_at: instant };

export const dashboardSchema = z.object({
  profile: z.object({ id, name: text, language: text, skills: z.array(text) }),
  membership: z.object({ user_id: id, site_id: id, role }).nullable(),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  site: z
    .object({
      id,
      name: text,
      join_code: id.optional(),
      supervisor_id: id,
      manager_id: id.nullable(),
      low_hours: z.number(),
      medium_hours: z.number(),
      high_hours: z.number(),
      location_required: z.boolean(),
      latitude: z.number().nullable(),
      longitude: z.number().nullable(),
      radius_m: z.number(),
      daily_regular_minutes: z.number(),
      overtime_multiplier_pct: z.number(),
    })
    .optional(),
  people: z.array(z.object({ id, name: text, role })).optional(),
  payroll: z
    .array(
      z.object({
        worker_id: id,
        site_id: id,
        rate_paise: z.number(),
        allowance_paise: z.number(),
        deduction_paise: z.number(),
        approved_month: text.nullable(),
        approved_at: nullableInstant,
        approved_by: id.nullable(),
      }),
    )
    .optional(),
  shifts: z
    .array(
      z.object({
        id,
        site_id: id,
        worker_id: id,
        scheduled_start: instant,
        scheduled_end: instant,
        check_in: nullableInstant,
        check_out: nullableInstant,
        verified_at: nullableInstant,
        verified_by: id.nullable(),
      }),
    )
    .optional(),
  corrections: z
    .array(
      z.object({
        ...record,
        shift_id: id,
        worker_id: id,
        proposed_in: instant,
        proposed_out: instant,
        reason: text,
        status: text,
        reply: text.nullable(),
      }),
    )
    .optional(),
  disputes: z
    .array(
      z.object({
        ...record,
        worker_id: id,
        period: text,
        line: text,
        text,
        status: text,
        reply: text.nullable(),
      }),
    )
    .optional(),
  reports: z
    .array(
      z.object({
        ...record,
        reference: text,
        reporter_name: text.nullable(),
        language: text,
        category: text,
        severity: text,
        location: text,
        text,
        status: text,
        manager_id: id,
        due_at: instant,
        escalated_at: nullableInstant,
        note: text.nullable(),
      }),
    )
    .optional(),
  events: z
    .array(z.object({ ...record, entity_id: id, actor: text, action: text, details: json }))
    .optional(),
  notifications: z
    .array(
      z.object({
        id,
        user_id: id,
        entity_id: id,
        kind: text,
        message: text,
        created_at: instant,
      }),
    )
    .optional(),
});

export type Dashboard = z.infer<typeof dashboardSchema>;
export const commandResultSchema = z.object({
  id: id.optional(),
  reference: text.optional(),
  token: id.optional(),
  expires_at: instant.optional(),
});
export type CommandResult = z.infer<typeof commandResultSchema>;

export function parseDashboard(value: unknown): Dashboard {
  const result = dashboardSchema.safeParse(value);
  if (!result.success)
    throw new Error("Workspace data could not be read. Please refresh and try again.");
  return result.data;
}

export function parseCommandResult(value: unknown): CommandResult {
  const result = commandResultSchema.safeParse(value);
  if (!result.success)
    throw new Error("The action returned an unreadable result. Refresh to check its status.");
  return result.data;
}
