from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.models import Product
from app.schemas.catalog import ProductOut


router = APIRouter(prefix="/products", tags=["products"])


@router.get("/", response_model=list[ProductOut])
def list_products(
    category: str | None = Query(default=None),
    product_type: str | None = Query(default=None),
    brand: str | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[ProductOut]:
    stmt = (
        select(Product)
        .options(
            selectinload(Product.variants),
            selectinload(Product.photos),
            selectinload(Product.supplier),
        )
        .order_by(Product.id_products.desc())
        .limit(limit)
        .offset(offset)
    )

    if category:
        stmt = stmt.where(Product.category == category)
    if product_type:
        stmt = stmt.where(Product.type == product_type)
    if brand:
        stmt = stmt.where(Product.brand == brand)
    if search:
        search_pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Product.name.ilike(search_pattern),
                Product.discription.ilike(search_pattern),
                Product.brand.ilike(search_pattern),
            )
        )

    return list(db.execute(stmt).scalars().all())


@router.get("/brands", response_model=list[str])
def list_brands(db: Session = Depends(get_db)) -> list[str]:
    stmt = (
        select(Product.brand)
        .where(Product.brand.is_not(None), Product.brand != "")
        .distinct()
        .order_by(Product.brand.asc())
    )
    return [brand for brand in db.execute(stmt).scalars().all() if brand]


@router.get("/photo-proxy")
def proxy_photo(url: str = Query(min_length=8, max_length=1000)) -> Response:
    remote_url = url.strip()
    parsed = urlparse(remote_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid photo URL")

    request = Request(
        remote_url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Safari/537.36"
            ),
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "Referer": f"{parsed.scheme}://{parsed.netloc}/",
        },
    )
    try:
        with urlopen(request, timeout=12) as response:
            content_type = response.headers.get("Content-Type", "application/octet-stream")
            content = response.read(15 * 1024 * 1024 + 1)
    except HTTPError as exc:
        raise HTTPException(status_code=exc.code, detail="Remote photo is not available") from exc
    except (URLError, TimeoutError) as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Remote photo is not available") from exc

    if not content_type.lower().startswith("image/"):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="URL is not an image")
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Photo is too large")

    return Response(content=content, media_type=content_type)


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)) -> ProductOut:
    stmt = (
        select(Product)
        .options(
            selectinload(Product.variants),
            selectinload(Product.photos),
            selectinload(Product.supplier),
        )
        .where(Product.id_products == product_id)
    )
    product = db.execute(stmt).scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product
