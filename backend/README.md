# DB Magaz Backend (FastAPI + PostgreSQL)

Backend for catalog website (without online checkout) with admin authentication and assortment management.

## Stack

- FastAPI
- SQLAlchemy 2
- PostgreSQL
- JWT auth for admin panel
- openpyxl (Excel parsing)

## 1. Install

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Configure environment

```bash
copy .env.example .env
```

Edit `.env` and set real PostgreSQL credentials and `JWT_SECRET_KEY`.
Required DB vars format:

- `PG_HOST`
- `PG_PORT`
- `PG_NAME` (username, not database name)
- `PG_PASSWORD`
- `PG_DB` (database name)

## 3. Initialize PostgreSQL and create tables

Option A (SQLAlchemy):

```bash
python scripts/init_db.py --create-db
```

If database already exists, command will just create missing tables.
For old databases, compatibility migration is also applied (`products.brand`).

Option B (raw SQL):

```bash
psql -U postgres -d postgres -c "CREATE DATABASE db_magaz;"
psql -U postgres -d db_magaz -f sql/schema.sql
psql -U postgres -d db_magaz -f sql/migrations/001_add_brand_to_products.sql
```

## 4. Create admin user

```bash
python scripts/create_admin.py --login admin --password admin12345
```

## 5. Run API

```bash
uvicorn app.main:app --reload
```

Swagger:

- `http://127.0.0.1:8000/api/v1/docs`

## Main endpoints

- `POST /api/v1/auth/login` - admin login, returns JWT
- `POST /api/v1/auth/token` - OAuth2 form login (optional)
- `GET /api/v1/auth/me` - current admin by JWT
- `GET /api/v1/products` - public catalog list
- `GET /api/v1/products/{id}` - product details
- `GET /api/v1/admin/products` - admin products list
- `POST /api/v1/admin/products` - create product with variants/photos
- `POST /api/v1/admin/import/excel` - upload supplier Excel and import/upsert by article
- `PUT /api/v1/admin/products/{id}` - update product
- `DELETE /api/v1/admin/products/{id}` - delete product
- `POST /api/v1/admin/products/{id}/variants` - add variant
- `PUT /api/v1/admin/variants/{id}` - update variant
- `DELETE /api/v1/admin/variants/{id}` - delete variant
- `POST /api/v1/admin/products/{id}/photos` - add photo
- `DELETE /api/v1/admin/photos/{id}` - delete photo
- `GET /api/v1/admin/suppliers` - list suppliers
- `POST /api/v1/admin/suppliers` - create supplier
- `PUT /api/v1/admin/suppliers/{id}` - update supplier
- `DELETE /api/v1/admin/suppliers/{id}` - delete supplier

## 6. Excel import

The parser extracts fields:

- `Название товара`
- `Тип`
- `цвет`
- `категория`
- `размер (длина, ширина, высота)`
- `материал`
- `артикул`
- `Бренд`
- `Страна производителя`

Photos are not imported.

### Import via API

Use admin JWT and upload file as `multipart/form-data`:

- `file` - `.xlsx` file
- `supplier_name` - optional (recommended, backend resolves/creates supplier and assigns id)
- `supplier_id` - optional (legacy mode)

### Batch import script

```bash
python scripts/import_excel_files.py "C:\Users\Hurricaneevi\Downloads\ROCA.xlsx" "C:\Users\Hurricaneevi\Downloads\AQUATON.xlsx"
```

## 7. Basic React frontend

Frontend is in `../frontend` and provides:

- public catalog page
- admin login
- Excel upload form

Run:

```bash
cd ../frontend
copy .env.example .env
npm install
npm run dev
```
