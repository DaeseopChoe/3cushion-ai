# Architecture_Dictionary.md

# 3Cushion AI Application Architecture Standard (AAS) v2.0

## Architecture Dictionary

**Version:** v2.0\
**Status:** Normative\
**Purpose:** Architecture Vocabulary Standard

------------------------------------------------------------------------

# 1. Purpose

본 문서는 3Cushion AI 프로젝트에서 사용하는 공식 Architecture 용어를
정의한다.

목적은 개발자, Cursor, AI가 동일한 개념을 항상 동일한 용어로 사용하도록
하는 것이다.

동일 개념에 대해 여러 용어를 사용하는 것을 금지하며, 본 문서를
프로젝트의 용어 SSOT(Single Source of Truth)로 사용한다.

------------------------------------------------------------------------

# 2. Naming Rules

-   공식 용어는 PascalCase 또는 공백을 포함한 Pascal Style을 사용한다.
-   하나의 개념에는 하나의 Official Name만 존재한다.
-   새로운 용어는 본 문서에 등록한 후 사용한다.
-   동일 의미의 별칭(Alias)은 공식 문서에서 사용하지 않는다.

------------------------------------------------------------------------

# 3. Preferred Terms

  Official Name         Do Not Use
  --------------------- ---------------------------
  Application Runtime   Application, Runtime
  Application Layer     Business Layer
  Domain Layer          Logic Layer, Engine Layer
  System Layer          System Config
  Dataset Layer         Data Layer
  Runtime Context       Context
  Runtime State         State
  Runtime Flow          Flow
  Runtime Dispatcher    Dispatcher
  Runtime Coordinator   Coordinator, Manager
  Runtime Loader        Loader
  Runtime Service       Service Manager
  Calculation Domain    Calculation Engine
  Trajectory Domain     Trajectory Engine
  Search Domain         Search Engine
  History Domain        History Manager
  Profile Definition    Profile
  Logic Definition      Logic
  Anchor Definition     Anchor
  System Definition     System Config
  Canonical Dataset     Base Dataset
  ViewModel             View Data

------------------------------------------------------------------------

# 4. Architecture Vocabulary

## Core

### Application Runtime

-   Definition : 애플리케이션 전체를 실행하고 각 Layer를 조정하는 최상위
    Runtime.
-   Used By : App.jsx, Application Layer

### Application Layer

-   Definition : 업무 흐름을 조정하는 계층. 계산은 수행하지 않는다.
-   Used By : Runtime Coordinator, Runtime Dispatcher

### Domain Layer

-   Definition : 계산과 비즈니스 규칙을 수행하는 계층.
-   Used By : Calculation, Trajectory, Search, History

### System Layer

-   Definition : 시스템 정의(profile, logic, anchors, system_meta)를
    관리하는 계층.

### Dataset Layer

-   Definition : 데이터셋과 Dataset Model을 관리하는 계층.

### Infrastructure

-   Definition : Storage, File, Network 등 외부 환경을 담당하는 계층.

## Runtime

### Runtime Context

-   Definition : Runtime 전체에서 공유되는 실행 컨텍스트.

### Runtime State

-   Definition : 현재 Runtime의 상태 정보.

### Runtime Flow

-   Definition : 하나의 업무 처리 흐름.

### Runtime Dispatcher

-   Definition : Command를 적절한 Flow로 전달하는 컴포넌트.

### Runtime Coordinator

-   Definition : 여러 Domain을 조합하여 업무 흐름을 완성하는 컴포넌트.

### Runtime Loader

-   Definition : System Definition을 Runtime으로 로드하는 컴포넌트.

### Runtime Service

-   Definition : Runtime에서 제공하는 공통 서비스.

## System

### Profile Definition

-   Definition : 시스템의 정적 정의.

### Logic Definition

-   Definition : 시스템의 동적 규칙 정의.

### Anchor Definition

-   Definition : 좌표 및 기준점 정의.

### System Definition

-   Definition : Profile, Logic, Anchor, Meta를 포함하는 시스템 정의.

## Dataset

### Canonical Dataset

-   Definition : 프로젝트의 기준 데이터셋.

### Dataset Model

-   Definition : Dataset의 표준 데이터 구조.

## Development

### SSOT

-   Definition : 하나의 정보는 하나의 위치에서만 관리한다.

### Requirement

-   Definition : Architecture Standard의 공식 규칙.

### Compliance

-   Definition : Architecture Standard 준수 여부.

### Regression

-   Definition : 변경 이후 기존 기능 유지 여부를 검증하는 절차.

### ViewModel

-   Definition : Presentation Layer에 전달되는 표시 전용 모델.

------------------------------------------------------------------------

# 5. Abbreviations

  Abbreviation   Meaning
  -------------- -----------------------------------
  AAS            Application Architecture Standard
  SSOT           Single Source of Truth
  VM             ViewModel
  REQ            Requirement

------------------------------------------------------------------------

# 6. Compliance

-   모든 Architecture 문서는 본 문서의 Official Name을 사용한다.
-   Do Not Use 항목은 신규 문서와 코드에서 사용하지 않는다.
-   새로운 Architecture 용어가 필요한 경우 본 문서를 먼저 수정한다.
-   Cursor 작업 시 용어가 혼용되면 Official Name으로 통일한다.

------------------------------------------------------------------------

# 7. References

-   Architecture Constitution
-   Application Architecture Standard (Chapter01\~20)
-   App.jsx (Reference Implementation)

------------------------------------------------------------------------

# Revision History

  Version   Description
  --------- ------------------------------------------
  v2.0      Initial Architecture Vocabulary Standard
