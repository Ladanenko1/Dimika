from decimal import Decimal
from typing import Optional

from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    login: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)


class Supplier(Base):
    __tablename__ = "suppliers"

    id_s: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    first_name: Mapped[str] = mapped_column(String(120), nullable=False)
    last_name: Mapped[str] = mapped_column(String(120), nullable=False)

    products: Mapped[list["Product"]] = relationship(back_populates="supplier")


class Product(Base):
    __tablename__ = "products"

    id_products: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    discription: Mapped[Optional[str]] = mapped_column(String(1000))
    brand: Mapped[Optional[str]] = mapped_column(String(120), index=True)
    type: Mapped[Optional[str]] = mapped_column(String(120), index=True)
    category: Mapped[Optional[str]] = mapped_column(String(120), index=True)
    supplier_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("suppliers.id_s", ondelete="SET NULL"), nullable=True, index=True
    )

    supplier: Mapped[Optional["Supplier"]] = relationship(back_populates="products")
    variants: Mapped[list["ProductVariant"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    photos: Mapped[list["Photo"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class ProductVariant(Base):
    __tablename__ = "products_variants"

    id_pv: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id_products", ondelete="CASCADE"), index=True
    )
    article: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    size: Mapped[Optional[str]] = mapped_column(String(50))
    color: Mapped[Optional[str]] = mapped_column(String(50))
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    collection: Mapped[Optional[str]] = mapped_column(String(120))
    material: Mapped[Optional[str]] = mapped_column(String(120))
    country: Mapped[Optional[str]] = mapped_column(String(120))

    product: Mapped["Product"] = relationship(back_populates="variants")


class Photo(Base):
    __tablename__ = "photos"

    id_photo: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    products_id: Mapped[int] = mapped_column(
        ForeignKey("products.id_products", ondelete="CASCADE"), index=True
    )
    file: Mapped[str] = mapped_column(String(255), nullable=False)

    product: Mapped["Product"] = relationship(back_populates="photos")
