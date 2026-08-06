# Manifest SSOT (Dataset Manifest Architecture)

**Document:** MANIFEST_SSOT.md  
**Status:** Architecture Design Draft · Architecture Freeze Compatible  
**Parent:** `ENVELOPE_ARCHITECTURE_SSOT.md`  
**Depends on:** `ENVELOPE_DATASET_SCHEMA_SSOT.md` · `PUBLISHED_DATASET_SSOT.md` · `PACKAGE_SSOT.md`  
**Scope:** Manifest Logical Architecture · Authority · Identity · Lifecycle · Package↔Manifest · Loader Contract  
**Non-goals:** Manifest JSON · 파일명 · Version Format · Checksum · Compression · DB · Directory · Implementation

> Manifest는 Published Dataset Package를 **설명하는 메타 계층**이다.  
> Search Representation도 아니고 Strategy도 아니다. Dataset 의미를 바꾸지 않는다.

---

## 1. Manifest SSOT

### 1.1 정의

**Manifest**는 Published Envelope Dataset Package에 대한 **논리 메타 계층**이다.

```text
Published Envelope Dataset     ← Search Representation
        │
        ▼
Package                        ← Physical Delivery Unit
        │
        ▼
Manifest                       ← Metadata describing Package / Dataset
        │
        ▼
Search Loader                  ← reads Manifest (guide) + Package (payload)
```

| Manifest는 | Manifest는 아님 |
|------------|-----------------|
| Package / Dataset을 **설명**한다 | Search Representation |
| Search가 **무엇을 읽을지 안내**한다 | Strategy / Modal 저장소 |
| Metadata only | EnvelopeRecord 저장소 |
| Generator Output의 메타 동반물 | Dataset 의미의 재정의 |

### 1.2 원칙

1. Manifest는 Dataset·Package의 **의미를 변경하지 않는다**.  
2. Membership은 여전히 **Published Dataset**의 `target` / `cueSet` / `secondSet`으로만 수행한다.  
3. Manifest는 Dataset을 **대체하지 않는다**.  
4. Architecture / Schema / Package SSOT는 수정하지 않는다. Manifest는 그 위에 얹힌 **설명 계층**이다.

---

## 2. Manifest Identity

```text
Manifest  ↔  Package  =  1 : 1
```

| ID | 계약 |
|----|------|
| **MAN-ID-01** | Manifest = **Package 하나**에 대응한다 |
| **MAN-ID-02** | Package = **Manifest 하나**에 대응한다 |
| **MAN-ID-03** | Manifest ≠ Dataset |
| **MAN-ID-04** | Manifest ≠ Strategy |
| **MAN-ID-05** | Manifest는 **Metadata only**이다 |
| **MAN-ID-06** | Manifest는 Strategy를 대표하지 않는다 |
| **MAN-ID-07** | Manifest는 EnvelopeRecord를 저장하지 않는다 |
| **MAN-ID-08** | Manifest는 Modal을 포함하지 않는다 |

EnvelopeRecord ↔ Strategy **1:1**은 Dataset Identity이며 Manifest가 대체·분할하지 않는다.

---

## 3. Manifest Contents

### 3.1 허용 (논리적으로 설명할 수 있는 정보)

| 허용 | 역할 |
|------|------|
| Package Identity | 이 Manifest가 가리키는 Package |
| Dataset Identity | Package가 싣는 Published Dataset |
| Generator Build Identity | 어떤 Generator 산출인지 (논리) |
| Version Reference | 후속 Version용 자리 · 포맷 미정 |
| Package Reference | Package 획득 안내 (논리 참조) |
| 생성 시각 (논리 메타) | 재생성·추적용 |
| Generator Build Metadata | Build 관련 메타 (Modal 아님) |

### 3.2 금지

| 금지 |
|------|
| Strategy · Modal |
| EnvelopeRecord (`strategyRef`/`target`/`cueSet`/`secondSet` 본문) |
| Geometry Raw · Builder Result |
| Index · KDTree · Search Cache |
| Search Result · Ranking · Interpolation |
| Working 상태 · PositionRecord |
| Schema/Architecture 재정의 페이로드 |

---

## 4. Loader Contract

```text
Package 확인
    ↓
Manifest 확인          ← 안내 · 식별 · 참조 검증 (수치식/포맷 Out of Scope)
    ↓
Package 획득
    ↓
Dataset 획득           ← Search Representation
    ↓
Membership
    ↓
Resolve
    ↓
Strategy
    ↓
Modal
```

| Loader 함 | Loader 안 함 |
|-----------|--------------|
| Manifest **read-only** | Manifest **생성** |
| Manifest로 Package/Dataset **안내** | Manifest **수정** |
| Dataset으로 Membership 수행 | Manifest를 Dataset **대신** 사용 |
| Resolve 후 Strategy/Modal | Manifest에서 Modal/Strategy 로드 |

---

## 5. Generator Contract

```text
Strategy Corpus (read)
  + Sampling Policy
        ↓
  Published Dataset 생성
        ↓
  Package 생성
        ↓
  Manifest 생성
        ↓
  Replace (Dataset + Package + Manifest 일괄)
```

| Generator 함 | Generator 안 함 |
|--------------|-----------------|
| Manifest **유일 생성자** | Manifest **Patch** |
| Manifest를 Package와 **함께** 산출 | **Incremental** Manifest |
| Full regenerate 시 Manifest **재생성** | Manifest만 단독 갱신 |
| Strategy/Modal write 없음 | EnvelopeRecord를 Manifest에 넣음 |

---

## 6. Lifecycle

```text
Strategy 변경
        ↓
Invalidate Dataset
        ↓
Invalidate Package
        ↓
Invalidate Manifest
        ↓
Generator
        ↓
Dataset → Package → Manifest
        ↓
Replace (원자적 논리 교체)
        ↓
Search (Loader → Manifest 확인 → Package → Dataset → …)
```

| 규칙 | |
|------|--|
| Manifest는 **항상 Package와 함께** 재생성된다 |
| **Manifest 단독 갱신 금지** |
| Patch / Incremental 금지 |
| Invalidate는 Dataset · Package · Manifest에 **연쇄** |

---

## 7. Authority

| Actor | Manifest Write | Manifest Read | 비고 |
|-------|----------------|---------------|------|
| **Authoring** | **없음** | 검색용 불필요 | Strategy만 수정 |
| **Generator** | **유일 생성·Regenerate** | Strategy Corpus read | Patch 금지 |
| **Search Loader** | **없음** | **read-only** | Dataset 대체 사용 금지 |
| **Sampling Policy** | **없음** | Generator Rule로만 적용 | |
| **Resolve** | **없음** | Manifest 비사용 | Strategy만 |

**새 Authority 주체 없음.** Manifest Write = Generator only.

---

## 8. Must Have / Must Not Have

### Must Have

- Manifest Identity (Package와 1:1)  
- Package Reference  
- Dataset Reference  
- Generator Build Identity  
- Version Reference **자리** (포맷 미정)  
- Architecture Freeze · Package · Dataset · Schema 계약 준수  

### Must Not Have

- Strategy · Modal · EnvelopeRecord  
- Geometry · Index · Search 결과  
- Schema/Architecture 변경  
- Manifest-only regenerate · Patch  

---

## 9. Out of Scope

- Manifest JSON · 파일명 · Manifest Version Format  
- Checksum · Hash · Compression · Cloud · DB · Directory  
- Build Number 알고리즘  
- Loader 구현 · Generator 구현  

---

## 10. Self Audit

| 검사 | 결과 |
|------|------|
| Architecture Freeze 충돌 | 없음. Search Representation은 Dataset 유지. Manifest는 메타만 |
| Published Dataset SSOT | Dataset 의미·1:1 Identity·Must Not 불변 |
| Package SSOT | Package = Delivery Unit 유지. Manifest는 Package 설명 계층 |
| Manifest가 Dataset 의미 변경? | **아니오** |
| Generator만 Manifest 생성? | **예** |
| Search Manifest read-only? | **예** |
| Strategy/Modal in Manifest? | **아니오** |
| Manifest Patch 허용? | **아니오** |
| Package와 함께 regenerate? | **예** (단독 갱신 금지) |
| 새 Authority? | **아니오** |

**Self Audit 결론:** Architecture / Schema / Published Dataset / Package / Generator / Search / Authority / Lifecycle와 **충돌 없음**. Freeze Compatible.
