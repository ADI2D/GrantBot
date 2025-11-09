import { useOrgContext } from "@/components/providers/org-provider";

export function useOrg() {
  return useOrgContext();
}
