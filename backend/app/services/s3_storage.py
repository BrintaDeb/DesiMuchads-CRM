import os
import uuid
from typing import Dict, Any, Optional
from datetime import datetime
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class S3StorageService:
    def __init__(self):
        self.bucket = settings.AWS_S3_BUCKET
        self.region = settings.AWS_REGION
        self.is_aws_configured = bool(
            settings.AWS_ACCESS_KEY_ID
            and settings.AWS_SECRET_ACCESS_KEY
            and "mock" not in settings.AWS_ACCESS_KEY_ID.lower()
            and "mock" not in settings.AWS_SECRET_ACCESS_KEY.lower()
        )
        self.local_upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
        os.makedirs(self.local_upload_dir, exist_ok=True)

    def generate_presigned_upload_url(
        self,
        filename: str,
        content_type: str,
        folder: str = "media",
    ) -> Dict[str, Any]:
        """
        Generates presigned upload URL for direct browser uploads.
        If AWS S3 credentials are configured, generates an authentic S3 PUT presigned URL.
        Otherwise, returns a local upload endpoint for seamless local development.
        """
        file_ext = os.path.splitext(filename)[1].lower()
        storage_key = f"{folder}/{datetime.utcnow().strftime('%Y%m')}/{uuid.uuid4().hex}{file_ext}"

        if self.is_aws_configured:
            try:
                import boto3
                from botocore.config import Config

                s3_client = boto3.client(
                    "s3",
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=self.region,
                    config=Config(signature_version="s3v4"),
                )

                presigned_url = s3_client.generate_presigned_url(
                    ClientMethod="put_object",
                    Params={
                        "Bucket": self.bucket,
                        "Key": storage_key,
                        "ContentType": content_type,
                    },
                    ExpiresIn=settings.AWS_PRESIGNED_EXPIRATION_SECONDS,
                )

                public_url = f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{storage_key}"

                return {
                    "provider": "AWS_S3",
                    "upload_url": presigned_url,
                    "method": "PUT",
                    "storage_key": storage_key,
                    "file_url": public_url,
                    "headers": {"Content-Type": content_type},
                }
            except Exception as e:
                logger.error(f"Error generating S3 presigned URL: {e}. Falling back to local upload.")

        # Fallback to local storage
        local_target_url = f"/api/v1/assets/upload?storage_key={storage_key}"
        file_serve_url = f"/api/v1/assets/files/{storage_key}"

        return {
            "provider": "LOCAL_STORAGE",
            "upload_url": local_target_url,
            "method": "POST",
            "storage_key": storage_key,
            "file_url": file_serve_url,
            "headers": {},
        }

    def save_local_file(self, storage_key: str, content: bytes) -> str:
        """
        Saves uploaded file content to disk in the local storage directory.
        """
        target_path = os.path.join(self.local_upload_dir, storage_key.replace("/", os.sep))
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, "wb") as f:
            f.write(content)
        return target_path

    def get_local_file_path(self, storage_key: str) -> Optional[str]:
        target_path = os.path.join(self.local_upload_dir, storage_key.replace("/", os.sep))
        if os.path.exists(target_path) and os.path.isfile(target_path):
            return target_path
        return None


storage_service = S3StorageService()

