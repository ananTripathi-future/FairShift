import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { commandFn, dashboardFn } from "./fairshift.functions";
import { commandSchema, type Command } from "./workflows";

export function useDashboard() {
  const fetch = useServerFn(dashboardFn);
  return useQuery({ queryKey: ["fairshift"], queryFn: () => fetch(), refetchInterval: 30000 });
}
export function useCommand() {
  const run = useServerFn(commandFn);
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (input: Command) => run({ data: commandSchema.parse(input) }),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["fairshift"] }),
    onError: (error) => toast.error(error.message),
  });
}
