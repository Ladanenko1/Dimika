from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, auth, products
from app.core.config import settings


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


@app.get("/health", tags=["health"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router, prefix=settings.api_v1_str)
app.include_router(products.router, prefix=settings.api_v1_str)
app.include_router(admin.router, prefix=settings.api_v1_str)
