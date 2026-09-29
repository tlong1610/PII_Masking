with open("src/models/schemas.py", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    "    statistics: dict = Field(\n        default_factory=dict,\n        description=\"Thống kê đã làm sạch (VD: {'min_len': 12, 'max_len': 12, 'pattern': 'XXX'})\"\n    )",
    "    statistics: dict = Field(\n        default_factory=dict,\n        description=\"Thống kê đã làm sạch (VD: {'min_len': 12, 'max_len': 12, 'pattern': 'XXX'})\"\n    )\n    samples: list[str] = Field(default_factory=list, description=\"Raw samples\")"
)

with open("src/models/schemas.py", "w", encoding="utf-8") as f:
    f.write(text)
print("Updated successfully")
