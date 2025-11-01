import { NextRequest, NextResponse } from "next/server";
import { fetchOrganization } from "@/lib/data-service";
import { createRouteSupabase } from "@/lib/supabase-server";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const sectionId: string | undefined = body.sectionId;

    if (!sectionId) {
      return NextResponse.json({ error: "Missing sectionId" }, { status: 400 });
    }

    const proposalId = params.id;

    const { data: proposal } = await supabase
      .from("proposals")
      .select("id, organization_id, opportunity_id")
      .eq("id", proposalId)
      .single();

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const organization = await fetchOrganization(supabase, proposal.organization_id);

    const { data: opportunity } = await supabase
      .from("opportunities")
      .select("name, focus_area, compliance_notes")
      .eq("id", proposal.opportunity_id)
      .single();

    const { data: sectionRecord } = await supabase
      .from("proposal_sections")
      .select("title")
      .eq("id", sectionId)
      .eq("proposal_id", proposalId)
      .single();

    if (!sectionRecord) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const prompt = `You are writing the "${sectionRecord.title}" section for a grant proposal. \n\nOrganization: ${organization.name}. Mission: ${organization.mission ?? "(not provided)"}. \nOpportunity: ${opportunity?.name ?? "(not specified)"}. Focus area: ${opportunity?.focus_area ?? "(unknown)"}.\n\nDraft a professional, funder-ready narrative in 2-3 paragraphs covering the required content for this section.`;

    let generatedContent = `Automated draft for ${sectionRecord.title}. Replace this text with AI output once integration is configured.`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch(OPENAI_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "You are an expert nonprofit grant writer." },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
          }),
        });

        if (response.ok) {
          const json = await response.json();
          generatedContent = json.choices?.[0]?.message?.content ?? generatedContent;
        }
      } catch (apiError) {
        console.warn("OpenAI generation failed", apiError);
      }
    }

    await supabase
      .from("proposal_sections")
      .update({ content: generatedContent, updated_at: new Date().toISOString() })
      .eq("id", sectionId);

    await supabase.from("activity_logs").insert({
      organization_id: proposal.organization_id,
      proposal_id: proposal.id,
      user_id: session.user.id,
      action: "section_regenerated",
      metadata: { sectionId, sectionTitle: sectionRecord.title },
    });

    return NextResponse.json({ content: generatedContent });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
