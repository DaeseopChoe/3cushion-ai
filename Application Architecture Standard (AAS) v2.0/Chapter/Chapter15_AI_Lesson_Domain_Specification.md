# Chapter15_AI_Lesson_Domain_Specification.md

# 3Cushion AI Application Architecture SSOT v2.0

# Part IV. Domain Layer
# Chapter 15. AI & Lesson Domain Specification

Version: v2.0
Status: Draft SSOT
Owner: 3Cushion AI Architecture

Depends on:

- Architecture_Constitution.md
- Chapter09_Domain_Architecture.md
- Chapter10_Calculation_Domain_Specification.md
- Chapter11_Trajectory_Domain_Specification.md
- Chapter12_Dataset_Domain_Specification.md
- Chapter13_Search_Domain_Specification.md
- Chapter14_History_Domain_Specification.md

---

# 1. Purpose

본 Chapter는 AI & Lesson Domain의 공식 역할과 구조를 정의한다.

AI & Lesson Domain은 Calculation, Trajectory, Search 등의 Domain 결과를 해석하여
사용자에게 설명, 전략, 학습 정보를 제공하는 순수 Domain 계층이다.

핵심 원칙은 다음과 같다.

> AI & Lesson Domain은 계산 결과를 해석하지만, 계산 자체를 변경하지 않는다.

---

# 2. Responsibilities

AI & Lesson Domain의 책임

- Lesson 생성
- One Point Lesson 생성
- Strategy Recommendation
- AI Comment 생성
- Explanation 생성
- Hint 생성
- ViewModel 생성

수행하지 않는 작업

- Formula 계산
- Trajectory 계산
- Search 수행
- React Rendering
- Runtime 제어
- 외부 AI API 직접 호출

---

# 3. Position

```text
Application Flow
        │
        ▼
AI & Lesson Domain
        │
        ▼
Calculation / Trajectory / Search Result
        │
        ▼
Lesson Result
```

AI & Lesson Domain은 기존 Domain의 결과를 소비하여 해석 정보를 생성한다.

---

# 4. Standard Structure

```text
domain/ai/

lesson/
strategy/
comment/
hint/
explanation/
viewmodel/
prompt/
validation/
shared/
```

각 모듈은 단일 책임 원칙(SRP)을 따른다.

---

# 5. Lesson Pipeline

```text
Domain Result
        │
        ▼
Context Analysis
        │
        ▼
Lesson Generation
        │
        ▼
Strategy Recommendation
        │
        ▼
Comment Generation
        │
        ▼
Lesson Result
```

Pipeline 각 단계는 독립적으로 테스트 가능해야 한다.

---

# 6. Lesson Model

Lesson은 학습 정보를 제공하는 표준 모델이다.

구성 예시

- Title
- Summary
- Key Point
- Explanation
- Recommendation
- Difficulty
- Metadata

Lesson은 UI Component가 아니다.

---

# 7. Strategy Recommendation

Strategy Engine의 책임

- 선택 가능한 전략 제안
- 장단점 설명
- 대안 제시
- 위험 요소 안내

Strategy는 계산 결과를 변경하지 않는다.

---

# 8. AI Comment

AI Comment의 책임

- 계산 결과 설명
- Trajectory 해설
- 검색 결과 해석
- 사용자 친화적 문장 생성

AI Comment는 Domain Result를 기반으로 생성된다.

---

# 9. ViewModel

AI & Lesson Domain은 표시를 위한 ViewModel을 생성할 수 있다.

허용

- Display Model
- Ordered Sections
- Highlight 정보

금지

- React Component
- Canvas Drawing
- HTML 생성

---

# 10. Dependency Rule

AI & Lesson Domain은 참조 가능

- Calculation Domain
- Trajectory Domain
- Search Domain
- Dataset Domain
- Shared Domain

참조 금지

- React
- Runtime
- Dispatcher
- Loader
- Infrastructure

외부 AI 서비스 연동은 Infrastructure Adapter를 통해 수행한다.

---

# 11. Testing Rule

입력

- Domain Result
- System Definition
- Lesson Context

출력

- Lesson Result
- Strategy Result
- AI Comment

동일 입력은 동일한 구조의 결과를 생성해야 한다.

---

# 12. Future Extension

향후 확장 대상

- LLM 기반 설명 생성
- Personalized Lesson
- Adaptive Difficulty
- Coaching Session
- Multi-language Lesson

기존 Domain 구조를 변경하지 않고 확장 가능해야 한다.

---

# 13. Success Criteria

AI & Lesson Domain은 다음을 만족해야 한다.

- 계산과 설명을 분리한다.
- Domain 결과를 해석한다.
- UI와 Runtime에 의존하지 않는다.
- 외부 AI 서비스와 결합되지 않는다.
- 모든 시스템에서 재사용 가능하다.

---

# 14. Final Assessment

AI & Lesson Domain은 3Cushion AI의 지식 해석 계층이다.

Calculation Domain은 값을 계산하고,
Trajectory Domain은 경로를 생성하며,
Search Domain은 후보를 탐색한다.

AI & Lesson Domain은 이러한 결과를 사용자가 이해하고 학습할 수 있는 형태로 변환한다.

이를 통해 AI 기능과 학습 기능을 계산 엔진으로부터 독립적으로 발전시킬 수 있다.

---

# Revision History

## v2.0

- Initial AI & Lesson Domain Specification
- Lesson / Strategy / Comment architecture defined
- AI interpretation layer standardized
