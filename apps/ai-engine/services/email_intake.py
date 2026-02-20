"""
ViraWorkX ATS — Email Intake Service
Monitors jobs@viraworkx.ai via IMAP for incoming resume submissions.
Extracts attachments and creates candidate records automatically.
"""
import email
import logging
import re
from datetime import datetime, timezone
from typing import Optional
from email.header import decode_header

from imapclient import IMAPClient

from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc"}


def decode_email_subject(msg) -> str:
    """Decode email subject handling various encodings."""
    subject = msg.get("Subject", "")
    if not subject:
        return "(No Subject)"
    decoded_parts = decode_header(subject)
    parts = []
    for data, charset in decoded_parts:
        if isinstance(data, bytes):
            parts.append(data.decode(charset or "utf-8", errors="replace"))
        else:
            parts.append(data)
    return " ".join(parts)


def extract_sender_info(msg) -> dict:
    """Extract sender name and email from From header."""
    from_header = msg.get("From", "")
    # Parse "Name <email@example.com>" format
    match = re.match(r'"?([^"<]*)"?\s*<?([^>]+)>?', from_header)
    if match:
        name = match.group(1).strip()
        email_addr = match.group(2).strip()
    else:
        name = ""
        email_addr = from_header.strip()

    # Split name into first/last
    name_parts = name.split() if name else []
    first_name = name_parts[0] if name_parts else email_addr.split("@")[0]
    last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

    return {
        "first_name": first_name,
        "last_name": last_name or "Unknown",
        "email": email_addr.lower(),
        "full_name": name or email_addr,
    }


def extract_attachments(msg) -> list[dict]:
    """Extract resume attachments from email."""
    attachments = []

    if msg.is_multipart():
        for part in msg.walk():
            content_disposition = str(part.get("Content-Disposition", ""))
            if "attachment" in content_disposition:
                filename = part.get_filename()
                if filename:
                    # Check if it's a supported resume format
                    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
                    if ext in SUPPORTED_EXTENSIONS:
                        file_data = part.get_payload(decode=True)
                        if file_data:
                            attachments.append({
                                "filename": filename,
                                "data": file_data,
                                "content_type": part.get_content_type(),
                            })

    return attachments


def extract_body_text(msg) -> str:
    """Extract plain text body from email."""
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    body = payload.decode("utf-8", errors="replace")
                    break
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            body = payload.decode("utf-8", errors="replace")
    return body.strip()


async def check_inbox():
    """
    Check the IMAP inbox for new emails with resume attachments.
    Creates candidate records for each new submission.
    Runs every 2 minutes via Celery Beat.
    """
    if not settings.IMAP_EMAIL or not settings.IMAP_PASSWORD:
        logger.warning("IMAP credentials not configured, skipping inbox check")
        return

    try:
        # Connect to IMAP
        with IMAPClient(settings.IMAP_HOST, port=settings.IMAP_PORT, ssl=True) as server:
            server.login(settings.IMAP_EMAIL, settings.IMAP_PASSWORD)
            server.select_folder("INBOX")

            # Search for unread messages
            messages = server.search(["UNSEEN"])
            if not messages:
                logger.debug("No new emails in inbox")
                return

            logger.info(f"Found {len(messages)} new emails to process")

            for uid in messages:
                try:
                    # Fetch the email
                    raw_data = server.fetch([uid], ["RFC822"])
                    raw_email = raw_data[uid][b"RFC822"]
                    msg = email.message_from_bytes(raw_email)

                    # Extract info
                    sender = extract_sender_info(msg)
                    subject = decode_email_subject(msg)
                    body = extract_body_text(msg)
                    attachments = extract_attachments(msg)

                    if not attachments:
                        logger.info(f"Email from {sender['email']} has no resume attachments, skipping")
                        # Mark as read anyway
                        server.add_flags([uid], [b"\\Seen"])
                        continue

                    logger.info(
                        f"Processing email from {sender['email']}: "
                        f"{len(attachments)} attachment(s)"
                    )

                    # Create candidate record
                    # This would call the candidate creation service
                    # For now, we prepare the data
                    candidate_data = {
                        "first_name": sender["first_name"],
                        "last_name": sender["last_name"],
                        "email": sender["email"],
                        "source": "email_intake",
                        "source_detail": f"Email: {subject}",
                        "resume_filename": attachments[0]["filename"],
                        "resume_data": attachments[0]["data"],
                        "cover_letter": body if body else None,
                    }

                    # TODO: Call candidate creation service
                    # await create_candidate_from_email(candidate_data)

                    # Mark as processed
                    server.add_flags([uid], [b"\\Seen"])
                    # Add a label/flag for processed emails
                    try:
                        server.add_flags([uid], [b"ATS-Processed"])
                    except Exception:
                        pass  # Not all IMAP servers support custom flags

                    logger.info(f"Successfully processed email from {sender['email']}")

                except Exception as e:
                    logger.error(f"Failed to process email UID {uid}: {e}")
                    continue

    except Exception as e:
        logger.error(f"IMAP connection/processing failed: {e}")
