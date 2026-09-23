<<<<<<< HEAD
import logging
=======
import sys
>>>>>>> f45040372d1adc8255f49111083df98e10322ec5
from pathlib import Path

# Đảm bảo import được module `src` khi chạy file script trực tiếp
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import logging  # noqa: E402

try:  # noqa: E402
    import psycopg
    from psycopg.rows import dict_row
except ImportError:
    logging.warning("psycopg is not installed. Please install it using `pip install psycopg`.")
    psycopg = None

<<<<<<< HEAD
from src.models.schemas import ColumnProfile, DatabaseProfile, TableProfile, TableRelation
=======
from src.models.schemas import ColumnProfile, DatabaseProfile, TableProfile, TableRelation  # noqa: E402
>>>>>>> f45040372d1adc8255f49111083df98e10322ec5

logger = logging.getLogger(__name__)


class PostgresConnector:
    """
    Connector để đọc dữ liệu mẫu và lấy thông tin schema từ PostgreSQL.
    Dành cho luồng PII Detection.
    """

    def __init__(self, connection_string: str):
        self.connection_string = connection_string

    def extract_database_profile(
        self,
        schema_name: str = "public",
        sample_size: int = 5
    ) -> DatabaseProfile:
        """
        Trích xuất toàn bộ cấu trúc CSDL bao gồm quan hệ và dữ liệu mẫu.

        Args:
            schema_name: Tên schema cần quét (thường là 'public' trong Postgres)
            sample_size: Số lượng giá trị mẫu cần trích xuất mỗi cột

        Returns:
            DatabaseProfile: Object chứa cấu trúc DB chuẩn bị cho AI Agent
        """
        if psycopg is None:
            raise RuntimeError("Thư viện psycopg chưa được cài đặt. Không thể kết nối Database.")

        tables_profile: list[TableProfile] = []
        # Lấy tên database từ chuỗi kết nối (ví dụ: postgresql://user:pass@host:5432/dbname)
        db_name = self.connection_string.split("/")[-1].split("?")[0]

        with psycopg.connect(self.connection_string, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                # 1. Quét danh sách các bảng (Tables)
                cur.execute(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = %s AND table_type = 'BASE TABLE'",
                    (schema_name,)
                )
                tables = [row["table_name"] for row in cur.fetchall()]

                # 2. Quét toàn bộ Primary Keys (Khóa chính)
                cur.execute("""
                    SELECT c.table_name, c.column_name
                    FROM information_schema.columns c
                    JOIN information_schema.key_column_usage kcu
                        ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
                    JOIN information_schema.table_constraints tc
                        ON kcu.constraint_name = tc.constraint_name AND tc.constraint_type = 'PRIMARY KEY'
                    WHERE c.table_schema = %s
                """, (schema_name,))
                pks = cur.fetchall()
                pk_set = {(row["table_name"], row["column_name"]) for row in pks}

                # 3. Quét toàn bộ Foreign Keys (Khóa ngoại) và xây dựng đồ thị quan hệ
                cur.execute("""
                    SELECT
                        tc.table_name AS source_table, kcu.column_name AS source_column,
                        ccu.table_name AS target_table, ccu.column_name AS target_column
                    FROM information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
                    WHERE tc.constraint_schema = %s AND tc.constraint_type = 'FOREIGN KEY'
                """, (schema_name,))
                fks = cur.fetchall()

                # Gom nhóm FK theo từng bảng nguồn
                fk_map = {}
                for fk in fks:
                    src_table = fk["source_table"]
                    if src_table not in fk_map:
                        fk_map[src_table] = []
                    fk_map[src_table].append({
                        "from_column": fk["source_column"],
                        "to_table": fk["target_table"],
                        "to_column": fk["target_column"]
                    })

                # 4. Duyệt qua từng bảng để lấy danh sách cột và Samples
                for table in tables:
                    # Thông tin quan hệ của bảng này
                    relations_data = fk_map.get(table, [])
                    relations = [
                        TableRelation(**r) for r in relations_data
                    ]
                    fk_columns = {r["from_column"] for r in relations_data}

                    # Quét danh sách cột của bảng
                    cur.execute("""
                        SELECT column_name, data_type
                        FROM information_schema.columns
                        WHERE table_schema = %s AND table_name = %s
                    """, (schema_name, table))
                    columns_info = cur.fetchall()

                    column_profiles = []
                    for col_info in columns_info:
                        col_name = col_info["column_name"]
                        data_type = col_info["data_type"]

                        is_pk = (table, col_name) in pk_set
                        is_fk = col_name in fk_columns

                        # Hard-code recommend: Các trường khóa bắt buộc dùng HASHING
                        system_rec = "HASHING" if is_pk or is_fk else None

                        # Lấy 3-5 mẫu (Sample data) khác NULL
                        # Sử dụng psycopg.sql để format identifier an toàn tránh SQL Injection
                        from psycopg import sql
                        query = sql.SQL("SELECT DISTINCT {} FROM {} WHERE {} IS NOT NULL LIMIT {}").format(
                            sql.Identifier(col_name),
                            sql.Identifier(table),
                            sql.Identifier(col_name),
                            sql.Literal(sample_size)
                        )

                        try:
                            cur.execute(query)
                            samples_raw = cur.fetchall()
                            samples = [str(r[col_name]) for r in samples_raw if r[col_name] is not None]
                        except Exception as e:
                            logger.error(f"Lỗi khi trích xuất mẫu bảng {table} cột {col_name}: {e}")
                            samples = []

                        col_prof = ColumnProfile(
                            column_name=col_name,
                            data_type=data_type,
                            is_primary_key=is_pk,
                            is_foreign_key=is_fk,
                            samples=samples,
                            system_recommendation=system_rec
                        )
                        column_profiles.append(col_prof)

                    # Gom lại thành Profile của bảng
                    table_profile = TableProfile(
                        table_name=table,
                        relations=relations,
                        columns=column_profiles
                    )
                    tables_profile.append(table_profile)

        # 5. Trả về Profile toàn cục của cả Database
        return DatabaseProfile(
            database_name=db_name,
            tables=tables_profile
        )

    def export_profile_to_json(self, output_path: str, schema_name: str = "public", sample_size: int = 5):
        """
        Tiện ích: Trích xuất và lưu toàn bộ cấu trúc DB ra file JSON vật lý.
        Dành cho mục đích debug hoặc chia sẻ data contract giữa Backend và AI Engineer.

        Args:
            output_path: Đường dẫn file JSON cần lưu (VD: 'data/fixtures/db_profile.json')
            schema_name: Tên schema cần quét
            sample_size: Số lượng mẫu dữ liệu
        """
        # 1. Trích xuất
        profile = self.extract_database_profile(schema_name, sample_size)

        # 2. Convert sang JSON string
        json_data = profile.model_dump_json(indent=4)

        # 3. Lưu ra file
        out_file = Path(output_path)
        out_file.parent.mkdir(parents=True, exist_ok=True)
        out_file.write_text(json_data, encoding="utf-8")

        logger.info(f"Đã lưu cấu trúc DB ra file: {output_path}")


if __name__ == "__main__":
    import os

    # Thay đổi URL này cho khớp với Database Postgres thực tế trên máy bạn.
    # Format: postgresql://username:password@host:port/database_name
    DB_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/mydatabase",
    )
    print(f"Đang kết nối tới: {DB_URL}")

    try:
        connector = PostgresConnector(connection_string=DB_URL)

        # Đường dẫn file JSON sẽ xuất ra (theo cấu trúc thư mục của team).
        output_file = "data/fixtures/db_profile.json"
        print("Đang trích xuất dữ liệu...")
        connector.export_profile_to_json(output_path=output_file)
        print(f"Xong! Hãy mở file '{output_file}' để kiểm tra thành quả.")
    except Exception as e:
        print(f"Có lỗi xảy ra (kiểm tra lại DB_URL xem DB đã bật chưa): {e}")
