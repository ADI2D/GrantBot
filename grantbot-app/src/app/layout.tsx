import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { createServerSupabase } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "GrantBot | AI Grant Workspace",
  description:
    "GrantBot helps small nonprofits ship fundable grant proposals with AI drafting, workflows, and performance insights.",
  metadataBase: new URL("https://grantbot.local"),
  openGraph: {
    title: "GrantBot",
    description:
      "AI-assisted grant writing workspace designed for small nonprofits.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <AppProviders initialSession={session}>{children}</AppProviders>
      </body>
    </html>
  );
}
