import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const highlights = [
  {
    title: "AI drafting + human review",
    description:
      "Upload your profile once, then pull funder-ready narratives with embedded compliance guardrails.",
  },
  {
    title: "Opportunity intelligence",
    description:
      "Curated grants with match scoring, risk flags, and reminders keep the pipeline full without extra staff.",
  },
  {
    title: "Outcomes analytics",
    description:
      "See where proposals win, share insights with your board, and feed learnings back into every template.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-20">
        <header className="space-y-6 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600"
          >
            GrantSpec MVP • 90-day build
          </Link>
          <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">
            Win more grants with an AI workspace built for small nonprofits.
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-600">
            GrantSpec combines automated research, proposal drafting, collaboration, and analytics so lean teams produce board-ready submissions in under 48 hours.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild className="gap-2">
              <Link href="/dashboard">
                Open workspace
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/onboarding">See onboarding flow</Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {highlights.map((highlight) => (
            <Card key={highlight.title} className="p-6">
              <p className="text-sm font-semibold text-blue-600">{highlight.title}</p>
              <p className="mt-3 text-sm text-slate-600">{highlight.description}</p>
            </Card>
          ))}
        </section>

        <Card className="overflow-hidden border border-blue-200 bg-white p-8 text-center shadow-soft">
          <p className="text-xs uppercase text-blue-500">Pilot proof point</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            40% win rate vs. 15% historical
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Run the concierge beta with 10 nonprofits, then graduate to automated onboarding and analytics loops outlined in the PRD and roadmap.
          </p>
        </Card>
      </div>
    </div>
  );
}
