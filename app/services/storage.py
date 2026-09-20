import io
import logging
import os
import uuid
import warnings
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit

import boto3
from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

logger = logging.getLogger("visualmemory.storage")

UPLOAD_DIR = Path("uploads/covers")
MAX_FILE_SIZE = 5 * 1024 * 1024
MAX_IMAGE_WIDTH = 6000
MAX_IMAGE_HEIGHT = 6000
MAX_IMAGE_PIXELS = 24_000_000

FORMAT_METADATA = {
    "JPEG": (".jpg", "image/jpeg"),
    "PNG": (".png", "image/png"),
    "GIF": (".gif", "image/gif"),
    "WEBP": (".webp", "image/webp"),
}


@dataclass(frozen=True)
class StorageConfig:
    provider: str
    access_key: str = ""
    secret_key: str = ""
    bucket: str = ""
    region: str = "us-east-1"
    endpoint_url: str = ""
    public_base_url: str = ""


@dataclass(frozen=True)
class ValidatedImage:
    content: bytes
    extension: str
    content_type: str


def _load_storage_config() -> StorageConfig:
    provider = os.getenv("STORAGE_PROVIDER", "local").strip().lower()
    config = StorageConfig(
        provider=provider,
        access_key=os.getenv("STORAGE_ACCESS_KEY", "").strip(),
        secret_key=os.getenv("STORAGE_SECRET_KEY", "").strip(),
        bucket=os.getenv("STORAGE_BUCKET", "").strip(),
        region=os.getenv("STORAGE_REGION", "us-east-1").strip() or "us-east-1",
        endpoint_url=os.getenv("STORAGE_ENDPOINT_URL", "").strip().rstrip("/"),
        public_base_url=os.getenv("STORAGE_PUBLIC_BASE_URL", "").strip().rstrip("/"),
    )

    if provider not in {"local", "s3"}:
        raise RuntimeError("STORAGE_PROVIDER deve ser 'local' ou 's3'.")
    if provider == "s3" and not all([config.access_key, config.secret_key, config.bucket]):
        raise RuntimeError(
            "Configuração S3 incompleta. Configure STORAGE_ACCESS_KEY, "
            "STORAGE_SECRET_KEY e STORAGE_BUCKET."
        )
    return config


@lru_cache(maxsize=4)
def _create_s3_client(
    access_key: str,
    secret_key: str,
    region: str,
    endpoint_url: str,
):
    return boto3.client(
        "s3",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region,
        endpoint_url=endpoint_url or None,
    )


def reset_storage_client_cache() -> None:
    """Limpa o cache do cliente; útil após rotação de credenciais e em testes."""
    _create_s3_client.cache_clear()


def _get_s3_client(config: StorageConfig):
    return _create_s3_client(
        config.access_key,
        config.secret_key,
        config.region,
        config.endpoint_url,
    )


def _validate_image(content: bytes) -> ValidatedImage:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(content)) as image:
                image_format = image.format
                width, height = image.size
                image.verify()
    except (Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(status_code=400, detail="A imagem excede o limite de resolução.")
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError):
        raise HTTPException(status_code=400, detail="O arquivo enviado não é uma imagem válida.")

    if image_format not in FORMAT_METADATA:
        raise HTTPException(
            status_code=400,
            detail="Formato não permitido. Use JPG, PNG, GIF ou WebP.",
        )
    if (
        width <= 0
        or height <= 0
        or width > MAX_IMAGE_WIDTH
        or height > MAX_IMAGE_HEIGHT
        or width * height > MAX_IMAGE_PIXELS
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                f"A imagem deve ter no máximo {MAX_IMAGE_WIDTH}x{MAX_IMAGE_HEIGHT} pixels "
                f"e {MAX_IMAGE_PIXELS:,} pixels no total."
            ),
        )

    extension, content_type = FORMAT_METADATA[image_format]
    return ValidatedImage(content=content, extension=extension, content_type=content_type)


async def _read_and_validate_upload(upload_file: UploadFile) -> ValidatedImage:
    content = await upload_file.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="A imagem deve ter no máximo 5 MB.")
    if not content:
        raise HTTPException(status_code=400, detail="A imagem enviada está vazia.")
    return await run_in_threadpool(_validate_image, content)


def _public_url(config: StorageConfig, object_key: str) -> str:
    if config.public_base_url:
        return f"{config.public_base_url}/{object_key}"
    if config.endpoint_url:
        if "supabase.co" in config.endpoint_url:
            base_url = config.endpoint_url.replace("/s3", "/object/public")
            return f"{base_url}/{config.bucket}/{object_key}"
        return f"{config.endpoint_url}/{config.bucket}/{object_key}"
    return f"https://{config.bucket}.s3.{config.region}.amazonaws.com/{object_key}"


def _managed_s3_prefixes(config: StorageConfig) -> tuple[str, ...]:
    prefixes = []
    if config.public_base_url:
        prefixes.append(f"{config.public_base_url}/covers/")
    if config.endpoint_url:
        if "supabase.co" in config.endpoint_url:
            base_url = config.endpoint_url.replace("/s3", "/object/public")
            prefixes.append(f"{base_url}/{config.bucket}/covers/")
        else:
            prefixes.append(f"{config.endpoint_url}/{config.bucket}/covers/")
    prefixes.append(f"https://{config.bucket}.s3.{config.region}.amazonaws.com/covers/")
    return tuple(prefixes)


def _managed_object_key(file_url: str, config: StorageConfig) -> str | None:
    if config.provider == "local":
        prefix = "/uploads/covers/"
        if file_url.startswith(prefix):
            filename = Path(file_url.removeprefix(prefix)).name
            return f"covers/{filename}" if filename else None
        return None

    for prefix in _managed_s3_prefixes(config):
        if file_url.startswith(prefix):
            filename = Path(urlsplit(file_url).path).name
            return f"covers/{filename}" if filename else None
    return None


def _referenced_cover_key(file_url: str) -> str | None:
    """Extrai uma chave conservadora mesmo se o domínio público tiver mudado."""
    path_parts = [part for part in urlsplit(file_url).path.split("/") if part]
    if len(path_parts) < 2 or path_parts[-2] != "covers":
        return None
    filename = Path(path_parts[-1]).name
    return f"covers/{filename}" if filename else None


async def save_upload_file(upload_file: UploadFile) -> str:
    """Valida uma imagem e a salva no storage configurado."""
    config = _load_storage_config()
    image = await _read_and_validate_upload(upload_file)
    filename = f"{uuid.uuid4()}{image.extension}"
    object_key = f"covers/{filename}"

    if config.provider == "s3":
        client = _get_s3_client(config)
        await run_in_threadpool(
            client.upload_fileobj,
            io.BytesIO(image.content),
            config.bucket,
            object_key,
            ExtraArgs={"ContentType": image.content_type},
        )
        return _public_url(config, object_key)

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_path = UPLOAD_DIR / filename
    try:
        await run_in_threadpool(file_path.write_bytes, image.content)
    except Exception:
        file_path.unlink(missing_ok=True)
        raise
    return f"/uploads/{object_key}"


def delete_stored_file(file_url: str | None) -> bool:
    """Remove apenas arquivos reconhecidos como pertencentes ao storage da aplicação."""
    if not file_url:
        return False

    config = _load_storage_config()
    object_key = _managed_object_key(file_url, config)
    if not object_key:
        return False

    try:
        if config.provider == "s3":
            _get_s3_client(config).delete_object(Bucket=config.bucket, Key=object_key)
        else:
            file_path = UPLOAD_DIR / Path(object_key).name
            file_path.unlink(missing_ok=True)
        return True
    except Exception:
        logger.exception("Falha ao remover objeto gerenciado do storage.")
        return False


async def delete_stored_file_async(file_url: str | None) -> bool:
    return await run_in_threadpool(delete_stored_file, file_url)


def cleanup_orphaned_covers(
    referenced_urls: set[str], *, apply: bool = False, min_age_hours: int = 24
) -> list[str]:
    """Lista ou remove capas não referenciadas, ignorando objetos recentes por segurança."""
    if min_age_hours < 1:
        raise ValueError("min_age_hours deve ser maior ou igual a 1")

    config = _load_storage_config()
    referenced_keys = {
        key for url in referenced_urls if (key := _referenced_cover_key(url)) is not None
    }
    cutoff = datetime.now(timezone.utc) - timedelta(hours=min_age_hours)
    orphaned_keys: list[str] = []

    if config.provider == "local":
        if not UPLOAD_DIR.exists():
            return []
        for file_path in UPLOAD_DIR.iterdir():
            if not file_path.is_file():
                continue
            object_key = f"covers/{file_path.name}"
            modified_at = datetime.fromtimestamp(file_path.stat().st_mtime, timezone.utc)
            if object_key not in referenced_keys and modified_at <= cutoff:
                orphaned_keys.append(object_key)
                if apply:
                    file_path.unlink(missing_ok=True)
        return sorted(orphaned_keys)

    client = _get_s3_client(config)
    paginator = client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=config.bucket, Prefix="covers/"):
        for item in page.get("Contents", []):
            object_key = item.get("Key")
            modified_at = item.get("LastModified")
            if not object_key or not isinstance(modified_at, datetime):
                continue
            if modified_at.tzinfo is None:
                modified_at = modified_at.replace(tzinfo=timezone.utc)
            if object_key not in referenced_keys and modified_at <= cutoff:
                orphaned_keys.append(object_key)
                if apply:
                    client.delete_object(Bucket=config.bucket, Key=object_key)
    return sorted(orphaned_keys)
