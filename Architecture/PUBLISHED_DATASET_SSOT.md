# Published Envelope Dataset SSOT (Logical Storage Design)

**Document:** PUBLISHED_DATASET_SSOT.md  
**Status:** Logical Storage Design Draft  
**Parent:** `ENVELOPE_ARCHITECTURE_SSOT.md` (Freeze)  
**Depends on:** `ENVELOPE_DATASET_SCHEMA_SSOT.md`  
**Scope:** Published Dataset이 Strategy / EnvelopeRecord를 **논리적으로 어떻게 관리하는지**  
**Non-goals:** JSON · 파일명/경로 · Version · Index · Algorithm · 구현

Architecture·Schema는 수정하지 않는다.

---

## 1. Published Dataset SSOT

### 1.1 정의

**Published Envelope Dataset**은 Generator가 Sampling Policy를 실행하여 만든  
**Strategy Corpus의 Search Representation**이다.

```text
Published Envelope Dataset
  = EnvelopeRecord 의 집합
  = Search Runtime이 읽는 유일한 Search Representation
  ≠ Authoring DB
  ≠ Modal 저장소
  ≠ Working Dataset
  = Generator Output (유일)
```

### 1.2 논리 계층

```text
Published Envelope Dataset
    │
    └── EnvelopeRecord[]          ← 집합 (corpus)
            │
            └── EnvelopeRecord    ← Strategy당 1건 (1:1)
                    ├── strategyRef   : Reference
                    ├── target        : Point (1)
                    ├── cueSet        : PointSet (N ≥ 1)
                    └── secondSet     : PointSet (M ≥ 1)
```

| 계층 | 역할 |
|------|------|
| **Published Envelope Dataset** | Search용 corpus 전체 |
| **EnvelopeRecord[]** | Record 집합 |
| **EnvelopeRecord** | 한 Strategy의 Search Representation |
| **Field 4종** | Schema Required (`strategyRef` · `target` · `cueSet` · `secondSet`) |

물리 leaf·파일 분할은 Out of Scope. 논리적으로는 **하나의 Published Envelope Dataset = 해당 Strategy Corpus에 대한 EnvelopeRecord 집합**이다.

### 1.3 Published Dataset Identity

| 계약 | 내용 |
|------|------|
| **정체** | EnvelopeRecord의 집합 |
| **역할** | Strategy Corpus의 **Search Representation** |
| **아님** | Authoring DB · Modal 저장소 · Working 상태 저장소 |
| **출처** | **Generator Output** only |
| **소비** | Search Runtime read-only |

---

## 2. Identity Rule (Strategy ↔ EnvelopeRecord)

**Published Dataset의 핵심 계약 (필수)**

| ID | 계약 |
|----|------|
| **ID-01** | 한 EnvelopeRecord는 **정확히 하나의** Strategy를 표현한다 |
| **ID-02** | 한 Strategy는 **정확히 하나의** EnvelopeRecord를 가진다 |
| **ID-03** | EnvelopeRecord는 Strategy를 **분할하지 않는다** (1 Strategy → N Record 금지) |
| **ID-04** | EnvelopeRecord는 Strategy를 **병합하지 않는다** (N Strategy → 1 Record 금지) |
| **ID-05** | Strategy와 EnvelopeRecord는 항상 **1:1** 계약이다 |
| **ID-06** | 연결은 `strategyRef`만으로 성립한다 (Modal/본문 복제로 Identity를 만들지 않음) |

```text
Strategy₁ ←——1:1——→ EnvelopeRecord₁
Strategy₂ ←——1:1——→ EnvelopeRecord₂
Strategyₙ ←——1:1——→ EnvelopeRecordₙ
```

위반 예 (금지):

- 슬롯/트랙별로 Record를 쪼개 Strategy를 분할  
- 여러 Strategy를 한 Record의 Set에 합침  
- Strategy 없이 orphan EnvelopeRecord  
- EnvelopeRecord 없이 Published Dataset에 “검색만 되는” Strategy 표현  

(Authoring에 Strategy가 있으나 Regenerate 전 stale 구간은 Lifecycle의 Invalidate 상태이며, **유효 Published Dataset**에서는 1:1이 성립해야 한다.)

---

## 3. Authority Table

| Actor | 생성 | 수정 (in-place) | 읽기 | 삭제 | 재생성 |
|-------|------|-----------------|------|------|--------|
| **Authoring** | Dataset 생성 권한 없음 | Dataset Field 수정 금지 · **Strategy만** 수정 | Authoring 경로에서 Dataset 비사용(검색 아님) | Dataset 직접 삭제 권한 없음* | 트리거만 (Strategy 변경 → Invalidate) |
| **Generator** | **유일 Producer** — Dataset 생성 | in-place Field 수정 **금지** | Strategy read-only | 이전 Dataset을 **교체(Regenerate)** 로 소거 | **유일 Regenerator** (Full만) |
| **Search Runtime** | 없음 | 없음 | **Published Dataset만** 검색 읽기 | 없음 | 없음 |
| **Strategy Resolve** | 없음 | 없음 | Membership 후 `strategyRef` → Strategy | 없음 | 없음 |
| **Sampling Policy** | Dataset write 없음 | 없음 | Generator 실행 시 Rule로 적용 | 없음 | 없음 |

\* Authoring이 “파일 삭제” 같은 운영 행위를 할 수 있는지는 물리 계층 Out of Scope. **논리 Authority상 Dataset 내용의 삭제·교체는 Generator Full Regenerate로만** 한다.

| 요약 | |
|------|--|
| **누가 생성하는가** | Generator only |
| **누가 수정 가능한가** | **아무도 in-place 수정 불가** |
| **누가 읽는가 (Search)** | Search Runtime |
| **누가 삭제/교체하는가** | Generator Full Regenerate (전체 교체) |
| **누가 재생성하는가** | Generator only |

---

## 4. Lifecycle

```text
[Authoring]
  Strategy 작성 / 수정 / 삭제  (Modal · Authoring 좌표)
        │
        ▼
[Generator]
  Sampling Policy 실행
  Strategy Corpus read-only
        │
        ▼
[Publish]
  Published Envelope Dataset 생성
  (EnvelopeRecord[] · 1:1 Identity 만족)
        │
        ▼
[Search Use]
  Search Runtime → Published Dataset only
  → Membership → strategyRef → Resolve → Modal
        │
        │ Strategy 변경
        ▼
[Invalidate]
  기존 Published Dataset = stale
  Search의 권위 있는 Representation 아님
        │
        ▼
[Full Regenerate]
  Generator가 Dataset 전체를 새로 생성·교체
  부분 Patch 금지
        │
        └─► [Search Use]
```

| 규칙 | |
|------|--|
| **부분 Patch 금지** | 단일 Field·단일 Record만 손봐 Strategy와 맞추지 않음 |
| **동기화** | Regenerate only |
| **Identity** | Regenerate 결과도 항상 ID-01…05 유지 |

---

## 5. Must Have

유효한 Published Envelope Dataset은 다음을 **반드시** 가진다.

| Must | 내용 |
|------|------|
| EnvelopeRecord 집합 | Dataset의 구성 단위 |
| 각 Record의 `strategyRef` | Strategy 1:1 참조 |
| 각 Record의 `target` | Point × 1 |
| 각 Record의 `cueSet` | PointSet · N ≥ 1 |
| 각 Record의 `secondSet` | PointSet · M ≥ 1 |
| Identity 1:1 | Corpus 내 Strategy ↔ Record 전단사(유효 상태) |
| Generator 출처 | Dataset은 Generator Output |

---

## 6. Must Not Have

Published Envelope Dataset / EnvelopeRecord에 **포함 금지**:

| 금지 | 예 |
|------|-----|
| Modal | SYS, HP, STR, AI, Reflection, Correction, 설명 |
| Strategy 복제 | sysInputs, signature 페이로드, corrections 등 본문 복사 |
| Cartesian pair | cue×second 조합 목록 |
| Ranking / Similarity / Interpolation 결과 | |
| Geometry Raw | pathNodes, cushionPath, Extension geometry |
| Working 상태 | draft, UI session, local-only flags |
| PositionRecord | Position 중심 Authoring/Search 레거시 단위를 Dataset에 혼입 |
| Authoring Metadata | 편집자·작업 이력 등 Authoring DB 전용 메타를 Search Representation에 저장 |
| Builder 결과물 원본 | TrajectoryBuildResult 전체를 Dataset에 persist |
| Schema 비계약 Field | Required 4필드 외 Logical Schema 계약 필드 |

---

## 7. Search ↔ Published Dataset

| 규칙 | |
|------|--|
| Search는 **Published Envelope Dataset만** 읽는다 |
| Search는 **Strategy를 직접 검색하지 않는다** |
| Search는 **Authoring / Working Dataset을 검색하지 않는다** |
| Membership 단계에서는 Modal을 열지 않는다 |
| **Resolve 이후에만** Strategy(및 Modal)를 읽는다 |

```text
Query
  → Published Envelope Dataset
  → Target Match (target)
  → Cue Membership (cueSet)
  → Second Membership (secondSet)
  → strategyRef
  → Resolve → Strategy → Modal
```

---

## 8. Generator ↔ Published Dataset

| 규칙 | |
|------|--|
| Generator는 Published Dataset의 **유일한 Producer**이다 |
| Generator는 Dataset을 **in-place 수정하지 않는다** |
| 갱신은 항상 **Full Regenerate** (전체 교체)이다 |
| Generator는 Strategy/Modal/Authoring DB에 **쓰지 않는다** |
| 산출물은 Schema 준수 EnvelopeRecord만이며 Identity 1:1을 만족해야 한다 |

```text
Strategy Corpus (read)
  + Sampling Policy
  → Generator
  → Published Envelope Dataset (replace entirely)
```

---

## 9. Architecture Self Audit

| 검사 | 결과 |
|------|------|
| **Architecture Freeze** | Chain·Authority·Dataset 역할과 일치. Architecture 문구 변경 제안 없음 |
| **Schema** | Record Field = 4 Required only. 선택/금지 Field 확장 없음 |
| **Sampling Policy** | Storage SSOT는 Set **저장**만 다룸. 구간·간격은 Policy 영역 유지 |
| **Generator** | Unique Producer · Full Regenerate · Strategy write 금지 → Freeze §7·AR-03·AR-09 일치 |
| **Search Runtime** | Published Dataset only · Resolve 후 Strategy → §9·AR-06·AR-11 일치 |
| **Authority** | in-place 수정자 없음 · Authoring은 Strategy만 → §4 일치 |
| **Lifecycle** | Invalidate → Full Regenerate · Patch 금지 → §8.5·§12 일치 |
| **Identity 1:1** | Architecture §8.2 `Strategy : Record = 1 : 1`을 Published 핵심 계약으로 승격 · 충돌 없음 |
| **Must Not** | Modal/Cartesian/Geometry/PositionRecord 금지 → §8.4·AR-04·AR-05 일치 |
| **Out of Scope** | 파일·Version·Index·Algorithm 미정의 → Freeze §14 준수 |

**Self Audit 결론:** Architecture / Schema / Policy / Generator / Search / Authority / Lifecycle와 **충돌 없음**.
