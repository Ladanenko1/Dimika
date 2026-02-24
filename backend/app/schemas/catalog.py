from decimal import Decimal

from pydantic import BaseModel, Field


class SupplierBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=120)
    last_name: str = Field(default="", max_length=120)


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=120)
    last_name: str | None = Field(default=None, max_length=120)


class SupplierOut(SupplierBase):
    id_s: int

    model_config = {"from_attributes": True}


class PhotoCreate(BaseModel):
    file: str = Field(min_length=1, max_length=1000)


class PhotoOut(PhotoCreate):
    id_photo: int
    products_id: int

    model_config = {"from_attributes": True}


class VariantBase(BaseModel):
    article: str = Field(min_length=1, max_length=100)
    size: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, max_length=50)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    collection: str | None = Field(default=None, max_length=120)
    material: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=120)


class VariantCreate(VariantBase):
    pass


class VariantUpdate(BaseModel):
    article: str | None = Field(default=None, min_length=1, max_length=100)
    size: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, max_length=50)
    price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    collection: str | None = Field(default=None, max_length=120)
    material: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=120)


class VariantOut(VariantBase):
    id_pv: int
    product_id: int

    model_config = {"from_attributes": True}


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    discription: str | None = Field(default=None, max_length=1000)
    brand: str | None = Field(default=None, max_length=120)
    type: str | None = Field(default=None, max_length=120)
    category: str | None = Field(default=None, max_length=120)
    supplier_id: int | None = None


class ProductCreate(ProductBase):
    variants: list[VariantCreate] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    discription: str | None = Field(default=None, max_length=1000)
    brand: str | None = Field(default=None, max_length=120)
    type: str | None = Field(default=None, max_length=120)
    category: str | None = Field(default=None, max_length=120)
    supplier_id: int | None = None


class ProductOut(ProductBase):
    id_products: int
    supplier: SupplierOut | None = None
    variants: list[VariantOut] = Field(default_factory=list)
    photos: list[PhotoOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class ExcelImportOut(BaseModel):
    total_rows: int
    inserted: int
    updated: int
    skipped: int
    without_photos: int = 0
    photos_inserted: int
    supplier_id: int | None = None
    supplier_name: str | None = None
    parse_errors: list[str] = Field(default_factory=list)
    import_errors: list[str] = Field(default_factory=list)
