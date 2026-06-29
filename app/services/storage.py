import os
import shutil
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

UPLOAD_DIR = Path("uploads/covers")

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


async def save_upload_file(upload_file: UploadFile) -> str:
    """Salva um arquivo enviado e retorna sua URL.

    - Se STORAGE_PROVIDER for \"s3\", faz o upload para um serviço compatível
      com S3 (ex: Cloudflare R2, Supabase Storage, Backblaze B2) utilizando
      as chaves de acesso genéricas.
    - Se for \"local\" ou não definido, salva o arquivo localmente no disco.
    """
    provider = os.getenv("STORAGE_PROVIDER", "local").lower()

    original_filename = upload_file.filename or "image.jpg"
    ext = Path(original_filename).suffix.lower() or ".jpg"

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de arquivo não permitido. Use: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    filename = f"{uuid.uuid4()}{ext}"

    if provider == "s3":
        import boto3

        access_key = os.getenv("STORAGE_ACCESS_KEY")
        secret_key = os.getenv("STORAGE_SECRET_KEY")
        bucket_name = os.getenv("STORAGE_BUCKET")
        region = os.getenv("STORAGE_REGION", "us-east-1")
        endpoint_url = os.getenv("STORAGE_ENDPOINT_URL")

        if not all([access_key, secret_key, bucket_name]):
            raise RuntimeError(
                "Configuração do armazenamento S3-compatível incompleta no arquivo .env. "
                "Certifique-se de configurar STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY "
                "e STORAGE_BUCKET."
            )

        s3_client = boto3.client(
            "s3",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
            endpoint_url=endpoint_url if endpoint_url else None,
        )

        await upload_file.seek(0)

        s3_client.upload_fileobj(
            upload_file.file,
            bucket_name,
            f"covers/{filename}",
            ExtraArgs={"ContentType": upload_file.content_type or "image/jpeg"},
        )

        if endpoint_url:
            base_url = endpoint_url.rstrip("/")
            return f"{base_url}/{bucket_name}/covers/{filename}"

        return f"https://{bucket_name}.s3.{region}.amazonaws.com/covers/{filename}"

    else:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        file_path = UPLOAD_DIR / filename
        await upload_file.seek(0)
        with open(file_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)

        return f"/uploads/covers/{filename}"
