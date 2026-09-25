class PostgresViewGenerator:
    """Generate PostgreSQL masking views from reviewed PII actions."""

    def __init__(
        self,
        salt: str = "MY_DEFAULT_SALT",
        pepper: str = "MY_SECRET_PEPPER",
        custom_logic: dict[str, str] | None = None,
    ):
        self.salt = salt
        self.pepper = pepper
        self.sql_templates = {
            "HMAC": (
                "encode(hmac(coalesce({column}::text, ''), "
                f"'{self._escape_literal(self.pepper)}:{self._escape_literal(self.salt)}', 'sha256'), 'hex')"
            ),
            "HASHING": (
                "encode(hmac(coalesce({column}::text, ''), "
                f"'{self._escape_literal(self.pepper)}:{self._escape_literal(self.salt)}', 'sha256'), 'hex')"
            ),
            "HASH": f"md5(concat('{self._escape_literal(self.pepper)}', {{column}}::text, '{self._escape_literal(self.salt)}'))",
            "MASK": "'[MASKED]'",
            "MASK_ALL": "'[MASKED]'",
            "NULL": "NULL",
            "KEEP": "{column}",
        }

        if custom_logic:
            self.sql_templates.update({key.upper(): value for key, value in custom_logic.items()})

    def generate_postgres_view(
        self,
        table_name: str,
        all_columns: list[str],
        pii_actions: dict[str, str],
        view_prefix: str = "vw_masked_",
        schema_name: str | None = None,
    ) -> str:
        """Return a CREATE OR REPLACE VIEW statement for one table."""
        view_name = f"{view_prefix}{table_name}"
        source_table = self._qualified_name(table_name, schema_name)
        target_view = self._qualified_name(view_name, schema_name)
        select_items = []

        for column in all_columns:
            action = pii_actions.get(column, "KEEP").upper()
            quoted_column = self._quote_identifier(column)

            if action == "DROP":
                continue

            template = self.sql_templates.get(action, "{column}")
            expression = template.format(column=quoted_column)
            select_items.append(f"    {expression} AS {quoted_column}")

        if not select_items:
            raise ValueError("Cannot generate a view with zero output columns.")

        select_clause = ",\n".join(select_items)
        return f"""CREATE OR REPLACE VIEW {target_view} AS
SELECT
{select_clause}
FROM {source_table};"""

    @staticmethod
    def _escape_literal(value: str) -> str:
        return value.replace("'", "''")

    @classmethod
    def _qualified_name(cls, name: str, schema_name: str | None = None) -> str:
        quoted_name = cls._quote_identifier(name)
        if schema_name is None:
            return quoted_name
        return f"{cls._quote_identifier(schema_name)}.{quoted_name}"

    @staticmethod
    def _quote_identifier(identifier: str) -> str:
        return f'"{identifier.replace(chr(34), chr(34) * 2)}"'


def generate_postgres_view(
    table_name: str,
    all_columns: list[str],
    pii_actions: dict[str, str],
    salt: str = "MY_DEFAULT_SALT",
    pepper: str = "MY_SECRET_PEPPER",
    custom_logic: dict[str, str] | None = None,
    schema_name: str | None = None,
) -> str:
    generator = PostgresViewGenerator(salt=salt, pepper=pepper, custom_logic=custom_logic)
    return generator.generate_postgres_view(table_name, all_columns, pii_actions, schema_name=schema_name)


if __name__ == "__main__":
    table = "customers"
    columns = ["id", "full_name", "email", "phone_number", "address", "created_at"]
    detected_pii = {
        "email": "HMAC",
        "phone_number": "MASK",
        "address": "DROP",
        "full_name": "MASK_NAME",
    }
    custom_rules = {
        "MASK_NAME": "concat(split_part({column}::text, ' ', 1), ' ***')",
    }
    sql = generate_postgres_view(
        table_name=table,
        all_columns=columns,
        pii_actions=detected_pii,
        custom_logic=custom_rules,
    )
    print("--- GENERATED SQL ---")
    print(sql)
