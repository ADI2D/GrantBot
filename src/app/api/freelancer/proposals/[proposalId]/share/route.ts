import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { Resend } from "resend";

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
    const { reviewerName, reviewerEmail, reviewerRelationship, proposalStage, message } = body;

    // Validate required fields
    if (!reviewerName || !reviewerEmail || !reviewerRelationship || !proposalStage) {
      return NextResponse.json(
        { error: "Reviewer name, email, relationship, and proposal stage are required" },
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
        proposal_stage: proposalStage,
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
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 8px 0 0 0;
      color: #cbd5e1;
      font-size: 14px;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      margin: 0 0 20px 0;
      color: #1e293b;
      font-size: 20px;
      font-weight: 600;
    }
    .content p {
      margin: 0 0 16px 0;
      line-height: 1.6;
      color: #475569;
      font-size: 16px;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 10px 0;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .info-box {
      background-color: #f1f5f9;
      border-left: 4px solid #2563eb;
      padding: 16px 20px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .info-box p {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #475569;
      line-height: 1.5;
    }
    .info-box p:last-child {
      margin-bottom: 0;
    }
    .info-box strong {
      color: #1e293b;
    }
    .message-box {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px 20px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .message-box p {
      margin: 0;
      color: #78350f;
      font-size: 15px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .message-box strong {
      display: block;
      margin-bottom: 8px;
      color: #92400e;
    }
    .features {
      margin: 24px 0;
    }
    .features ul {
      margin: 12px 0;
      padding-left: 20px;
    }
    .features li {
      margin: 8px 0;
      color: #475569;
      font-size: 15px;
      line-height: 1.5;
    }
    .link-box {
      background-color: #f8fafc;
      padding: 12px;
      border-radius: 6px;
      margin: 20px 0;
      word-break: break-all;
    }
    .link-box a {
      color: #2563eb;
      font-size: 13px;
      text-decoration: none;
    }
    .footer {
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      background-color: #f8fafc;
    }
    .footer p {
      margin: 0 0 8px 0;
      font-size: 13px;
      color: #64748b;
      line-height: 1.6;
    }
    .footer p:last-child {
      margin-bottom: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Proposal Review Request</h1>
      <p>You've been invited to provide feedback</p>
    </div>

    <div class="content">
      <p>Hello <strong>${reviewerName}</strong>,</p>

      <p>${senderName} has invited you to review a grant proposal and provide your valuable feedback.</p>

      <div class="info-box">
        <p><strong>📋 Proposal Details:</strong></p>
        <p><strong>Title:</strong> ${proposalTitle}</p>
        <p><strong>Client:</strong> ${clientName}</p>
      </div>

      ${personalMessage ? `
      <div class="message-box">
        <strong>💬 Personal Message from ${senderName}:</strong>
        <p>${personalMessage}</p>
      </div>
      ` : ''}

      <div class="button-container">
        <a href="${shareUrl}" class="button">Review Proposal Now</a>
      </div>

      <div class="features">
        <p><strong>What you can do:</strong></p>
        <ul>
          <li>📖 Read the complete proposal draft</li>
          <li>💭 Leave comments and suggestions</li>
          <li>✍️ Provide specific feedback on content</li>
          <li>🎯 Help improve the proposal quality</li>
        </ul>
      </div>

      <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
        <strong>Can't click the button?</strong> Copy and paste this link into your browser:
      </p>
      <div class="link-box">
        <a href="${shareUrl}">${shareUrl}</a>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        ⏰ This review link will expire in 30 days. If you have any questions, please contact ${senderName} directly.
      </p>
    </div>

    <div class="footer">
      <p><strong>GrantBot</strong> - Grant Writing Platform</p>
      <p>This email was sent because ${senderName} shared a proposal with you for review.</p>
    </div>
  </div>
</body>
</html>
  `;

  // Check if Resend API key is configured
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  if (!resendApiKey) {
    console.error("[EMAIL] RESEND_API_KEY not configured");
    console.log("[EMAIL] Would send to:", to);
    console.log("[EMAIL] Subject:", `Review Request: ${proposalTitle}`);
    console.log("[EMAIL] Share URL:", shareUrl);
    throw new Error("Email service not configured. Please add RESEND_API_KEY to environment variables.");
  }

  // Send email with Resend
  const resend = new Resend(resendApiKey);

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject: `📋 Review Request: ${proposalTitle}`,
    html: emailHtml,
  });

  if (error) {
    console.error("[EMAIL] Send error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  console.log("[EMAIL] ✅ Email sent successfully to:", to);
  console.log("[EMAIL] Message ID:", data?.id);

  return data;
}
