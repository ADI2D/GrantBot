import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { createServerSupabase } from "@/lib/supabase-server";
import { Montserrat, Merriweather } from "next/font/google";

const headingFont = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading-variable",
  weight: ["600", "700", "800"],
});

const bodyFont = Merriweather({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body-variable",
  weight: ["300", "400", "700"],
});

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
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body className="antialiased font-body bg-surface text-primary">
        <AppProviders initialSession={session}>{children}</AppProviders>
      </body>
    </html>
  );
}
