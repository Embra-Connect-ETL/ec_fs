from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# ----------------------
# Initialize FastAPI
# ----------------------
app = FastAPI(
    title="EC File System UI",
    description="The UI for Embra Connect's File System",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------
# Mount the "static" directory at root
# Requests to / will serve index.html, and other assets by path
# ----------------------------------------
app.mount(
    "/",
    StaticFiles(directory="static", html=True),
    name="static",
)

if __name__ == "__main__":
    uvicorn.run("ec_fs_ui:app", host="0.0.0.0", port=3309, reload=True)
