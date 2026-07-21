# STEP7 P6 Apply Decision

## IU-6-01A
Apply Decision Scope Specification

## 0. Baseline

본 IU 작성 시점의 Baseline은 다음과 같다.

- STEP7 P5 Complete (IU-5-01A ~ IU-5-05A PASS)
- WG-AI-001 PASS (Freeze Candidate)
- Architecture Workflow PASS
- Runtime Baseline unchanged
- P6 Entry Ready

본 IU는 직전 P6 Entry 검토 결과를 그대로 Consume하며,
Baseline을 변경하지 않는다.

## 1. Document Purpose

본 문서는 STEP7 P6(Apply Decision)의 첫 번째 Implementation Unit(IU)으로서,
P6에서 수행할 Apply Decision의 범위(Scope)와 책임(Responsibility)을
공식적으로 정의하는 것을 목적으로 한다.

본 문서는 Apply를 수행하는 문서가 아니다.

본 문서는 Apply 대상과 Apply Decision Workflow의 위치를 정의하는
Design 문서이다.

본 IU는 P5에서 확정된 Change Design 산출물(Change Package, Impact Analysis Record,
Review Result)과 WG-AI-001을 Consume 대상으로 사용하며,
새로운 Rule을 정의하거나 기존 산출물을 수정하지 않는다.

본 IU는 Design-only 범위이며,
Apply, Verification, Runtime 변경, System JSON 변경은 수행하지 않는다.

## 2. P6 Apply Decision Role

P6 Apply Decision의 역할은 다음과 같다.

- P5에서 완료된 Change Design 결과를 Apply 관점에서 정리한다.
- 각 Change Package에 대해 Apply 여부를 판단하기 위한 기준 대상을 정의한다.
- Architecture Review 결과(Review Decision, Review Comment, Review Status)를
  Apply Decision의 입력으로 사용한다.
- Apply Candidate를 식별하기 위한 Scope를 정의한다.
- Apply 판단의 근거가 되는 산출물 간 연결 관계를 유지한다.
- Design → Apply → Verify Workflow에서 Apply Decision의 위치를 명확히 한다.

P6 Apply Decision은 "무엇을 Apply 후보로 다룰 것인가"를 정의하는 단계이며,
"실제로 Apply를 수행"하는 단계가 아니다.

Apply Decision은 WG-AI-001의 Impact / Risk / Review Level 판정 결과를 Consume하며,
해당 판정 규칙을 재정의하지 않는다.

## 3. Apply Decision Target

P6 Apply Decision이 다루는 대상은 다음 네 가지이다.

### 3.1 Change Package (CP)

- P5-IU-5-03A(Change Package Design)에서 정의된 Change Package를 대상으로 한다.
- Change Package는 Apply Decision의 기본 판단 단위이다.
- 본 IU는 Change Package를 새로 생성하거나 수정하지 않는다.

### 3.2 Impact Analysis Record (IMP)

- P5-IU-5-04A(Architecture Impact Analysis)에서 정의된 Impact Analysis Record를 대상으로 한다.
- IMP는 각 Change Package의 Overall Impact Level과 Overall Risk를 제공한다.
- Change Package(CP)와 Impact Analysis Record(IMP)는 기본적으로 1:1 관계를 가진다.
- 본 IU는 Impact를 재계산하지 않는다.

### 3.3 Review Result

- P5-IU-5-05A(Architecture Review)에서 생성된 Review 결과를 대상으로 한다.
- Review 결과는 Review Decision, Review Comment, Review Status,
  Reviewed Impact Analysis Record를 포함한다.
- Review 결과는 Apply Decision의 승인 입력으로 사용된다.
- 본 IU는 Review를 재수행하거나 Review Rule을 수정하지 않는다.

### 3.4 Apply Candidate

- Change Package, Impact Analysis Record, Review Result의 연결을 통해
  Apply 판단 대상이 되는 항목을 Apply Candidate로 정의한다.
- Apply Candidate는 Apply Decision Scope 안에서 다루는 대상 개념이다.
- 본 IU는 Apply Candidate의 대상 정의만 수행하며,
  Apply 실행 및 Apply 순서 결정은 수행하지 않는다.

## 4. P6 Scope

본 IU의 Scope는 STEP7 P6 Apply Decision의 적용 범위를 공식적으로 정의하는 것이다.

본 IU에서 수행하는 작업은 다음과 같다.

- P6 Apply Decision의 목적과 역할을 정의한다.
- Apply Decision이 다루는 대상(Change Package, Impact Analysis Record,
  Review Result, Apply Candidate)을 정의한다.
- P6에서 Consume할 기준 산출물을 확정한다.
- Apply Decision Workflow에서 P6의 위치를 정의한다.
- P6 Output과 다음 IU(IU-6-02A)로 전달할 산출물을 정의한다.
- P6 전체에서 공통으로 적용할 Scope와 Constraints 기준을 수립한다.

본 IU는 Scope 정의만 수행하며,
실제 Apply, Apply Procedure 작성, Verification은 포함하지 않는다.

## 5. Out of Scope

본 IU의 범위에 포함되지 않는 작업은 다음과 같다.

- Change Apply 수행
- Apply Procedure 작성
- Verification 수행
- Verification Procedure 작성
- Runtime 변경
- Registry 변경
- Loader 변경
- Contract 변경
- Framework 변경
- Pipeline 변경
- System JSON 수정
- Dataset 변경
- WG-AI-001 Rule 수정
- P5 산출물(IU-5-01A ~ IU-5-05A) 수정
- 새로운 Rule 정의
- 새로운 Review Rule 정의
- Architecture Impact 재계산
- Impact Analysis Record 신규 생성
- Catalog Freeze 선언
- Catalog/Register JSON 생성
- catalogPinId 발급
- Severity Lock
- Implementation / Code 작성
- Git Commit
- Git Push

위 작업은 후속 Implementation Unit 또는 별도 Session에서 수행하며,
본 IU에서는 수행하지 않는다.

## 6. P6 Input (Consume)

본 IU는 아래 산출물을 Consume 대상으로 사용한다.

### 6.1 Primary Consume

- WG-AI-001_Architecture_Impact_Working_Guideline.md
- STEP7_P5_IU-5-01A (Change Design Scope)
- STEP7_P5_IU-5-02A (Resolution Mapping)
- STEP7_P5_IU-5-03A (Change Package Design)
- STEP7_P5_IU-5-04A (Architecture Impact Analysis)
- STEP7_P5_IU-5-05A (Architecture Review)

### 6.2 Supporting Consume

- STEP7 P4 Standardization Plan Suite (IU-4-01A ~ IU-4-08A)
- STEP7 P2 Catalog Design (v0.15)
- STEP6 Final Freeze (v1.0)
- STEP7 P3 D-GAP-A
- STEP7 P3 D-GAP-R

### 6.3 Consume Principles

- WG-AI-001은 Impact / Risk / Review Level 판정 규칙의 Primary Rule Source이며,
  본 IU는 해당 Guideline을 재정의하거나 복사하지 않는다.
- P5 산출물은 Apply Decision의 대상 및 입력으로만 사용하며,
  본문 내용과 승인 상태(PASS)를 변경하지 않는다.
- 모든 Consume 대상은 참조 목적으로만 사용하며,
  내용, 상태, 승인 결과를 변경하지 않는다.
- 승인 상태(VG-P3 PASS, VG-P4 PASS, STEP6 Final Freeze,
  P5 IU PASS, WG-AI-001 PASS)는 그대로 유지한다.

## 7. P6 Output

본 IU의 산출물(Output)은 다음과 같다.

- P6 Apply Decision Scope 정의
- Apply Decision Role 정의
- Apply Decision Target 정의 (Change Package, Impact Analysis Record,
  Review Result, Apply Candidate)
- P6 Scope 및 Out of Scope 정의
- P6 Input(Consume) 목록 정의
- Apply Decision Workflow 위치 정의
- 다음 IU(IU-6-02A)로 전달할 산출물 기준 정의

본 IU의 Output은 Design 산출물이며,
Apply 결과물이나 Runtime 변경물을 포함하지 않는다.

## 8. P6 Workflow Position

Design → Apply → Verify Workflow에서 P6 Apply Decision의 위치는 다음과 같다.

```text
Change Package (P5-IU-5-03A)
        ↓
Impact Analysis (P5-IU-5-04A)
        ↓
Architecture Review (P5-IU-5-05A)
        ↓
Apply Decision (P6-IU-6-01A · 본 IU)
        ↓
Verification (후속 · 본 IU 범위 아님)
```

- Change Package → Impact Analysis → Architecture Review 단계는 P5에서 완료되었다.
- Apply Decision은 위 세 단계의 결과를 Consume하는 P6의 진입 단계이다.
- Verification은 Apply Decision 이후 단계이며,
  본 IU의 범위에 포함되지 않는다.

본 IU는 Workflow에서 Apply Decision의 위치를 정의할 뿐,
Apply와 Verification을 수행하지 않는다.

## 9. Deliverables to Next IU (IU-6-02A)

본 IU가 다음 Implementation Unit으로 전달하는 산출물은 다음과 같다.

- P6 Apply Decision Scope
- Apply Decision Target 정의 (Change Package, Impact Analysis Record,
  Review Result, Apply Candidate)
- P6 Input(Consume) 기준
- Apply Decision Workflow 위치

Next IU

Session ID
S7-P6-IU-6-02A

Objective

본 IU에서 정의한 Apply Decision Scope와 Apply Candidate 대상을 기준으로,
Apply Decision 상세(Apply Candidate 정리 및 Apply Decision 판단 기준 연결)를
후속 IU에서 수행한다.

Next IU는

- WG-AI-001
- P5-IU-5-03A / IU-5-04A / IU-5-05A 결과
- 본 IU(IU-6-01A)에서 정의한 Apply Decision Scope

를 Consume한다.

Next IU는 새로운 Rule을 정의하지 않으며,
Apply 및 Verification은 별도 후속 단계에서 수행한다.
