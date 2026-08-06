# Envelope Architecture SSOT

**Document** : ENVELOPE_ARCHITECTURE_SSOT.md  
**Status** : Architecture Freeze  
**Role** : Envelope Architecture 최상위 SSOT  
**Scope** : Strategy · Strategy Envelope · Sampling Policy · Generator · Envelope Dataset · Search Runtime · Membership · Strategy Resolve  
**Out of Scope** : Search Algorithm · Ranking · Interpolation · JSON Schema · 파일 배치 · 구현

> 이후 Generator / Envelope Dataset / Search / Membership / Resolve 구현은  
> **본 문서를 유일한 Architecture 기준**으로 한다.

---

## 1. Architecture Purpose

### 1.1 프로젝트 목적

본 Architecture의 목적은 좌표 샘플을 대량 생산하는 것이 아니다.

**하나의 Strategy가 논리적으로 허용하는 좌표 공간(Strategy Envelope)을  
Sampling Policy에 따라 Envelope Dataset으로 표현하고,  
Search Runtime이 그 Dataset만으로 Strategy를 Resolve하는 것**이다.

### 1.2 Envelope Architecture를 쓰는 이유

- Authoring(전략·모달)과 Search(허용 좌표 표현)를 분리한다.
- Search Representation에 Modal을 넣지 않아 중복·불일치를 막는다.
- Cue×Second Cartesian을 저장하지 않고, 두 축 Set + Domain Rule로 Envelope를 표현한다.
- Sampling Rule을 Generator 구현과 분리하여 Rule 교체·재생성을 가능하게 한다.

### 1.3 Authoring / Search 분리

| 축 | SSOT | 역할 |
|----|------|------|
| Authoring | Strategy (+ Modal Data) | 관리자가 작성·수정하는 유일 대상 |
| Search | Envelope Dataset | Generator 산출물 · Search Runtime만 소비 |

Strategy Envelope는 저장물이 아닌 **Logical Concept**이다.

---

## 2. Architecture Chain

```text
Strategy                          ← Authoring SSOT
    │
    ▼
Strategy Envelope                 ← Logical Concept (허용 좌표 공간)
    │
    ▼
Sampling Policy                   ← Architecture Rule Set
    │
    ▼
Generator                         ← Policy 실행 Producer
    │
    ▼
Envelope Dataset                  ← Search Representation
    │
    ▼
Search Runtime
    │
    ▼
Membership                        ← Target ∧ Cue ∧ Second
    │
    ▼
Strategy Resolve                  ← strategyRef → Strategy
    │
    ▼
Modal Data                        ← SYS / HP / STR / AI / …
```

---

## 3. Terminology

| 용어 | 정의 |
|------|------|
| **Strategy** | Authoring SSOT. Modal Data와 논리 Envelope의 소유 주체. 수정 가능한 유일 Authoring 대상 |
| **Modal Data** | SYS, HP, STR, AI, Reflection, Correction 및 기타 모달·설명 데이터. Strategy에만 존재 |
| **Strategy Envelope** | Strategy가 논리적으로 허용하는 좌표 공간. Target(1) + Cue 축 + Second 축. **저장물 아님** |
| **Sampling Policy** | Strategy Envelope → Envelope Dataset 변환 Rule Set. Generator와 독립인 Architecture SSOT |
| **Generator** | Sampling Policy를 **실행**하여 Envelope Dataset을 만드는 Producer. Strategy를 수정하지 않음 |
| **Envelope Dataset** | Generator 산출물. Search Representation. Record = strategyRef + target + cueSet + secondSet |
| **Search Runtime** | Envelope Dataset만 읽어 Membership 후 Resolve로 Strategy/Modal에 도달하는 Runtime |
| **Membership** | 사용자 좌표가 EnvelopeRecord의 Target/Cue Set/Second Set에 속하는가에 대한 논리 판정 |
| **Strategy Resolve** | `strategyRef` → Strategy 매핑. 이후에서만 Modal 접근 |
| **strategyRef** | EnvelopeRecord가 Strategy를 가리키는 논리 참조. **구현 형태는 본 SSOT에서 미정** |
| **Line of Score** | Runtime `buildTrajectory`가 산출한 계산 path에서 **C3 → 마지막 유효 득점 쿠션** polyline. Extension·표시용 Hermite(CO→C1) 제외 |
| **Domain Rule** | Cue Set의 모든 원소와 Second Set의 모든 원소는 동일 Strategy 안에서 유효하다. Cue Sampling이 Impact **1/3**까지로 제한되어 성립 |

**금지 혼동**

- Strategy Envelope ≠ Envelope Dataset  
- Sampling Policy ≠ Generator  
- Envelope Dataset ≠ Strategy / Modal  

---

## 4. Authority (SSOT)

| 계층 | 쓰기 | 읽기 | 비고 |
|------|------|------|------|
| **Strategy / Modal** | Authoring만 | Generator(read) · Resolve 후 Search | Authoring SSOT |
| **Sampling Policy** | Architecture 개정만 | Generator 실행 시 적용 | Rule SSOT · 코드에 Rule 하드코딩 소유 금지(논리) |
| **Generator** | Envelope Dataset만 씀 | Strategy read-only · Policy 적용 | Strategy 저장소에 write 금지 |
| **Envelope Dataset** | Generator만 생성/교체 | Search Runtime만 검색 읽기 | Authoring 편집 금지 · 재생성 대상 |
| **Search Runtime** | 없음 (조회·Resolve 트리거) | Envelope Dataset | Strategy 직접 검색 읽기 금지 |
| **Membership** | 없음 | EnvelopeRecord 축 | 수치식은 본 문서 비범위 |
| **Strategy Resolve** | 없음 | strategyRef → Strategy | Modal 게이트 |

**재생성 대상:** Envelope Dataset만.  
**재생성 트리거:** Strategy 추가·삭제·Modal·Authoring 좌표 등 Strategy 변경 시 Dataset Invalidate → 전체 Regenerate.

---

## 5. Strategy Envelope (Logical Concept)

하나의 Strategy는 다음 논리 구조를 가진다.

```text
Strategy
    ├── Modal Data
    └── Strategy Envelope
            ├── Target (1)     ← 고정 · Sampling 없음
            ├── Cue axis       ← Cue → Impact 1/3 구간이 허용 Cue 공간
            └── Second axis    ← C3 → Line of Score 가 허용 Second 공간
```

| 축 | 논리 |
|----|------|
| Target | Strategy당 1개. Authoring Target |
| Cue | Canonical Cue에서 Impact 방향 **1/3**까지만 Envelope에 포함 |
| Second | Runtime Line of Score 상의 점만 Envelope에 포함 |

Domain Rule: Cue 축의 모든 허용점과 Second 축의 모든 허용점은 **동일 Strategy**에 속한다.  
이 논리 공간 자체는 persist하지 않는다. persist되는 것은 Sampling 결과인 Envelope Dataset이다.

---

## 6. Sampling Policy

### 6.1 역할

Sampling Policy는 Strategy Envelope를 Envelope Dataset으로 옮기는 **교체 가능한 Rule Set**이다.  
Generator는 이 Policy의 실행기일 뿐 Rule의 소유자가 아니다.

### 6.2 Target Rules

| ID | Rule |
|----|------|
| SP-T-01 | Target Sampling 금지 |
| SP-T-02 | Strategy당 Target 정확히 1개 (Authoring Target 복사) |

### 6.3 Cue Rules

| ID | Rule |
|----|------|
| SP-C-01 | 구간 = Canonical Cue → Impact, 파라미터 **t ∈ [0, 1/3]** |
| SP-C-02 | Cue→Impact **전체** Sampling 금지 |
| SP-C-03 | 간격 = **1.5 grid** |
| SP-C-04 | Endpoint 필수: Cue 시작, 1/3 종점 |
| SP-C-05 | 산출 = `cueSet` |

Impact 좌표는 기존 Impact SSOT(`evaluateStrategy` / 동일 Impact 정의)를 **consume**한다. Formula 수정 금지.

### 6.4 Second Rules

| ID | Rule |
|----|------|
| SP-S-01 | 구간 = Line of Score = **C3 → 마지막 유효 득점 쿠션** |
| SP-S-02 | Trajectory Extension Sampling 금지 |
| SP-S-03 | CO→C1 표시용 Hermite 등은 Second 입력 아님 |
| SP-S-04 | 간격 = **1.5 grid** |
| SP-S-05 | Endpoint 필수: C3, 마지막 득점 쿠션 |
| SP-S-06 | 산출 = `secondSet` |

Line of Score geometry는 `buildTrajectory` 결과(통상 Strategy 적용 계산 path)를 **consume**한다. Builder/Formula 수정 금지.  
Display Cap(second_ball 표시 절단)을 Envelope 상한으로 쓰지 않는다. Extension을 상한으로 쓰지 않는다.

### 6.5 Product / Domain Rules

| ID | Rule |
|----|------|
| SP-D-01 | Cue×Second **Cartesian Product 생성·저장 금지** |
| SP-D-02 | Domain Rule (Cue Set × Second Set 동일 Strategy 유효) 전제 |
| SP-D-03 | Policy는 Modal을 정의·저장하지 않음 |

구간 길이가 step 미만이면 시작·끝만 유지. 논리적으로 Set(중복 좌표 제거 가능).

---

## 7. Generator

### 7.1 입력 (read-only)

- Strategy Authoring Data (Modal + Authoring balls 앵커)
- Sampling Policy
- Geometry consume: Impact SSOT · `buildTrajectory` (수정 없이 호출)

### 7.2 출력

- **Envelope Dataset only** (Strategy당 EnvelopeRecord 1개)

### 7.3 책임

1. Strategy를 읽기만 한다.  
2. Sampling Policy를 실행한다.  
3. `target` / `cueSet` / `secondSet` / `strategyRef`를 채운 EnvelopeRecord를 만든다.  
4. Strategy 변경 후 Dataset을 재생성할 수 있는 순수 Producer이다.

### 7.4 금지

- Strategy / Modal / Working Authoring 저장소 write  
- Builder · Formula · Display Cap · Extension 수정  
- Cartesian 생성·저장  
- Modal을 EnvelopeRecord에 기록  
- Sampling Rule을 Generator 내부 소유물로 고정(Policy와 분리 유지)  
- Search · Ranking · Interpolation 수행  

Legacy 참고: Authoring은 `StrategyEntry`+canonical SAVE, geometry는 `trajectoryBuilder`/`evaluateStrategy`를 **재사용 consume**. `trajectorySampleBuilder`·Interpolation을 Envelope Generator로 승격하지 않는다.

---

## 8. Envelope Dataset

### 8.1 역할

Search Runtime이 사용하는 **유일한 Search Representation**.  
Authoring 대상이 아니다. Strategy를 복제하지 않고 `strategyRef`로만 참조한다.

### 8.2 논리 구조

```text
Envelope Dataset
  └── EnvelopeRecord[]   (Strategy : Record = 1 : 1)
        ├── strategyRef
        ├── target        // Point · 1
        ├── cueSet        // Point[] · N ≥ 1
        └── secondSet     // Point[] · M ≥ 1
```

### 8.3 Must Have

- `strategyRef`, `target`, `cueSet`, `secondSet`
- Sampling Policy를 준수한 Set 내용
- Strategy 비복제 · Modal 비포함

### 8.4 Must Not Have

- SYS / HP / STR / AI / Reflection / Correction / 기타 Modal  
- Strategy 본문 복사  
- Cartesian pairs  
- pathNodes / Extension raw geometry  
- Ranking / Interpolation 결과  

### 8.5 Lifecycle

```text
Strategy corpus
    → Generator (+ Sampling Policy)
    → Envelope Dataset available for Search
    → Strategy changed
    → Invalidate Dataset
    → Regenerate (full rebuild; in-place authoring patch 없음)
    → Search again
```

Published **Strategy** corpus와 Envelope Dataset은 역할이 다르다.  
전자는 Authoring 배포, 후자는 Search Representation. 논리적으로 합치지 않는다.  
(물리 파일·스키마는 본 문서 Out of Scope.)

---

## 9. Search Runtime

### 9.1 Pipeline (논리)

```text
사용자 좌표 (Cue, Target, Second)
    → Envelope Dataset
    → Target Match
    → Cue Membership
    → Second Membership
    → strategyRef
    → Strategy Resolve
    → Strategy Load
    → Modal 표시
```

### 9.2 Responsibility

1. Envelope Dataset만 Search Representation으로 읽는다.  
2. Membership 논리 단계를 적용한다.  
3. 통과 record의 `strategyRef`를 Resolve에 넘긴다.  
4. Resolve 이후 Strategy/Modal을 Load한다.  
5. Strategy · Policy · Generator · Dataset을 수정하지 않는다.

### 9.3 읽기 금지

- Membership 단계에서 Strategy/Modal 직접 열람  
- Authoring Working Dataset을 Search Representation으로 사용  
- Envelope에 없는 Modal을 Dataset에서 복구  

### 9.4 Out of Scope (Search)

KDTree · Spatial Index · Hash · 최적화 · Ranking · Similarity · Top-K · Interpolation · AI 추천 · Membership 수치식.

Legacy 참고: 기존 Position L1 Spatial Recall은 Position 중심이며, 본 Architecture의 Envelope Membership 모델과 다르다. 구현 시 Compare/Algorithm은 교체 대상이 될 수 있으나, Resolve 후 hydrate 패턴은 재사용 가능하다.

---

## 10. Membership

### 10.1 정의 (개념만 · 수치식 제외)

| 판정 | 질문 |
|------|------|
| **Target Match** | 사용자 Target ≡ record.target 인가? |
| **Cue Membership** | 사용자 Cue ∈ record.cueSet 인가? |
| **Second Membership** | 사용자 Second ∈ record.secondSet 인가? |

### 10.2 결합

```text
Target Match
  AND Cue Membership
  AND Second Membership
→ strategyRef 획득 가능
```

Cartesian pair 매칭으로 대체하지 않는다.  
ε / nearest-in-set / permutation 등은 본 문서 비범위.

---

## 11. Strategy Resolve

```text
EnvelopeRecord.strategyRef
        → Resolve
Strategy (Authoring SSOT)
        → Modal Data
```

| ID | 규칙 |
|----|------|
| RES-01 | strategyRef → Strategy 매핑 |
| RES-02 | Resolve **성공 후에만** Modal 접근 |
| RES-03 | Envelope에서 Modal 합성·추정 금지 |
| RES-04 | Resolve 실패 시 Dataset으로 Modal 복구 금지 |

`strategyRef` 구현(UUID, positionId+slot, 기타)은 **본 Freeze에서 미정**. 계약은 “참조 → Strategy”만 고정한다.

---

## 12. Lifecycle (통합)

```text
[Author]
  Strategy 작성 / 수정 / 삭제
        │
        ▼
[Invalidate]
  Envelope Dataset stale
        │
        ▼
[Regenerate]
  Generator ← Strategy (read) + Sampling Policy
  → 새 Envelope Dataset (교체)
        │
        ▼
[Search]
  Query → Dataset → Membership → Resolve → Modal
```

- Coordinate/EnvelopeRecord를 관리자가 직접 고쳐 Strategy와 맞추지 않는다.  
- 동기화 수단은 **Regenerate only**.

---

## 13. Architecture Rules (Freeze)

| ID | Rule |
|----|------|
| AR-01 | **Builder 수정 금지** — Generator/Search는 consume only |
| AR-02 | **Formula 수정 금지** — 동일 |
| AR-03 | **Generator는 Strategy를 수정하지 않는다** |
| AR-04 | **Modal은 Strategy에만 존재** — Envelope Dataset 복제·저장 금지 |
| AR-05 | **Cartesian Product 저장 금지** |
| AR-06 | **Search Runtime은 Envelope Dataset만** Search Representation으로 읽는다 |
| AR-07 | **Generator = Producer** · **Sampling Policy = Rule SSOT** (분리) |
| AR-08 | **Strategy Envelope = Logical** · **Envelope Dataset = Search Representation** (용어 분리) |
| AR-09 | Strategy 변경 시 Envelope Dataset은 **Invalidate 후 항상 Regenerate** |
| AR-10 | Envelope Dataset은 **Authoring 대상이 아니다** |
| AR-11 | Membership 통과 후에서만 Resolve · Modal은 Resolve 이후 |
| AR-12 | Cue Sampling은 Impact **1/3**까지 · 이 제한이 Domain Rule의 전제 |
| AR-13 | Second Sampling은 Runtime Line of Score만 · Extension 제외 |
| AR-14 | Sampling 기본 간격 **1.5 grid** · Endpoint(Cue, 1/3, C3, 마지막 쿠션) 필수 |
| AR-15 | Target은 Strategy당 1 · Sampling 없음 |
| AR-16 | `strategyRef` 구현 형태는 후속 결정 · 참조 계약만 Freeze |

---

## 14. Out of Scope

본 Architecture Freeze에 **포함하지 않는다.**

- Search Algorithm · KDTree · Hash · Spatial Index · 검색 최적화  
- Ranking · Similarity · Top-K · Interpolation · AI 추천  
- Membership 수치식 · tolerance  
- JSON Schema · 파일명 · 저장 경로 · Dataset Version 체계  
- `strategyRef` 구체 구현  
- Generator / Loader / Search 코드 구현  
- Display Boundary / Trajectory Extension Runtime 재설계  

---

## 15. Freeze Declaration

**Envelope Architecture는 본 문서 기준으로 Freeze한다.**

구현·문서 변경이 Architecture Chain, Authority, Sampling Policy 확정 Rule, Dataset Must/Must-Not, Search 읽기 규칙, Membership AND, Resolve 게이트, §13 Rules를 깨면 **Architecture 위반**이다.  
Rule 변경이 필요하면 본 SSOT를 개정한 뒤 Regenerate·구현을 진행한다.
