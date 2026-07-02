# 3Cushion AI Application Architecture SSOT v2.0

# Chapter 03. Dependency Rule

## Purpose

본 Chapter는 Application Architecture의 Layer 간 의존성 규칙을 정의한다.

3Cushion AI는 Layered Architecture를 채택하며, 모든 구현은 본 Chapter의 Dependency Rule을 준수하여야 한다.

본 규칙은 App.jsx뿐 아니라 앞으로 생성되는 모든 Module, Component, Domain, System, Dataset에 동일하게 적용된다.

---

# Part A. Architecture SSOT

## 1. Dependency Principle

Architecture는 항상 아래 방향으로만 의존할 수 있다.

Presentation
↓
Application
↓
Domain
↓
System
↓
Dataset
↓
Storage

역방향 의존은 금지한다.

## 2. One Direction Rule

허용
- Presentation → Application
- Application → Domain
- Domain → System
- System → Dataset

금지
- Dataset → System
- System → Domain
- Domain → Application
- Application → Presentation

## 3. Layer Independence

각 Layer는 자신의 책임만 가진다.

- Presentation : UI
- Application : 업무 흐름
- Domain : 계산 및 비즈니스 규칙
- System : 시스템 정의
- Dataset : 데이터 관리
- Storage : 저장소

## 4. Forbidden Dependency

다음은 절대 금지한다.

- App → Dataset 직접 접근
- App → System Logic 직접 호출
- Component → Domain 계산
- Dataset → UI 참조

## 5. System Independence

모든 System은 profile.json, logic.json, anchors.json, system_meta.json만으로 동작 가능해야 한다.

App는 System 내부 규칙을 알지 못한다.

## 6. Domain Independence

Domain은 React, Hook, Context, Component를 참조하지 않는다.

## 7. Presentation Independence

Presentation은 Rendering만 수행하며 계산을 수행하지 않는다.

## 8. Circular Dependency

순환 참조(Circular Dependency)는 절대 금지한다.

## 9. System Loader Rule

모든 System 접근은 System Loader를 통해 수행한다.

systemId
↓
System Loader
↓
profile / logic / anchors / meta
↓
Application

## 10. Dependency Inversion

상위 Layer는 하위 Layer의 구현을 알지 못한다.

Application은 특정 System(5_half, Plus, Reverse 등)이 아니라 공통 인터페이스만 참조한다.

---

# Part B. Execution Plan

## Phase 1
- 현재 App.jsx의 import graph 분석
- Layer 위반 코드 식별

## Phase 2
- presentation/
- application/
- domain/
- system/
- dataset/
- storage/
구조 생성

## Phase 3
잘못된 참조 제거

## Phase 4
System Loader 구축

## Phase 5
Dependency Rule 검증

---

# Part C. Cursor Work Order

[Cursor Mode: Agent]

목표

Dependency Rule을 100% 준수하도록 구조를 리팩터링한다.

작업 순서

1. Import Graph 분석
2. Layer 위반 목록 작성
3. Presentation → Application 구조 정리
4. Application → Domain 구조 정리
5. Domain → System 구조 정리
6. System Loader 구축
7. 직접 참조 제거
8. 순환 참조 제거

주의사항

- UI 변경 금지
- 계산 결과 변경 금지
- Dataset 구조 변경 금지
- 기능 추가 금지
- 책임 분리만 수행

---

# Part D. Regression Checklist

- [ ] App가 Dataset를 직접 참조하지 않는다.
- [ ] App가 System Rule을 직접 구현하지 않는다.
- [ ] React Component가 계산을 수행하지 않는다.
- [ ] Domain이 React를 참조하지 않는다.
- [ ] Domain이 UI를 참조하지 않는다.
- [ ] Dataset이 UI를 참조하지 않는다.
- [ ] System Loader를 통해서만 System 접근이 이루어진다.
- [ ] Circular Dependency가 존재하지 않는다.
- [ ] 기존 계산 결과가 동일하다.
- [ ] USER Search 정상
- [ ] ADMIN Recall 정상
- [ ] Trajectory 정상
- [ ] Overlay 정상
- [ ] Build 성공
- [ ] Regression Test 통과

---

## Revision History

### v2.0

- Initial Dependency Rule 정의
- Layer 간 의존성 규칙 수립
- Cursor 구현 기준 정의
- Regression Checklist 작성
