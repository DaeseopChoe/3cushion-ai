# 12_Regression_Checklist.md

# 3Cushion AI Application Architecture SSOT v2.0

# Chapter 04-12

# Regression Checklist

Version: v2.0 Status: Draft SSOT Owner: 3Cushion AI Architecture

------------------------------------------------------------------------

# 1. Purpose

본 문서는 Application Runtime Architecture 적용 후 기능
회귀(Regression)를 방지하기 위한 공식 검증 기준을 정의한다.

모든 Runtime 변경은 본 Checklist를 통과해야 완료된 것으로 간주한다.

------------------------------------------------------------------------

# 2. Verification Principles

-   Build 성공은 필수이다.
-   기능 추가는 기존 기능을 변경해서는 안 된다.
-   모든 검증은 Architecture SSOT를 기준으로 수행한다.
-   새로운 기능보다 기존 기능의 안정성을 우선한다.

------------------------------------------------------------------------

# 3. Build Verification

필수 항목

-   Build 성공
-   Runtime Boot 성공
-   Console Error 없음
-   Fatal Exception 없음

------------------------------------------------------------------------

# 4. Functional Regression

## USER

-   USER Search 정상
-   USER Lesson 정상
-   USER Trajectory 정상

## ADMIN

-   ADMIN Search 정상
-   ADMIN Recall 정상
-   ADMIN Save 정상
-   ADMIN Local DB 정상

------------------------------------------------------------------------

# 5. Runtime Verification

-   Dispatcher 동작
-   Coordinator 동작
-   Flow Routing
-   Loader 동작
-   Runtime Context 유지
-   Runtime Lifecycle 정상

------------------------------------------------------------------------

# 6. System Verification

-   System Loader 정상
-   profile.json 로드
-   logic.json 로드
-   anchors.json 로드
-   system_meta.json 로드
-   systemId 변경 정상

------------------------------------------------------------------------

# 7. Dataset Verification

-   Published Dataset Loader 정상
-   Local Dataset 정상
-   Dataset Fetch URL 정상
-   Dataset Merge 영향 없음

------------------------------------------------------------------------

# 8. UI Verification

-   Overlay 정상
-   Dialog 정상
-   Slot 변경 정상
-   System Label 정상
-   Render 결과 동일

------------------------------------------------------------------------

# 9. Architecture Verification

확인 항목

-   App.jsx는 Orchestrator 유지
-   Layer Dependency 유지
-   Runtime 우회 없음
-   System-specific Branch 없음
-   Circular Dependency 없음

------------------------------------------------------------------------

# 10. Performance Verification

-   Runtime Boot 시간 유지
-   Search 성능 저하 없음
-   Loader 성능 유지
-   메모리 누수 없음

------------------------------------------------------------------------

# 11. Acceptance Criteria

다음 조건을 모두 만족해야 한다.

-   모든 Regression 통과
-   Build 성공
-   Architecture SSOT 준수
-   Dependency Rule 준수
-   기존 기능 결과 동일

------------------------------------------------------------------------

# 12. Completion Rule

Regression Checklist를 모두 통과한 경우에만

-   Commit
-   Push
-   Release

를 수행할 수 있다.

------------------------------------------------------------------------

# Revision History

## v2.0

-   Initial Regression Checklist
-   Runtime regression verification standardized
