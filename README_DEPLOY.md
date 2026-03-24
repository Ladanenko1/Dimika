# Деплой DB_magaz на выделенный сервер

Ниже схема для production-запуска через Docker Compose:

- `nginx` - внешний reverse proxy на 80/443.
- `frontend` - основной сайт, статическая сборка Vite.
- `admin` - отдельная админ-панель, тоже статическая сборка Vite.
- `backend` - FastAPI.
- `db` - PostgreSQL.
- `certbot` - выпуск и продление Let's Encrypt сертификатов.

## 1. DNS

Создайте A-записи на IP сервера:

```text
example.com        -> SERVER_IP
www.example.com    -> SERVER_IP
admin.example.com  -> SERVER_IP
```

В примерах ниже замените `example.com` на ваш домен.

## 2. Установка Docker

На Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Откройте порты:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## 3. Подготовка проекта

Скопируйте проект на сервер, например в:

```bash
/opt/db_magaz
```

Перейдите в папку проекта:

```bash
cd /opt/db_magaz
```

Создайте `.env` рядом с `docker-compose.yml`:

```env
DOMAIN=example.com
ADMIN_DOMAIN=admin.example.com

POSTGRES_USER=db_magaz
POSTGRES_PASSWORD=replace_with_strong_db_password
POSTGRES_DB=db_magaz

JWT_SECRET_KEY=replace_with_long_random_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120

CORS_ORIGINS=https://example.com,https://www.example.com,https://admin.example.com
VITE_API_BASE_URL=/api/v1

FEEDBACK_TO_EMAIL=mail@example.com
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_USE_TLS=true
```

Секрет можно сгенерировать так:

```bash
openssl rand -hex 32
```

## 4. Первый сертификат Let's Encrypt

До первого запуска `nginx` сертификатов ещё нет, поэтому выпускаем их через `certbot` в standalone-режиме. Убедитесь, что порт 80 свободен: если на сервере уже стоит системный nginx/apache, временно остановите его.

```bash
mkdir -p letsencrypt certbot/www
docker compose --profile certbot run --rm --service-ports certbot certonly --standalone \
  -d example.com \
  -d www.example.com \
  -d admin.example.com \
  --email admin@example.com \
  --agree-tos \
  --no-eff-email
```

Важно: первым `-d` указывайте значение из `DOMAIN`, потому что Let's Encrypt создаёт папку сертификата по первому домену. `nginx.conf` ожидает путь `./letsencrypt/live/example.com`.

## 5. Запуск

```bash
docker compose up -d --build db backend frontend admin nginx
```

Проверка:

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f nginx
```

Сайт:

```text
https://example.com
```

Админ-панель:

```text
https://admin.example.com
```

API:

```text
https://example.com/api/v1
```

## 6. Создание администратора

После первого запуска создайте или обновите админа:

```bash
docker compose exec backend python scripts/create_admin.py --login admin --password 'replace_with_admin_password'
```

## 7. Продление сертификатов

Так как сертификат выпущен standalone-режимом, на время продления нужно освободить порт 80:

```bash
docker compose stop nginx
docker compose --profile certbot run --rm --service-ports certbot renew --standalone
docker compose up -d nginx
```

Для cron, например раз в неделю:

```bash
sudo crontab -e
```

```cron
0 4 * * 1 cd /opt/db_magaz && docker compose stop nginx && docker compose --profile certbot run --rm --service-ports certbot renew --standalone --quiet && docker compose up -d nginx
```

## 8. Обновление проекта

После загрузки новой версии файлов на сервер:

```bash
cd /opt/db_magaz
docker compose up -d --build
```

Если менялись зависимости backend:

```bash
docker compose build backend
docker compose up -d backend nginx
```

Если менялся frontend/admin:

```bash
docker compose build frontend admin
docker compose up -d frontend admin nginx
```

## 9. Данные и бэкапы

PostgreSQL хранится в Docker volume `postgres_data`, загруженные из Excel изображения - в `backend_uploads`.

Бэкап базы:

```bash
docker compose exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

Восстановление:

```bash
cat backup.sql | docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

## 10. Как устроен nginx

В `nginx.conf` используются upstream:

```nginx
upstream frontend_upstream { server frontend:80; }
upstream admin_upstream { server admin:80; }
upstream backend_upstream { server backend:8000; }
```

Основной домен проксируется в `frontend`, админ-домен в `admin`, а `/api/v1/` и `/uploads/` на обоих доменах идут в `backend`.
