# STEP9 Phase 1 — Certification Platform Definition

```text
Document   : STEP9_P1_Platform_Definition.md
Type       : Platform Definition (Persisted SSOT)
Date       : 2026-07-26
Status     : PASS · Persisted
Phase      : STEP9 Phase 1
Location   : System Platform Standard (SPS) v1.0/Certification_Platform/
Baseline   : Phase 0 Architecture Review (Final) · Fleet Validation Standard · Consume only
Progress   : 15% → 30%
Rule       : Fix vocabulary & core meanings · No Freeze · No Cert execution
Authority  : Defines how Certification is performed (AP-01) · Does not certify
```

---

## 0. Consume & Non-Goals

**Consume:** Phase 0 AP-01…AP-13 · Final Gate v1.0 · Ch.8–11 · B4–B8 Freeze/ADR · Ops v1.0 · MASTER/LOG/HANDOFF · `3_SYSTEM_ARCHITECTURE` · `4_CALCULATION_RULES`.

**Non-Goals:** Platform Freeze · Pilot/Fleet/System Cert · Runtime/JSON/Code · Checklist · Validation Matrix · Evidence Pack 상세 · Report Format · Certificate Record 스키마.

---

## 1. Certification Vocabulary (Glossary)

| Term | Official Definition |
|------|---------------------|
| **SSOT** | 해당 주제의 **유일한 권위** 문서/기준. 충돌 시 SSOT 우선. |
| **Fleet** | Inventory 시스템 **집합** + 공통 표준 체계. |
| **Fleet Validation** | STEP8 함대 Apply 종료 검증/게이트. System Certification과 비동치. |
| **Fleet Validation Standard** | Final Gate v1.0 (+ Ch.8–11 · B4–B8 Freeze/ADR · Ops v1.0). STEP9 Baseline Consume. |
| **System** | `SYS-NNN` / `systemId` 독립 계산·데이터 단위. 고유 Logic/Values 가능. |
| **Corpus** | Certification 대상 System 집합. (N = Inventory 38 · 프로그램명 “40 Systems”) |
| **Certification Platform** *(Platform)* | Certification **How**를 정의하는 평가 기준 SSOT. 인증 주체 아님. |
| **Platform Definition** | 용어·Contract·Workflow·핵심 Definition을 문서로 확정한 상태. |
| **Platform Freeze** | Definition 이후 Cert에 쓸 Platform을 동결한 상태. (후속 Phase) |
| **Certification** | Actors가 Platform을 System에 적용하여 Certified를 부여하는 행위·과정. |
| **Gap Analysis** | Platform 대비 System 차이·결손·위험 식별. Calibration 입력. |
| **Calibration** | Gap 해소를 위해 **해당 System만** 허용 범위 내 조정. Platform 불변. |
| **Validation** | Calibration 결과가 Platform Required를 만족하는지 **판정**. 고치지 않음. |
| **Evidence** | 판정에 인용되는 사실·산출·검증 기록. (스키마 후속) |
| **Verdict** | 판정 결과: PASS / FAIL / HOLD / CONDITIONAL / DEFERRED. (Phase 2.5 확정) |
| **Certificate** | Certified(또는 허용 조건부) 공식 기록 단위. (스키마 후속) |
| **Certified** | Certification PASS 결과 System 상태. |
| **Not Certified** | Certified가 아닌 상태. |
| **Production Ready** | Certified **이후** 실데이터 입력 직전 운영 준비 상태. |
| **Carry** | 이전 STEP 비차단 목록. Cert Required를 몰래 재정의하지 않음. |
| **Hold** | 선행 조건으로 진행 정지. FAIL과 비동치. |
| **Conditional** | Required 충족 + 명시 조건/Defer 주석. |
| **Wave** | Corpus 부분 집합에 대한 Cert 묶음 단위. |
| **Report** | Gap/Validation/Certification 결과 문서. (Format 후속) |
| **Checklist** | Required/Optional 확인 항목 목록. (본문 후속) |
| **Contract** | Cert를 **무엇에 근거해** 수행하는지 고정. |
| **Workflow** | Cert를 **어떤 순서로** 수행하는지 고정. |
| **Rule** | Gap/Calibration/Validation/PASS 규범 문장. (상세 후속) |
| **Actor** | Platform을 System에 적용하는 주체 (User · Agent). |
| **System Logic** | 해당 System 고유 계산·분기 규칙. |
| **System Values** | 해당 System 고유 시스템값·도메인·기준값. |
| **Meaning Preservation** | Formula / Value / Trajectory 의미 무단 변경 금지. |
| **Allow-list** | Calibration 수정 허용 System-local 대상 종류. (열거 후속) |
| **Forbidden mutation** | Platform · 타 System · Ratified informal edit · Meaning silent rewrite 등 금지 변경. |
| **Fleet Certification** | Corpus-wide Certification (용어 과부하 방지용 표기). |

---

## 2. Core Definitions

### 2.1 Platform

Certification Platform = Corpus 전 시스템 공통 **Certification How-SSOT**.

**Normative:** *Platform does not certify. Platform defines how Certification is performed.*

### 2.2 Subject

Certification 대상 = **System** (Corpus 멤버).

### 2.3 Fleet Baseline Relation

Platform은 Fleet Validation Standard · Ratified Ch.8–11 · Ops · Locked STEP6을 **Consume**하며 **재정의하지 않는다**.

### 2.4 Independence

한 System Cert Session은 독립. 수정·Verdict·Certificate는 해당 System에 귀속.

---

## 3. Certification Contract Definition

**Purpose:** “이 System을 **무엇에 근거해** Certificate하는가”를 고정.

Contract가 의미상 고정하는 것:

1. **Authority sources** — Platform + Fleet Baseline (+ Locked STEP6 as evidence tools)  
2. **Subject** — System / Corpus membership  
3. **Preserved uniqueness** — Logic/Values 동질화 금지  
4. **Conformance target** — Fleet 공통 표준 + Platform Required  
5. **Non-authority** — Carry 몰래 Required 승격 금지 · Not Persisted chapter를 Cert SSOT로 사용 금지  

Contract는 System 파일을 직접 수정하지 않으며, Fleet Chapter 본문을 대체하지 않는다.

---

## 4. Workflow Definition

### 4.1 Platform lifecycle

```text
Architecture Review (Phase 0)
        ↓
Platform Definition (Phase 1)
        ↓
Platform Review / Freeze (Phase 2+)
        ↓
Pilot Certification
        ↓
Fleet (Corpus) Certification
```

### 4.2 Per-System path

```text
System 선택
        ↓
Gap Analysis
        ↓
Calibration          ← Validation FAIL 시 복귀 가능
        ↓
Validation
        ↓
Certification        ← Verdict → Certified / Not Certified
        ↓
Production Ready     ← Certified 이후
        ↓
실데이터 입력         ← Cert Workflow 밖
```

### 4.3 Workflow invariants

| Invariant | Statement |
|-----------|-----------|
| **Order** | Gap Analysis는 Calibration **이전** |
| **Judge ≠ Fix** | Validation = 판정 · Calibration = 수정 |
| **Platform stable** | Workflow 중 Platform 변경 금지 |
| **Local only** | Calibration은 선택 System만 |
| **Certified before PR** | Production Ready는 Certification **이후** |

---

## 5. Gap / Calibration / Validation Definition

### 5.1 Gap Analysis

**비교:** System 현재 상태 vs Platform Required (+ Fleet Baseline cite).  
**산출:** Gap 목록 · 위험/범위 · Calibration 입력.  
**아님:** 수정 · PASS 선언 · Platform/타 System 변경.

### 5.2 Calibration

**목적:** Gap 해소 · System을 Platform에 맞춤.  
**변경 가능:** Allow-list의 **해당 System-local** 산출만 (열거 후속).  
**변경 불가:** Platform · 타 System · Ratified informal edit · Meaning silent rewrite · 전 시스템 동질화.  
**FAIL 처리:** Validation FAIL → 재Calibration (Platform 완화 금지).

> **Boundary 상세**는 Phase 2.5 Gate Closure `STEP9_P2_5_Gate_Closure.md` §3를 **권위 보완**으로 본다.

### 5.3 Validation

**판정:** Calibration 이후 Platform Required 충족 여부.  
**실패:** Platform 결함이 아니라 System 미달 → Calibration 복귀.  
**STEP6 Engine:** 도구/증거 후보 · Platform 권위 대체 아님.  
**STEP8 B8:** Fleet Closure Validation과 별개.

```text
Gap Analysis → Calibration → Validation
                    ↑             │
                    └──── FAIL ───┘
                          │
                        PASS → Certification
```

---

## 6. PASS / Certified / Production Ready Definition

| Term | Definition |
|------|------------|
| **Validation PASS** | Platform Required Validation 조건 충족 |
| **Certification PASS** | Validation PASS + Certification Required 충족 |
| **Certified** | Certification PASS 결과 System **상태** |
| **Production Ready** | Certified **이후** 실데이터 입력 직전 상태 |

**Sequence:** `Certified → Production Ready → 실데이터 입력`

**Non-PASS outcomes (용어):** FAIL · HOLD · CONDITIONAL · DEFERRED  
(Verdict/State 단일 체계는 Phase 2.5 §5 권위.)

---

## 7. Definition Principles (DP-01…DP-12)

| ID | Principle | Statement |
|----|-----------|-----------|
| **DP-01** | **One vocabulary** | Glossary 외 의미로 핵심 용어 사용 금지 |
| **DP-02** | **Definition before Rule detail** | 용어·의미가 Rule/Checklist/Matrix보다 앞섬 |
| **DP-03** | **Actors certify** | Certificate = Actor가 Platform을 System에 적용한 결과 |
| **DP-04** | **Contract = authority boundary** | 근거·비근거를 가름 |
| **DP-05** | **Workflow = order only (here)** | 본 Phase는 순서·불변식까지 |
| **DP-06** | **Gap precedes Calibration** | 순서 역전 금지 |
| **DP-07** | **Validate does not mutate** | 판정 단계 silent mutation 금지 |
| **DP-08** | **Calibrate System only** | Platform·peer System 수정 금지 |
| **DP-09** | **Certified ≠ Production Ready** | 상태 병합 금지 |
| **DP-10** | **Definition ≠ Freeze** | 본 산출은 Definition |
| **DP-11** | **No Baseline rewrite** | STEP8 / Architecture / Calculation Rules 재정의 금지 |
| **DP-12** | **Carry is inventory** | 기본 non-blocking · Explicit 처리 전 Required 아님 |

---

## 8. Open Decisions (Phase 1 시점)

| ID | Decision | Close in |
|----|----------|----------|
| OD-01 | Corpus N | Freeze 입력 → Design CLOSED in 2.5 |
| OD-02 | Production Ready 최소 조건 | Pilot 전 |
| OD-03 | Carry mapping | Rule Phase |
| OD-04 | Platform 문서 경로 | Persist → CLOSED in 2.5 |
| OD-05 | Pilot 선정 | Pilot 전 |
| OD-06 | STEP6 Engine Required? | Rule Phase |
| OD-07 | Allow-list 열거 | Rule/Pilot 전 |
| OD-08 | Verdict enum | CLOSED in 2.5 |
| OD-09 | Wave vs System 기본 단위 | Pilot 전 |

---

## 9. Next Phase

```text
Phase 1 Definition PASS
        ↓
Phase 2 Freeze Review & Contract Review
```

---

## Gate Verdict

| Field | Value |
|-------|-------|
| **Gate** | STEP9 Phase 1 Certification Platform Definition |
| **Verdict** | **PASS** |
| **Fixed** | Vocabulary · Core Definitions · Contract/Workflow/Gap/Calibration/Validation/PASS/PR meanings |
| **Deferred** | Rule detail · Checklist · Matrix · Evidence · Report · Certificate · Freeze · Cert execution |
| **Not claimed** | Platform Frozen · System Certified · Production Ready |

---

*End of STEP9_P1_Platform_Definition.md — Persisted SSOT*
