"""
ViraWorkX ATS — File Storage Service
Upload and manage files (resumes, documents) in S3/R2.
"""
import uuid
import logging
from typing import Optional
from datetime import datetime, timezone

import boto3
from botocore.config import Config as BotoConfig

from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


def get_s3_client():
    """Create S3 client (works with AWS S3, Cloudflare R2, MinIO)."""
    config = {
        "aws_access_key_id": settings.AWS_ACCESS_KEY_ID,
        "aws_secret_access_key": settings.AWS_SECRET_ACCESS_KEY,
        "region_name": settings.S3_REGION,
        "config": BotoConfig(signature_version="s3v4"),
    }
    if settings.S3_ENDPOINT_URL:
        config["endpoint_url"] = settings.S3_ENDPOINT_URL

    return boto3.client("s3", **config)


async def upload_resume(
    file_data: bytes,
    filename: str,
    candidate_id: int,
) -> Optional[str]:
    """
    Upload a resume file to S3.
    Returns the S3 URL or None on failure.
    """
    try:
        client = get_s3_client()

        # Generate unique key
        ext = filename.rsplit(".", 1)[-1] if "." in filename else "pdf"
        key = f"resumes/{candidate_id}/{uuid.uuid4().hex}.{ext}"

        # Determine content type
        content_types = {
            "pdf": "application/pdf",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "doc": "application/msword",
        }
        content_type = content_types.get(ext.lower(), "application/octet-stream")

        # Upload
        client.put_object(
            Bucket=settings.S3_BUCKET,
            Key=key,
            Body=file_data,
            ContentType=content_type,
            Metadata={
                "candidate_id": str(candidate_id),
                "original_filename": filename,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
            },
        )

        # Generate URL
        if settings.S3_ENDPOINT_URL:
            url = f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET}/{key}"
        else:
            url = f"https://{settings.S3_BUCKET}.s3.{settings.S3_REGION}.amazonaws.com/{key}"

        logger.info(f"Resume uploaded: {key}")
        return url

    except Exception as e:
        logger.error(f"S3 upload failed: {e}")
        return None


async def get_presigned_url(key: str, expiry: int = 3600) -> Optional[str]:
    """Generate a pre-signed URL for temporary file access."""
    try:
        client = get_s3_client()
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.S3_BUCKET, "Key": key},
            ExpiresIn=expiry,
        )
        return url
    except Exception as e:
        logger.error(f"Failed to generate presigned URL: {e}")
        return None


async def delete_file(key: str) -> bool:
    """Delete a file from S3."""
    try:
        client = get_s3_client()
        client.delete_object(Bucket=settings.S3_BUCKET, Key=key)
        logger.info(f"File deleted: {key}")
        return True
    except Exception as e:
        logger.error(f"S3 delete failed: {e}")
        return False
