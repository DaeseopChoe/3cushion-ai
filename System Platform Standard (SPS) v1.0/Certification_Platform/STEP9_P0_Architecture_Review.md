# STEP9 Phase 0 — Certification Platform Architecture Review

```text
Document   : STEP9_P0_Architecture_Review.md
Type       : Architecture Review (Final Revision · Persisted SSOT)
Date       : 2026-07-26
Status     : PASS · Persisted
Phase      : STEP9 Phase 0
Location   : System Platform Standard (SPS) v1.0/Certification_Platform/
Baseline   : Fleet Validation Standard (Final Gate v1.0) · Consume only
Progress   : 0% → 15% (Architecture Review + Refinement)
Rule       : Architecture clarity · No Contract/Workflow detail · No Freeze · No Cert
```

---

## 1. Architecture Summary

STEP9는 Fleet Apply를 반복하거나 시스템을 “검사”만 하는 단계가 아니다.  
**Certification Platform**을 STEP9 전체 SSOT로 세우고, 그 기준으로 각 System을  
**Gap Analysis → Calibration → Validation → Certification → Production Ready**까지 독립 완성한다.

| Statement | Architecture meaning |
|-----------|----------------------|
| **Platform does not certify** | Platform은 인증 **주체가 아니다** |
| **Platform defines how Certification is performed** | Platform은 Certification **How**의 기준(SSOT)이다 |
| **System is the subject** | Calibration·Validation·Certification·Production Ready의 **대상**은 System이다 |
| **Fleet ≠ Cert** | STEP8 Fleet Validation = 함대 Apply 종료 게이트 · STEP9 = 시스템 Production path |

**상위 흐름:**

```text
Gap Analysis → Calibration → Validation → Certification → Production Ready → 실데이터 입력
```

**Platform lifecycle (추천):**

```text
Architecture Review → Platform Definition → Platform Review → Platform Freeze
        → Pilot Certification → Fleet (Corpus) Certification
```

**Phase 0 완료 의미:** Phase 1 Platform Definition으로 이어질 Architecture가 충분함.  
**비의미:** Platform Frozen · System Cert 시작 가능.

**Baseline Consume (재정의 금지):** MASTER · LOG · Workflow v1.0 · HANDOFF · Final Gate + Ch.8–11 + B4–B8 Freeze/ADR · `3_SYSTEM_ARCHITECTURE.md` · `4_CALCULATION_RULES.md`.

---

## 2. Architecture Review

### 2.1 Fleet

**Fleet** = Inventory 시스템 **집합** + 공통 표준 체계  
(Contracts · Fleet Validation Standard · Ops Governance · Locked Validation surfaces).

Fleet Validation(STEP8)은 함대 Apply·거버넌스 **종료 게이트**이다.  
개별 System Production Ready를 선언하지 않는다.

### 2.2 System

**System** = Inventory ID(`SYS-NNN`) / `systemId`로 식별되는 **독립 계산·데이터 단위**.  
고유 System Logic / System Values를 가질 수 있다.  
Certification 목적은 전 시스템 공식 **동질화가 아니다**.

### 2.3 Certification Platform

**Platform** = 모든 시스템이 공통으로 참조하는 **Certification 평가 기준(SSOT)**.

| Platform IS | Platform IS NOT |
|-------------|-----------------|
| 평가 기준 · Gate · Rule 집합의 상위 틀 | 개별 시스템 패키지 |
| STEP9 전역 SSOT | Fleet Contract 본문 대체물 |
| “합격선 / How” | Runtime / Formula 엔진 자체 |
| 특정 System 때문에 바꾸지 않는 기준 | Calibration 수정 대상 |

### 2.4 Certification

Actors가 Platform을 적용하여 System에 대해 Gap→Calibration→Validation 후 **Certified**를 부여하는 **행위·과정**.

### 2.5 Production Ready

**Certified 이후**, 실데이터 입력 **직전** 운영 준비 상태.  
Certified와 **비동치**.

```text
Certified → Production Ready → 실데이터 입력
```

### 2.6 Scope / Boundary / Responsibility

**IN:** Platform 구축 · Corpus 내 독립 Cert 세션 · System-local Calibration · Platform 기준 판정.  
**OUT:** Fleet Apply 재개 · Platform을 System 때문에 변경 · Logic/Values 동질화 · Ratified chapter informal rewrite · OPEN-* 흡수.

**Corpus (Design):** Inventory Frozen = **SYS-001…038 (38)**. “40 Systems” = 프로그램 명칭.

| Actor | Owns |
|-------|------|
| **User** | 시스템 지정 · 실데이터 · 실계산 vs 예상 검증 |
| **Cursor / Agent** | Platform 기준 Gap/구조 · Calibration 지원 · Validation · Report |
| **Platform** | 공통 기준 · Gate · 판정 언어 |
| **System package** | 고유 Logic/Values + 허용된 local 수정 |

### 2.7 System Independent Certification

One System, one session (기본) · 수정은 해당 System만 · 타 System/Platform 부수 효과 금지 · 실패는 해당 Verdict에만 귀속.

### 2.8 Platform SSOT 원칙

Single Platform · Stable under corpus · Consume Fleet Baseline · Issue/Amendment path only · No Phase-0 detail theater.

---

## 3. Architecture Principles (AP-01…AP-13)

| ID | Principle | Statement |
|----|-----------|-----------|
| **AP-01** | **Platform ≠ Certifier** | Platform does not certify. Platform defines how Certification is performed. |
| **AP-02** | **Platform = STEP9 SSOT** | Corpus 전 시스템이 동일 Platform을 기준으로 Cert된다. |
| **AP-03** | **System = Subject** | Gap·Calibration·Validation·Certification·Production Ready의 대상은 System이다. |
| **AP-04** | **Evaluate vs Mutate** | Platform = 평가 기준 · System = 수정 대상. |
| **AP-05** | **Platform Stability** | 특정 System 실패·오차로 Platform을 변경하지 않는다. |
| **AP-06** | **Uniqueness Preserved** | System Logic / Values 고유성 유지 · 동질화 금지. |
| **AP-07** | **Meaning Preservation** | Formula / Value / Trajectory 의미 silent rewrite 금지. |
| **AP-08** | **Independence** | System Cert는 독립 세션 · 타 System/Platform 부수 효과 금지. |
| **AP-09** | **Ordered Cert Path** | Gap Analysis → Calibration → Validation → Certification → Production Ready. |
| **AP-10** | **Certified ≠ Production Ready** | Production Ready는 Cert 이후 실입력 직전 상태. |
| **AP-11** | **Definition before Freeze** | Architecture → Definition → Review → Freeze → Pilot → Fleet Cert. |
| **AP-12** | **Fleet Baseline Consume** | Final Gate · Ch.8–11 · Ops · Architecture/Calculation Rules 재정의 금지. |
| **AP-13** | **No Phase-0 Detail Theater** | Contract/Workflow 상세 · Checklist · Matrix · Certificate Record는 Phase 0에서 만들지 않음. |

---

## 4. Architecture Recommendations

1. “Platform certifies” 표현 금지 → “Certification against Platform”.  
2. Phase 1 = Platform Definition only · Freeze/Pilot 비혼합.  
3. Gap Analysis를 필수 선행 단계로 유지.  
4. Production Ready를 Cert PASS와 분리.  
5. Platform 변경 요구 시 System Calibration 먼저.  
6. Corpus N은 Inventory cite로 잠금.

---

## 5. Open Decisions (Phase 0 시점 · 후속 폐쇄)

| ID | Decision | Needed by |
|----|----------|-----------|
| OD-01 | Corpus N | Definition / Freeze |
| OD-02 | Production Ready 최소 조건 | Definition+ |
| OD-03 | Carry 처리 | Rules |
| OD-04 | Platform 문서 위치 | Persist |
| OD-05 | Pilot 선정 | Pilot 전 |
| OD-06 | STEP6 Engine 필수 여부 | Validation Rule |

---

## 6. Next Phase

```text
Phase 0 Architecture Review PASS
        ↓
Phase 1 Certification Platform Definition
```

---

## Gate Verdict

| Field | Value |
|-------|-------|
| **Gate** | STEP9 Phase 0 Architecture Review (+ Refinement) |
| **Verdict** | **PASS** |
| **Next** | Phase 1 Platform Definition |
| **Not claimed** | Platform Defined · Frozen · System Certified |

---

*End of STEP9_P0_Architecture_Review.md — Persisted SSOT*
