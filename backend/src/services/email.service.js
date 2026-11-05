// email.service.js — Email notification service powered by Nodemailer & MailHog

const nodemailer = require("nodemailer");

// Create reusable transporter configured for MailHog SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "127.0.0.1",
  port: parseInt(process.env.SMTP_PORT, 10) || 1025,
  secure: false, // MailHog runs plain SMTP on port 1025
  ignoreTLS: true,
});

const DEFAULT_FROM = process.env.SMTP_FROM || "University of Botswana Publications <noreply@ub.ac.bw>";

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Format publication type nicely (e.g., Thesis (Master's), Dissertation (PhD))
 */
function formatPubType(type) {
  if (!type) return "Unspecified";
  const lower = type.trim().toLowerCase();
  if (lower === "thesis") return "Thesis (Master's)";
  if (lower === "dissertation") return "Dissertation (PhD)";
  return type;
}

/**
 * Send an email notification to the student confirming submission receipt.
 *
 * @param {Object} params
 * @param {string} params.studentEmail - Student's email from Users table
 * @param {string} params.studentName - Student's full name
 * @param {string} params.title - Publication title
 * @param {string} params.reference - Publication reference (e.g. UB-PUB-2026-XXXX)
 * @param {string} params.publicationType - Type (Thesis, Dissertation, Journal Article, etc.)
 * @param {string} [params.academicLevel] - Master's / PhD
 * @param {string} [params.lecturerName] - Assigned reviewing lecturer
 * @param {string} [params.lecturerEmail] - Assigned reviewing lecturer's email
 */
async function sendSubmissionConfirmation({
  studentEmail,
  studentName,
  title,
  reference,
  publicationType,
  academicLevel,
  lecturerName,
  lecturerEmail,
}) {
  if (!studentEmail) {
    console.warn("[EmailService] No student email provided; skipping notification.");
    return null;
  }

  const formattedType = formatPubType(publicationType);
  const reviewerDisplay = lecturerName
    ? `${lecturerName}${lecturerEmail ? ` (${lecturerEmail})` : ""}`
    : "To be assigned";

  const subject = `[UB Publications] Submission Confirmed: ${reference} - ${title}`;

  const textBody = `
Dear ${studentName || "Student"},

Thank you for submitting your research to the University of Botswana Publication Management System.

Submission Summary:
--------------------------------------------------------------------------------
Reference Number : ${reference}
Title            : ${title}
Publication Type : ${formattedType}${academicLevel ? ` [${academicLevel}]` : ""}
Current Status   : Pending Review
Assigned Reviewer: ${reviewerDisplay}
Date Submitted   : ${new Date().toLocaleString("en-GB")}
--------------------------------------------------------------------------------

Your assigned lecturer/supervisor has been notified and will review your manuscript. You will receive an email update once a review determination has been submitted.

Best regards,
University of Botswana — Publication Management Subsystem
  `.trim();

  const htmlBody = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #222; margin: 0; padding: 0; background-color: #f7f7f9; }
      .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 8px; border: 1px solid #e5e5ea; overflow: hidden; }
      .header { background: #800020; color: #ffffff; padding: 24px 30px; }
      .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
      .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
      .content { padding: 30px; font-size: 15px; line-height: 1.6; }
      .card { background: #faf8f8; border-left: 4px solid #800020; padding: 16px 20px; margin: 20px 0; border-radius: 4px; }
      .card-item { margin-bottom: 8px; }
      .card-item:last-child { margin-bottom: 0; }
      .card-label { font-weight: 600; color: #555; display: inline-block; width: 140px; }
      .card-value { color: #111; font-weight: 500; }
      .badge-type { background: #800020; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; }
      .badge-status { background: #d97706; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; }
      .footer { background: #f2f2f7; color: #666; padding: 16px 30px; font-size: 12px; text-align: center; border-top: 1px solid #e5e5ea; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>University of Botswana</h1>
        <p>Publication Management System</p>
      </div>
      <div class="content">
        <p>Dear <strong>${escapeHtml(studentName || "Student")}</strong>,</p>
        <p>Your research submission has been successfully received and recorded in the repository.</p>
        
        <div class="card">
          <div class="card-item"><span class="card-label">Reference Number:</span> <span class="card-value"><strong>${escapeHtml(reference)}</strong></span></div>
          <div class="card-item"><span class="card-label">Title:</span> <span class="card-value">${escapeHtml(title)}</span></div>
          <div class="card-item"><span class="card-label">Publication Type:</span> <span class="badge-type">${escapeHtml(formattedType)}</span></div>
          ${academicLevel ? `<div class="card-item"><span class="card-label">Academic Track:</span> <span class="card-value">${escapeHtml(academicLevel)}</span></div>` : ""}
          <div class="card-item"><span class="card-label">Current Status:</span> <span class="badge-status">Pending Review</span></div>
          <div class="card-item"><span class="card-label">Reviewing Lecturer:</span> <span class="card-value">${escapeHtml(reviewerDisplay)}</span></div>
          <div class="card-item"><span class="card-label">Submitted On:</span> <span class="card-value">${new Date().toLocaleString("en-GB")}</span></div>
        </div>

        <p>Your manuscript has been routed to your assigned reviewing lecturer. You will receive an update once a review determination has been submitted.</p>
      </div>
      <div class="footer">
        University of Botswana &bull; Computer Science &bull; Post-Graduate Research Repository
      </div>
    </div>
  </body>
  </html>
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to: studentEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });

    console.log(`[EmailService] Submission email delivered to ${studentEmail} (MessageId: ${info.messageId})`);
    return info;
  } catch (err) {
    console.error("[EmailService] Failed to send student submission email:", err.message);
    return null;
  }
}

/**
 * Send an email notification to the assigned lecturer informing them of a pending review.
 */
async function sendLecturerAssignmentNotification({
  lecturerEmail,
  lecturerName,
  studentName,
  studentEmail,
  title,
  reference,
  publicationType,
}) {
  if (!lecturerEmail) {
    return null;
  }

  const formattedType = formatPubType(publicationType);
  const subject = `[UB Publications] Action Required: New Submission Assigned for Review (${reference})`;

  const textBody = `
Dear ${lecturerName || "Lecturer"},

A new student publication has been submitted and assigned to you for review.

Submission Details:
--------------------------------------------------------------------------------
Reference Number : ${reference}
Title            : ${title}
Submitting Student: ${studentName || "Student"}${studentEmail ? ` (${studentEmail})` : ""}
Type             : ${formattedType}
Submitted At     : ${new Date().toLocaleString("en-GB")}
--------------------------------------------------------------------------------

Please log in to the University of Botswana Publication Management System review queue to evaluate this submission.

Best regards,
University of Botswana — Publication Management Subsystem
  `.trim();

  const htmlBody = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #222; margin: 0; padding: 0; background-color: #f7f7f9; }
      .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 8px; border: 1px solid #e5e5ea; overflow: hidden; }
      .header { background: #800020; color: #ffffff; padding: 24px 30px; }
      .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
      .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
      .content { padding: 30px; font-size: 15px; line-height: 1.6; }
      .card { background: #faf8f8; border-left: 4px solid #800020; padding: 16px 20px; margin: 20px 0; border-radius: 4px; }
      .card-item { margin-bottom: 8px; }
      .card-label { font-weight: 600; color: #555; display: inline-block; width: 150px; }
      .card-value { color: #111; font-weight: 500; }
      .badge-type { background: #800020; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; }
      .footer { background: #f2f2f7; color: #666; padding: 16px 30px; font-size: 12px; text-align: center; border-top: 1px solid #e5e5ea; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>University of Botswana</h1>
        <p>Publication Management System &bull; Lecturer Review</p>
      </div>
      <div class="content">
        <p>Dear <strong>${escapeHtml(lecturerName || "Lecturer")}</strong>,</p>
        <p>A new publication manuscript has been submitted and assigned to your review queue.</p>
        
        <div class="card">
          <div class="card-item"><span class="card-label">Reference Number:</span> <span class="card-value"><strong>${escapeHtml(reference)}</strong></span></div>
          <div class="card-item"><span class="card-label">Title:</span> <span class="card-value">${escapeHtml(title)}</span></div>
          <div class="card-item"><span class="card-label">Submitting Student:</span> <span class="card-value">${escapeHtml(studentName || "Student")} ${studentEmail ? `&lt;${escapeHtml(studentEmail)}&gt;` : ""}</span></div>
          <div class="card-item"><span class="card-label">Publication Type:</span> <span class="badge-type">${escapeHtml(formattedType)}</span></div>
          <div class="card-item"><span class="card-label">Assigned At:</span> <span class="card-value">${new Date().toLocaleString("en-GB")}</span></div>
        </div>

        <p>Please log in to your reviewer dashboard to inspect the document and record your evaluation decision.</p>
      </div>
      <div class="footer">
        University of Botswana &bull; Computer Science &bull; Post-Graduate Research Repository
      </div>
    </div>
  </body>
  </html>
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to: lecturerEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log(`[EmailService] Lecturer assignment email delivered to ${lecturerEmail} (MessageId: ${info.messageId})`);
    return info;
  } catch (err) {
    console.error("[EmailService] Failed to send lecturer assignment email:", err.message);
    return null;
  }
}

/**
 * Send an email notification to the student when a review status update occurs.
 */
async function sendReviewDecisionNotification({
  studentEmail,
  studentName,
  title,
  reference,
  status,
  comments,
  reviewerName,
}) {
  if (!studentEmail) {
    return null;
  }

  const isApproved = status.toLowerCase() === "approved";
  const statusColor = isApproved ? "#15803d" : "#b91c1c";
  const subject = `[UB Publications] Review Decision: ${title} (${status})`;

  const textBody = `
Dear ${studentName || "Student"},

Your submission "${title}" (${reference}) has been reviewed.

Status: ${status}
Reviewer: ${reviewerName || "Assigned Lecturer"}
${comments ? `Comments:\n${comments}\n` : ""}

You can view the full details on the University of Botswana Publication Management dashboard.

Best regards,
University of Botswana — Publication Management Subsystem
  `.trim();

  const htmlBody = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #222; margin: 0; padding: 0; background-color: #f7f7f9; }
      .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 8px; border: 1px solid #e5e5ea; overflow: hidden; }
      .header { background: #800020; color: #ffffff; padding: 24px 30px; }
      .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
      .content { padding: 30px; font-size: 15px; line-height: 1.6; }
      .status-pill { display: inline-block; background: ${statusColor}; color: #ffffff; padding: 6px 14px; border-radius: 14px; font-weight: 700; font-size: 14px; margin: 10px 0; }
      .comments-box { background: #fdfdfd; border-left: 4px solid ${statusColor}; padding: 14px 18px; margin: 16px 0; border-radius: 4px; font-style: italic; color: #333; }
      .footer { background: #f2f2f7; color: #666; padding: 16px 30px; font-size: 12px; text-align: center; border-top: 1px solid #e5e5ea; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>University of Botswana</h1>
        <p>Publication Management System &bull; Review Decision</p>
      </div>
      <div class="content">
        <p>Dear <strong>${escapeHtml(studentName || "Student")}</strong>,</p>
        <p>An evaluation has been completed for your publication: <strong>${escapeHtml(title)}</strong> (<em>${escapeHtml(reference)}</em>).</p>

        <p><strong>Review Decision:</strong><br />
          <span class="status-pill">${escapeHtml(status.toUpperCase())}</span>
        </p>

        ${comments ? `<div class="comments-box"><strong>Reviewer Feedback:</strong><br />${escapeHtml(comments)}</div>` : ""}

        <p>Reviewed by: <strong>${escapeHtml(reviewerName || "Assigned Lecturer")}</strong></p>
        <p>Log in to your dashboard to review any required revisions or proceed with final repository deposit.</p>
      </div>
      <div class="footer">
        University of Botswana &bull; Computer Science &bull; Post-Graduate Research Repository
      </div>
    </div>
  </body>
  </html>
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to: studentEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log(`[EmailService] Review decision email delivered to ${studentEmail} (MessageId: ${info.messageId})`);
    return info;
  } catch (err) {
    console.error("[EmailService] Failed to send review decision email:", err.message);
    return null;
  }
}

module.exports = {
  transporter,
  sendSubmissionConfirmation,
  sendLecturerAssignmentNotification,
  sendReviewDecisionNotification,
};
