import Link from "next/link";
import { listAllPricingPlans } from "@/lib/pricing-plans";
import { PricingManager } from "./pricing-manager";

export default async function PricingSettingsPage() {
  const plans = await listAllPricingPlans();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase text-slate-500">Configuration</p>
        <h1 className="text-2xl font-semibold text-slate-900">Pricing Tiers</h1>
        <p className="text-sm text-slate-500">
          Edit plan names, pricing, and proposal allowances. Stripe products and prices are kept in sync when you update
          a plan.
        </p>
        <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
          ← Back to settings
        </Link>
      </header>

      <PricingManager initialPlans={plans} />
    </div>
  );
}
