# Search Runtime SSOT (Architecture Freeze Compatible)

**Document:** SEARCH_RUNTIME_SSOT.md  
**Status:** Architecture Design Draft · Architecture Freeze Compatible  
**Parent:** `ENVELOPE_ARCHITECTURE_SSOT.md`  
**Depends on:** `ENVELOPE_DATASET_SCHEMA_SSOT.md` · `PUBLISHED_DATASET_SSOT.md` · `PACKAGE_SSOT.md` · `MANIFEST_SSOT.md` · `VERSION_SSOT.md` · `SEARCH_LOADER_SSOT.md` · `MEMBERSHIP_SSOT.md` · `RESOLVE_SSOT.md`  
**Role:** Search Runtime **통합(Orchestration) 상위 SSOT** — Membership/Resolve/Loader 세부 계약을 **흡수하지 않고** Host 계약만 정의  
**Non-goals:** Search/Membership/Resolve Algorithm · Ranking · Similarity · Interpolation · KDTree · Acceleration · Performance · Implementation · Code · JSON · Directory · Compression · Database · Cloud · Thread · Cache

> Runtime은 Loader가 공급한 Published Dataset을 소비하고, Membership → Resolve → Strategy → Modal을 **호스팅**한다.  
> Search Representation을 생성·변경하지 않으며 Generator가 아니다.

---

## §1 Search Runtime SSOT

### 1.1 역할

| Runtime은 | Runtime은 아님 |
|-----------|----------------|
| Loader 공급 **Published Dataset Consumer** | Generator |
| **Membership + Resolve Host** (orchestration) | Dataset / Package Writer |
| Resolve **이후** Strategy 사용 | Package / Manifest / Version **직접 Reader** |
| Resolve **이후** Modal 접근 허용 | Membership/Resolve **Algorithm** 정의서 |
| Search Session / Execution Layer | Search Representation 생성자 |

### 1.2 Architecture Chain

```text
Strategy
    ↓
Generator
    ↓
Published Dataset
    ↓
Package
    ↓
Manifest
    ↓
Version
    ↓
Search Loader
    ↓
Published Dataset 공급
    ↓
Search Runtime              ← 본 SSOT (Host)
    ↓
Membership
    ↓
Resolve
    ↓
Strategy
    ↓
Modal
```

세부 Stage 계약은 각각 Membership SSOT · Resolve SSOT · Search Loader SSOT가 소유한다. 본 문서는 **연결 순서와 Host Authority**만 고정한다.

---

## §2 Runtime Identity

| ID | 계약 |
|----|------|
| **SRT-ID-01** | Runtime = **Search Execution Layer** |
| **SRT-ID-02** | Runtime = Published Dataset **Consumer** |
| **SRT-ID-03** | Runtime = **Membership + Resolve Host** |
| **SRT-ID-04** | Runtime = **Search Session Layer** |
| **SRT-ID-05** | Runtime ≠ Generator |
| **SRT-ID-06** | Runtime ≠ Dataset Writer |
| **SRT-ID-07** | Runtime ≠ Package/Manifest/Version **직접** Reader |
| **SRT-ID-08** | Runtime ≠ Membership Algorithm · Resolve Algorithm |

---

## §3 Runtime Inputs

### 3.1 반드시 읽는 것 (Runtime 경로)

| 입력 | 출처 / 단계 |
|------|-------------|
| **Published Dataset** | Search Loader 공급 |
| **Membership Candidate** | Membership Stage 산출 |
| **Strategy** | Resolve 이후 |
| **Modal** | Resolve 이후 · Strategy에서 |

Query 좌표(사용자 Cue/Target/Second)는 Membership 입력으로 Runtime Session이 보유한다 (Dataset Field 아님).

### 3.2 읽지 않는 것 (Runtime 직접)

| 금지 |
|------|
| Package · Manifest · Version (Loader 전용) |
| Generator · Authoring DB (검색 단계) |
| Geometry Raw · Builder Result |
| Search Cache · KDTree · Ranking · Interpolation |

---

## §4 Runtime Contract

### 4.1 논리 Pipeline

```text
Published Dataset (from Loader)
    ↓
Membership
    ↓
Candidate
    ↓
Resolve
    ↓
Strategy
    ↓
Modal
    ↓
Search Result
```

### 4.2 Runtime이 수행하는 계약 (Orchestration)

| 함 | |
|----|--|
| Loader 공급 Dataset**만** Search Representation으로 사용 | |
| Membership Stage **호스팅·실행 순서 보장** | |
| Resolve Stage **호스팅·실행 순서 보장** (Membership 이후) | |
| Resolve 이후 Strategy 사용 · Modal 접근 | |
| Search Result 산출 (Session 결과 · Algorithm 비범위) | |

### 4.3 Runtime이 수행하지 않는 것

| 안 함 |
|------|
| Dataset / Package / Manifest / Version **생성·수정·Regenerate** |
| Package / Manifest / Version **직접 읽기** (Loader 우회) |
| Generator 역할 |
| Membership Algorithm · Resolve Algorithm **정의** (하위 SSOT/후속 Mission) |
| Ranking · Interpolation · Index 구축 |

---

## §5 Loader Contract (Runtime ↔ Loader)

| 규칙 | |
|------|--|
| Loader는 Runtime에 **Published Dataset만** 공급한다 |
| Runtime은 Loader를 **우회하지 않는다** |
| Loader는 Membership을 **수행하지 않는다** |
| Loader는 Resolve를 **수행하지 않는다** |
| Loader = **Reader/Provider** · Runtime = **Consumer/Host** — 역할 분리 유지 |

```text
Loader (Package/Manifest/Version → Dataset)
        → Runtime (Dataset → Membership → Resolve → …)
```

---

## §6 Lifecycle

```text
Search Start
    ↓
Search Loader
    ↓
Published Dataset 공급
    ↓
Membership
    ↓
Resolve
    ↓
Strategy
    ↓
Modal
    ↓
Search Result
    ↓
Search End
```

| 규칙 | |
|------|--|
| Runtime은 Dataset / Package / Manifest / Version을 **Regenerate하지 않는다** |
| Invalidate / Regenerate는 **Generator** 영역 |
| Runtime은 최신 Loader 공급 Dataset만 consume한다 |

---

## §7 Authority

| Actor | Write | Read / 역할 |
|-------|-------|-------------|
| **Generator** | Dataset · Package · Manifest · Version | Strategy Corpus read · Producer |
| **Search Loader** | **없음** | Version/Manifest/Package read · Dataset **공급** |
| **Search Runtime** | **없음** | Dataset consume · Membership/Resolve **Host** |
| **Membership** | **없음** | Dataset `target`/`cueSet`/`secondSet` · Candidate |
| **Resolve** | **없음** | Candidate · `strategyRef` · Strategy Repository |
| **Authoring** | Strategy only | Runtime write **없음** |

**Write 권한을 새로 추가하지 않는다.**  
Runtime = Reader / Consumer / Host only.

---

## §8 Must Have

- Loader 공급 Dataset만 사용  
- Membership **이후** Resolve  
- Resolve **이후** Strategy  
- Strategy **이후** Modal  
- Architecture Freeze 유지  
- Published Dataset 의미 유지  
- **새 Authority 없음**  
- Membership/Resolve SSOT 역할을 **흡수하지 않고** orchestration만  

---

## §9 Must Not Have / Out of Scope

### Must Not Have

- Dataset / Package / Manifest / Version Write  
- Generator 역할 · Loader 우회  
- Membership/Resolve Algorithm 본문  
- Ranking · Interpolation · KDTree · Geometry 처리  
- Patch · Incremental  

### Out of Scope

Search/Membership/Resolve Algorithm · Ranking · Similarity · Interpolation · KDTree · Acceleration · Performance · Implementation · Code · JSON · Directory · Compression · Database · Cloud · Thread · Cache

---

## §10 Architecture Self Audit

| 검사 | 결과 |
|------|------|
| Published Dataset 의미 변경? | **아니오** — Consumer only |
| Search Loader SSOT 충돌? | **없음** — Dataset만 공급 · Runtime 우회 금지 |
| Membership SSOT 충돌? | **없음** — Host만 · Algorithm/세부 계약 비흡수 |
| Resolve SSOT 충돌? | **없음** — Membership 이후 · strategyRef→Strategy |
| Generator Authority 변경? | **아니오** — Producer 유지 · Runtime write 없음 |
| 새 Authority 생성? | **아니오** |
| Architecture Freeze 수정? | **안 함** |
| Search Representation 변경? | **아니오** — 여전히 Published Dataset |
| 기존 SSOT 문서 수정? | **안 함** — Runtime 통합 SSOT만 추가 정의 |

**Self Audit 결론:** Architecture / Schema / Dataset / Package / Manifest / Version / Loader / Membership / Resolve와 **충돌 없음**. Freeze Compatible. Search Runtime은 **오케스트레이션 상위 SSOT**로만 정의됨.
