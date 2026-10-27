import { z } from "zod";
import type { Tables } from "@/integrations/supabase/types";

const uuid = z.string().uuid();
const note = z.string().trim().min(5).max(500);
const reason = z.string().trim().min(10).max(500);
const instant = z.string().datetime({ offset: true });
const amount = z.number().int().min(0).max(100000000);
export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(10000),
  timestamp: z.number().positive(),
});
export const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["feedback", "observation"]), data: z.object({ text: reason }) }),
  z.object({ action: z.literal("flag_attendance"), data: z.object({ id: uuid, reason }) }),
  z.object({
    action: z.literal("update_shift"),
    data: z.object({ id: uuid, start: instant, end: instant }),
  }),
  z.object({ action: z.literal("cancel_shift"), data: z.object({ id: uuid }) }),
  z.object({
    action: z.literal("pay_rules"),
    data: z.object({
      minutes: z.number().int().min(60).max(1440),
      multiplier: z.number().int().min(100).max(300),
    }),
  }),
  z.object({
    action: z.literal("location_settings"),
    data: z.object({
      required: z.boolean(),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      radius: z.number().int().min(50).max(2000),
    }),
  }),
  z.object({
    action: z.literal("skills"),
    data: z.object({ skills: z.array(z.string().trim().min(1).max(100)).max(20) }),
  }),
  z.object({
    action: z.literal("create_site"),
    data: z.object({ name: z.string().trim().min(2).max(100) }),
  }),
  z.object({ action: z.literal("join_site"), data: z.object({ code: uuid }) }),
  z.object({
    action: z.literal("profile"),
    data: z.object({ name: z.string().trim().min(1).max(100), language: z.enum(["en", "ta"]) }),
  }),
  z.object({ action: z.literal("qr"), data: z.object({}) }),
  z.object({
    action: z.literal("schedule"),
    data: z.object({ worker_id: uuid, start: instant, end: instant }),
  }),
  z.object({
    action: z.enum(["check_in", "check_out"]),
    data: z.object({ id: uuid, token: uuid, location: locationSchema.optional() }),
  }),
  z.object({
    action: z.literal("correction"),
    data: z.object({ id: uuid, in: instant, out: instant, reason }),
  }),
  z.object({
    action: z.literal("correction_decision"),
    data: z.object({ id: uuid, status: z.enum(["Approved", "Rejected"]), reply: note }),
  }),
  z.object({ action: z.literal("verify"), data: z.object({ id: uuid }) }),
  z.object({
    action: z.literal("dispute"),
    data: z.object({
      line: z.enum(["Base pay", "Overtime", "Allowances", "Deductions", "Net payable"]),
      text: reason,
    }),
  }),
  z.object({
    action: z.literal("dispute_decision"),
    data: z.object({ id: uuid, status: z.enum(["Resolved", "Rejected"]), reply: note }),
  }),
  z.object({
    action: z.literal("pay_terms"),
    data: z.object({
      worker_id: uuid,
      rate: z.number().int().min(0).max(10000000),
      allowance: amount,
      deduction: amount,
    }),
  }),
  z.object({ action: z.literal("approve_pay"), data: z.object({ worker_id: uuid }) }),
  z.object({
    action: z.literal("role"),
    data: z.object({ worker_id: uuid, role: z.enum(["worker", "supervisor", "manager"]) }),
  }),
  z.object({
    action: z.literal("report"),
    data: z.object({
      language: z.enum(["en", "ta"]),
      category: z.string().min(1).max(60),
      severity: z.enum(["Low", "Medium", "High"]),
      location: z.string().trim().min(2).max(120),
      text: z.string().trim().max(1000),
      anonymous: z.boolean(),
      has_media: z.boolean(),
      manager_id: uuid.optional(),
    }),
  }),
  z.object({
    action: z.literal("report_update"),
    data: z.object({
      id: uuid,
      status: z.enum(["Under Review", "Action Taken", "Resolved"]),
      note,
    }),
  }),
  z.object({ action: z.literal("assign"), data: z.object({ id: uuid, manager_id: uuid }) }),
  z.object({ action: z.literal("escalate"), data: z.object({ id: uuid }) }),
  z.object({
    action: z.literal("deadlines"),
    data: z.object({
      Low: z.number().int().min(1).max(720),
      Medium: z.number().int().min(1).max(720),
      High: z.number().int().min(1).max(720),
    }),
  }),
]);
export type Command = z.infer<typeof commandSchema>;
export type Dashboard = {
  profile: Tables<"profiles">;
  membership: Tables<"user_roles"> | null;
  period: string;
  site?: Tables<"fs_sites">;
  people?: { id: string; name: string; role: "worker" | "manager" | "supervisor" }[];
  payroll?: Tables<"fs_payroll">[];
  shifts?: Tables<"fs_shifts">[];
  corrections?: Tables<"fs_corrections">[];
  disputes?: Tables<"fs_disputes">[];
  reports?: Tables<"fs_reports">[];
  events?: Tables<"fs_events">[];
  notifications?: Tables<"fs_notifications">[];
};
export const steps = ["Reported", "Under Review", "Action Taken", "Resolved"];
export function isOverdue(report: Pick<Tables<"fs_reports">, "status" | "due_at">, now: number) {
  return report.status !== "Resolved" && Date.parse(report.due_at) < now;
}
export function parseQR(value: string) {
  let raw = value.trim();
  const match = raw.match(/[?&]token=([0-9a-fA-F-]{36})/);
  if (match) raw = match[1]!;
  else if (raw.startsWith("fairshift:")) raw = raw.slice(10);
  return uuid.parse(raw);
}
const mediaTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
]);
export function validateMedia(files: Pick<File, "type" | "size">[]) {
  if (files.length > 3) throw new Error("Attach up to three files.");
  for (const file of files) {
    if (
      !mediaTypes.has(file.type.split(";")[0] ?? "") ||
      file.size <= 0 ||
      file.size > 10 * 1024 * 1024
    )
      throw new Error("Use JPG, PNG, WebP or audio files up to 10 MB.");
  }
}
export const dateTime = (s: string) =>
  new Date(s).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
export const periodOf = (s: string) => new Date(Date.parse(s) + 19800000).toISOString().slice(0, 7);
