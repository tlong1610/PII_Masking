# PIIGuard VN - Architecture Diagram

File nay la ban diagram rut gon de nhin nhanh. Ban giai thich chi tiet nam o [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) va [../ARCHITECTURE.md](../ARCHITECTURE.md).

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
    A[Connect/list source] --> B[Choose table/collection]
    B --> C[Scan field profiles]
    C --> D[Rules/AI proposes action]
    D --> E[DPO reviews]
    E --> F[Build protected snapshot]
    F --> G[Verifier checks downstream]
    G -->|pass| H[Publish]
    G -->|fail| I[Fix decisions or rerun]
    H --> J[Analyst preview]
```

## PostgreSQL Branch

```mermaid
flowchart TD
    A[PostgreSQL source] --> B[PostgresConnector]
    B --> C[Field profiles]
    C --> D[DPO decisions]
    D --> E[pg_pipeline]
    E --> F[Snapshot schema/database]
    F --> G[SQL JOIN + aggregate verifier]
```

## MongoDB Branch

```mermaid
flowchart TD
    A[MongoDB source] --> B[MongoConnector]
    B --> C[Nested path profiles]
    C --> D[DPO decisions]
    D --> E[mongo_pipeline]
    E --> F[Protected database]
    F --> G[$lookup verifier]
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

Raw sample co the dung noi bo de regex/rule/BM25 chay tot, nhung khong duoc dua ra UI, API, log, report hoac prompt LLM.
