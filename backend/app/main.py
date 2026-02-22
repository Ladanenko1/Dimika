from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import admin, auth, feedback, products
from app.core.config import BASE_DIR, settings


app = FastAPI(
    title=settings.project_name,
    docs_url=f"{settings.api_v1_str}/docs",
    redoc_url=f"{settings.api_v1_str}/redoc",
    openapi_url=f"{settings.api_v1_str}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = BASE_DIR / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

brand_logos_dir = BASE_DIR.parent / "photos" / "brand"
brand_logos_dir.mkdir(parents=True, exist_ok=True)
app.mount("/brand-logos", StaticFiles(directory=str(brand_logos_dir)), name="brand_logos")


@app.get("/health", tags=["health"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router, prefix=settings.api_v1_str)
app.include_router(products.router, prefix=settings.api_v1_str)
app.include_router(feedback.router, prefix=settings.api_v1_str)
app.include_router(admin.router, prefix=settings.api_v1_str)
