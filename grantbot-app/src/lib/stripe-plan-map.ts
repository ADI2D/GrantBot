const entries: [string, string | undefined][] = [
  [process.env.STRIPE_PRICE_STARTER ?? "", "starter"],
  [process.env.STRIPE_PRICE_GROWTH ?? "", "growth"],
  [process.env.STRIPE_PRICE_IMPACT ?? "", "impact"],
];

const pricePlanMap: Record<string, string> = entries.reduce((acc, [priceId, planId]) => {
  if (priceId && planId) {
    acc[priceId] = planId;
  }
  return acc;
}, {} as Record<string, string>);

export function getPlanFromPrice(priceId?: string | null) {
  if (!priceId) return null;
  return pricePlanMap[priceId] ?? null;
}
