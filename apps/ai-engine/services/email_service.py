"""
ViraWorkX ATS — Email Sending Service
SendGrid-based email sending with template support.
"""
import logging
from typing import Optional
from datetime import datetime, timezone

from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


def render_template(template_body: str, variables: dict) -> str:
    """Replace {{variable}} placeholders in email templates."""
    rendered = template_body
    for key, value in variables.items():
        rendered = rendered.replace(f"{{{{{key}}}}}", str(value or ""))
    return rendered


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    from_email: Optional[str] = None,
    from_name: Optional[str] = None,
) -> dict:
    """
    Send an email via SendGrid.
    Returns {"success": bool, "message_id": str, "error": str}
    """
    if not settings.SENDGRID_API_KEY:
        logger.warning("SendGrid API key not configured, email not sent")
        return {"success": False, "error": "SendGrid not configured"}

    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail, Email, To, Content

        sg = SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        message = Mail(
            from_email=Email(from_email or settings.FROM_EMAIL, from_name or settings.FROM_NAME),
            to_emails=To(to_email),
            subject=subject,
            html_content=html_content,
        )
        if text_content:
            message.add_content(Content("text/plain", text_content))

        response = sg.send(message)
        message_id = response.headers.get("X-Message-Id", "")

        logger.info(f"Email sent to {to_email}, status={response.status_code}, id={message_id}")
        return {
            "success": response.status_code in (200, 201, 202),
            "message_id": message_id,
            "status_code": response.status_code,
        }

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return {"success": False, "error": str(e)}


async def send_stage_email(
    candidate_name: str,
    candidate_email: str,
    stage: str,
    template_subject: str,
    template_body: str,
    extra_variables: dict = None,
) -> dict:
    """Send a stage-triggered email with template variables."""
    variables = {
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
        "stage": stage,
        "company_name": "ViraWorkX",
        "year": datetime.now().year,
        **(extra_variables or {}),
    }

    rendered_subject = render_template(template_subject, variables)
    rendered_body = render_template(template_body, variables)

    return await send_email(
        to_email=candidate_email,
        subject=rendered_subject,
        html_content=rendered_body,
    )


# -- Default Email Templates --
DEFAULT_TEMPLATES = [
    {
        "name": "Application Received",
        "trigger_stage": "applied",
        "subject": "Thanks for applying to ViraWorkX, {{candidate_name}}!",
        "body_html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7C3AED;">Application Received</h2>
            <p>Hi {{candidate_name}},</p>
            <p>Thank you for your interest in joining ViraWorkX! We've received your application and our team will review it within 48 hours.</p>
            <p>What happens next:</p>
            <ol>
                <li>Our team reviews your profile</li>
                <li>If shortlisted, we'll schedule a quick phone call</li>
                <li>You'll complete our assessment process</li>
                <li>Get matched with US startup clients</li>
            </ol>
            <p>Best regards,<br>The ViraWorkX Team</p>
        </div>
        """,
        "is_auto_send": True,
    },
    {
        "name": "Phone Screen Passed",
        "trigger_stage": "enrolled",
        "subject": "Welcome to ViraWorkX Assessment, {{candidate_name}}!",
        "body_html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7C3AED;">You're Moving Forward!</h2>
            <p>Hi {{candidate_name}},</p>
            <p>Great news! You've passed the initial screening and you're now enrolled in the ViraWorkX talent assessment program.</p>
            <p>Your next step is to complete our 3-part proctored assessment:</p>
            <ol>
                <li><strong>Coding Assessment</strong> -- Technical skills evaluation</li>
                <li><strong>Communication Assessment</strong> -- English fluency and clarity</li>
                <li><strong>Psychometric Assessment</strong> -- Behavioral and cognitive evaluation</li>
            </ol>
            <p>We'll send you the assessment link shortly.</p>
            <p>Best regards,<br>The ViraWorkX Team</p>
        </div>
        """,
        "is_auto_send": True,
    },
    {
        "name": "Tier Assigned",
        "trigger_stage": "tier_allocation",
        "subject": "Your ViraWorkX Assessment Results, {{candidate_name}}",
        "body_html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7C3AED;">Assessment Complete</h2>
            <p>Hi {{candidate_name}},</p>
            <p>You've completed the ViraWorkX assessment. Based on your scores, you've been assigned to <strong>{{tier}}</strong>.</p>
            <p>Our team will be in touch with next steps regarding onboarding and client matching.</p>
            <p>Best regards,<br>The ViraWorkX Team</p>
        </div>
        """,
        "is_auto_send": True,
    },
    {
        "name": "Rejection",
        "trigger_stage": "rejected",
        "subject": "Update on your ViraWorkX application, {{candidate_name}}",
        "body_html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7C3AED;">Application Update</h2>
            <p>Hi {{candidate_name}},</p>
            <p>Thank you for your interest in ViraWorkX. After careful review, we're unable to move forward with your application at this time.</p>
            <p>We encourage you to continue building your skills and reapply in the future. We keep all profiles on file and will reach out if a suitable opportunity arises.</p>
            <p>Best regards,<br>The ViraWorkX Team</p>
        </div>
        """,
        "is_auto_send": True,
    },
]
