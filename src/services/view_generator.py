from typing import List, Dict, Optional

class PostgresViewGenerator:
    """
    Trình tạo lệnh SQL CREATE VIEW cho PostgreSQL với cơ chế tùy chỉnh (Customizable).
    Cho phép thay đổi logic mask/hash dễ dàng từ bên ngoài.
    """

    def __init__(
        self, 
        salt: str = "MY_DEFAULT_SALT", 
        pepper: str = "MY_SECRET_PEPPER", 
        custom_logic: Optional[Dict[str, str]] = None
    ):
        """
        Khởi tạo view generator.
        
        Args:
            salt: Chuỗi ngẫu nhiên (hoặc tên cột salt) để chống Rainbow table.
            pepper: Khóa bí mật (chỉ lưu trên server/code) để tăng cường bảo mật.
            custom_logic: (Tùy chọn) Dictionary map action với biểu thức SQL. 
        """
        self.salt = salt
        self.pepper = pepper
        
        # Logic mặc định đã được đơn giản hóa Mask và tăng cường Hash
        self.sql_templates = {
            # Hashing với Pepper + Data + Salt
            'hash': f"md5(concat('{self.pepper}', {{column}}::text, '{self.salt}'))",
            
            # Masking đơn giản
            'mask': "'********'",
            'mask_all': "'[MASKED]'",
            
            # Hash SHA256 (tốt nhất, yêu cầu extension pgcrypto)
            'hash_sha256': f"encode(digest(concat('{self.pepper}', {{column}}::text, '{self.salt}'), 'sha256'), 'hex')" 
        }
        
        # Ghi đè/bổ sung bằng logic tùy chỉnh từ người dùng
        if custom_logic:
            self.sql_templates.update(custom_logic)

    def generate_postgres_view(
        self,
        table_name: str, 
        all_columns: List[str], 
        pii_actions: Dict[str, str],
        view_prefix: str = "vw_masked_"
    ) -> str:
        """
        Sinh mã SQL tạo View cho PostgreSQL.
        
        Args:
            table_name: Tên bảng gốc (vd: 'users')
            all_columns: Danh sách tất cả các cột của bảng gốc
            pii_actions: Kết quả từ PII Detect, map Tên Cột -> Action (vd: {'email': 'hash', 'phone': 'mask'})
            view_prefix: Tiền tố cho tên View (mặc định: vw_masked_)
            
        Returns:
            Chuỗi câu lệnh CREATE OR REPLACE VIEW
        """
        view_name = f"{view_prefix}{table_name}"
        select_items = []

        for col in all_columns:
            action = pii_actions.get(col)

            # Nếu cột cần được xử lý và action tồn tại trong bộ rules
            if action and action in self.sql_templates:
                expression = self.sql_templates[action].format(column=col)
                select_items.append(f"    {expression} AS {col}")
            else:
                # Cột bình thường hoặc action không hợp lệ thì giữ nguyên
                select_items.append(f"    {col}")

        # Nối các cột lại
        select_clause = ",\n".join(select_items)
        
        sql_query = f"""CREATE OR REPLACE VIEW {view_name} AS
SELECT
{select_clause}
FROM {table_name};"""

        return sql_query

# --- Helper Function (Interface nhanh) ---
def generate_postgres_view(
    table_name: str, 
    all_columns: List[str], 
    pii_actions: Dict[str, str],
    salt: str = "MY_DEFAULT_SALT",
    pepper: str = "MY_SECRET_PEPPER",
    custom_logic: Optional[Dict[str, str]] = None
) -> str:
    """
    Hàm tĩnh hỗ trợ gọi nhanh trình tạo View.
    """
    generator = PostgresViewGenerator(salt=salt, pepper=pepper, custom_logic=custom_logic)
    return generator.generate_postgres_view(table_name, all_columns, pii_actions)


if __name__ == "__main__":
    # --- VÍ DỤ SỬ DỤNG ---
    # 1. Schema giả định lấy từ CSDL
    table = "customers"
    columns = ["id", "full_name", "email", "phone_number", "address", "created_at"]
    
    # 2. Đầu ra từ thuật toán PII Detection
    detected_pii = {
        "email": "hash",          
        "phone_number": "mask",   
        "full_name": "mask_name"  # Một action custom mới tinh
    }
    
    # 3. Định nghĩa logic custom 
    my_custom_rules = {
        # Đổi logic hash sang xài mã hóa sinh UUID ngẫu nhiên kết hợp salt (ví dụ)
        "hash": "md5(concat({column}::text, 'SALT_123'))",
        
        # Định nghĩa logic mask_name (chỉ lấy phần tên, che phần họ đệm)
        "mask_name": "concat(split_part({column}::text, ' ', 1), ' ***')" 
    }
    
    # 4. Sinh mã lệnh
    sql = generate_postgres_view(
        table_name=table,
        all_columns=columns,
        pii_actions=detected_pii,
        custom_logic=my_custom_rules
    )
    
    print("--- GENERATED SQL ---")
    print(sql)
