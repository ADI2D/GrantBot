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
  title: "GrantSpec | AI Grant Workspace",
  description:
    "GrantSpec helps small nonprofits ship fundable grant proposals with AI drafting, workflows, and performance insights.",
  metadataBase: new URL("https://grantspec.local"),
  openGraph: {
    title: "GrantSpec",
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
    data: { user },
  } = await supabase.auth.getUser();

  // If user exists, fetch the full session for initial state
  let session = null;
  if (user) {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  }

  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body className="antialiased font-body bg-surface text-primary">
        <AppProviders initialSession={session}>{children}</AppProviders>
      </body>
    </html>
  );
}
