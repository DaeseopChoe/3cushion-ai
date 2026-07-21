# Architecture Impact Working Guideline

Version

WG-AI-001

Status

Working Guideline

Purpose

STEP7 P5-IU-5-04A(Architecture Impact Analysis)의
설계 입력으로 사용할 최소 Working Guideline을 정의한다.

본 Guideline은 현재 SSOT(Standard)가 아니며,
P5 완료 후 검증 결과에 따라 Standard 승격 여부를 결정한다.

## 1. Impact Dimension Definition

Architecture Impact는 아래 6개의 Dimension을 기준으로 평가한다.

1. Runtime
- 실행 흐름 또는 Runtime 동작에 영향을 주는 변경

2. Data
- Dataset, Catalog, Schema 또는 저장 데이터 구조에 영향을 주는 변경

3. Interface
- Contract, API, 외부/내부 인터페이스에 영향을 주는 변경

4. Validation
- Validation Rule, Verification, Test Scope에 영향을 주는 변경

5. Performance
- 성능, 처리량, 응답 시간 또는 리소스 사용량에 영향을 주는 변경

6. Architecture
- Framework, Pipeline, System Architecture 또는 Component 관계에 영향을 주는 변경

Y/N Decision Rule

각 Dimension은 아래 기준을 만족하면 "Y",
그 외에는 "N"으로 평가한다.

Runtime = Y

아래 조건 중 하나(ANY)라도 만족하면
해당 Dimension은 Y로 판정한다.

- Runtime 실행 흐름이 변경된다.
- Runtime Logic이 변경된다.
- Loader 또는 Registry 변경으로 Runtime 동작이 달라진다.

Data = Y

아래 조건 중 하나(ANY)라도 만족하면
해당 Dimension은 Y로 판정한다.

- Dataset 구조가 변경된다.
- Catalog 구조가 변경된다.
- Schema가 변경된다.
- 저장 데이터 형식이 변경된다.

Interface = Y

아래 조건 중 하나(ANY)라도 만족하면
해당 Dimension은 Y로 판정한다.

- Contract가 변경된다.
- API가 변경된다.
- Component 간 Interface가 변경된다.

Validation = Y

아래 조건 중 하나(ANY)라도 만족하면
해당 Dimension은 Y로 판정한다.

- Validation Rule이 변경된다.
- Verification Scope가 변경된다.
- Test Coverage가 변경된다.

Performance = Y

아래 조건 중 하나(ANY)라도 만족하면
해당 Dimension은 Y로 판정한다.

- 성능 측정 결과가 변경된다.
- 처리량(Throughput)이 변경된다.
- Memory 사용 특성이 변경된다.
- CPU 사용 특성이 변경된다.
- I/O 처리 특성이 변경된다.

Architecture = Y

아래 조건 중 하나(ANY)라도 만족하면
해당 Dimension은 Y로 판정한다.

- Framework가 변경된다.
- Pipeline이 변경된다.
- Component 관계가 변경된다.
- System Architecture가 변경된다.

판정 기준에 해당하지 않으면
"N"으로 평가한다.

본 Guideline에서는
Dimension별 Y/N을 판정한 뒤,
Overall Impact Level은 Impact Level Decision Algorithm으로 계산한다.

## 2. Impact Level Definition

Impact Level은 아래 5단계를 사용한다.

L0
None

L1
Low

L2
Medium

L3
High

L4
Critical

본 Guideline에서는
Level 정의와 판정 규칙만 관리한다.

Impact Level Decision Algorithm

Architecture Impact Level은 아래 순서에 따라 결정한다.

Step 1.

Architecture Dimension이 "Y"이면

Overall Impact Level = L4 (Critical)

다른 Dimension은 추가 평가하지 않는다.

Step 2.

Architecture가 "N"이고

Runtime Dimension이 "Y"이면

Overall Impact Level = L3 (High)

Step 3.

Architecture = N

Runtime = N

인 경우에는

나머지 Dimension(Data, Interface, Validation, Performance)의
Y 개수를 계산한다.

Y 개수 = 0

→ L0 (None)

Y 개수 = 1

→ L1 (Low)

Y 개수 = 2 또는 3

→ L2 (Medium)

Y 개수 = 4

→ L3 (High)

Decision Rule

Architecture는 항상 최우선(Veto)으로 판단한다.

Runtime는 Architecture 다음 우선순위를 가진다.

나머지 Dimension은
영향 범위를 기준으로
Escalation Rule을 적용한다.

Decision Reason

모든 Impact Analysis Record는
Overall Impact Level과 함께
Decision Reason을 기록한다.

예)

Architecture = Y → L4

Runtime = Y → L3

Data + Validation = Y → L2

Validation = Y → L1

No Dimension = Y → L0

Decision Reason은
Impact Level의 판정 근거로 사용한다.

## 3. Risk Definition

Risk는 아래 4단계를 사용한다.

R0
None

R1
Low

R2
Medium

R3
High

Risk는 Impact와 독립적으로 평가한다.

Risk Decision Algorithm

Risk는 Change 자체의 영향이 아니라
적용 과정의 불확실성과 운영 위험을 평가한다.

Risk는 아래 5개 항목을 기준으로 평가한다.

- Rollback
- Dependency
- Test Coverage
- Regression
- Operational Uncertainty

Risk Severity Definition

각 Risk 항목은 아래 등급 중 하나로 판정한다.

None
Low
High
Critical

Rollback

- None : Rollback 경로가 존재하고 검증되어 있다.
- Low : Rollback이 가능하나 수동 절차가 필요하다.
- High : Rollback이 부분적으로만 가능하거나 복구 범위가 제한된다.
- Critical : Rollback이 불가능하거나 Rollback 실패 시 복구 수단이 없다.

Dependency

- None : 다른 Package 또는 Component에 대한 적용 의존이 없다.
- Low : 약한 의존이 있으나 순서를 조정하면 해소된다.
- High : 둘 이상의 Package/Component에 적용 순서가 필수이다.
- Critical : 미해소 Dependency로 인해 단독 Apply가 불가능하다.

Test Coverage

- None : 변경 범위에 대한 Test Coverage가 확보되어 있다.
- Low : Coverage가 부분적이며 잔여 공백이 문서화되어 있다.
- High : Coverage 공백이 크고 핵심 경로가 미검증이다.
- Critical : 적용에 필요한 Test Coverage가 부재하다.

Regression

- None : Regression 위험이 식별되지 않았다.
- Low : 국소 Regression 가능성이 있으나 격리 가능하다.
- High : 다중 영역 Regression 가능성이 있다.
- Critical : 광범위 또는 비가역 Regression 위험이 있다.

Operational Uncertainty

- None : 운영 영향이 명확하고 관측 가능하다.
- Low : 운영 영향이 제한적이며 관측 계획이 있다.
- High : 운영 영향 범위가 불명확하거나 관측이 어렵다.
- Critical : 운영 영향이 불명이고 장애 대응 경로가 없다.

평가 규칙은 아래와 같다.

Step 1.

Critical Risk가 하나라도 존재하면

Overall Risk = R3 (High)

Step 2.

Critical Risk가 없고

High Risk 항목이 2개 이상 존재하면

Overall Risk = R2 (Medium)

Step 3.

High Risk는 없고

Low Risk 항목만 존재하면

Overall Risk = R1 (Low)

Step 4.

Risk 항목이 모두 없으면

Overall Risk = R0 (None)

Risk Decision Rule

Impact와 Risk는 서로 독립적으로 평가한다.

Impact는
무엇이 변경되는가를 평가한다.

Risk는
얼마나 안전하게 적용할 수 있는가를 평가한다.

모든 Impact Analysis Record는
Overall Risk와 함께
Risk Decision Reason을 기록한다.

예)

Rollback 불가 → R3

Dependency + Regression → R2

Regression만 존재 → R1

Risk 없음 → R0

## 4. Approval Rule

Architecture Review Level은

Impact × Risk

조합으로 결정한다.

세부 Approval Matrix는
본 Guideline에서 관리한다.

Review Level Decision Matrix

Approval Level은

Overall Impact Level

과

Overall Risk

를 함께 사용하여 결정한다.

기본 원칙은 아래와 같다.

L0 + R0

→ Auto Approval

L1

→ Design Review

L2

→ Technical Review

L3

→ Architecture Review

L4

→ SPS Review

Escalation Rule

Risk가 R3인 경우에는

Impact Level과 관계없이

최소 Architecture Review 이상을 수행한다.

Architecture Impact가 L4인 경우에는

항상 SPS Review를 수행한다.

Approval Decision Reason

모든 Impact Analysis Record는

Approval Level과 함께

Approval Decision Reason을 기록한다.

예)

L2 + R1

→ Technical Review

L3 + R3

→ Architecture Review

L4

→ SPS Review

## 5. Impact Analysis Record

Impact Analysis Record(IMP)는
각 Change Package(CP)에 대한 Architecture Impact 평가 결과를
기록하는 Working Record이다.

Record ID 형식은 아래 규칙을 사용한다.

IMP-001
IMP-002
IMP-003
...

CP와 IMP는 기본적으로 1:1 관계를 가진다.

필수 Record 항목은 아래와 같다.

- Impact Record ID
- Related Change Package ID
- Related Resolution ID
- Related D-GAP ID (있는 경우)
- Impact Dimension Result
- Overall Impact Level
- Overall Risk Level
- Review Level
- Decision Reason
- Review Status
- Reviewer
- Review Date

Record Relationship

CP

↓

IMP

↓

Review

↓

Apply Decision

Impact Analysis Record는

Change Package의

Architecture Impact,

Risk,

Review Level,

Apply 판단의 근거를 제공한다.

Working Rule

현재 단계에서는

Impact Analysis Record의

데이터 구조와

필수 필드만 정의한다.

실제 Record 생성,

Apply,

Verification,

Runtime 반영은

P5 범위에 포함하지 않는다.

Design-only Constraints

본 Guideline은

Architecture Impact 분석 기준만 정의한다.

다음 작업은 수행하지 않는다.

- 실제 IMP Record 생성
- Change Apply
- Runtime 변경
- Registry 변경
- Loader 변경
- Dataset 변경
- Contract 변경
- Verification 수행
- Git Commit
- Git Push

본 문서는 Working Guideline(WG-AI-001)로서
아래 항목을 정의한다.

- Impact Dimension Definition
- Dimension Y/N Decision Rule
- Impact Level Decision Algorithm
- Risk Severity Definition
- Risk Decision Algorithm
- Review Level Decision Matrix
- Impact Analysis Record 필수 필드

본 Guideline은 Standard가 아니며,
실제 IMP Record 생성 및 Apply/Verification은 수행하지 않는다.

---

## Appendix — STEP8 Execution Rule (Fleet Apply)

STEP8 Fleet Apply 실행 중 아래 Execution Rule을 적용한다.
본 규칙은 Architecture 보호를 위한 Apply-time 안전장치이며, 기존 Impact 평가 절차를 대체하지 않는다.

1. **Metadata rename 제약**
   - Metadata(키) rename은 **Fleet Contract Book Ch.7의 Ratified mapping이 on-disk SSOT로 존재할 때에만** 수행한다.
   - Ratified mapping이 없는 상태의 임의 rename은 **금지**한다 (새 Rule 생성 = 금지).

2. **의미 변경 시 즉시 중단 (Semantic Guard)**
   - Apply 중 의미(semantic) 변경 가능성이 확인되면 **즉시 중단(Safe Stop)** 하고 근거를 보고한다.
   - Runtime 소비 필드(예: `profile.meta.version`)를 파손할 수 있는 변경은 해당 Layer 단독으로 수행하지 않는다.

3. **Safe Stop ≠ FAIL**
   - **HALTED(Safe Stop)** 는 실패가 아니라 Architecture·의미 보존을 위한 **정상 종료**이다.
   - HALTED 배치는 근거 SSOT가 확보될 때까지 **재시도하지 않는다**.

4. **적용 이력 (참조)**
   - B0/B1 (`82cb371`), B2/B2.5 (`a32bed9`) = PASS · B3 (Metadata) = HALTED (Safe Stop) — 근거: Ch.7 Metadata canonical mapping SSOT 미Ratify.
