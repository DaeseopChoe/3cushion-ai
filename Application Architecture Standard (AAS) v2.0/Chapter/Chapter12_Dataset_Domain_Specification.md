# Chapter12_Dataset_Domain_Specification.md

# 3Cushion AI Application Architecture SSOT v2.0

# Part IV. Domain Layer
# Chapter 12. Dataset Domain Specification

Version: v2.0
Status: Draft SSOT
Owner: 3Cushion AI Architecture

Depends on:

- Architecture_Constitution.md
- Chapter04_Application_Runtime_Model_Specification.md
- Chapter09_Domain_Architecture.md

---

# 1. Purpose

본 Chapter는 Dataset Domain의 공식 역할과 구조를 정의한다.

Dataset Domain은 3Cushion AI의 모든 데이터셋을 일관된 형식으로 관리하는
순수 Domain 계층이다.

핵심 원칙은 다음과 같다.

> Dataset Domain은 데이터를 관리하지만,
> 데이터를 저장하거나 화면에 표시하지 않는다.

---

# 2. Responsibilities

Dataset Domain의 책임

- Dataset Model 관리
- Dataset Merge
- Canonicalization
- Normalization
- Validation
- Diff 생성
- Import / Export 모델 생성
- Version Metadata 관리

수행하지 않는 작업

- localStorage 접근
- fetch 호출
- 파일 저장
- UI Rendering
- Runtime 제어

---

# 3. Position

```text
Application Flow
        │
        ▼
Dataset Domain
        │
        ▼
Dataset Model
        │
        ▼
Infrastructure Adapter
```

Dataset Domain은 저장(Storage)을 알지 않는다.

---

# 4. Standard Structure

```text
domain/dataset/

model/
merge/
normalize/
canonical/
validation/
diff/
import/
export/
version/
shared/
```

각 모듈은 하나의 책임만 가진다.

---

# 5. Dataset Types

지원 대상

- Published Dataset
- Local Dataset
- Sample Dataset
- Working Dataset
- Temporary Dataset

모든 Dataset은 동일한 Domain Model을 사용한다.

---

# 6. Canonical Model

Dataset Domain은 Canonical Model을 기준으로 동작한다.

```text
Raw Dataset
      │
      ▼
Normalization
      │
      ▼
Canonical Dataset
      │
      ▼
Merge / Diff / Export
```

Application은 Canonical Dataset만 사용한다.

---

# 7. Merge Rule

Merge는 다음 원칙을 따른다.

- 동일 Entry 식별
- Version 유지
- Metadata 보존
- 충돌 감지
- Merge Result 반환

Merge 과정에서 UI 상태는 포함하지 않는다.

---

# 8. Validation

Validation 항목

- Schema
- Required Field
- Duplicate Entry
- Invalid Coordinate
- Invalid SystemId
- Version Compatibility

Validation 실패 시 DatasetError를 반환한다.

---

# 9. Import / Export

Import

- 외부 Dataset → Canonical Dataset

Export

- Canonical Dataset → 외부 포맷

Import와 Export는 역변환 가능해야 한다.

---

# 10. Dependency Rule

Dataset Domain은 참조 가능

- Shared Domain
- Dataset Schema
- System Definition

참조 금지

- React
- Runtime
- Flow
- Dispatcher
- localStorage
- fetch

외부 저장은 Infrastructure Adapter를 통해 수행한다.

---

# 11. Testing Rule

Dataset Domain은 순수 함수 형태로 테스트 가능해야 한다.

입력

- Dataset
- Merge Target
- Version

출력

- Canonical Dataset
- Merge Result
- Validation Result

동일 입력은 항상 동일 결과를 생성해야 한다.

---

# 12. Success Criteria

Dataset Domain은 다음을 만족해야 한다.

- Canonical Dataset을 유지한다.
- Merge와 Storage를 분리한다.
- Import/Export를 표준화한다.
- UI와 Runtime에 의존하지 않는다.
- 모든 시스템에서 재사용 가능하다.

---

# 13. Future Extension

향후 지원 대상

- Cloud Dataset
- Team Workspace
- Version History
- Conflict Resolution
- Incremental Sync

기존 Domain 구조를 변경하지 않고 확장 가능해야 한다.

---

# 14. Final Assessment

Dataset Domain은 3Cushion AI의 데이터 표준 계층이다.

Application Layer는 Dataset을 요청하고,
Dataset Domain은 데이터를 정규화·병합·검증하며,
Infrastructure는 실제 저장을 담당한다.

이를 통해 데이터 구조와 저장 방식을 완전히 분리할 수 있다.

---

# Revision History

## v2.0

- Initial Dataset Domain Specification
- Canonical Dataset architecture defined
- Merge / Validation / Import / Export standardized
