export type AdminRole = "super_admin" | "support" | "developer" | "read_only";

export function getRoleLabel(role: AdminRole) {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "support":
      return "Support";
    case "developer":
      return "Developer";
    case "read_only":
    default:
      return "Read Only";
  }
}

export function roleTone(role: AdminRole) {
  switch (role) {
    case "super_admin":
      return "info";
    case "support":
      return "success";
    case "developer":
      return "neutral";
    case "read_only":
    default:
      return "warning";
  }
}

export const adminNavItems = [
  { label: "Overview", href: "/admin" },
  { label: "Customers", href: "/admin/customers" },
  { label: "Users", href: "/admin/users" },
  { label: "Connectors", href: "/admin/connectors" },
  { label: "Analytics", href: "/admin/analytics" },
  { label: "AI Ops", href: "/admin/ai" },
  { label: "Billing", href: "/admin/billing" },
  { label: "Settings", href: "/admin/settings" },
];
