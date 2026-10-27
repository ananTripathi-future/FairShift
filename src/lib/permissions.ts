export type SiteRole = "worker" | "supervisor" | "manager";
export function permissions(role: SiteRole | undefined) {
  return {
    level: role === "manager" ? 3 : role === "supervisor" ? 2 : 1,
    operations: role === "manager" || role === "supervisor",
    payroll: role === "manager",
    correctionDecision: role === "manager",
    manageAccess: role === "manager",
  };
}
export function canDecide(role: SiteRole | undefined, actor: string, owner: string) {
  return role === "manager" && actor !== owner;
}
