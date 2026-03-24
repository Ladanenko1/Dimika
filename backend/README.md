# DB Magaz Backend (FastAPI + PostgreSQL)

Backend for catalog website (without online checkout) with admin authentication and assortment management.

## Stack

- FastAPI
- SQLAlchemy 2
- PostgreSQL
- JWT auth for admin panel
- openpyxl (Excel parsing)

## Windows quick start

Prerequisites:

- Python 3.10+
- Node.js 18+
- PostgreSQL running locally

Run each part in a separate PowerShell window.

### 1. Backend API

```powershell
cd C:\Users\МАКСИМ\Desktop\сосискаv1\DB_magaz\backend
py -3.14 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts\init_db.py --create-db
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend will be available here:

- API: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/api/v1/docs`

### 2. Public frontend

```powershell
cd C:\Users\МАКСИМ\Desktop\сосискаv1\DB_magaz\frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Main website:

- `http://127.0.0.1:5173`

### 3. Admin panel

```powershell
cd C:\Users\МАКСИМ\Desktop\сосискаv1\DB_magaz\frontend
npm run dev:admin
```

Admin panel:

- `http://127.0.0.1:5174`

### If PowerShell blocks venv activation

Run PowerShell as the current user and allow local scripts:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then repeat:

```powershell
.\.venv\Scripts\Activate.ps1
```

### Environment

Before the first run, create `.env` from example and check PostgreSQL credentials:

```powershell
cd C:\Users\МАКСИМ\Desktop\сосискаv1\DB_magaz\backend
copy .env.example .env
notepad .env
```

For local PostgreSQL this project currently expects:

- `PG_HOST=127.0.0.1`
- `PG_PORT=5432`
- `PG_NAME=postgres`
- `PG_DB=magazsant`

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

For feedback form emails, set SMTP vars:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`
- `FEEDBACK_TO_EMAIL`

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
python scripts/create_admin.py --login admin --password 
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
- `POST /api/v1/feedback` - public feedback form, sends email via SMTP
- `GET /api/v1/products` - public catalog list
- `GET /api/v1/products/{id}` - product details
- `GET /api/v1/admin/products` - admin products list
- `POST /api/v1/admin/products` - create product with variants
- `POST /api/v1/admin/import/excel` - upload supplier Excel and import/upsert by article, including photo links
- `PUT /api/v1/admin/products/{id}` - update product
- `DELETE /api/v1/admin/products/{id}` - delete product
- `POST /api/v1/admin/products/{id}/variants` - add variant
- `PUT /api/v1/admin/variants/{id}` - update variant
- `DELETE /api/v1/admin/variants/{id}` - delete variant
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
- photo URL columns such as `Фото`, `Ссылка на фото`, `Image URL`, `Photo URL`

Photo links are saved to `photos.file`; the frontend renders the image directly from the URL.

### Import via API

Use admin JWT and upload file as `multipart/form-data`:

- `file` - `.xlsx` file
- `supplier_name` - optional (recommended, backend resolves/creates supplier and assigns id)
- `supplier_id` - optional (legacy mode)

### Batch import script



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
