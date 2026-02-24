import argparse
import socket
import sys
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import OperationalError

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from app.core.config import settings
from app.core.database import Base, engine
from app.models import Photo, Product, ProductVariant, Question, Supplier, User  # noqa: F401


def _is_tcp_reachable(host: str, port: int) -> bool:
    try:
        with socket.create_connection((host, port), timeout=2):
            return True
    except OSError:
        return False


def _print_connection_debug() -> None:
    print("Connection settings from .env:")
    print(f"- PG_HOST={settings.pg_host}")
    print(f"- PG_PORT={settings.pg_port}")
    print(f"- PG_NAME={settings.pg_name}")
    print(f"- PG_DB={settings.pg_db}")
    print(f"- PG_PASSWORD={'set' if settings.pg_password else 'empty'}")


def _handle_operational_error(exc: OperationalError, create_db_flag: bool) -> None:
    original_error = getattr(exc, "orig", exc)
    error_message = str(original_error).strip() or str(exc).strip()

    print("Failed to connect to PostgreSQL.")
    if error_message:
        print(f"Driver message: {error_message}")
    else:
        print("Driver message is empty (OperationalError without text).")

    _print_connection_debug()

    reachable = _is_tcp_reachable(settings.pg_host, int(settings.pg_port))
    print(f"- TCP {settings.pg_host}:{settings.pg_port} reachable: {'yes' if reachable else 'no'}")

    print("What to check:")
    print("1) PG_NAME is PostgreSQL username, PG_DB is database name.")
    if settings.pg_name != settings.pg_name.lower():
        print(
            "   Hint: PG_NAME contains uppercase letters. "
            "Most PostgreSQL roles are lowercase (e.g. db_magaz)."
        )
    print("2) PG_PASSWORD is correct for this user.")
    print("3) PostgreSQL service is running and listens on PG_HOST:PG_PORT.")
    if not create_db_flag:
        print("4) If DB does not exist, run: python scripts/init_db.py --create-db")


def create_database_if_missing(database_url: str) -> bool:
    url = make_url(database_url)
    if not isinstance(url, URL):
        raise RuntimeError("Invalid database URL")
    if not url.database:
        raise RuntimeError("DATABASE_URL must include database name")

    db_name = url.database
    admin_url = url.set(database="postgres")
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT", pool_pre_ping=True)

    try:
        with admin_engine.connect() as conn:
            exists = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :db_name"),
                {"db_name": db_name},
            ).scalar()
            if exists:
                return False

            quoted_name = db_name.replace('"', '""')
            conn.execute(text(f'CREATE DATABASE "{quoted_name}"'))
            return True
    finally:
        admin_engine.dispose()


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    # Lightweight compatibility migration for already initialized databases.
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(120)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_products_brand ON products(brand)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT TRUE"))
        conn.execute(text("UPDATE users SET is_admin = TRUE WHERE is_admin IS NULL"))
        conn.execute(text("ALTER TABLE photos ALTER COLUMN file TYPE VARCHAR(1000)"))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Initialize PostgreSQL database and create all tables."
    )
    parser.add_argument(
        "--create-db",
        action="store_true",
        help="Create database if it does not exist (needs permission).",
    )
    args = parser.parse_args()

    try:
        if args.create_db:
            created = create_database_if_missing(settings.database_url)
            if created:
                print("Database created")
            else:
                print("Database already exists")

        create_tables()
        print("All tables created successfully")
    except OperationalError as exc:
        _handle_operational_error(exc, create_db_flag=args.create_db)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
