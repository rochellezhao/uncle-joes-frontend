from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


BASE_DIR = Path(__file__).resolve().parent
app = FastAPI(title="Uncle Joe's Frontend")


app.mount("/src", StaticFiles(directory=BASE_DIR / "src"), name="src")


@app.get("/styles.css")
async def styles() -> FileResponse:
    return FileResponse(BASE_DIR / "styles.css")


@app.get("/coffee.jpeg")
async def coffee_image() -> FileResponse:
    return FileResponse(BASE_DIR / "coffee.jpeg")


@app.get("/{full_path:path}")
async def spa(full_path: str) -> FileResponse:
    return FileResponse(BASE_DIR / "index.html")
