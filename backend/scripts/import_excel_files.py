import argparse
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from app.core.database import SessionLocal
from app.services import import_rows_to_db, parse_supplier_excel


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch import supplier Excel files into catalog DB")
    parser.add_argument("files", nargs="+", help="Path(s) to .xlsx files")
    parser.add_argument("--supplier-id", type=int, default=None, help="Optional supplier_id for imported products")
    args = parser.parse_args()

    with SessionLocal() as db:
        for file_path in args.files:
            path = Path(file_path)
            if not path.exists():
                print(f"[SKIP] {path} (file not found)")
                continue
            if path.suffix.lower() not in {".xlsx", ".xlsm", ".xltx", ".xltm"}:
                print(f"[SKIP] {path} (unsupported extension)")
                continue

            print(f"\n=== {path.name} ===")
            content = path.read_bytes()
            rows, parse_errors = parse_supplier_excel(content, filename=path.name)
            report = import_rows_to_db(db, rows, supplier_id=args.supplier_id)

            print(f"total_rows={report.total_rows}")
            print(f"inserted={report.inserted}, updated={report.updated}, skipped={report.skipped}")
            if parse_errors:
                print("parse_errors:")
                for err in parse_errors[:10]:
                    print(f" - {err}")
            if report.errors:
                print("import_errors:")
                for err in report.errors[:10]:
                    print(f" - {err}")


if __name__ == "__main__":
    main()
