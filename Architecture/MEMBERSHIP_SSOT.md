# Membership SSOT (Search Membership Architecture)

**Document:** MEMBERSHIP_SSOT.md  
**Status:** Architecture Design Draft · Architecture Freeze Compatible  
**Parent:** `ENVELOPE_ARCHITECTURE_SSOT.md`  
**Depends on:** `ENVELOPE_DATASET_SCHEMA_SSOT.md` · `PUBLISHED_DATASET_SSOT.md` · `PACKAGE_SSOT.md` · `MANIFEST_SSOT.md` · `VERSION_SSOT.md` · `SEARCH_LOADER_SSOT.md`  
**Scope:** Membership Logical Architecture · Identity · Input/Output Contract · Authority · Lifecycle · Search Runtime 연결  
**Non-goals:** Membership Algorithm · Distance/Similarity · Ranking · Interpolation · Threshold · KDTree · Spatial Index · Acceleration · Performance · Code · JSON · Directory · Implementation

> Membership은 Search Runtime의 **첫 번째 논리 단계**다.  
> Algorithm이 아니라 **Candidate Selection Layer의 Architecture·Authority**만 정의한다.

---

## §1 Membership SSOT

### 1.1 역할

Membership은 Search Runtime 내부에서 Published Dataset을 읽어, 사용자 좌표가 EnvelopeRecord의 허용 축에 맞는지 판정하고 **Candidate**를 만드는 단계다.

| Membership은 | Membership은 아님 |
|--------------|-------------------|
| Search Runtime의 **첫 논리 Stage** | Search Algorithm 정의서 |
| Published Dataset **Consumer** | Dataset / Package / Manifest / Version **Writer** |
| `target` / `cueSet` / `secondSet`만 사용 | Strategy / Modal Reader |
| Search Representation을 **변경하지 않음** | Resolve |
| Dataset을 **생성하지 않음** | Generator |
| Candidate까지 | strategyRef로 Modal을 여는 단계 |

### 1.2 Architecture 위치

```text
Search Loader
    → Published Dataset 공급
        → Search Runtime
            → Membership          ← 본 SSOT
            → Resolve
            → Strategy
            → Modal
```

---

## §2 Membership Identity

| ID | 계약 |
|----|------|
| **MEM-ID-01** | Membership = **Search Candidate Selection Layer** |
| **MEM-ID-02** | Membership = **Resolve 이전** 단계 |
| **MEM-ID-03** | Membership = Published Dataset **Consumer** |
| **MEM-ID-04** | Membership = **Reader** · Writer 아님 |
| **MEM-ID-05** | Dataset을 **수정하지 않는다** |
| **MEM-ID-06** | Strategy를 **생성하지 않는다** |
| **MEM-ID-07** | Search Algorithm이 **아니다** (수치·가속 비범위) |
| **MEM-ID-08** | Search Representation(Dataset) 의미를 **변경하지 않는다** |

---

## §3 Membership Inputs

### 3.1 반드시 읽는 것

| 입력 | 용도 |
|------|------|
| **Published Dataset** | Loader가 공급한 Search Representation |
| **`target`** | Target Match |
| **`cueSet`** | Cue Membership |
| **`secondSet`** | Second Membership |
| 사용자 Query 좌표 | Cue / Target / Second (Runtime Query · Dataset Field 아님) |

### 3.2 읽지 않는 것 (Membership 단계)

| 금지 |
|------|
| **`strategyRef`** (Membership 입력으로 사용하지 않음) |
| Strategy · Modal |
| Geometry Raw · Builder Result |
| Ranking · Interpolation · Search Cache · KDTree |

`strategyRef`는 Membership **통과 후** Candidate에 실려 Resolve로 넘어갈 때 사용한다. Membership **판정 입력**으로 Strategy를 열지 않는다.

---

## §4 Membership Contract

### 4.1 논리 Pipeline

```text
Published Dataset
    ↓
Target Match          (record.target)
    ↓
Cue Membership        (record.cueSet)
    ↓
Second Membership     (record.secondSet)
    ↓
Membership Candidate
    ↓
Resolve               ← Membership 밖
```

결합(Architecture Freeze와 동일):

```text
Target Match
  AND Cue Membership
  AND Second Membership
→ Membership Candidate
```

### 4.2 Membership이 수행하는 계약

| 함 | |
|----|--|
| Dataset의 `target` / `cueSet` / `secondSet`으로 논리 판정 | |
| 통과 EnvelopeRecord를 **Candidate**로 산출 | |
| Candidate는 Resolve가 쓸 수 있도록 Record 식별·`strategyRef` **전달만** (판정 입력으로 Strategy Load 하지 않음) | |

### 4.3 Membership이 수행하지 않는 책임

| 안 함 |
|------|
| Resolve · Strategy Load · Modal Load |
| Ranking · Top-K · Similarity 점수화 (비범위) |
| Dataset / Package / Manifest / Version write |
| Cartesian pair 생성·매칭으로 Set membership 대체 |
| Algorithm · Threshold · Distance 공식 정의 |

**Membership는 Candidate까지만 만든다. Resolve는 수행하지 않는다.**

---

## §5 Runtime Contract

| 규칙 | |
|------|--|
| Search Runtime은 Membership 결과를 Resolve로 전달한다 |
| Membership는 Runtime **내부 Stage**이다 |
| **Membership 이후에만** `strategyRef`를 Resolve 입력으로 사용한다 |
| Membership는 Search Representation을 **변경하지 않는다** |
| Runtime은 Loader를 우회해 Package/Manifest/Version으로 Membership하지 않는다 (Loader SSOT) |

```text
Membership Candidate
    → (이후) strategyRef
    → Resolve
    → Strategy
    → Modal
```

---

## §6 Lifecycle

```text
Search 시작
    ↓
Published Dataset 사용 (from Loader)
    ↓
Membership
    ↓
Candidate 생성
    ↓
Resolve
    ↓
Strategy
    ↓
Modal
```

| 규칙 | |
|------|--|
| **Invalidate / Regenerate**는 Generator 영역이다 |
| Membership는 Dataset을 **Regenerate하지 않는다** |
| Membership는 stale Dataset을 고치지 않는다 · 공급된 Dataset을 consume만 한다 |

---

## §7 Authority

| Actor | Membership 관련 | Write |
|-------|-----------------|-------|
| **Generator** | Dataset 생성 · Membership write **없음** | Dataset/Package/… |
| **Search Runtime** | **Membership 수행** | Dataset 수정 **없음** |
| **Resolve** | Membership **이후** 수행 | — |
| **Search Loader** | Dataset 공급 · Membership **수행 안 함** | — |
| **Authoring** | Membership **없음** | Strategy only |

**새로운 Authority 주체를 추가하지 않는다.**  
Membership Write = 없음. Membership = Runtime 내부 read-only 판정 Stage.

---

## §8 Must Have / Must Not Have

### Must Have

- Published Dataset read  
- `target` · `cueSet` · `secondSet` 사용  
- Candidate 생성  
- Architecture Freeze 유지 (AND Membership · Cartesian 비저장)  

### Must Not Have

- Strategy Load · Modal Load · Resolve  
- Ranking · Interpolation · KDTree · Geometry 처리  
- Dataset / Package / Manifest / Version Write  

---

## §9 Out of Scope

- Membership Algorithm · Similarity · Distance · Threshold  
- Ranking · Interpolation · Acceleration  
- KDTree · Spatial Index  
- Implementation · Code · JSON  

---

## §10 Architecture Self Audit

| 검사 | 결과 |
|------|------|
| Dataset 의미 변경? | **아니오** — Consumer only |
| Resolve 침범? | **아니오** — Candidate까지 |
| Strategy 읽기 (Membership 단계)? | **아니오** |
| Modal 읽기? | **아니오** |
| Dataset 수정? | **아니오** |
| Writer인가? | **아니오** — Reader |
| Search Loader SSOT 충돌? | **없음** — Loader 공급 Dataset만 사용 · Loader가 Membership 안 함 |
| Published Dataset SSOT 충돌? | **없음** — Field·Must Not·1:1 Identity 불변 |
| Architecture Freeze 수정? | **안 함** — §10 Membership AND · strategyRef는 Resolve와 정합 |
| 새 Authority? | **없음** |
| Schema / Package / Manifest / Version / Loader 문서 수정? | **안 함** — Membership Layer만 독립 정의 |

**Self Audit 결론:** 기존 Architecture / Schema / Published Dataset / Package / Manifest / Version / Loader와 **충돌 없음**. Freeze Compatible. Membership Layer만 독립 정의됨.
