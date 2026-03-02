from __future__ import annotations

import re
import hashlib
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from io import BytesIO
from pathlib import Path
from typing import Any

from openpyxl import load_workbook
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Photo, Product, ProductVariant


def _normalize_key(value: str) -> str:
    return re.sub(r"[^0-9a-zа-я]+", "", value.lower().strip(), flags=re.IGNORECASE)


ALIASES_RAW: dict[str, list[str]] = {
    "article": ["Артикул", "article"],
    "name": [
        "Название товара",
        "Наименование товара",
        "Название",
        "Короткое наименование",
        "Полное название из каталога",
        "Расширенное наименование",
    ],
    "description": ["Описание", "Описание товара", "Расширенное наименование", "Расширенное описание", "Описание для карточки"],
    "product_type": ["Тип", "Тип изделия", "Под категория", "Раздел 3го уровня", "Категория (уровень 2)"],
    "category": ["Категория", "Товарная категория", "Раздел 2го уровня", "Раздел 1го уровня", "Категория (уровень 1)"],
    "color": ["Цвет", "цвет", "Цвет решетки"],
    "material": ["Материал", "Вид решетки", "Дизайн"],
    "country": ["Страна производителя", "Страна", "Страна происхождения"],
    "brand": ["Бренд", "Компания"],
    "length": [
        "Длина, см",
        "Длина, мм",
        "Длина",
        "Глубина",
        "Глубина, мм",
        "Длина (глубина) изделия (мм.)",
        "Длина упаковки, мм",
    ],
    "width": ["Ширина, см", "Ширина, мм", "Ширина", "Ширина изделия (мм.)", "Ширина упаковки, мм"],
    "height": ["Высота, см", "Высота, мм", "Высота", "Высота изделия (мм.)", "Высота упаковки, мм", "Глубина упаковки, мм"],
    "size": ["Размер", "Размер (длина, ширина, высота)", "Габариты"],
    "price": [
        "Цена",
        "Цена (руб.)",
        "Цена руб",
        "Итоговая цена со скидкой (руб.)",
        "РРЦ 11.12.25",
        "РРЦ по акции до 31.03.26",
        "РРЦ",
    ],
    "photo_urls": [
        "Фото",
        "Фотография",
        "Изображение",
        "Картинка",
        "Ссылка на фото",
        "Ссылки на фото",
        "URL фото",
        "Фото URL",
        "Image",
        "Image URL",
        "Photo",
        "Photo URL",
        "photo_url",
        "image_url",
    ],
}

ALIASES: dict[str, list[str]] = {
    key: [_normalize_key(alias) for alias in aliases]
    for key, aliases in ALIASES_RAW.items()
}

MAX_ERRORS = 100
HEADER_SCAN_ROWS = 15
PHOTO_URL_PATTERN = re.compile(r"https?://[^\s,;|]+", flags=re.IGNORECASE)
PHOTO_LINK_ROW_KEY = "__photo_links"
IMAGE_URL_PATTERN = re.compile(
    r"^https?://.+\.(?:jpe?g|png|webp|gif|bmp|svg)(?:[?#].*)?$",
    flags=re.IGNORECASE,
)
PHOTO_HEADER_PREFIXES = (
    "фото",
    "фотография",
    "изображение",
    "картинка",
    "image",
    "photo",
)
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "excel-images"
UPLOAD_URL_PREFIX = "/uploads/excel-images"


@dataclass
class ParsedCatalogRow:
    name: str
    product_type: str | None
    color: str | None
    category: str | None
    size: str | None
    material: str | None
    article: str
    brand: str | None
    country: str | None
    description: str | None
    price: Decimal
    photo_urls: list[str]


@dataclass
class ImportReport:
    total_rows: int = 0
    inserted: int = 0
    updated: int = 0
    skipped: int = 0
    without_photos: int = 0
    photos_inserted: int = 0
    errors: list[str] = field(default_factory=list)


def _safe_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text


def _first_value(row: dict[str, Any], aliases: list[str]) -> str | None:
    for alias in aliases:
        value = _safe_str(row.get(alias))
        if value:
            return value
    return None


def _first_prefixed_value(row: dict[str, Any], prefixes: tuple[str, ...]) -> str | None:
    for key, value in row.items():
        if any(key.startswith(prefix) for prefix in prefixes):
            text = _safe_str(value)
            if text:
                return text
    return None


PRICE_PREFIXES = tuple(
    _normalize_key(value)
    for value in (
        "Итоговая цена со скидкой",
        "РРЦ по акции",
        "Цена",
        "РРЦ",
    )
)


def _parse_decimal(value: str | None) -> Decimal | None:
    if value is None:
        return None
    sanitized = value.replace(" ", "").replace(",", ".")
    sanitized = re.sub(r"[^0-9.]+", "", sanitized)
    if not sanitized:
        return None
    try:
        parsed = Decimal(sanitized)
    except (InvalidOperation, ValueError):
        return None
    if parsed <= 0:
        return None
    return parsed.quantize(Decimal("0.01"))


def _split_photo_urls(value: Any) -> list[str]:
    text = _safe_str(value)
    if not text:
        return []

    candidates = PHOTO_URL_PATTERN.findall(text)
    if not candidates:
        candidates = re.split(r"[\n\r,;|]+", text)

    urls: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        url = candidate.strip().strip(".,;")
        if not re.match(r"^https?://", url, flags=re.IGNORECASE):
            continue
        if len(url) > 1000:
            continue
        if url in seen:
            continue
        seen.add(url)
        urls.append(url)
    return urls


def _is_image_url(value: str | None) -> bool:
    if not value:
        return False
    return bool(IMAGE_URL_PATTERN.match(value.strip()))


def _extract_photo_urls(row: dict[str, Any]) -> list[str]:
    photo_aliases = set(ALIASES["photo_urls"])
    urls: list[str] = []
    seen: set[str] = set()

    for url in row.get(PHOTO_LINK_ROW_KEY, []) or []:
        if url in seen:
            continue
        seen.add(url)
        urls.append(url)

    for header, value in row.items():
        if header == PHOTO_LINK_ROW_KEY:
            continue
        is_photo_header = header in photo_aliases or any(
            header.startswith(prefix) for prefix in PHOTO_HEADER_PREFIXES
        )
        if not is_photo_header:
            continue

        for url in _split_photo_urls(value):
            if url in seen:
                continue
            seen.add(url)
            urls.append(url)

    return urls


def _safe_file_part(value: str) -> str:
    text = re.sub(r"[^0-9a-zа-я_-]+", "-", value.lower().strip(), flags=re.IGNORECASE)
    return text.strip("-") or "excel"


def _image_anchor_row(image: Any) -> int | None:
    marker = getattr(getattr(image, "anchor", None), "_from", None)
    row = getattr(marker, "row", None)
    if row is None:
        return None
    return int(row) + 1


def _image_extension(image: Any) -> str:
    image_format = str(getattr(image, "format", "") or "").lower()
    if image_format in {"jpeg", "jpg"}:
        return "jpg"
    if image_format in {"png", "gif", "bmp", "webp"}:
        return image_format

    image_path = str(getattr(image, "path", "") or "")
    suffix = Path(image_path).suffix.lower().lstrip(".")
    if suffix in {"jpeg", "jpg", "png", "gif", "bmp", "webp"}:
        return "jpg" if suffix == "jpeg" else suffix
    return "png"


def _save_embedded_image(image: Any, filename: str, sheet_name: str, row_idx: int, image_idx: int) -> str | None:
    try:
        image_bytes = image._data()
    except Exception:
        return None

    if not image_bytes:
        return None

    digest = hashlib.sha1(image_bytes).hexdigest()[:12]
    extension = _image_extension(image)
    file_name = (
        f"{_safe_file_part(Path(filename).stem)}-"
        f"{_safe_file_part(sheet_name)}-r{row_idx}-{image_idx}-{digest}.{extension}"
    )
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    target = UPLOAD_DIR / file_name
    if not target.exists():
        target.write_bytes(image_bytes)
    return f"{UPLOAD_URL_PREFIX}/{file_name}"


def _extract_embedded_photo_files(sheet: Any, filename: str) -> dict[int, list[str]]:
    photos_by_row: dict[int, list[str]] = {}
    for image_idx, image in enumerate(getattr(sheet, "_images", []) or [], start=1):
        row_idx = _image_anchor_row(image)
        if row_idx is None or row_idx <= 1:
            continue

        file_url = _save_embedded_image(image, filename, sheet.title, row_idx, image_idx)
        if not file_url:
            continue
        photos_by_row.setdefault(row_idx, []).append(file_url)
    return photos_by_row


def _alias_fields_for_header(header: str) -> set[str]:
    fields: set[str] = set()
    for field, aliases in ALIASES.items():
        if header in aliases:
            fields.add(field)

    if any(header.startswith(prefix) for prefix in PHOTO_HEADER_PREFIXES):
        fields.add("photo_urls")
    if any(header.startswith(prefix) for prefix in PRICE_PREFIXES):
        fields.add("price")
    return fields


def _find_header_row(sheet: Any) -> tuple[int, dict[int, str]] | None:
    best: tuple[int, int, dict[int, str]] | None = None
    max_scan_row = min(sheet.max_row or 0, HEADER_SCAN_ROWS)

    for row_idx, row in enumerate(
        sheet.iter_rows(min_row=1, max_row=max_scan_row, values_only=False),
        start=1,
    ):
        normalized_header: dict[int, str] = {}
        matched_fields: set[str] = set()

        for idx, cell in enumerate(row):
            header_name = _safe_str(cell.value)
            if not header_name:
                continue
            header = _normalize_key(header_name)
            normalized_header[idx] = header
            matched_fields.update(_alias_fields_for_header(header))

        if "article" not in matched_fields:
            continue
        if not ({"name", "description"} & matched_fields):
            continue

        score = len(matched_fields) * 100 + len(normalized_header)
        if best is None or score > best[0]:
            best = (score, row_idx, normalized_header)

    if best is None:
        return None
    return best[1], best[2]


def _extract_size(name: str | None, raw_size: str | None, length: str | None, width: str | None, height: str | None) -> str | None:
    if raw_size:
        return raw_size

    if length or width or height:
        parts = [length or "?", width or "?", height or "?"]
        return "x".join(parts)

    if name:
        match = re.search(
            r"(\d+(?:[.,]\d+)?)\s*[xх*]\s*(\d+(?:[.,]\d+)?)\s*[xх*]\s*(\d+(?:[.,]\d+)?)",
            name,
            flags=re.IGNORECASE,
        )
        if match:
            return "x".join([segment.replace(",", ".") for segment in match.groups()])
    return None


def _row_to_parsed(
    row: dict[str, Any],
    sheet_name: str,
    source_brand: str | None,
    embedded_photo_files: list[str] | None = None,
) -> ParsedCatalogRow | None:
    article = _first_value(row, ALIASES["article"])
    if article is None:
        return None

    name = _first_value(row, ALIASES["name"])
    description = _first_value(row, ALIASES["description"])
    if name is None:
        name = description
    if name is None:
        return None

    brand = _first_value(row, ALIASES["brand"]) or source_brand
    product_type = _first_value(row, ALIASES["product_type"])
    category = _first_value(row, ALIASES["category"]) or _safe_str(sheet_name)
    color = _first_value(row, ALIASES["color"])
    material = _first_value(row, ALIASES["material"])
    country = _first_value(row, ALIASES["country"])

    raw_size = _first_value(row, ALIASES["size"])
    length = _first_value(row, ALIASES["length"])
    width = _first_value(row, ALIASES["width"])
    height = _first_value(row, ALIASES["height"])
    size = _extract_size(name=name, raw_size=raw_size, length=length, width=width, height=height)

    raw_price = _first_value(row, ALIASES["price"]) or _first_prefixed_value(row, PRICE_PREFIXES)
    price = _parse_decimal(raw_price) or Decimal("1.00")
    photo_urls = _extract_photo_urls(row)
    for photo_file in embedded_photo_files or []:
        if photo_file not in photo_urls:
            photo_urls.append(photo_file)

    return ParsedCatalogRow(
        name=name,
        product_type=product_type,
        color=color,
        category=category,
        size=size,
        material=material,
        article=article,
        brand=brand,
        country=country,
        description=description,
        price=price,
        photo_urls=photo_urls,
    )


def _attach_photo_links(product: Product, photo_urls: list[str]) -> int:
    if not photo_urls:
        return 0

    existing = {photo.file for photo in product.photos}
    inserted = 0
    for url in photo_urls:
        if url in existing:
            continue
        product.photos.append(Photo(file=url))
        existing.add(url)
        inserted += 1
    return inserted


def parse_supplier_excel(file_bytes: bytes, filename: str) -> tuple[list[ParsedCatalogRow], list[str]]:
    errors: list[str] = []
    rows: list[ParsedCatalogRow] = []
    source_brand = Path(filename).stem.strip() or None

    workbook = load_workbook(BytesIO(file_bytes), read_only=False, data_only=True)
    try:
        for sheet in workbook.worksheets:
            embedded_photos = _extract_embedded_photo_files(sheet, filename)
            header_result = _find_header_row(sheet)
            if header_result is None:
                continue
            header_row_idx, normalized_header = header_result

            for row_idx, row_values in enumerate(
                sheet.iter_rows(min_row=header_row_idx + 1, values_only=False),
                start=header_row_idx + 1,
            ):
                if not row_values or not any(cell.value is not None for cell in row_values):
                    continue

                normalized_row: dict[str, Any] = {}
                photo_links: list[str] = []
                for idx, cell in enumerate(row_values):
                    cell_text = _safe_str(cell.value)
                    if _is_image_url(cell_text):
                        photo_links.append(cell_text)
                    hyperlink = _safe_str(getattr(getattr(cell, "hyperlink", None), "target", None))
                    if hyperlink and _is_image_url(hyperlink):
                        photo_links.append(hyperlink)

                    header = normalized_header.get(idx)
                    if header is None:
                        continue
                    normalized_row[header] = cell.value

                if photo_links:
                    normalized_row[PHOTO_LINK_ROW_KEY] = photo_links

                parsed = _row_to_parsed(
                    normalized_row,
                    sheet.title,
                    source_brand,
                    embedded_photo_files=embedded_photos.get(row_idx, []),
                )
                if parsed is None:
                    continue
                rows.append(parsed)
    finally:
        workbook.close()

    return rows, errors


def import_rows_to_db(
    db: Session,
    rows: list[ParsedCatalogRow],
    supplier_id: int | None = None,
) -> ImportReport:
    report = ImportReport(total_rows=len(rows))
    for idx, row in enumerate(rows, start=1):
        try:
            if not row.photo_urls:
                report.skipped += 1
                report.without_photos += 1
                if len(report.errors) < MAX_ERRORS:
                    report.errors.append(
                        f"row #{idx} article '{row.article}': skipped because photo is missing"
                    )
                continue

            existing_variant = db.execute(
                select(ProductVariant).where(ProductVariant.article == row.article)
            ).scalar_one_or_none()

            if existing_variant:
                product = db.get(Product, existing_variant.product_id)
                if product is None:
                    raise RuntimeError(
                        f"Variant article '{row.article}' has no linked product"
                    )

                product.name = row.name
                product.type = row.product_type
                product.category = row.category
                product.brand = row.brand
                product.discription = row.description
                if supplier_id is not None:
                    product.supplier_id = supplier_id

                existing_variant.size = row.size
                existing_variant.color = row.color
                existing_variant.price = row.price
                existing_variant.material = row.material
                existing_variant.country = row.country
                report.photos_inserted += _attach_photo_links(product, row.photo_urls)
                report.updated += 1
            else:
                product = Product(
                    name=row.name,
                    discription=row.description,
                    brand=row.brand,
                    type=row.product_type,
                    category=row.category,
                    supplier_id=supplier_id,
                )
                variant = ProductVariant(
                    article=row.article,
                    size=row.size,
                    color=row.color,
                    price=row.price,
                    material=row.material,
                    country=row.country,
                )
                product.variants.append(variant)
                report.photos_inserted += _attach_photo_links(product, row.photo_urls)
                db.add(product)
                report.inserted += 1

            db.commit()
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            report.skipped += 1
            if len(report.errors) < MAX_ERRORS:
                report.errors.append(f"row #{idx} article '{row.article}': {exc}")

    return report
