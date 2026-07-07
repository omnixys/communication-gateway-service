FROM python:3.14-slim AS base

RUN pip install --no-cache-dir uv

WORKDIR /app

COPY pyproject.toml .

RUN uv sync --frozen --no-dev

COPY src/ src/

EXPOSE 8002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8002/health')" || exit 1

CMD ["uv", "run", "gateway"]
