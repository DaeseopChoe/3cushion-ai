# Published Envelope Dataset Package SSOT (Physical Packaging Design)

**Document:** PACKAGE_SSOT.md  
**Status:** Architecture Freeze Compatible  
**Parent:** `ENVELOPE_ARCHITECTURE_SSOT.md`  
**Depends on:** `ENVELOPE_DATASET_SCHEMA_SSOT.md` · `PUBLISHED_DATASET_SSOT.md`  
**Scope:** Physical Package Design · Logical Storage Packaging · Generator Output Package · Search Loader Contract · Regenerate Replace Policy  
**Non-goals:** JSON · 파일명 · Directory 구현 · Version 알고리즘 · Manifest Schema · Compression · DB · Index · Search Algorithm · Code

> Package는 Published Dataset을 **감싸 전달하는 단위**일 뿐, Dataset·Schema·Architecture의 의미를 바꾸지 않는다.

---

## 1. Published Dataset Package SSOT

### 1.1 정의

**Published Envelope Dataset Package**는 Published Envelope Dataset의 **물리적 배포 단위(Physical Delivery Unit)** 이다.

```text
Published Envelope Dataset          ← Search Representation (논리)
        ↓ packaging
Published Envelope Dataset Package  ← 생성 · 배포 · 교체 단위
        ↓
Search Loader
        ↓ unpack / obtain
Published Envelope Dataset          ← Membership에 사용 (의미 불변)
```

| Package는 | Package는 아님 |
|-----------|----------------|
| Generator Output | Authoring 대상 |
| Search Input (Loader가 읽는 단위) | Strategy / Modal 저장소 |
| Search Representation **Delivery Unit** | Dataset 의미의 재정의 |
| Full Replace의 교체 단위 | Patch / Incremental 단위 |

### 1.2 원칙

1. Package는 Dataset을 **포함·전달**한다. Dataset 필드·Identity·Authority를 변경하지 않는다.  
2. Architecture Chain에서 Package는 Generator 출력과 Search Loader 입력 **사이**에만 위치한다.  
3. Search Membership이 소비하는 것은 여전히 **Published Envelope Dataset**이다. Package는 그 Dataset을 싣는 상자다.

---

## 2. Package Identity

```text
하나의 Published Strategy Corpus
        ↓ Generator
하나의 Published Dataset Package
```

| ID | 계약 |
|----|------|
| **PKG-ID-01** | Package는 **하나의** Published Envelope Dataset을 포함한다 |
| **PKG-ID-02** | Package는 Strategy를 포함하지 않는다 |
| **PKG-ID-03** | Package는 Modal을 포함하지 않는다 |
| **PKG-ID-04** | Package는 **Generator Output**이다 |
| **PKG-ID-05** | Strategy Corpus(해당 배포 범위) ↔ Package는 **1:1 배포 계약** (한 Corpus 산출물 = 한 Package) |
| **PKG-ID-06** | Package Identity ≠ Strategy Identity ≠ EnvelopeRecord Identity. Record의 Strategy 1:1은 Dataset SSOT 계약을 **그대로 유지** |

Package를 쪼개 Strategy별로 배포 단위를 나누는 설계는 본 SSOT 범위에서 **정의하지 않으며**, Identity 계약은 “Corpus → 하나의 Package”이다. (파일 분할 구현은 Out of Scope.)

---

## 3. Package Contents

### 3.1 반드시 포함 (Payload)

| 포함 | 설명 |
|------|------|
| **Published Envelope Dataset** | EnvelopeRecord[] |
| **각 EnvelopeRecord** | Schema Required: `strategyRef`, `target`, `cueSet`, `secondSet` |
| **Identity 1:1** | Dataset SSOT Identity Rule 만족 상태의 Dataset |

### 3.2 포함 가능 (논리 메타 — 선택)

물리 포맷·스키마는 정하지 않는다. Package가 **논리적으로 참조·부착할 수 있는** 메타만 허용한다.

| 허용 메타 (논리) | 용도 |
|------------------|------|
| Dataset Identity | 이 Package가 싣는 Dataset 식별 |
| Package Identity | 배포 단위 식별 |
| Generator Build 정보 | 재생성·추적용 (논리 수준) |
| Version 참조 | 후속 Version Mission용 자리 · 알고리즘 미정 |
| Manifest 참조 | 후속 Manifest Mission용 자리 · Schema 미정 |

메타는 Modal·Strategy·Search 결과를 대신하지 않는다.

### 3.3 금지 (Package 내부)

| 금지 | |
|------|--|
| Strategy / Modal | |
| Working Data | |
| PositionRecord | |
| Builder Result (pathNodes 등 raw) | |
| Search Cache | |
| KDTree / Spatial Index | |
| Ranking / Interpolation 결과 | |
| Cartesian Pair | |
| Geometry Raw | |
| Schema Required 외 Dataset 계약 Field 확장 | |
| EnvelopeRecord in-place 편집본을 Authoring으로 보관 | |

---

## 4. Loader Contract

**Search Loader**는 Package를 읽어 Published Dataset을 Search Runtime에 공급하는 계약 주체다.

```text
Package
  → Search Loader (read Package only)
  → obtain Published Envelope Dataset
  → Search Runtime
       → Membership (target / cueSet / secondSet)
       → strategyRef
       → Resolve
       → Strategy Load
       → Modal Load
```

| Loader 함 | Loader 안 함 |
|-----------|--------------|
| Package **만** 읽는다 | Strategy를 Package/검색 단계에서 직접 읽지 않음 |
| Package에서 Published Dataset **획득** | Authoring DB 접근 안 함 |
| Dataset을 Search Runtime에 **전달** | Package **수정** 안 함 |
| (이후 Runtime이 Membership→Resolve) | Dataset Field 패치 · Package 재작성 안 함 |

Loader는 Generator가 아니다. Package Producer가 아니다.

---

## 5. Generator Contract

```text
Strategy Corpus (read-only)
  + Sampling Policy
        ↓
  Published Envelope Dataset 생성
        ↓
  Package 생성 (Dataset 포함)
        ↓
  Package Replace (전체 교체)
```

| Generator 함 | Generator 안 함 |
|--------------|-----------------|
| Dataset 생성 (Schema 준수) | Package **patch** |
| Package 생성 | **Incremental** update |
| **Full Package regenerate** 후 replace | Strategy/Modal write |
| 이전 Package를 권위 있는 입력으로 편집 | Index/Cache를 Package에 넣음 |

Generator는 Package의 **유일 생성자**이며, 갱신 수단은 **Full Package Regenerate + Replace**뿐이다.

---

## 6. Lifecycle

```text
Strategy 변경 (Authoring)
        ↓
Invalidate Package          ← 기존 Package stale
        ↓
Generator
        ↓
새 Package 생성             ← Full regenerate (Dataset + packaging)
        ↓
Package Replace             ← Atomic Replace (논리 개념)
        ↓
Search Loader 사용          ← 새 Package만 권위
```

| 규칙 | |
|------|--|
| **Package Patch 금지** | Field·Record·메타만 골라 고치지 않음 |
| **Partial Replace 금지** | Package 일부만 교체하여 혼합 corpus 만들지 않음 |
| **Atomic Replace** | 논리적으로 “이전 Package 전체 ↔ 새 Package 전체” 교체. 트랜잭션 구현은 Out of Scope |
| Dataset Identity 1:1 | Replace 전후 모두 Published Dataset SSOT Identity 유지 |

---

## 7. Authority

| Actor | Package Write | Package Read | 비고 |
|-------|---------------|--------------|------|
| **Authoring** | **없음** | 검색용 Package 읽기 권한 불필요 | Strategy만 수정 · Invalidate 트리거 |
| **Generator** | **유일 생성·Replace** | Strategy Corpus read | Patch 금지 |
| **Search / Loader** | **없음** | **Package read-only** | Dataset 획득 후 Membership |
| **Sampling Policy** | **없음** | Generator에 Rule로 적용 | |
| **Resolve** | **없음** | Package 안 읽지 않음 · Strategy만 | Membership 이후 |

**새 Authority 주체 없음.** Package Write = Generator only. Package Search Read = Loader/Search only.

---

## 8. Must Have / Must Not Have

### Must Have

- Package 안에 **Published Envelope Dataset** 포함  
- Dataset = Schema Required Field를 갖춘 EnvelopeRecord[]  
- **Generator Output**  
- **Search Input** (Loader 계약)  
- **Replace 대상** (Full Package)  
- **Architecture Freeze** · Dataset Identity 1:1 · Schema Must Have 준수  

### Must Not Have

- Strategy · Modal  
- Schema 변경 / Record 의미 변경  
- Record·Dataset **in-place 수정**을 Package 생명주기로 허용  
- Search 결과 · Ranking · Index 저장  
- Geometry Raw · Working 상태  
- Package Patch / Incremental / Partial Replace  

---

## 9. Out of Scope

- JSON 구조 · Manifest Schema · Version Format  
- Directory Layout · 파일명 · Compression  
- DB · Cloud · Incremental Update · Patch Format  
- Index · KDTree · Hash · Search Algorithm  
- Membership 수치식 · Ranking · Interpolation  
- Generator/Loader **코드 구현**  

---

## 10. Self Audit

| 검사 | 결과 |
|------|------|
| Architecture Freeze 충돌 | 없음. Chain에 Package는 Delivery만 추가. Dataset/Search/Resolve 의미 불변 |
| Published Dataset SSOT | Dataset = EnvelopeRecord 집합 · Generator Output · Search Representation 유지. Package가 이를 대체하지 않음 |
| Schema SSOT | Payload Field = 4 Required only. Schema 확장 없음 |
| Package가 Dataset 의미 변경? | **아니오.** Packaging only |
| Generator만 Package 생성? | **예.** Authority §7 |
| Search는 Package만 읽나? | **예** (Loader). Membership은 획득한 Dataset 사용 |
| Package Patch 허용? | **아니오** |
| Full Replace Lifecycle? | **예.** Invalidate → Full regenerate → Atomic Replace |
| Modal/Strategy in Package? | **아니오** (Contents 금지) |
| 새 Authority? | **아니오.** Writer=Generator, Reader=Search/Loader |

**Self Audit 결론:** Architecture / Schema / Published Dataset / Generator / Search / Authority / Lifecycle와 **충돌 없음**. Freeze Compatible.
