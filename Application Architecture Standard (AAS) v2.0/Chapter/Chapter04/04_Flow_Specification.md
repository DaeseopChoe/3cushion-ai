# 04_Flow_Specification.md

# 3Cushion AI Application Architecture SSOT v2.0

# Chapter 04-04

# Flow Specification

Version: v2.0 Status: Draft SSOT Owner: 3Cushion AI Architecture

Parent Documents: - Architecture_Constitution.md -
Chapter01_App_Authority.md - Chapter02_Layer_Architecture.md -
Chapter03_Dependency_Rule.md - Chapter04/01_Runtime_Philosophy.md -
Chapter04/02_Runtime_Object_Model.md - Chapter04/03_Runtime_Lifecycle.md

------------------------------------------------------------------------

# 1. Purpose

본 문서는 Application Runtime에서 사용하는 **Flow**의 공식 규격을
정의한다.

Flow는 하나의 사용자 요구(User Intent) 또는 업무 절차(Use Case)를
실행하는 Runtime 구성 요소이다.

Flow는 계산 엔진이 아니며, UI도 아니다.

------------------------------------------------------------------------

# 2. Definition

Flow는 다음 역할을 수행한다.

-   Runtime으로부터 Command 수신
-   필요한 Domain 호출
-   결과 조합
-   Runtime Result 반환

Flow는 업무 절차(Process)를 담당하며 계산 자체는 Domain에 위임한다.

------------------------------------------------------------------------

# 3. Standard Flow Structure

``` text
Command
   │
   ▼
Flow
   │
   ├── Validate
   ├── Load Context
   ├── Invoke Domain
   ├── Assemble Result
   └── Return Result
```

------------------------------------------------------------------------

# 4. Standard Flow Lifecycle

``` text
Command Received
        │
        ▼
Validation
        │
        ▼
Context Ready
        │
        ▼
Domain Execution
        │
        ▼
Result Assembly
        │
        ▼
Flow Completed
```

------------------------------------------------------------------------

# 5. Standard Flow Contract

Input

-   ApplicationCommand
-   ApplicationContext

Output

-   ApplicationResult

Flow는 Runtime 외부 객체를 직접 수정하지 않는다.

------------------------------------------------------------------------

# 6. Recommended Flow List

Core Runtime Flow

-   UserSearchFlow
-   AdminSearchFlow
-   AdminRecallFlow
-   SystemLoadFlow
-   SlotFlow
-   OverlayFlow
-   TrajectoryFlow
-   HistoryFlow
-   SaveFlow
-   ResetFlow

Extension Flow

-   DatasetExportFlow
-   DatasetImportFlow
-   AiPanelFlow
-   LessonFlow
-   HPTFlow

------------------------------------------------------------------------

# 7. Responsibilities

Flow는 수행할 수 있다.

-   Domain 호출
-   Context 확인
-   Loader 요청
-   Coordinator 호출
-   Runtime Result 생성

Flow는 수행해서는 안 된다.

-   React Rendering
-   System Formula 계산
-   Trajectory Geometry 계산
-   Dataset Merge 구현
-   System-specific Rule 구현

------------------------------------------------------------------------

# 8. Dependency Rule

Allowed

Runtime → Flow

Flow → Domain

Flow → Loader

Flow → Coordinator

Forbidden

Flow → React Component

Flow → App.jsx

Flow → System Rule

Flow → Dataset Storage

------------------------------------------------------------------------

# 9. Error Handling

Flow는 예외를 직접 화면에 출력하지 않는다.

오류 발생 시

-   ApplicationError 생성
-   Runtime 반환
-   Recovery 여부 표시

------------------------------------------------------------------------

# 10. Extension Rule

새 기능은 기존 Flow를 수정하기보다 새로운 Flow를 추가한다.

새 System 추가를 위해 Flow 내부에 systemId 분기를 추가해서는 안 된다.

------------------------------------------------------------------------

# 11. Success Criteria

-   하나의 Flow는 하나의 업무를 담당한다.
-   모든 Flow는 동일한 Contract를 따른다.
-   Flow는 Domain 계산을 구현하지 않는다.
-   Flow는 Runtime Lifecycle을 준수한다.
-   Flow 추가만으로 기능 확장이 가능하다.

------------------------------------------------------------------------

# Revision History

## v2.0

-   Initial Flow Specification
-   Standard Flow Contract defined
-   Runtime Flow architecture established
