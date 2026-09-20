import io
import os
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException, UploadFile
from PIL import Image
from starlette.datastructures import Headers

from app.services.storage import (
    MAX_FILE_SIZE,
    UPLOAD_DIR,
    cleanup_orphaned_covers,
    delete_stored_file,
    reset_storage_client_cache,
    save_upload_file,
)


@pytest.fixture(autouse=True)
def clear_storage_client_cache():
    reset_storage_client_cache()
    yield
    reset_storage_client_cache()


def image_bytes(image_format: str = "PNG", size: tuple[int, int] = (12, 8)) -> bytes:
    stream = io.BytesIO()
    mode = "RGB" if image_format == "JPEG" else "RGBA"
    Image.new(mode, size, color="red").save(stream, format=image_format)
    return stream.getvalue()


def upload(filename: str, content: bytes, content_type: str) -> UploadFile:
    return UploadFile(
        filename=filename,
        file=io.BytesIO(content),
        headers=Headers({"content-type": content_type}),
    )


def configure_s3(monkeypatch, *, endpoint_url: str = "", public_base_url: str = ""):
    monkeypatch.setenv("STORAGE_PROVIDER", "s3")
    monkeypatch.setenv("STORAGE_ACCESS_KEY", "fake_key")
    monkeypatch.setenv("STORAGE_SECRET_KEY", "fake_secret")
    monkeypatch.setenv("STORAGE_BUCKET", "fake_bucket")
    monkeypatch.setenv("STORAGE_REGION", "sa-east-1")
    monkeypatch.setenv("STORAGE_ENDPOINT_URL", endpoint_url)
    monkeypatch.setenv("STORAGE_PUBLIC_BASE_URL", public_base_url)


@pytest.mark.anyio
async def test_save_and_delete_local_image(monkeypatch):
    monkeypatch.setenv("STORAGE_PROVIDER", "local")
    content = image_bytes("PNG")

    url = await save_upload_file(upload("cover.png", content, "image/png"))

    assert url.startswith("/uploads/covers/")
    local_path = UPLOAD_DIR / url.rsplit("/", 1)[-1]
    assert local_path.read_bytes() == content
    assert delete_stored_file(url) is True
    assert not local_path.exists()


@pytest.mark.anyio
@patch("boto3.client")
async def test_s3_client_is_reused_and_content_type_comes_from_image(mock_boto_client, monkeypatch):
    mock_s3 = MagicMock()
    mock_boto_client.return_value = mock_s3
    configure_s3(monkeypatch)
    content = image_bytes("PNG")

    first_url = await save_upload_file(upload("wrong.jpg", content, "image/jpeg"))
    second_url = await save_upload_file(upload("another.png", content, "image/png"))

    assert first_url.startswith("https://fake_bucket.s3.sa-east-1.amazonaws.com/covers/")
    assert first_url.endswith(".png")
    assert second_url.endswith(".png")
    mock_boto_client.assert_called_once_with(
        "s3",
        aws_access_key_id="fake_key",
        aws_secret_access_key="fake_secret",
        region_name="sa-east-1",
        endpoint_url=None,
    )
    assert mock_s3.upload_fileobj.call_count == 2
    args, kwargs = mock_s3.upload_fileobj.call_args_list[0]
    assert args[0].getvalue() == content
    assert args[1] == "fake_bucket"
    assert args[2].startswith("covers/")
    assert kwargs["ExtraArgs"] == {"ContentType": "image/png"}


@pytest.mark.anyio
@patch("boto3.client")
async def test_s3_custom_public_url_and_delete(mock_boto_client, monkeypatch):
    mock_s3 = MagicMock()
    mock_boto_client.return_value = mock_s3
    configure_s3(
        monkeypatch,
        endpoint_url="https://account.r2.cloudflarestorage.com",
        public_base_url="https://media.example.com",
    )

    url = await save_upload_file(upload("cover.webp", image_bytes("WEBP"), "image/webp"))

    assert url.startswith("https://media.example.com/covers/")
    assert delete_stored_file(url) is True
    mock_s3.delete_object.assert_called_once_with(
        Bucket="fake_bucket", Key=f"covers/{url.rsplit('/', 1)[-1]}"
    )


@pytest.mark.anyio
async def test_rejects_invalid_image_content(monkeypatch):
    monkeypatch.setenv("STORAGE_PROVIDER", "local")

    with pytest.raises(HTTPException, match="imagem válida") as exc_info:
        await save_upload_file(upload("malware.png", b"not an image", "image/png"))

    assert exc_info.value.status_code == 400


@pytest.mark.anyio
async def test_rejects_actual_content_over_size_limit(monkeypatch):
    monkeypatch.setenv("STORAGE_PROVIDER", "local")
    oversized = b"x" * (MAX_FILE_SIZE + 1)

    with pytest.raises(HTTPException, match="5 MB") as exc_info:
        await save_upload_file(upload("large.png", oversized, "image/png"))

    assert exc_info.value.status_code == 400


@pytest.mark.anyio
async def test_rejects_excessive_dimensions(monkeypatch):
    monkeypatch.setenv("STORAGE_PROVIDER", "local")
    content = image_bytes("PNG", size=(6001, 1))

    with pytest.raises(HTTPException, match="6000x6000") as exc_info:
        await save_upload_file(upload("wide.png", content, "image/png"))

    assert exc_info.value.status_code == 400


@patch("boto3.client")
def test_does_not_delete_external_url(mock_boto_client, monkeypatch):
    configure_s3(monkeypatch)

    assert delete_stored_file("https://external.example.com/cover.jpg") is False
    mock_boto_client.assert_not_called()


def test_orphan_cleanup_is_dry_run_by_default_and_respects_age(monkeypatch, tmp_path):
    import app.services.storage as storage

    monkeypatch.setenv("STORAGE_PROVIDER", "local")
    monkeypatch.setattr(storage, "UPLOAD_DIR", tmp_path)
    referenced = tmp_path / "referenced.png"
    orphaned = tmp_path / "orphaned.png"
    recent = tmp_path / "recent.png"
    for file_path in (referenced, orphaned, recent):
        file_path.write_bytes(b"image")

    old_timestamp = (datetime.now(timezone.utc) - timedelta(hours=48)).timestamp()
    os.utime(referenced, (old_timestamp, old_timestamp))
    os.utime(orphaned, (old_timestamp, old_timestamp))

    referenced_urls = {"/uploads/covers/referenced.png"}
    assert cleanup_orphaned_covers(referenced_urls) == ["covers/orphaned.png"]
    assert orphaned.exists()

    assert cleanup_orphaned_covers(referenced_urls, apply=True) == ["covers/orphaned.png"]
    assert referenced.exists()
    assert recent.exists()
    assert not orphaned.exists()
