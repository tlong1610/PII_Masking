"""Plain Postgres URLs (Render's connectionString) must use psycopg 3, the only driver shipped."""

import pytest

from src.db.session import sqlalchemy_url


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("postgresql://u:p@h:5432/db", "postgresql+psycopg://u:p@h:5432/db"),
        ("postgres://u:p@h/db", "postgresql+psycopg://u:p@h/db"),
        ("postgresql+psycopg://u:p@h/db", "postgresql+psycopg://u:p@h/db"),
        ("sqlite:///./data/app.db", "sqlite:///./data/app.db"),
    ],
)
def test_sqlalchemy_url_pins_postgres_to_psycopg(url, expected):
    assert sqlalchemy_url(url) == expected
