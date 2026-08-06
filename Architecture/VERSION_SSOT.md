# Version SSOT (Dataset Version Architecture)

**Document:** VERSION_SSOT.md  
**Status:** Architecture Design Draft · Architecture Freeze Compatible  
**Parent:** `ENVELOPE_ARCHITECTURE_SSOT.md`  
**Depends on:** `ENVELOPE_DATASET_SCHEMA_SSOT.md` · `PUBLISHED_DATASET_SSOT.md` · `PACKAGE_SSOT.md` · `MANIFEST_SSOT.md`  
**Scope:** Version Logical Architecture · Identity · Authority · Lifecycle · Generator/Search Contracts · Package/Manifest 관계  
**Non-goals:** Version Number Format · SemVer · Hash · Checksum · Compression · JSON · Directory · Cloud · DB · Build Pipeline · Implementation

> Version은 Generator가 만든 Published Dataset / Package / Manifest를 **식별·교체(Replace)** 하기 위한 Metadata이다.  
> Dataset 의미를 바꾸지 않으며, Search Representation이 아니다.

---

## 1. Version SSOT

### 1.1 역할

| Version은 | Version은 아님 |
|-----------|----------------|
| Published Dataset의 **Metadata** | Search Representation |
| Package / Manifest **위의** 식별·교체용 Metadata | Strategy / Modal |
| Generator Output Build **식별자** | Dataset 의미의 재정의 |
| Atomic Replace의 **식별 대상 중 하나** | EnvelopeRecord 저장소 |

### 1.2 Architecture Chain (배포 계층)

```text
Strategy
    ↓
Generator
    ↓
Published Dataset          ← Search Representation
    ↓
Package                    ← Delivery Unit
    ↓
Manifest                   ← Package/Dataset 설명 메타
    ↓
Version                    ← Build/Replace 식별 메타
    ↓
Search Loader
```

Membership이 소비하는 Search Representation은 여전히 **Published Dataset**이다.  
Version → Manifest → Package는 Loader가 **무엇을 읽을지 식별·확인**하는 계층이다.

### 1.3 원칙

1. Version은 Dataset·Schema·Architecture 의미를 **변경하지 않는다**.  
2. Version을 Dataset **대신** Search에 쓰지 않는다.  
3. Version은 Strategy를 대표하지 않는다.  
4. Version Patch / Incremental / 단독 regenerate를 허용하지 않는다.

---

## 2. Version Identity

| ID | 계약 |
|----|------|
| **VER-ID-01** | Version ↔ Package = **1 : 1** |
| **VER-ID-02** | Package ↔ Manifest = **1 : 1** (Manifest SSOT 유지) |
| **VER-ID-03** | Published Dataset ↔ Package = **1 : 1** (Package SSOT 유지) |
| **VER-ID-04** | 따라서 Version ↔ Manifest ↔ Package ↔ Dataset = **동일 배포 단위에 대한 1:1 사슬** |
| **VER-ID-05** | Version은 Dataset을 **대표하지 않는다** (식별만) |
| **VER-ID-06** | Version은 Strategy를 **대표하지 않는다** |
| **VER-ID-07** | Version은 **Generator Output Build**를 식별한다 |
| **VER-ID-08** | Version은 **Metadata only**이다 |

EnvelopeRecord ↔ Strategy **1:1**은 Dataset Identity이며 Version이 대체하지 않는다.

---

## 3. Version Contents

### 3.1 허용 (논리 메타)

| 허용 | 역할 |
|------|------|
| Version Identity | 이 Build/Replace 단위 식별 |
| Package Identity | 대응 Package |
| Dataset Identity | 대응 Published Dataset |
| Generator Build Identity | Generator 산출 Build 식별 |
| Build Time (Logical) | 생성 시각 메타 |
| Architecture Version Reference | Freeze/Architecture 문서 참조 자리 (포맷 미정) |
| Manifest Reference | 대응 Manifest |
| Package Reference | 대응 Package |
| Dataset Reference | 대응 Dataset |
| Generator Reference | Generator/Build 논리 참조 |

### 3.2 금지

| 금지 |
|------|
| Strategy · Modal |
| EnvelopeRecord · Schema Payload |
| Geometry · Builder Result |
| Ranking · Search Cache · KDTree · Search Result · Interpolation Result |
| Working State · PositionRecord |
| Dataset/Schema/Architecture 재정의 내용 |

---

## 4. Search Contract

```text
Search Loader
  → Version read-only
  → Manifest read-only
  → Package read-only
  → Published Dataset 획득
  → Membership
  → Resolve
  → Strategy
  → Modal
```

| Search/Loader 함 | 안 함 |
|------------------|------|
| Version **read-only** | Version을 Search Representation으로 사용 |
| Manifest / Package read-only | Version **생성·수정** |
| Dataset으로 Membership | Version에서 Modal/Strategy 로드 |
| Resolve 후 Strategy/Modal | Version Patch |

---

## 5. Generator Contract

```text
Strategy Corpus (read) + Sampling Policy
    → Published Dataset 생성
    → Package 생성
    → Manifest 생성
    → Version 생성
    → Atomic Replace (전체 교체)
```

| Generator 함 | Generator 안 함 |
|--------------|-----------------|
| Version **유일 생성자** | Version **Patch** |
| Full regenerate 시 Version **포함 재생성** | **Incremental** Version |
| Dataset+Package+Manifest+Version **일괄 Replace** | Version **단독** regenerate |
| Strategy/Modal write 없음 | EnvelopeRecord를 Version에 저장 |

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
Invalidate Version
    ↓
Generator
    ↓
Dataset → Package → Manifest → Version
    ↓
Atomic Replace
    ↓
Search
```

| 규칙 | |
|------|--|
| Version은 **항상 Manifest와 함께** regenerate된다 |
| Version 단독 갱신 금지 |
| Patch / Incremental 금지 |
| Invalidate는 Dataset → Package → Manifest → Version **연쇄** |

---

## 7. Authority

| Actor | Version Write | Version Read | 비고 |
|-------|---------------|--------------|------|
| **Generator** | **생성 · Regenerate** | Strategy Corpus read | Patch 금지 |
| **Search Loader** | **없음** | **read-only** | Dataset 대체 사용 금지 |
| **Authoring** | **없음** | 검색용 불필요 | Strategy만 수정 |
| **Sampling Policy** | **없음** | — | |
| **Resolve** | **없음** | **사용하지 않음** | Strategy만 |

**새 Authority 주체 없음.** Version Write = Generator only.

---

## 8. Must Have / Must Not Have

### Must Have

- Version Identity  
- Package Reference · Manifest Reference · Dataset Reference  
- Generator Build Identity  
- Architecture Freeze 준수  
- Package 1:1 · Manifest 1:1 · Dataset 1:1 (배포 사슬)

### Must Not Have

- Strategy · Modal · EnvelopeRecord · Geometry  
- Search Result · Patch · Incremental · Working State  
- Version-only regenerate  

---

## 9. Out of Scope

- Version Number Format · Semantic Version  
- Hash · Checksum · Compression  
- Manifest JSON · Directory · Cloud · Database  
- Build Pipeline · Implementation  

---

## 10. Architecture Self Audit

| 검사 | 결과 |
|------|------|
| Architecture Freeze 충돌 | 없음. Search Representation = Dataset 유지. Version = Metadata |
| Published Dataset SSOT | Dataset 의미·Must Not·1:1 Record Identity 불변 |
| Package SSOT | Package = Delivery Unit 유지. Version이 Package를 대체하지 않음 |
| Manifest SSOT | Manifest = 설명 메타 유지. Version은 Build/Replace 식별 메타로 **상위/병행** 식별 계층. Dataset 의미 불변 |
| Generator Authority | Version Write = Generator only · Full regenerate · Patch 금지 → 유지 |
| Search Authority | Version read-only · Dataset으로 Membership → 유지 |
| Lifecycle | Invalidate 연쇄 + Atomic Replace + Manifest와 공동 regenerate → Package/Manifest Lifecycle과 정합 |
| Version = Metadata only? | **예** |
| Dataset 의미 변경? | **아니오** |
| 새 Authority? | **아니오** |

**Self Audit 결론:** Architecture / Schema / Published Dataset / Package / Manifest / Generator / Search / Authority / Lifecycle와 **충돌 없음**. Freeze Compatible.
