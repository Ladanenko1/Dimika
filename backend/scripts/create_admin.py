import argparse
import sys
from pathlib import Path

from sqlalchemy import select

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import User


def create_or_update_admin(login: str, password: str) -> None:
    with SessionLocal() as db:
        user = db.execute(select(User).where(User.login == login)).scalar_one_or_none()
        if user is None:
            user = User(login=login, password_hash=hash_password(password), is_admin=True)
            db.add(user)
            action = "created"
        else:
            user.password_hash = hash_password(password)
            user.is_admin = True
            action = "updated"

        db.commit()
        print(f"Admin user '{login}' {action}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or update admin user")
    parser.add_argument("--login", required=True, help="Admin login")
    parser.add_argument("--password", required=True, help="Admin password")
    args = parser.parse_args()
    create_or_update_admin(args.login, args.password)


if __name__ == "__main__":
    main()
