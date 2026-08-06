# Search Loader SSOT (Search Loader Architecture)

**Document:** SEARCH_LOADER_SSOT.md  
**Status:** Architecture Design Draft · Architecture Freeze Compatible  
**Parent:** `ENVELOPE_ARCHITECTURE_SSOT.md`  
**Depends on:** `ENVELOPE_DATASET_SCHEMA_SSOT.md` · `PUBLISHED_DATASET_SSOT.md` · `PACKAGE_SSOT.md` · `MANIFEST_SSOT.md` · `VERSION_SSOT.md`  
**Scope:** Search Loader Architecture · Identity · Authority · Read Contract · Lifecycle · Search Runtime 연결  
**Non-goals:** Loader 구현 · Package/Manifest/Version Format · JSON · Directory · Compression · Cloud · Checksum · DB · Cache · KDTree · Ranking · Implementation

> Search Loader는 Package / Manifest / Version을 확인하여 **Published Envelope Dataset을 Search Runtime에 공급하는 Reader**이다.  
> Search Algorithm · Membership · Resolve · Generator가 아니다.

---

## 1. Search Loader SSOT

### 1.1 역할

| Search Loader는 | Search Loader는 아님 |
|-----------------|---------------------|
| Package를 **읽는다** | Generator |
| Manifest를 **읽는다** | Search Runtime |
| Version을 **읽는다** | Membership |
| Published Envelope Dataset을 Runtime에 **공급**한다 | Resolve |
| Search Runtime의 **입력 계층** | Search Algorithm |
| | Ranking / Interpolation / Geometry 처리 |

**Search Representation은 여전히 Published Dataset이다.**  
Loader는 Representation을 생성·변경하지 않고 **전달**만 한다.

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
Search Loader              ← Reader / Dataset Provider
    ↓
Published Dataset 획득
    ↓
Search Runtime
    ↓
Membership
    ↓
Resolve
    ↓
Strategy
    ↓
Modal
```

---

## 2. Loader Identity

| ID | 계약 |
|----|------|
| **SL-ID-01** | Search Loader = **Reader** |
| **SL-ID-02** | Package Reader · Manifest Reader · Version Reader |
| **SL-ID-03** | **Dataset Provider** (Runtime에 Published Dataset 공급) |
| **SL-ID-04** | Search Representation **생성자가 아니다** |
| **SL-ID-05** | Published Dataset 의미를 **변경하지 않는다** |
| **SL-ID-06** | Writer가 아니다 (Package/Manifest/Version/Dataset write 없음) |

---

## 3. Loader Inputs

### 3.1 읽는 대상

| 대상 | 용도 |
|------|------|
| Version | Build/Replace 식별 · 확인 |
| Manifest | Package/Dataset 안내 · 확인 |
| Package | Delivery Unit 획득 |
| Published Dataset | Package에서 획득 후 Runtime 공급 |

### 3.2 읽지 않는 대상

| 금지 읽기 (Loader 단계) |
|-------------------------|
| Strategy · Modal |
| Authoring DB · Working Dataset |
| EnvelopeRecord 수정본 (Authoring 패치) |
| Search Cache · Builder Result · Geometry |
| KDTree · Ranking |

Strategy/Modal은 **Resolve 이후 · Search Runtime 경로**에서만 읽힌다. Loader가 직접 Load하지 않는다.

---

## 4. Loader Contract

```text
Version 확인
    ↓
Manifest 확인
    ↓
Package 획득
    ↓
Published Dataset 획득
    ↓
Search Runtime에 전달
```

| Loader 함 | Loader 금지 |
|-----------|-------------|
| Version / Manifest / Package **read-only** | Dataset **수정** |
| Dataset **획득·전달** | Package / Manifest / Version **수정** |
| 최신 Replace된 Package만 공급 | Strategy **직접 Load** |
| | **Membership** 수행 |
| | **Resolve** 수행 |
| | Patch / Incremental 적용 |

확인의 수치·포맷·실패 정책은 Out of Scope. 계약은 “확인 후 Dataset 공급”의 **논리 순서**만 고정한다.

---

## 5. Search Runtime Contract

Search Runtime은 Loader가 공급한 **Published Dataset만** Search Representation으로 사용한다.

```text
Published Dataset (from Loader)
    → Membership
    → Resolve
    → Strategy
    → Modal
```

| Runtime 함 | Runtime 안 함 |
|------------|---------------|
| Loader 공급 Dataset으로 Membership | Loader **우회** |
| Membership 통과 후 Resolve | Package **직접** 읽기 |
| Resolve 후 Strategy / Modal | Manifest **직접** 읽기 |
| | Version을 Search Representation으로 **직접** 사용 |

Package / Manifest / Version은 **Loader 전용 입력 계층**이다. Runtime의 Membership 입력은 Dataset Field(`target` / `cueSet` / `secondSet`)뿐이다.

---

## 6. Lifecycle

```text
Strategy 변경
    ↓
Invalidate Dataset → Package → Manifest → Version
    ↓
Generator
    ↓
Dataset → Package → Manifest → Version
    ↓
Atomic Replace
    ↓
Search Loader          ← 최신 Replace된 Package만 공급
    ↓
Search Runtime
    ↓
Membership → Resolve → Strategy → Modal
```

| 규칙 | |
|------|--|
| Loader는 **항상 최신 Replace된 Package**만 권위 있는 입력으로 공급한다 |
| stale Package/Manifest/Version을 권위 입력으로 쓰지 않는다 (Invalidate 이후) |
| Loader는 Regenerate를 수행하지 않는다 (Generator 영역) |

---

## 7. Authority

| Actor | Write | Read / Consume | 비고 |
|-------|-------|----------------|------|
| **Generator** | Dataset · Package · Manifest · Version | Strategy Corpus | 유일 Producer |
| **Search Loader** | **없음** | Version · Manifest · Package · Dataset (read) | Reader / Provider only |
| **Search Runtime** | **없음** | Loader 공급 **Dataset only** | Membership → Resolve |
| **Authoring** | Strategy only · Loader write **없음** | — | |
| **Resolve** | **없음** | Strategy (Membership 후) · **Loader bypass 없음** | |
| **Sampling Policy** | Loader write **없음** | — | |

**새로운 Authority 주체를 추가하지 않는다.**  
Loader Write = 없음. Loader = Read-only.

---

## 8. Must Have / Must Not Have

### Must Have

- Package Reader · Manifest Reader · Version Reader  
- Dataset Provider  
- **Read only**  
- Architecture Freeze 준수  
- Runtime에는 **Published Dataset만** 공급  

### Must Not Have

- Strategy Write · Dataset Write  
- Package / Manifest / Version Patch  
- Membership · Resolve · Search Algorithm  
- Ranking · KDTree · Interpolation · Geometry 처리  

---

## 9. Out of Scope

- Loader 구현  
- Package / Manifest / Version Format · JSON · Directory  
- Compression · Cloud · Checksum · Database · Cache  
- KDTree · Ranking · Implementation  

---

## 10. Architecture Self Audit

| 검사 | 결과 |
|------|------|
| Architecture Freeze | 충돌 없음. Search Representation = Dataset. Loader는 공급 계층만 |
| Published Dataset SSOT | Dataset 의미·Must Not·1:1 Identity 불변. Loader가 변경하지 않음 |
| Package SSOT | Loader = Package Reader. Package Write = Generator only 유지 |
| Manifest SSOT | Manifest read-only · Dataset 대체 사용 금지 유지 |
| Version SSOT | Version read-only · Search Representation 아님 유지 |
| Generator Authority | Producer = Generator only. Loader는 생성하지 않음 → 유지 |
| Search Authority | Runtime = Dataset consume · Membership/Resolve는 Runtime → 유지 |
| Loader가 Representation 변경? | **아니오** |
| Loader가 Membership 수행? | **아니오** |
| Loader가 Resolve 수행? | **아니오** |
| 새 Authority? | **아니오** (Read-only Reader만 명시) |

**Self Audit 결론:** Architecture / Schema / Dataset / Package / Manifest / Version / Generator / Search Runtime과 **충돌 없음**. Freeze Compatible.
