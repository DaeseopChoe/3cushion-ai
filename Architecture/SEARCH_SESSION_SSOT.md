# Search Session SSOT (Search Session Architecture)

**Document:** SEARCH_SESSION_SSOT.md  
**Status:** Architecture Design Draft · Architecture Freeze Compatible  
**Parent:** `ENVELOPE_ARCHITECTURE_SSOT.md`  
**Depends on:** `PUBLISHED_DATASET_SSOT.md` · `PACKAGE_SSOT.md` · `MANIFEST_SSOT.md` · `VERSION_SSOT.md` · `SEARCH_LOADER_SSOT.md` · `MEMBERSHIP_SSOT.md` · `RESOLVE_SSOT.md` · `SEARCH_RUNTIME_SSOT.md`  
**Role:** Search Runtime **내부**의 검색 **1회 실행 단위(Session)** — Membership/Resolve 책임을 **흡수하지 않음**  
**Non-goals:** Search/Membership/Resolve Algorithm · Ranking · Similarity · Interpolation · KDTree · Acceleration · Performance · Implementation · Code · JSON · Directory · Compression · Database · Cloud · Thread · Cache

> Runtime = Host · Session = Execution Context.  
> Session은 Loader 공급 Dataset을 쓰고 Membership → Resolve → Strategy → Modal을 **한 번의 검색**으로 호스트한다. Representation을 생성·수정하지 않는다.

---

## §1 Search Session SSOT

### 1.1 역할

| Session은 | Session은 아님 |
|-----------|----------------|
| Runtime 내부의 **검색 실행 단위** | Generator |
| Loader 공급 Published Dataset **사용자** | Dataset / Package Writer |
| Membership → Resolve → Strategy → Modal **실행 컨텍스트** | Package/Manifest/Version 직접 Reader |
| Search Result **Producer** (Session 산출) | Membership/Resolve Algorithm 정의서 |
| Search Representation을 **생성·수정하지 않음** | Runtime Host 자체를 대체 |

### 1.2 Architecture Chain

```text
Search Loader
    ↓
Published Dataset
    ↓
Search Runtime                 ← Host
    ↓
Search Session                 ← 본 SSOT (1회 실행)
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
```

---

## §2 Session Identity

| ID | 계약 |
|----|------|
| **SES-ID-01** | Session = **Search Execution Context** |
| **SES-ID-02** | Session = **Runtime Child** |
| **SES-ID-03** | Session = Membership + Resolve **Execution Context** |
| **SES-ID-04** | Session = **Search Result Producer** |
| **SES-ID-05** | Session ≠ Generator |
| **SES-ID-06** | Session ≠ Dataset Writer |
| **SES-ID-07** | Session ≠ Membership Algorithm · Resolve Algorithm |
| **SES-ID-08** | Session ≠ Runtime을 대체하는 별도 Authority Writer |

---

## §3 Session Inputs

### 3.1 반드시 사용하는 것

| 입력 | 단계 |
|------|------|
| **Published Dataset** | Loader → Runtime → Session |
| **Runtime Query** (Cue / Target / Second) | Membership 입력 |
| **Membership Candidate** | Membership 산출 |
| **Strategy** | Resolve 이후 |
| **Modal** | Resolve 이후 |

### 3.2 사용하지 않는 것 (Session 직접)

| 금지 |
|------|
| Package · Manifest · Version |
| Generator · Authoring DB |
| Geometry Raw · Builder Result |
| Ranking · Interpolation · KDTree |

---

## §4 Runtime Contract (Session ↔ Runtime)

### 4.1 논리 Pipeline (1회 검색)

```text
Published Dataset
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

### 4.2 Session이 수행하는 계약

| 함 | |
|----|--|
| Runtime 내부에서 **1회 검색** 실행 | |
| Membership **실행 순서** 보장 | |
| Resolve **실행 순서** 보장 (Membership 이후) | |
| Search Result 생성 | |

### 4.3 Session이 수행하지 않는 것

| 안 함 |
|------|
| Dataset 생성·수정 · Package/Manifest/Version 직접 읽기 |
| Generator 역할 |
| Membership Algorithm · Resolve Algorithm **정의** (하위 SSOT 유지) |
| Runtime Host 권한의 재정의 |

계층: **Runtime = Host** · **Session = Execution Context** · Membership/Resolve SSOT = Stage 계약.

---

## §5 Lifecycle

```text
Search Request
    ↓
Search Session 생성
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
Session 종료
```

| 규칙 | |
|------|--|
| Session은 Dataset / Package / Manifest / Version을 **Regenerate하지 않는다** |
| Invalidate / Regenerate는 **Generator** 영역 |
| Session 종료 후 실행 컨텍스트는 소멸한다 (persist 비범위) |

---

## §6 Authority

| Actor | Write | Session 관련 |
|-------|-------|----------------|
| **Generator** | Dataset · Package · Manifest · Version | Session write **없음** |
| **Search Loader** | **없음** | Dataset 공급 · Session 아님 |
| **Search Runtime** | **없음** | Session **Host** |
| **Search Session** | **없음** | 1회 실행 Consumer / Result Producer |
| **Membership** | **없음** | Session 내부 Stage |
| **Resolve** | **없음** | Session 내부 Stage |
| **Authoring** | Strategy only | Session write **없음** |

**Write 권한을 새로 추가하지 않는다.**  
Session = Runtime 내부 **Consumer / Execution Context**.

---

## §7 Must Have

- Runtime Child · Execution Context  
- Membership **이후** Resolve  
- Resolve **이후** Strategy  
- Strategy **이후** Modal  
- Architecture Freeze 유지  
- Published Dataset 의미 유지  
- **새 Authority 없음**  

---

## §8 Must Not Have

- Dataset / Package / Manifest / Version Write  
- Generator 역할  
- Membership/Resolve Algorithm 본문  
- Ranking · Interpolation · KDTree · Geometry 처리  
- Patch · Incremental  

---

## §9 Out of Scope

Search/Membership/Resolve Algorithm · Ranking · Similarity · Interpolation · KDTree · Acceleration · Performance · Implementation · Code · JSON · Directory · Compression · Database · Cloud · Thread · Cache

---

## §10 Architecture Self Audit

| 검사 | 결과 |
|------|------|
| Published Dataset 의미 변경? | **아니오** |
| Search Runtime SSOT 충돌? | **없음** — Session = Runtime Child · Host/Context 분리 |
| Search Loader SSOT 충돌? | **없음** — Dataset만 사용 · Package 직접 읽기 금지 |
| Membership SSOT 충돌? | **없음** — Stage 호스트만 · 책임 비흡수 |
| Resolve SSOT 충돌? | **없음** — Membership 이후 · 책임 비흡수 |
| Generator Authority 변경? | **아니오** |
| 새 Authority 생성? | **아니오** |
| Architecture Freeze 수정? | **안 함** |
| Search Representation 변경? | **아니오** |
| Session이 Runtime 역할 침범? | **아니오** — Host≠Session · Orchestration은 Runtime, 1회 실행은 Session |
| 기존 SSOT 문서 수정? | **안 함** |

**Self Audit 결론:** 기존 전 계층 SSOT와 **충돌 없음**. Freeze Compatible. Search Session은 Runtime 내부 Execution Context만 독립 정의됨.
