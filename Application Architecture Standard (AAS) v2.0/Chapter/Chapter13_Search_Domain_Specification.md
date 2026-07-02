# Chapter13_Search_Domain_Specification.md

# 3Cushion AI Application Architecture SSOT v2.0

# Part IV. Domain Layer
# Chapter 13. Search Domain Specification

Version: v2.0
Status: Draft SSOT
Owner: 3Cushion AI Architecture

Depends on:

- Architecture_Constitution.md
- Chapter04_Application_Runtime_Model_Specification.md
- Chapter09_Domain_Architecture.md
- Chapter10_Calculation_Domain_Specification.md
- Chapter12_Dataset_Domain_Specification.md

---

# 1. Purpose

본 Chapter는 Search Domain의 공식 역할과 구조를 정의한다.

Search Domain은 사용자의 입력 조건을 기반으로 Dataset에서 적합한 후보를 탐색하고,
평가·정렬하여 최적의 결과를 반환하는 순수 Domain이다.

핵심 원칙은 다음과 같다.

> Search Domain은 "무엇을 찾을 것인가"를 계산하며,
> UI와 Runtime을 알지 않는다.

---

# 2. Responsibilities

Search Domain의 책임

- Search Request 해석
- Candidate 생성
- Filtering
- Similarity 계산
- Ranking
- Threshold 적용
- Recall 후보 생성
- SearchResult 생성

수행하지 않는 작업

- UI 표시
- Event 처리
- Runtime 제어
- Dataset 저장
- React Component 접근

---

# 3. Position

```text
Application Flow
        │
        ▼
Search Domain
        │
        ▼
Canonical Dataset
        │
        ▼
Search Result
```

Search Domain은 Dataset Domain이 제공하는 Canonical Dataset을 소비한다.

---

# 4. Standard Structure

```text
domain/search/

request/
candidate/
filter/
matching/
similarity/
ranking/
threshold/
recall/
validation/
shared/
```

각 모듈은 단일 책임 원칙(SRP)을 따른다.

---

# 5. Search Pipeline

```text
Search Request
        │
        ▼
Validation
        │
        ▼
Candidate Generation
        │
        ▼
Filtering
        │
        ▼
Similarity Evaluation
        │
        ▼
Ranking
        │
        ▼
Threshold Evaluation
        │
        ▼
Search Result
```

Pipeline의 각 단계는 독립적으로 테스트 가능해야 한다.

---

# 6. Candidate Generation

Candidate Generator의 책임

- 검색 범위 결정
- Dataset 탐색
- 초기 후보 생성
- Candidate Metadata 구성

Candidate는 아직 정렬되지 않은 상태이다.

---

# 7. Matching & Similarity

Matching은 검색 조건 충족 여부를 판단한다.

Similarity Engine은 다음 요소를 평가할 수 있다.

- System Value
- Position
- Rail Pattern
- Shot Type
- User Condition

Similarity 계산 방식은 Search Domain 내부 규칙으로 관리한다.

---

# 8. Ranking & Threshold

Ranking Engine의 책임

- Candidate Score 계산
- 우선순위 정렬
- 동일 점수 처리
- 최종 순위 생성

Threshold Engine의 책임

- 최소 점수 적용
- 결과 제외
- 후보 수 제한

---

# 9. Recall Integration

Search Domain은 Recall 기능과 협력한다.

```text
Search
    │
    ├─ Exact Match
    ├─ Similar Match
    └─ Recall Candidate
```

Recall은 별도의 Domain으로 확장 가능하지만,
Search Domain은 Recall 후보를 생성할 수 있어야 한다.

---

# 10. Result Model

표준 결과

```ts
type SearchResult = {

    candidates

    ranking

    selected

    threshold

    metadata

}
```

SearchResult는 UI ViewModel이 아니다.

---

# 11. Dependency Rule

Search Domain은 참조 가능

- Dataset Domain
- Calculation Domain
- Shared Domain
- System Definition

참조 금지

- React
- Runtime
- Dispatcher
- Flow
- Loader
- localStorage

---

# 12. Testing Rule

모든 Search는 단위 테스트 가능해야 한다.

입력

- Search Request
- Canonical Dataset
- System Definition

출력

- SearchResult

동일 입력은 항상 동일한 결과를 생성해야 한다.

---

# 13. Success Criteria

Search Domain은 다음을 만족해야 한다.

- Candidate 생성과 Ranking이 분리된다.
- Threshold 규칙이 독립적이다.
- Dataset 구조와 UI에 의존하지 않는다.
- 모든 시스템에서 공통으로 사용된다.
- Recall 확장이 가능하다.

---

# 14. Future Extension

향후 확장 대상

- AI Ranking
- Semantic Search
- Multi-Dataset Search
- Personal Search Profile
- Learning-based Ranking

기존 Search Pipeline을 변경하지 않고 확장 가능해야 한다.

---

# 15. Final Assessment

Search Domain은 3Cushion AI의 공통 검색 엔진이다.

Application Layer는 검색 흐름을 제어하고,
Dataset Domain은 데이터를 제공하며,
Search Domain은 후보 생성, 유사도 평가, 순위 결정이라는 핵심 검색 로직을 담당한다.

이를 통해 새로운 검색 전략이 추가되더라도 Application과 UI를 수정하지 않고 확장할 수 있다.

---

# Revision History

## v2.0

- Initial Search Domain Specification
- Candidate / Matching / Ranking architecture defined
- Search Pipeline standardized
