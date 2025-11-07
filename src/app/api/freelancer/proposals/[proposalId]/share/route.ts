import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    const { proposalId } = await params;
    const supabase = await createRouteSupabase();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { reviewerName, reviewerEmail, reviewerRelationship, message } = body;

    // Validate required fields
    if (!reviewerName || !reviewerEmail || !reviewerRelationship) {
      return NextResponse.json(
        { error: "Reviewer name, email, and relationship are required" },
        { status: 400 }
      );
    }

    // Verify proposal belongs to user
    const { data: proposal, error: proposalError } = await supabase
      .from("freelancer_proposals")
      .select("id, title, client_name, status")
      .eq("id", proposalId)
      .eq("freelancer_user_id", user.id)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    // Generate secure share token
    const shareToken = generateSecureToken();

    // Create share record
    const { data: share, error: shareError } = await supabase
      .from("freelancer_proposal_shares")
      .insert({
        proposal_id: proposalId,
        freelancer_user_id: user.id,
        share_token: shareToken,
        reviewer_name: reviewerName,
        reviewer_email: reviewerEmail,
        reviewer_relationship: reviewerRelationship,
        can_comment: true,
        // Expire after 30 days
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (shareError) {
      console.error("[freelancer][proposals][share] Create share error:", shareError);
      return NextResponse.json(
        { error: "Failed to create share link" },
        { status: 500 }
      );
    }

    // Get user's name for the email
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Construct share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const shareUrl = `${baseUrl}/proposals/shared/${shareToken}`;

    // Send email to reviewer
    try {
      await sendReviewEmail({
        to: reviewerEmail,
        reviewerName,
        senderName: user.email?.split('@')[0] || "A colleague", // Fallback to email prefix
        proposalTitle: proposal.title,
        clientName: proposal.client_name,
        shareUrl,
        personalMessage: message,
      });
    } catch (emailError) {
      console.error("[freelancer][proposals][share] Email error:", emailError);
      // Don't fail the request if email fails - the share link still exists
    }

    return NextResponse.json({
      success: true,
      shareId: share.id,
      shareUrl,
      expiresAt: share.expires_at,
    });
  } catch (error) {
    console.error("[freelancer][proposals][share] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Helper function to generate secure token
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Helper function to send review email
async function sendReviewEmail(params: {
  to: string;
  reviewerName: string;
  senderName: string;
  proposalTitle: string;
  clientName: string;
  shareUrl: string;
  personalMessage?: string;
}) {
  const { to, reviewerName, senderName, proposalTitle, clientName, shareUrl, personalMessage } = params;

  // Email HTML template
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .message-box { background-color: white; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Proposal Review Request</h1>
    </div>
    <div class="content">
      <p>Hello ${reviewerName},</p>

      <p>${senderName} has invited you to review a grant proposal:</p>

      <div class="message-box">
        <strong>Proposal:</strong> ${proposalTitle}<br>
        <strong>Client:</strong> ${clientName}
      </div>

      ${personalMessage ? `
      <div class="message-box">
        <strong>Personal Message:</strong><br>
        ${personalMessage}
      </div>
      ` : ''}

      <p>You can view the proposal and leave feedback by clicking the button below:</p>

      <div style="text-align: center;">
        <a href="${shareUrl}" class="button">Review Proposal</a>
      </div>

      <p style="font-size: 14px; color: #64748b;">
        Or copy and paste this link into your browser:<br>
        <a href="${shareUrl}">${shareUrl}</a>
      </p>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

      <p style="font-size: 14px;">
        <strong>What you can do:</strong>
      </p>
      <ul style="font-size: 14px;">
        <li>View the complete proposal</li>
        <li>Leave comments and suggestions</li>
        <li>Provide feedback on specific sections</li>
      </ul>

      <p style="font-size: 12px; color: #64748b;">
        This link will expire in 30 days. If you have any questions, please contact ${senderName}.
      </p>
    </div>

    <div class="footer">
      <p>This email was sent because ${senderName} shared a proposal with you for review.</p>
    </div>
  </div>
</body>
</html>
  `;

  // In production, you'd use a service like SendGrid, AWS SES, or Resend
  // For now, we'll log it
  console.log("[EMAIL] Would send to:", to);
  console.log("[EMAIL] Subject:", `Review Request: ${proposalTitle}`);
  console.log("[EMAIL] Share URL:", shareUrl);

  // TODO: Implement actual email sending
  // Example with Resend:
  /*
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: 'GrantBot <noreply@yourdomain.com>',
    to: [to],
    subject: `Review Request: ${proposalTitle}`,
    html: emailHtml,
  });
  */
}
