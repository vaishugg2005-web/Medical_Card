import os
import uuid
from typing import Tuple
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/dicom"
}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

class StorageService:
    @staticmethod
    def save_document(file: UploadFile, patient_id: int) -> Tuple[str, int, str]:
        """
        Validates and safely persists a medical report or diagnostic document.
        Returns: (file_path, file_size, mime_type)
        """
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file MIME type '{file.content_type}'. Allowed types: PDF, JPEG, PNG, DICOM."
            )

        storage_dir = os.path.join(settings.LOCAL_STORAGE_DIR, f"patient_{patient_id}")
        os.makedirs(storage_dir, exist_ok=True)

        ext = os.path.splitext(file.filename)[1] or ".bin"
        safe_filename = f"{uuid.uuid4().hex}{ext}"
        destination_path = os.path.join(storage_dir, safe_filename)

        file_bytes = file.file.read()
        file_size = len(file_bytes)

        if file_size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds maximum permitted limit of 10 MB."
            )

        with open(destination_path, "wb") as f:
            f.write(file_bytes)

        return destination_path, file_size, file.content_type

    @staticmethod
    def save_doctor_document(file: UploadFile, doctor_id: int) -> Tuple[str, int, str]:
        """Validates and persists official doctor verification certificates/diplomas."""
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file MIME type '{file.content_type}'. Allowed types: PDF, JPEG, PNG."
            )

        storage_dir = os.path.join(settings.LOCAL_STORAGE_DIR, f"doctor_{doctor_id}")
        os.makedirs(storage_dir, exist_ok=True)

        ext = os.path.splitext(file.filename)[1] or ".bin"
        safe_filename = f"{uuid.uuid4().hex}{ext}"
        destination_path = os.path.join(storage_dir, safe_filename)

        file_bytes = file.file.read()
        file_size = len(file_bytes)

        if file_size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds maximum permitted limit of 10 MB."
            )

        with open(destination_path, "wb") as f:
            f.write(file_bytes)

        return destination_path, file_size, file.content_type
