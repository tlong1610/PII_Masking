.PHONY: run test lint format typecheck check clean

run:
	.venv/bin/uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

test:
	.venv/bin/pytest tests/ -v

lint:
	.venv/bin/ruff check src/ tests/

format:
	.venv/bin/ruff format src/ tests/

typecheck:
	.venv/bin/mypy src/

check: lint format test

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type d -name .pytest_cache -exec rm -rf {} +
	find . -type d -name .ruff_cache -exec rm -rf {} +
