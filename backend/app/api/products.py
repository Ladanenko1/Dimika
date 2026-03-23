from fastapi import APIRouter, Depends, HTTPException, Query, status
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
