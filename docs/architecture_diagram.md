# PIIGuard VN - Architecture Diagram

File này là bản diagram rút gọn để nhìn nhanh. Bản giải thích chi tiết nằm ở [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) và [../ARCHITECTURE.md](../ARCHITECTURE.md).

## Overview

```mermaid
flowchart TB
    DPO[DPO] --> FE[React Frontend]
    ANA[Analyst] --> FE
    FE -->|REST /api/v1| API[FastAPI Backend]

    API --> AUTH[Role + state guard]
    API --> SOURCES[Sources]
    API --> RUNS[Runs + decisions]
    API --> DATASETS[Datasets]

    RUNS --> SCAN[Scanner]
    SCAN --> RULES[Regex/rules/BM25]
    SCAN --> LLM[Optional LLM<br/>sanitized profile only]

    SOURCES --> PG[(PostgreSQL source<br/>read-only)]
    SOURCES --> MG[(MongoDB source<br/>read-only)]

    RUNS --> TRANSFORM[Transform<br/>MASK/DROP/HMAC/KEEP]
    TRANSFORM --> PGOUT[(PostgreSQL snapshot)]
    TRANSFORM --> MGOUT[(MongoDB protected DB)]

    PGOUT --> VER[Verifier]
    MGOUT --> VER
    VER -->|VERIFIED| DATASETS
    VER -->|FAILED| RUNS
```

## Main Flow

```mermaid
flowchart LR
    A[Connect/list source<br/>connection string] --> B[Choose table/collection]
    B --> C[Scan selected scope]
    C --> D[Rules/AI proposes action]
    D --> E[DPO reviews]
    E --> F[Build protected snapshot]
    F --> G[Verifier checks downstream]
    G -->|pass| H[Publish]
    G -->|fail| I[Fix decisions or rerun]
    H --> J[Analyst preview]
```

Input/output của MVP:

```text
Input  = PostgreSQL/MongoDB source database
Output = protected PostgreSQL/MongoDB snapshot database
```

## PostgreSQL Branch

```mermaid
flowchart TD
    A[SOURCE_DATABASE_URL] --> B[PostgresConnector]
    B --> C[Read tables]
    C --> D[DPO selects tables]
    D --> E[Field profiles for selected tables]
    E --> F[DPO decisions]
    F --> G[pg_pipeline]
    G --> H[SNAPSHOT_DATABASE_URL<br/>snapshot schema/database]
    H --> I[SQL JOIN + aggregate verifier]
```

## MongoDB Branch

```mermaid
flowchart TD
    A[MONGO_URI + MONGO_DB] --> B[MongoConnector]
    B --> C[Read collections]
    C --> D[DPO selects collections]
    D --> E[Nested path profiles for selected collections]
    E --> F[DPO decisions]
    F --> G[mongo_pipeline]
    G --> H[MONGO_SNAPSHOT_DB<br/>protected database]
    H --> I[$lookup verifier]
```

## Security Boundary

```mermaid
flowchart LR
    RAW[Raw sample values] --> INTERNAL[Internal connector/scanner only]
    INTERNAL --> SAFE[Sanitized profile]
    SAFE --> API[API response]
    SAFE --> UI[DPO UI]
    SAFE --> LLM[LLM prompt]
    RAW -.blocked.-> API
    RAW -.blocked.-> UI
    RAW -.blocked.-> LLM
```

Raw sample có thể dùng nội bộ để regex/rule/BM25 chạy tốt, nhưng không được đưa ra UI, API, log, report hoặc prompt LLM.
