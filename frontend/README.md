# DB Magaz Frontend (React + Vite)

## Run

```bash
copy .env.example .env
npm install
npm run dev
```

Default API:

- `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1`

## Features

- Multi-page site:
  - `/` - Главная
  - `/catalog` - Каталог
  - `/about` - О нас
  - `/contacts` - Контакты
  - `/admin` - Админ-панель
- Footer with embedded map
- Catalog search/filter
- Admin login by JWT
- Excel upload into backend import endpoint
- Supplier name input (ID resolved/created automatically by backend)
