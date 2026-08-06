# Envelope Dataset Schema SSOT (Logical Design)

**Document:** ENVELOPE_DATASET_SCHEMA_SSOT.md  
**Status:** Schema Design Draft (Architecture Freeze 준수)  
**Parent SSOT:** `ENVELOPE_ARCHITECTURE_SSOT.md`  
**Scope:** Logical Schema only  
**Non-goals:** JSON Schema · 파일 · Version · Index · Membership 수치식 · 구현

Architecture는 수정하지 않는다. 본 문서는 Freeze §8 Must Have / Must Not을 **Schema Field 단위로만** 구체화한다.

---

## 1. Envelope Dataset Schema SSOT

### 1.1 Schema 단위

```text
Envelope Dataset
  = EnvelopeRecord[]     (집합)
EnvelopeRecord
  = 한 Strategy의 Search Representation 1건
Cardinality
  = Strategy : EnvelopeRecord = 1 : 1
```

### 1.2 Field 분류

#### 필수 Field (Required)

| Field | Logical Type | 개수 제약 |
|-------|--------------|-----------|
| `strategyRef` | Reference | 1 |
| `target` | Point | 1 |
| `cueSet` | PointSet (= Point[]) | N ≥ 1 |
| `secondSet` | PointSet (= Point[]) | M ≥ 1 |

이 네 필드가 **EnvelopeRecord의 전체 Required Schema**이다. Architecture §8.2와 동일하다.

#### 선택 Field (Optional)

본 Schema는 **선택 Field를 두지 않는다.**

Architecture가 Dataset Must Have로 명시한 것은 위 네 필드뿐이며, provenance·policyVersion·출처 메타 등은 Architecture Out of Scope(파일·Version)에 해당하므로 **Schema Required/Optional에 추가하지 않는다.**  
(후속 물리 포맷에서 메타를 얹을 수는 있으나, 본 Logical Schema의 계약 필드가 아니다.)

#### 금지 Field (Forbidden)

아래를 EnvelopeRecord / Envelope Dataset에 **절대 포함하지 않는다.**

| 금지 범주 | 예시 |
|-----------|------|
| Modal Data | SYS, HP, STR, AI, Reflection, Correction, 설명문, 기타 모달 |
| Strategy 본문 복제 | sysInputs, signature 전체 복사, corrections, hpT, str, ai, track 페이로드 등 |
| Cartesian | cue×second pair 목록, 조합 entry |
| Geometry raw | pathNodes, cushionPath, Extension endpoints/geometry |
| Search 파생 | Ranking score, Similarity, Interpolation 결과 |
| Authoring 식별 혼입 | PositionRecord 전체, Working draft 상태 |
| Sampling 중간물 | Impact 좌표를 별도 필드로 저장, Line of Score polyline 원본 저장 |

---

## 2. Field Definition

### 2.1 `strategyRef`

| 항목 | 정의 |
|------|------|
| **책임** | 이 EnvelopeRecord가 표현하는 **Strategy**를 가리키는 유일한 다리 |
| **저장 의미** | 참조만. Strategy/Modal을 복제하지 않음 |
| **Resolve** | Search Membership 통과 후 `strategyRef` → Strategy → Modal |
| **구현 형태** | Architecture AR-16: **미정**. Schema는 Logical Type `Reference`만 요구 |
| **불변(인스턴스)** | Record 수명 동안 가리키는 Strategy와 1:1. 부분 수정으로 다른 Strategy로 바꾸지 않음(재생성으로만 교체) |

### 2.2 `target`

| 항목 | 정의 |
|------|------|
| **책임** | Strategy Envelope의 **고정 Target** (Sampling 없음) |
| **저장 의미** | Authoring Target 좌표 1점. SP-T-01/02 |
| **Search** | Target Match의 비교 대상 |
| **개수** | 정확히 1 |

### 2.3 `cueSet`

| 항목 | 정의 |
|------|------|
| **책임** | Cue 축 허용 공간의 **이산 Search Representation** |
| **저장 의미** | Sampling Policy에 따라 Cue→Impact **1/3** 구간을 1.5 grid로 Sampling한 Point 집합. Endpoint(Cue, 1/3) 포함 |
| **Search** | Cue Membership의 소속 검사 대상 |
| **개수** | N ≥ 1 (최소 Endpoint들로 성립 가능) |
| **비저장** | Cue×Second pair · Impact를 별도 top-level field로 두지 않음 |

### 2.4 `secondSet`

| 항목 | 정의 |
|------|------|
| **책임** | Second 축(Line of Score) 허용 공간의 **이산 Search Representation** |
| **저장 의미** | C3→마지막 유효 득점 쿠션을 1.5 grid로 Sampling한 Point 집합. Endpoint(C3, 마지막 쿠션) 포함. Extension 제외 |
| **Search** | Second Membership의 소속 검사 대상 |
| **개수** | M ≥ 1 |
| **비저장** | pathNodes 원본 · Extension · Cartesian |

### 2.5 Logical Types

| Type | 의미 |
|------|------|
| **Point** | 2D 좌표 논리값 (x, y). JSON 인코딩 미정 |
| **PointSet** | Point의 집합. 논리적으로 Set(중복 제거 가능). 순서 보장은 Schema 계약이 아님(구현 자유, Architecture 비범위) |
| **Reference** | Strategy를 식별하는 논리 참조. 직렬화 형태 미정 |
| **EnvelopeRecord** | `{ strategyRef, target, cueSet, secondSet }` |
| **Envelope Dataset** | `EnvelopeRecord`의 집합 |

---

## 3. Authority Table

| Field | 생성 | 인스턴스 수정 | 읽기 (Search) | 재생성 |
|-------|------|---------------|---------------|--------|
| `strategyRef` | Generator만 | 금지 (Authoring 패치 금지) | Membership 통과 후 Resolve가 사용 | Dataset Regenerate 시 재기록 |
| `target` | Generator만 (Authoring Target 복사) | 금지 | Target Match | 동일 |
| `cueSet` | Generator만 (Sampling Policy 실행) | 금지 | Cue Membership | 동일 |
| `secondSet` | Generator만 (Sampling Policy 실행) | 금지 | Second Membership | 동일 |
| Envelope Dataset 전체 | Generator만 생성/교체 | Authoring 편집 금지 | Search Runtime | Strategy 변경 → Invalidate → **전체 Regenerate** |

| Actor | Schema에 대한 권한 |
|-------|-------------------|
| **Authoring** | EnvelopeRecord Field write **없음**. Strategy만 수정 |
| **Generator** | Dataset/Record **유일 Writer** |
| **Search Runtime** | Dataset **Read-only**. Field 값 변경 없음 |
| **Sampling Policy** | Field를 쓰지 않음. Generator가 Set **내용**을 채울 때 적용하는 Rule |
| **Strategy Resolve** | `strategyRef` **읽기**만 · Modal은 Strategy에서 |

---

## 4. Must Have / Must Not Have (Schema 검증)

### Must Have

- 모든 EnvelopeRecord에 `strategyRef`, `target`, `cueSet`, `secondSet` 존재  
- `target` 개수 = 1  
- `cueSet.length` ≥ 1, `secondSet.length` ≥ 1  
- Set 내용은 Sampling Policy(SP-*)를 준수했다고 가정 (Policy 검증 절차는 구현 비범위)  
- Strategy : Record = 1 : 1  
- Modal / Strategy 본문 비포함  

### Must Not Have

- Modal 전 필드  
- Strategy 복제 페이로드  
- Cartesian / pair list  
- pathNodes · Extension · Ranking · Interpolation  
- Required 네 필드 외의 **Logical Schema 계약 Field** (선택 Field 없음)  

Architecture §8.3–8.4와 **일치**. 충돌 없음.

---

## 5. Generator ↔ Schema 관계

```text
Strategy (read) + Sampling Policy
        → Generator
        → EnvelopeRecord { strategyRef, target, cueSet, secondSet }
        → Envelope Dataset
```

| Generator가 **생성한다** | Generator가 **생성하면 안 된다** |
|--------------------------|----------------------------------|
| Envelope Dataset / EnvelopeRecord | Strategy·Modal write |
| `strategyRef` (참조값) | Modal을 Record에 embed |
| `target` (1 Point) | Cartesian pairs |
| `cueSet` / `secondSet` (Policy Sampling) | pathNodes / Extension 저장 |
| Dataset 전체 교체(Regenerate) | Record 부분 패치로 Authoring 동기화 |

Generator는 Schema의 **유일 Producer**이다. Schema Field를 Search/Authoring이 채우지 않는다.

---

## 6. Search Runtime ↔ Schema 관계

Search는 Schema Field를 **아래 순서의 논리 pipeline**으로만 사용한다. Algorithm은 정의하지 않는다.

```text
Envelope Dataset (Schema instances)
        │
        ▼  읽기: target
Target Match
        │
        ▼  읽기: cueSet
Cue Membership
        │
        ▼  읽기: secondSet
Second Membership
        │
        ▼  읽기: strategyRef
Strategy Resolve
        │
        ▼  Schema 밖 (Strategy Authoring)
Modal Load / 표시
```

| Stage | 사용하는 Schema Field | 쓰지 않는 것 |
|-------|----------------------|--------------|
| Target Match | `target` | Modal, cueSet, secondSet (이 단계 책임 아님) |
| Cue Membership | `cueSet` | Modal |
| Second Membership | `secondSet` | Modal |
| Resolve | `strategyRef` | Envelope 안의 Modal(없음) |

Search Runtime은 Schema를 **변경하지 않는다**.

---

## 7. Architecture Self Audit

| 검사 항목 | 결과 |
|-----------|------|
| **Authority** | Writer=Generator only · Authoring/Search write 없음 → Freeze §4와 일치 |
| **Lifecycle** | Field in-place 수정 금지 · 전체 Regenerate만 → §8.5·§12와 일치 |
| **Sampling Policy** | Schema는 Set **구조**만; 구간·간격은 Policy. Schema가 Policy를 대체하지 않음 → §6·AR-07 일치 |
| **Generator Responsibility** | Schema 산출 = 네 Field only · Modal/Cartesian/Builder 수정 없음 → §7 일치 |
| **Search Responsibility** | Dataset only · Membership 후 strategyRef · Modal은 Resolve 후 → §9–11 일치 |
| **용어** | Strategy Envelope(논리) vs Envelope Dataset(Schema 인스턴스) 혼동 없음 |
| **Cartesian / Modal** | Forbidden Field로 Schema에 명시 → AR-04·AR-05 일치 |
| **strategyRef 미정** | Logical Type `Reference`만 · 구현 형태 제안 없음 → AR-16 일치 |
| **선택 메타 필드** | Schema에 넣지 않음 → Version/파일 Out of Scope와 충돌 없음 |
| **Architecture 수정 제안** | 없음 |

**Self Audit 결론:** 본 Logical Schema는 `ENVELOPE_ARCHITECTURE_SSOT`와 **충돌 없음**. Freeze 위반 항목 없음.
