from minio.error import S3Error
import os
import json
import base64
import xmltodict
import pandas as pd

from io import BytesIO, StringIO
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from minio import Minio
from dotenv import load_dotenv

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from pydantic import BaseModel

# ----------------------
# Initialize FastAPI
# ----------------------
app = FastAPI(
    title="EC File System API",
    description="This API handles interactions with Embra Connect's file system",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------
# Rate Limiting
# ----------------------
limiter = Limiter(key_func=get_remote_address, default_limits=["10/minute"])
app.state.limiter = limiter

# ----------------------
# Load env vars and init MinIO
# ----------------------
load_dotenv()

minio_client = Minio(
    endpoint=os.getenv("EC_FS_ENDPOINT"),
    access_key=os.getenv("MINIO_ROOT_USER"),
    secret_key=os.getenv("MINIO_ROOT_PASSWORD"),
    secure=False
)

bucket_name = os.getenv("EC_FS_BUCKET")

if not minio_client.bucket_exists(bucket_name):
    minio_client.make_bucket(bucket_name)


# -----------------------
# Models
# -----------------------
class FileSaveRequest(BaseModel):
    content: str


# ----------------------
# Helper
# ----------------------
def validate_path(path: str):
    if path.startswith("/") or ".." in path:
        raise HTTPException(status_code=400, detail="Invalid path")


# ----------------------
# Routes
# ----------------------

@app.get("/")
async def health_check():
    return Response(content="File System API is running...", media_type="application/json")


@app.get("/files")
@limiter.limit("50/minute")
def list_files(request: Request):
    objects = minio_client.list_objects(bucket_name, recursive=True)
    return [obj.object_name for obj in objects]


@app.get("/files/{filename:path}")
@limiter.limit("50/minute")
def get_file(filename: str, request: Request):
    validate_path(filename)
    try:
        response = minio_client.get_object(bucket_name, filename)
        content = response.read()
        ext = filename.split(".")[-1]

        if ext == "json":
            return json.loads(content)
        elif ext in ["txt", "md", "sql", "js", "ts", "py", "rs", "go", "sh", "html", "css", "yaml", "yml", "ini"]:
            return {"content": content.decode("utf-8")}
        elif ext == "csv":
            df = pd.read_csv(StringIO(content.decode("utf-8")))
            return df.to_dict(orient="records")
        elif ext == "xml":
            return xmltodict.parse(content)
        else:
            return {
                "filename": filename,
                "content": base64.b64encode(content).decode("utf-8"),
                "format": "binary"
            }

    except S3Error as e:
        if e.code == "NoSuchKey":
            raise HTTPException(
                status_code=404, detail=f"File '{filename}' not found")
        else:
            raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/files/{filename:path}")
async def save_file(filename: str, payload: FileSaveRequest):
    validate_path(filename)
    try:
        file_bytes = payload.content.encode("utf-8")
        minio_client.put_object(
            bucket_name,
            filename,
            BytesIO(file_bytes),
            length=len(file_bytes),
        )
        return {"status": "saved", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/files/{filename:path}")
@limiter.limit("10/minute")
def delete_file(filename: str, request: Request):
    validate_path(filename)
    try:
        minio_client.remove_object(bucket_name, filename)
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/files/upload")
async def upload_file(file: UploadFile = File(...)):
    validate_path(file.filename)
    try:
        content = await file.read()
        minio_client.put_object(
            bucket_name, file.filename, BytesIO(content), length=len(content))
        return {"status": "uploaded", "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/folders/{folder_path:path}")
def create_folder(folder_path: str, request: Request):
    validate_path(folder_path)
    try:
        if not folder_path.endswith("/"):
            folder_path += "/"
        minio_client.put_object(
            bucket_name, folder_path, BytesIO(b""), length=0)
        return {"status": "folder created", "folder": folder_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/folders/rename")
def rename_folder(old_path: str, new_path: str, request: Request):
    validate_path(old_path)
    validate_path(new_path)
    try:
        if not old_path.endswith("/"):
            old_path += "/"
        if not new_path.endswith("/"):
            new_path += "/"

        objects = minio_client.list_objects(
            bucket_name, prefix=old_path, recursive=True)

        for obj in objects:
            new_obj_name = obj.object_name.replace(old_path, new_path, 1)
            data = minio_client.get_object(bucket_name, obj.object_name).read()
            minio_client.put_object(
                bucket_name, new_obj_name, BytesIO(data), len(data))
            minio_client.remove_object(bucket_name, obj.object_name)

        return {"status": "folder renamed", "from": old_path, "to": new_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/folders/{folder_path:path}")
def delete_folder(folder_path: str, request: Request):
    validate_path(folder_path)
    try:
        if not folder_path.endswith("/"):
            folder_path += "/"

        objects = minio_client.list_objects(
            bucket_name, prefix=folder_path, recursive=True)
        deleted = []
        for obj in objects:
            minio_client.remove_object(bucket_name, obj.object_name)
            deleted.append(obj.object_name)

        return {"status": "folder deleted", "deleted_objects": deleted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
