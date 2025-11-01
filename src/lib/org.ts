const fallbackOrgId = process.env.NEXT_PUBLIC_DEMO_ORG_ID;

export function resolveOrgId(param?: string | null) {
  const orgId = param ?? fallbackOrgId;

  if (!orgId) {
    throw new Error(
      "Organization ID missing. Provide ?orgId= or set NEXT_PUBLIC_DEMO_ORG_ID.",
    );
  }

  return orgId;
}
