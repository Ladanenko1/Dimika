from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_admin_user
from app.core.database import get_db
from app.models import Photo, Product, ProductVariant, Question, Supplier
from app.schemas.catalog import (
    ExcelImportOut,
    PhotoCreate,
    PhotoOut,
    ProductCreate,
    ProductOut,
    ProductUpdate,
    SupplierCreate,
    SupplierOut,
    SupplierUpdate,
    VariantCreate,
    VariantOut,
    VariantUpdate,
)
from app.schemas.feedback import QuestionOut
from app.services import import_rows_to_db, parse_supplier_excel


router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_admin_user)],
)


def _product_with_relations(db: Session, product_id: int) -> Product | None:
    stmt = (
        select(Product)
        .options(
            selectinload(Product.variants),
            selectinload(Product.photos),
            selectinload(Product.supplier),
        )
        .where(Product.id_products == product_id)
    )
    return db.execute(stmt).scalar_one_or_none()


def _validate_supplier(db: Session, supplier_id: int | None) -> None:
    if supplier_id is None:
        return
    supplier = db.get(Supplier, supplier_id)
    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier {supplier_id} not found",
        )


def _normalize_supplier_name(value: str) -> str:
    return " ".join(value.split()).strip().casefold()


def _supplier_display_name(supplier: Supplier) -> str:
    return " ".join([part for part in [supplier.first_name, supplier.last_name] if part]).strip()


def _resolve_supplier_id(
    db: Session,
    supplier_id: int | None,
    supplier_name: str | None,
) -> tuple[int | None, str | None]:
    if supplier_id is not None:
        _validate_supplier(db, supplier_id)
        supplier = db.get(Supplier, supplier_id)
        return supplier_id, _supplier_display_name(supplier) if supplier else None

    if supplier_name is None or not supplier_name.strip():
        return None, None

    requested_name = " ".join(supplier_name.split()).strip()
    normalized_requested = _normalize_supplier_name(requested_name)

    suppliers = db.execute(select(Supplier)).scalars().all()
    for supplier in suppliers:
        if _normalize_supplier_name(_supplier_display_name(supplier)) == normalized_requested:
            return supplier.id_s, _supplier_display_name(supplier)

    parts = requested_name.split(maxsplit=1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ""
    supplier = Supplier(first_name=first_name, last_name=last_name)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier.id_s, _supplier_display_name(supplier)


@router.get("/questions", response_model=list[QuestionOut])
def list_questions(db: Session = Depends(get_db)) -> list[QuestionOut]:
    stmt = select(Question).order_by(Question.id.desc())
    return list(db.execute(stmt).scalars().all())


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int, db: Session = Depends(get_db)) -> None:
    question = db.get(Question, question_id)
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    db.delete(question)
    db.commit()


@router.get("/suppliers", response_model=list[SupplierOut])
def list_suppliers(db: Session = Depends(get_db)) -> list[SupplierOut]:
    return list(db.execute(select(Supplier).order_by(Supplier.id_s.desc())).scalars().all())


@router.post("/suppliers", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(payload: SupplierCreate, db: Session = Depends(get_db)) -> SupplierOut:
    supplier = Supplier(**payload.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.put("/suppliers/{supplier_id}", response_model=SupplierOut)
def update_supplier(
    supplier_id: int,
    payload: SupplierUpdate,
    db: Session = Depends(get_db),
) -> SupplierOut:
    supplier = db.get(Supplier, supplier_id)
    if supplier is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, key, value)

    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/suppliers/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)) -> None:
    supplier = db.get(Supplier, supplier_id)
    if supplier is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    linked_products = db.execute(
        select(Product).where(Product.supplier_id == supplier_id)
    ).scalars().all()
    for product in linked_products:
        db.delete(product)
    db.delete(supplier)
    db.commit()


@router.post("/import/excel", response_model=ExcelImportOut)
def import_excel_catalog(
    file: UploadFile = File(...),
    supplier_id: int | None = Form(default=None),
    supplier_name: str | None = Form(default=None),
    db: Session = Depends(get_db),
) -> ExcelImportOut:
    resolved_supplier_id, resolved_supplier_name = _resolve_supplier_id(
        db,
        supplier_id=supplier_id,
        supplier_name=supplier_name,
    )

    filename = (file.filename or "").strip()
    if not filename.lower().endswith((".xlsx", ".xlsm", ".xltx", ".xltm")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Excel files are supported (.xlsx/.xlsm/.xltx/.xltm)",
        )

    content = file.file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    rows, parse_errors = parse_supplier_excel(content, filename=filename)
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "No valid rows found in Excel file",
                "parse_errors": parse_errors[:20],
            },
        )

    report = import_rows_to_db(db, rows, supplier_id=resolved_supplier_id)
    return ExcelImportOut(
        total_rows=report.total_rows,
        inserted=report.inserted,
        updated=report.updated,
        skipped=report.skipped,
        without_photos=report.without_photos,
        supplier_id=resolved_supplier_id,
        supplier_name=resolved_supplier_name,
        photos_inserted=report.photos_inserted,
        parse_errors=parse_errors,
        import_errors=report.errors,
    )


@router.get("/products", response_model=list[ProductOut])
def admin_list_products(db: Session = Depends(get_db)) -> list[ProductOut]:
    stmt = (
        select(Product)
        .options(
            selectinload(Product.variants),
            selectinload(Product.photos),
            selectinload(Product.supplier),
        )
        .order_by(Product.id_products.desc())
    )
    return list(db.execute(stmt).scalars().all())


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)) -> ProductOut:
    _validate_supplier(db, payload.supplier_id)

    product_data = payload.model_dump(exclude={"variants"})
    product = Product(**product_data)

    for variant_data in payload.variants:
        product.variants.append(ProductVariant(**variant_data.model_dump()))

    db.add(product)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product data or duplicate article",
        )

    created = _product_with_relations(db, product.id_products)
    if created is None:
        raise HTTPException(status_code=500, detail="Product creation failed")
    return created


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
) -> ProductOut:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    data = payload.model_dump(exclude_unset=True)
    if "supplier_id" in data:
        _validate_supplier(db, data["supplier_id"])

    for key, value in data.items():
        setattr(product, key, value)

    db.commit()
    updated = _product_with_relations(db, product_id)
    if updated is None:
        raise HTTPException(status_code=500, detail="Product update failed")
    return updated


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)) -> None:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    db.delete(product)
    db.commit()


@router.post(
    "/products/{product_id}/photos",
    response_model=PhotoOut,
    status_code=status.HTTP_201_CREATED,
)
def create_photo(
    product_id: int,
    payload: PhotoCreate,
    db: Session = Depends(get_db),
) -> PhotoOut:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    photo = Photo(products_id=product_id, file=payload.file)
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@router.put("/photos/{photo_id}", response_model=PhotoOut)
def update_photo(
    photo_id: int,
    payload: PhotoCreate,
    db: Session = Depends(get_db),
) -> PhotoOut:
    photo = db.get(Photo, photo_id)
    if photo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    photo.file = payload.file
    db.commit()
    db.refresh(photo)
    return photo


@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(photo_id: int, db: Session = Depends(get_db)) -> None:
    photo = db.get(Photo, photo_id)
    if photo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    db.delete(photo)
    db.commit()


@router.post(
    "/products/{product_id}/variants",
    response_model=VariantOut,
    status_code=status.HTTP_201_CREATED,
)
def create_variant(
    product_id: int,
    payload: VariantCreate,
    db: Session = Depends(get_db),
) -> VariantOut:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    variant = ProductVariant(product_id=product_id, **payload.model_dump())
    db.add(variant)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Variant article must be unique",
        )
    db.refresh(variant)
    return variant


@router.put("/variants/{variant_id}", response_model=VariantOut)
def update_variant(
    variant_id: int,
    payload: VariantUpdate,
    db: Session = Depends(get_db),
) -> VariantOut:
    variant = db.get(ProductVariant, variant_id)
    if variant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(variant, key, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Variant article must be unique",
        )
    db.refresh(variant)
    return variant


@router.delete("/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variant(variant_id: int, db: Session = Depends(get_db)) -> None:
    variant = db.get(ProductVariant, variant_id)
    if variant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")

    db.delete(variant)
    db.commit()
