# syntax=docker/dockerfile:1
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# system deps for building any C-extensions (pandas, etc)
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       gcc \
       build-essential \
       libpq-dev \
  && rm -rf /var/lib/apt/lists/*

# install *all* of your API’s Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# only the API entrypoint
COPY src/ec_fs_api.py .

EXPOSE 3307

CMD ["uvicorn", "ec_fs_api:app", "--host", "0.0.0.0", "--port", "3307"]