# syntax=docker/dockerfile:1
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# only FastAPI + Uvicorn for static serving
RUN pip install --no-cache-dir fastapi uvicorn

# copy in the static‐server script + your built UI assets
COPY src/ec_fs_ui.py .
COPY src/static ./static

EXPOSE 3309

CMD ["uvicorn", "ec_fs_ui:app", "--host", "0.0.0.0", "--port", "3309"]
