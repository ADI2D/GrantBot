"use client";

import { createContext, useContext, useMemo, useState, ReactNode } from "react";

type OrgOption = {
  id: string;
  name: string;
};

type OrgContextValue = {
  orgs: OrgOption[];
  currentOrgId: string;
  setCurrentOrgId: (id: string) => void;
  currentOrg?: OrgOption;
};

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

export function OrgProvider({
  children,
  orgs,
  initialOrgId,
}: {
  children: ReactNode;
  orgs: OrgOption[];
  initialOrgId: string;
}) {
  const [currentOrgId, setCurrentOrgId] = useState(initialOrgId);

  const value = useMemo(() => {
    const currentOrg = orgs.find((org) => org.id === currentOrgId) ?? orgs[0];
    return {
      orgs,
      currentOrgId: currentOrg?.id ?? initialOrgId,
      currentOrg,
      setCurrentOrgId,
    } satisfies OrgContextValue;
  }, [orgs, currentOrgId, initialOrgId]);

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrgContext() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error("useOrgContext must be used within OrgProvider");
  }
  return context;
}
