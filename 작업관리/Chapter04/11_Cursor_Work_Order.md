# 11_Cursor_Work_Order.md

# 3Cushion AI Application Architecture SSOT v2.0

# Chapter 04-11

# Cursor Work Order

Version: v2.0 Status: Draft SSOT Owner: 3Cushion AI Architecture

------------------------------------------------------------------------

# 1. Purpose

본 문서는 Cursor를 이용하여 Application Runtime Architecture를 구현할 때
따라야 하는 공식 작업 절차를 정의한다.

모든 구현은 Architecture SSOT를 기준으로 수행하며, 분석과 구현을 명확히
구분한다.

------------------------------------------------------------------------

# 2. Fundamental Rules

-   Architecture SSOT를 최우선 기준으로 한다.
-   App.jsx는 Orchestrator를 유지한다.
-   Layer Dependency Rule을 위반하지 않는다.
-   Runtime Core를 우회하지 않는다.
-   System-specific Logic을 Runtime에 추가하지 않는다.

------------------------------------------------------------------------

# 3. Cursor Mode Policy

## Analysis / Design

다음 작업은 반드시 Ask Mode를 사용한다.

``` text
[Cursor Mode: Ask]
```

대상

-   영향 범위 분석
-   설계 검토
-   수정 파일 식별
-   Git 상태 확인
-   리팩터링 계획 수립

------------------------------------------------------------------------

## Implementation

실제 구현은 반드시 Agent Mode를 사용한다.

``` text
[Cursor Mode: Agent]
```

대상

-   코드 수정
-   파일 생성
-   리팩터링
-   Commit
-   Push

------------------------------------------------------------------------

# 4. Standard Workflow

``` text
Architecture Review
        │
        ▼
Ask Mode
        │
        ▼
Impact Analysis
        │
        ▼
Agent Mode
        │
        ▼
Implementation
        │
        ▼
Build
        │
        ▼
Regression Test
        │
        ▼
Commit
```

------------------------------------------------------------------------

# 5. Standard Ask Template

``` text
[Cursor Mode: Ask]

Review the impact of this change.

Requirements:
- Identify affected files.
- Verify Layer Dependency.
- Verify Architecture Constitution compliance.
- Do not modify code.
```

------------------------------------------------------------------------

# 6. Standard Agent Template

``` text
[Cursor Mode: Agent]

Implement the approved Runtime Architecture.

Requirements:
- Follow Architecture SSOT.
- Preserve existing behavior.
- Keep App.jsx as Orchestrator.
- Do not introduce system-specific branches.
- Run regression before completion.
```

------------------------------------------------------------------------

# 7. Acceptance Rules

Run / Accept 요청 시

-   위험 요소가 없으면
    -   Run
    -   Accept

만 응답한다.

예외

-   데이터 손실 가능성
-   대규모 구조 변경
-   SSOT 위반 가능성
-   의도와 다른 변경 가능성

------------------------------------------------------------------------

# 8. Prohibited Actions

금지 사항

-   SSOT 없는 구현
-   App.jsx에 계산 추가
-   Domain Logic을 UI로 이동
-   Runtime 우회
-   Layer 역참조
-   System별 분기 추가

------------------------------------------------------------------------

# 9. Completion Criteria

작업 완료 조건

-   Build 성공
-   Regression 통과
-   Architecture SSOT 준수
-   Dependency Rule 준수
-   App.jsx 역할 유지

------------------------------------------------------------------------

# Revision History

## v2.0

-   Initial Cursor Work Order
-   Ask / Agent workflow standardized
