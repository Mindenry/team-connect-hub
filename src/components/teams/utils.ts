export function getRoleLabel(role?: string) {
  const value = String(role || "member").toLowerCase();
  if (value === "lead") return "Team Lead";
  return "Member";
}

export function rolePriority(role?: string) {
  const value = String(role || "member").toLowerCase();
  if (value === "lead") return 0;
  return 1;
}

export function canPromoteToLead(currentUserRole?: string) {
  const r = String(currentUserRole || "").toLowerCase();
  return r === "org_owner" || r === "admin";
}

export const filterOptions = [
  { key: "all", label: "ทั้งหมด" },
  { key: "mine", label: "ของฉัน" },
  { key: "favorites", label: "ปักหมุด" },
  { key: "active", label: "งานเปิด" },
] as const;
