import io
from unittest.mock import MagicMock, patch

import pytest
from fastapi import UploadFile
from starlette.datastructures import Headers

from app.services.storage import UPLOAD_DIR, save_upload_file


@pytest.mark.anyio
async def test_save_upload_file_local(monkeypatch):
    monkeypatch.setenv("STORAGE_PROVIDER", "local")

    file_content = b"fake local image content"
    mock_file = io.BytesIO(file_content)
    upload_file = UploadFile(
        filename="test_image.png",
        file=mock_file,
        headers=Headers({"content-type": "image/png"})
    )

    # Executar salvamento
    url = await save_upload_file(upload_file)

    # Verificar se a URL segue o padrão local
    assert url.startswith("/uploads/covers/")
    filename = url.split("/")[-1]

    # Verificar se o arquivo foi gravado de fato na pasta local
    local_path = UPLOAD_DIR / filename
    assert local_path.exists()

    # Validar se o conteúdo gravado é exatamente o mesmo
    with open(local_path, "rb") as f:
        assert f.read() == file_content

    # Limpar arquivo de teste para manter a pasta limpa
    local_path.unlink()


@pytest.mark.anyio
@patch("boto3.client")
async def test_save_upload_file_s3(mock_boto_client, monkeypatch):
    # Mock do cliente S3
    mock_s3 = MagicMock()
    mock_boto_client.return_value = mock_s3

    # Configurar variáveis de ambiente mockadas (genéricas)
    monkeypatch.setenv("STORAGE_PROVIDER", "s3")
    monkeypatch.setenv("STORAGE_ACCESS_KEY", "fake_key")
    monkeypatch.setenv("STORAGE_SECRET_KEY", "fake_secret")
    monkeypatch.setenv("STORAGE_BUCKET", "fake_bucket")
    monkeypatch.setenv("STORAGE_REGION", "sa-east-1")
    monkeypatch.setenv("STORAGE_ENDPOINT_URL", "")

    # Criar arquivo em memória
    file_content = b"fake s3 image content"
    mock_file = io.BytesIO(file_content)
    upload_file = UploadFile(
        filename="test_s3.jpg",
        file=mock_file,
        headers=Headers({"content-type": "image/jpeg"})
    )

    url = await save_upload_file(upload_file)

    # Validar URL da AWS gerada por padrão
    assert "https://fake_bucket.s3.sa-east-1.amazonaws.com/covers/" in url

    # Garantir que o boto3 foi instanciado com os parâmetros corretos
    mock_boto_client.assert_called_once_with(
        "s3",
        aws_access_key_id="fake_key",
        aws_secret_access_key="fake_secret",
        region_name="sa-east-1",
        endpoint_url=None
    )

    # Verificar se o método de envio do stream foi disparado
    mock_s3.upload_fileobj.assert_called_once()
    args, kwargs = mock_s3.upload_fileobj.call_args
    assert args[1] == "fake_bucket"
    assert args[2].startswith("covers/")
    assert kwargs["ExtraArgs"]["ContentType"] == "image/jpeg"


@pytest.mark.anyio
@patch("boto3.client")
async def test_save_upload_file_s3_custom_endpoint(mock_boto_client, monkeypatch):
    mock_s3 = MagicMock()
    mock_boto_client.return_value = mock_s3

    # Configurar variáveis com endpoint compatível (ex: Cloudflare R2 ou Supabase)
    monkeypatch.setenv("STORAGE_PROVIDER", "s3")
    monkeypatch.setenv("STORAGE_ACCESS_KEY", "fake_key")
    monkeypatch.setenv("STORAGE_SECRET_KEY", "fake_secret")
    monkeypatch.setenv("STORAGE_BUCKET", "r2-bucket")
    monkeypatch.setenv("STORAGE_REGION", "us-east-1")
    monkeypatch.setenv("STORAGE_ENDPOINT_URL", "https://xyz.r2.cloudflarestorage.com")

    file_content = b"fake r2 image content"
    mock_file = io.BytesIO(file_content)
    upload_file = UploadFile(
        filename="test_r2.gif",
        file=mock_file,
        headers=Headers({"content-type": "image/gif"})
    )

    url = await save_upload_file(upload_file)

    # Validar URL customizada gerada
    assert url.startswith("https://xyz.r2.cloudflarestorage.com/r2-bucket/covers/")

    # Garantir que o endpoint customizado foi repassado ao boto3
    mock_boto_client.assert_called_once_with(
        "s3",
        aws_access_key_id="fake_key",
        aws_secret_access_key="fake_secret",
        region_name="us-east-1",
        endpoint_url="https://xyz.r2.cloudflarestorage.com"
    )
