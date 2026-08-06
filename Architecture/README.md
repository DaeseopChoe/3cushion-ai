# Architecture — Envelope Search SSOT Index

**Role:** Document Index only (구현 설명 아님)  
**Root Freeze:** [`ENVELOPE_ARCHITECTURE_SSOT.md`](./ENVELOPE_ARCHITECTURE_SSOT.md)  
**Status:** Architecture Freeze maintained

---

## Architecture Layer 개요

Envelope Architecture는 Authoring(Strategy · Modal)과 Search Representation(Published Envelope Dataset)을 분리한다.

```text
Strategy (Authoring)
    → Strategy Envelope (Logical)
    → Sampling Policy
    → Generator
    → Published Dataset
    → Package → Manifest → Version
    → Search Loader
    → Search Runtime / Session
    → Membership → Resolve → Strategy → Modal
```

---

## Architecture Freeze 선언

- **Parent Freeze:** `ENVELOPE_ARCHITECTURE_SSOT.md` (Status: Architecture Freeze)
- 하위 SSOT는 Freeze와 **호환**되도록 설계·저장되었다.
- 본 디렉터리 문서는 Ask 확정본을 Repository에 반영한 것이며, Architecture 의미를 변경하지 않는다.
- Algorithm · JSON Schema · 구현 코드는 본 Index / 각 SSOT Out of Scope에 둔다.

---

## 읽는 순서 (권장)

1. `ENVELOPE_ARCHITECTURE_SSOT.md` — **최상위 Freeze (필수)**
2. `ENVELOPE_DATASET_SCHEMA_SSOT.md`
3. `PUBLISHED_DATASET_SSOT.md`
4. `PACKAGE_SSOT.md`
5. `MANIFEST_SSOT.md`
6. `VERSION_SSOT.md`
7. `SEARCH_LOADER_SSOT.md`
8. `MEMBERSHIP_SSOT.md`
9. `RESOLVE_SSOT.md`
10. `SEARCH_RUNTIME_SSOT.md`
11. `SEARCH_SESSION_SSOT.md`

---

## 각 SSOT 역할

| Document | Role |
|----------|------|
| **ENVELOPE_ARCHITECTURE_SSOT** | Envelope Architecture 최상위 Freeze · Chain · Authority · Sampling · Dataset · Search 규칙 |
| **ENVELOPE_DATASET_SCHEMA_SSOT** | EnvelopeRecord Logical Schema (Required 4 fields) |
| **PUBLISHED_DATASET_SSOT** | Published Dataset 논리 저장 · Strategy↔Record 1:1 Identity · Lifecycle |
| **PACKAGE_SSOT** | Published Dataset Physical Packaging · Delivery Unit · Replace |
| **MANIFEST_SSOT** | Package/Dataset 설명 Metadata · Package 1:1 |
| **VERSION_SSOT** | Build/Replace 식별 Metadata · Package/Manifest/Dataset 1:1 사슬 |
| **SEARCH_LOADER_SSOT** | Package/Manifest/Version Reader · Dataset Provider |
| **MEMBERSHIP_SSOT** | Candidate Selection Layer (target ∧ cueSet ∧ secondSet) |
| **RESOLVE_SSOT** | strategyRef → Strategy · Modal 접근 게이트 |
| **SEARCH_RUNTIME_SSOT** | Search Execution Host · Loader→Membership→Resolve orchestration |
| **SEARCH_SESSION_SSOT** | Runtime 내부 1회 검색 Execution Context |

---

## Parent 관계

모든 하위 SSOT의 **Parent**는 동일하다.

| Document | Parent |
|----------|--------|
| ENVELOPE_ARCHITECTURE_SSOT | — (Root Freeze) |
| ENVELOPE_DATASET_SCHEMA_SSOT | ENVELOPE_ARCHITECTURE_SSOT |
| PUBLISHED_DATASET_SSOT | ENVELOPE_ARCHITECTURE_SSOT |
| PACKAGE_SSOT | ENVELOPE_ARCHITECTURE_SSOT |
| MANIFEST_SSOT | ENVELOPE_ARCHITECTURE_SSOT |
| VERSION_SSOT | ENVELOPE_ARCHITECTURE_SSOT |
| SEARCH_LOADER_SSOT | ENVELOPE_ARCHITECTURE_SSOT |
| MEMBERSHIP_SSOT | ENVELOPE_ARCHITECTURE_SSOT |
| RESOLVE_SSOT | ENVELOPE_ARCHITECTURE_SSOT |
| SEARCH_RUNTIME_SSOT | ENVELOPE_ARCHITECTURE_SSOT |
| SEARCH_SESSION_SSOT | ENVELOPE_ARCHITECTURE_SSOT |

---

## Depends 관계

| Document | Depends on |
|----------|------------|
| ENVELOPE_ARCHITECTURE_SSOT | — |
| ENVELOPE_DATASET_SCHEMA_SSOT | ENVELOPE_ARCHITECTURE_SSOT |
| PUBLISHED_DATASET_SSOT | ENVELOPE_DATASET_SCHEMA_SSOT |
| PACKAGE_SSOT | ENVELOPE_DATASET_SCHEMA_SSOT · PUBLISHED_DATASET_SSOT |
| MANIFEST_SSOT | ENVELOPE_DATASET_SCHEMA_SSOT · PUBLISHED_DATASET_SSOT · PACKAGE_SSOT |
| VERSION_SSOT | ENVELOPE_DATASET_SCHEMA_SSOT · PUBLISHED_DATASET_SSOT · PACKAGE_SSOT · MANIFEST_SSOT |
| SEARCH_LOADER_SSOT | ENVELOPE_DATASET_SCHEMA_SSOT · PUBLISHED_DATASET_SSOT · PACKAGE_SSOT · MANIFEST_SSOT · VERSION_SSOT |
| MEMBERSHIP_SSOT | Schema · Published Dataset · Package · Manifest · Version · SEARCH_LOADER_SSOT |
| RESOLVE_SSOT | Schema · Published Dataset · Package · Manifest · Version · SEARCH_LOADER_SSOT · MEMBERSHIP_SSOT |
| SEARCH_RUNTIME_SSOT | Schema · Published Dataset · Package · Manifest · Version · SEARCH_LOADER_SSOT · MEMBERSHIP_SSOT · RESOLVE_SSOT |
| SEARCH_SESSION_SSOT | Published Dataset · Package · Manifest · Version · SEARCH_LOADER_SSOT · MEMBERSHIP_SSOT · RESOLVE_SSOT · SEARCH_RUNTIME_SSOT |

---

## 문서명 일관성

| Repo filename | Ask / Mission 대응 |
|---------------|-------------------|
| ENVELOPE_ARCHITECTURE_SSOT.md | Mission 6 Freeze |
| ENVELOPE_DATASET_SCHEMA_SSOT.md | Mission 7 Schema |
| PUBLISHED_DATASET_SSOT.md | Mission 8 Published Dataset |
| PACKAGE_SSOT.md | Mission 9 Package (Physical Packaging) |
| MANIFEST_SSOT.md | Mission 10 Manifest |
| VERSION_SSOT.md | Mission 11 Version |
| SEARCH_LOADER_SSOT.md | Mission 12 Search Loader |
| MEMBERSHIP_SSOT.md | Mission 13 Membership |
| RESOLVE_SSOT.md | Mission 14 Resolve |
| SEARCH_RUNTIME_SSOT.md | Mission 15 Search Runtime |
| SEARCH_SESSION_SSOT.md | Mission 16 Search Session |

---

## Note

- `작업관리/ENVELOPE_ARCHITECTURE_SSOT.md`에 동일 Freeze 원본이 있을 수 있다. Repository SSOT Index의 기준 경로는 **`Architecture/`** 이다.
- 본 README는 Index only · 구현·Algorithm·JSON을 포함하지 않는다.
