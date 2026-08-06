# Resolve SSOT (Search Resolve Architecture)

**Document:** RESOLVE_SSOT.md  
**Status:** Architecture Design Draft · Architecture Freeze Compatible  
**Parent:** `ENVELOPE_ARCHITECTURE_SSOT.md`  
**Depends on:** `ENVELOPE_DATASET_SCHEMA_SSOT.md` · `PUBLISHED_DATASET_SSOT.md` · `PACKAGE_SSOT.md` · `MANIFEST_SSOT.md` · `VERSION_SSOT.md` · `SEARCH_LOADER_SSOT.md` · `MEMBERSHIP_SSOT.md`  
**Scope:** Resolve Logical Architecture · Identity · Inputs/Outputs · Contract · Runtime · Authority · Lifecycle  
**Non-goals:** Resolve Algorithm · Lookup 구현 · Hash · Index · Database · Strategy/Modal Storage · Search Algorithm · Ranking · Interpolation · KDTree · Implementation · Code · JSON · Directory

> Resolve는 Membership Candidate의 **`strategyRef` → Strategy** 계약만 정의한다.  
> Algorithm·구현이 아니라 Architecture / Identity / Authority다.

---

## §1 Resolve SSOT

### 1.1 역할

Resolve는 Search Runtime 내부에서 Membership이 넘긴 Candidate를 받아 **`strategyRef`로 Strategy를 Resolve**하고, Modal 접근을 **시작하는** 단계다.

| Resolve는 | Resolve는 아님 |
|-----------|----------------|
| Search Runtime **내부 Stage** | Membership |
| Membership Candidate **소비자** | Generator |
| `strategyRef` **Resolver** | Search Representation Writer |
| Strategy를 **얻음** (기존 Authoring에서) | Dataset 수정자 |
| Modal 접근 **게이트/시작** | Strategy / Modal **생성자** |
| Search Representation을 **변경하지 않음** | Candidate 생성자 |

### 1.2 Architecture 위치

```text
Search Loader
    → Published Dataset
        → Membership
            → Candidate
                → Resolve          ← 본 SSOT
                    → Strategy
                        → Modal
```

---

## §2 Resolve Identity

| ID | 계약 |
|----|------|
| **RES-ID-01** | Resolve = **`strategyRef` Resolver** |
| **RES-ID-02** | Resolve = Membership **이후** Stage |
| **RES-ID-03** | Resolve = **Strategy Resolver** |
| **RES-ID-04** | Resolve = **Reader** (Strategy Corpus / Repository를 읽음) |
| **RES-ID-05** | Resolve = **Writer 아님** |
| **RES-ID-06** | Resolve = Published Dataset **Consumer 아님** (Membership이 Dataset을 consume) |
| **RES-ID-07** | Resolve = Strategy **생성자 아님** |
| **RES-ID-08** | Resolve = Modal **생성자 아님** |

Architecture Freeze의 RES-01…04(참조 → Strategy · Modal은 Resolve 성공 후 · Envelope에서 Modal 합성 금지)와 정합한다.

---

## §3 Resolve Inputs

### 3.1 반드시 읽는 것

| 입력 | 용도 |
|------|------|
| **Membership Candidate** | Resolve 진입 조건 · 대상 Record |
| **`strategyRef`** | Strategy 매핑 키 |
| **Strategy Repository** (논리 참조) | Authoring Strategy Corpus / 저장소 — Resolve가 Strategy를 **읽는** 곳 |

### 3.2 읽지 않는 것 (Resolve 단계)

| 금지 |
|------|
| `target` · `cueSet` · `secondSet` (Membership 영역) |
| Published Dataset 전체 재검색 |
| Package · Manifest · Version |
| Geometry · Ranking · Interpolation · Builder Result |

---

## §4 Resolve Contract

### 4.1 논리 Pipeline

```text
Membership Candidate
    ↓
strategyRef
    ↓
Strategy Resolve
    ↓
Strategy
    ↓
Modal                    ← 접근 시작 (로드 게이트)
    ↓
Search Runtime 사용
```

### 4.2 Resolve가 수행하는 계약

| 함 | |
|----|--|
| `strategyRef`를 Strategy로 Resolve | |
| Strategy를 Runtime에 **전달** | |
| Modal 접근을 **시작** (Resolve 성공 후에만 Modal 허용) | |
| Resolve 실패 시 Envelope/Dataset에서 Modal을 **합성·복구하지 않음** | |

### 4.3 Resolve가 수행하지 않는 책임

| 안 함 |
|------|
| Membership · Candidate 생성 |
| Dataset / Package / Manifest / Version 수정 |
| Strategy 생성 · Modal 생성 |
| Generator 역할 · Ranking · Interpolation |

---

## §5 Runtime Contract

| 규칙 | |
|------|--|
| Search Runtime은 **Membership 이후**에만 Resolve를 수행한다 |
| Resolve **이후** Strategy를 사용할 수 있다 |
| Resolve **이후** Modal 접근이 가능하다 |
| Membership **이전**에 Resolve를 수행하지 않는다 |
| Resolve는 Search Representation을 **변경하지 않는다** |
| Runtime은 Resolve를 우회해 Dataset만으로 Modal을 열지 않는다 |

```text
Membership → Candidate → Resolve → Strategy → Modal
```

---

## §6 Lifecycle

```text
Search 시작
    ↓
Loader
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
Search 종료
```

| 규칙 | |
|------|--|
| Invalidate / Regenerate는 **Generator** 영역 |
| Resolve는 Dataset을 **Regenerate하지 않는다** |
| Resolve는 Strategy Authoring을 **수정하지 않는다** |

---

## §7 Authority

| Actor | Resolve 관련 | Write |
|-------|--------------|-------|
| **Generator** | Strategy Corpus · Dataset 생성 · Resolve write **없음** | Dataset/Package/… |
| **Membership** | Candidate 생성 · Resolve **수행 안 함** | 없음 |
| **Resolve** | Strategy Resolve · **Write 없음** | 없음 |
| **Search Runtime** | Resolve 결과 **사용** | Dataset 수정 없음 |
| **Authoring** | Strategy **수정만** (Resolve와 무관) | Strategy |
| **Search Loader** | Resolve **수행 안 함** | 없음 |

**새로운 Authority 주체를 추가하지 않는다.**  
Resolve Write = 없음.

---

## §8 Must Have / Must Not Have

### Must Have

- Membership Candidate  
- `strategyRef`  
- Strategy Resolve  
- Strategy 전달  
- Modal 접근 시작 (게이트)  
- Architecture Freeze 유지  

### Must Not Have

- Dataset Write · Strategy 생성 · Modal 생성  
- Membership 수행  
- Ranking · Interpolation · KDTree · Geometry 처리  
- Package / Manifest / Version Write  

---

## §9 Out of Scope

- Resolve Algorithm · Lookup 구현 · Hash · Index · Database  
- Caching · Performance  
- KDTree · Ranking · Interpolation  
- Implementation · Code · JSON  
- `strategyRef` 구체 형식 (Freeze AR-16: 미정 유지)

---

## §10 Architecture Self Audit

| 검사 | 결과 |
|------|------|
| Membership 역할 침범? | **아니오** — Candidate 입력만 · target/cue/second 미사용 |
| Dataset 수정? | **아니오** |
| Search Representation 변경? | **아니오** |
| Strategy 생성? | **아니오** — Repository에서 Resolve |
| Modal 생성? | **아니오** — 접근 시작만 |
| Writer인가? | **아니오** |
| Membership SSOT 충돌? | **없음** — Candidate → Resolve 순서 · strategyRef는 Membership 이후 |
| Search Loader SSOT 충돌? | **없음** — Loader는 Dataset 공급 · Resolve 안 함 |
| Published Dataset SSOT 충돌? | **없음** — Dataset에 Modal 없음 · strategyRef 참조만 |
| Architecture Freeze 수정? | **안 함** |
| 새 Authority? | **없음** |
| 기존 SSOT 문서 수정? | **안 함** — Resolve Layer만 독립 정의 |

**Self Audit 결론:** Architecture / Schema / Published Dataset / Package / Manifest / Version / Search Loader / Membership와 **충돌 없음**. Freeze Compatible. Resolve Layer만 독립 정의됨.
