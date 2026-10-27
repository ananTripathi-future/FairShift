import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { commandSchema } from "./workflows";
import type { Dashboard } from "./workflows";

export const dashboardFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("fs_dashboard");
    if (error) throw new Error(error.message);
    return data as unknown as Dashboard;
  });

export const commandFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => commandSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { data: result, error } = await context.supabase.rpc("fs_command", {
      p_action: data.action,
      p_data: data.data,
    });
    if (error) throw new Error(error.message);
    return result as { id?: string; reference?: string; token?: string; expires_at?: string };
  });
