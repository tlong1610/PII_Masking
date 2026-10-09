import pytest
from cryptography.fernet import Fernet

from src.config import get_settings
from src.services import secret_box
from src.services.source_validation import SourceUrlError, parse_source_url


@pytest.fixture
def key(monkeypatch):
    monkeypatch.setenv("SOURCE_ENCRYPTION_KEY", Fernet.generate_key().decode())
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_round_trip(key):
    token = secret_box.encrypt("postgresql://u:S3cretPw9@h/db")
    assert "S3cretPw9" not in token
    assert secret_box.decrypt(token) == "postgresql://u:S3cretPw9@h/db"


def test_missing_or_invalid_key(monkeypatch):
    monkeypatch.setenv("SOURCE_ENCRYPTION_KEY", "")
    get_settings.cache_clear()
    with pytest.raises(secret_box.SecretBoxError):
        secret_box.encrypt("x")
    monkeypatch.setenv("SOURCE_ENCRYPTION_KEY", "not-a-key")
    get_settings.cache_clear()
    with pytest.raises(secret_box.SecretBoxError):
        secret_box.encrypt("x")
    get_settings.cache_clear()


def test_decrypt_with_other_key_fails_without_leaking(key, monkeypatch):
    token = secret_box.encrypt("mongodb://u:S3cretPw9@h/db")
    monkeypatch.setenv("SOURCE_ENCRYPTION_KEY", Fernet.generate_key().decode())
    get_settings.cache_clear()
    with pytest.raises(secret_box.SecretBoxError) as exc:
        secret_box.decrypt(token)
    assert "S3cretPw9" not in str(exc.value)


def test_parse_source_url():
    pg = parse_source_url("postgres://u:pw@db.example.com:5432/shop")
    assert (pg.engine, pg.source_type, pg.default_namespace) == ("postgresql", "SQL", "public")
    assert pg.host_hint == "db.example.com:5432/shop" and "pw" not in pg.host_hint
    mg = parse_source_url("mongodb+srv://u:pw@cluster.example.com/corp?retryWrites=true")
    assert (mg.engine, mg.default_namespace) == ("mongodb", "corp")
    for bad in ("mysql://u:p@h/db", "postgresql:///db", "not a url"):
        with pytest.raises(SourceUrlError):
            parse_source_url(bad)
