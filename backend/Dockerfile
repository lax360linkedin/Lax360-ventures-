# LAX360 Ventures API image. NOT built or run in this project's development environment (Docker was not available):
# build and test it yourself before relying on it.
#
#   docker build -t lax360-api backend
#   docker run --env-file backend/.env -e APP_ENV=production -p 8000:8000 lax360-api
#
# Secrets come from the environment (`--env-file` or your host's secret store). Never bake .env into the image.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /srv

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .

RUN useradd --create-home --uid 10001 appuser \
 && mkdir -p /srv/storage/hero_videos && chown -R appuser /srv/storage
USER appuser
# Homepage videos are files on disk: mount a persistent volume here (docker run -v lax360_videos:/srv/storage) or they vanish with the container.
VOLUME ["/srv/storage"]

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status == 200 else 1)"

# Behind a reverse proxy set FORWARDED_ALLOW_IPS=<proxy ip> (uvicorn reads it) and TRUST_PROXY_HEADERS=true so rate limits see real client IPs.
# One worker keeps the in-memory rate limiter exact; add `--workers N` only if you accept N x the limits.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
