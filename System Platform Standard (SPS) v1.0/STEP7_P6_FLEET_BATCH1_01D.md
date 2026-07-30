# STEP7 P6 Fleet

## STEP7_P6_FLEET_BATCH1_01D
Fleet Batch 1 — Change Design Authoring (W3) (Design-only)

```text
Document   : STEP7_P6_FLEET_BATCH1_01D.md
Version    : v0.1 (Draft)
Status     : Draft · Design-only · Change Design Authoring (W3)
Date       : 2026-07-21
STEP       : STEP7 / Phase P6 Fleet
Session    : S7-P6-FLEET-BATCH1-01D
             (Decomposition §3 batch naming equivalent: S7-P6-IU-6-1-01D · batch N=1)
Batch      : Fleet Batch 1
Owner      : System Standardization / Fleet Execution
Type       : Change Design Authoring (W3) — 변경 설계서 (Design narrative only)
Depends on : STEP7_P6_FLEET_BATCH1_01A/01B/01C (Complete) · STEP7 P5 Suite (IU-5-01A…05A) ·
             STEP7 P6 Apply Decision Suite (IU-6-01A…06A) · WG-AI-001 (PASS) · D-GAP-R (DGR-010)
Rule       : Consume Only · No new Rule · No WG-AI-001 redefinition ·
             No Framework / Pipeline change · No Runtime / Registry / Loader / Contract change ·
             No System JSON change · No directory rename · No Change Package creation ·
             No Apply · No Verification · No Git Commit / Push
Next       : STEP7_P6_FLEET_BATCH1_01E (Batch 1 Change Design Review — W4 · subsequent session)
```

---

## 0. Baseline

본 세션 작성 시점의 Baseline은 다음과 같으며, 본 문서는 이를 그대로 Consume하고 변경하지 않는다.

- **STEP7_P6_FLEET_BATCH1_01A Complete** (Fleet Entry · Batch 구조 · Entry Gate)
- **STEP7_P6_FLEET_BATCH1_01B Complete** (Apply Candidate Design · AC-B1-01 · Draft / Not Ready)
- **STEP7_P6_FLEET_BATCH1_01C Complete** (Change Design Entry · Scope · Workflow · Readiness)
- STEP7 P5 Change Design Complete (IU-5-01A ~ IU-5-05A PASS)
- STEP7 P6 Apply Decision Complete · Design-only (IU-6-01A ~ IU-6-06A)
- WG-AI-001 PASS (Freeze Candidate · Consume)
- Runtime Baseline `ec71ef9` **unchanged** · Architecture Locked · Design-only 유지

본 문서는 STEP7 P6 Fleet **Batch 1의 네 번째 세션**이며,
Batch 1 Candidate(AC-B1-01 / DGR-010)에 대한 **Change Design(변경 설계서)** 를 작성하는 W3 단계이다.
본 문서는 향후 Apply에서 사용할 **설계서**를 작성할 뿐, Change Package를 구현하거나 실제 변경을 수행하지 않는다.

---

## 1. Document Purpose

본 문서의 목적은 Batch 1 Candidate(AC-B1-01 / DGR-010)에 대한 **Change Design(변경 설계)** 를 작성하는 것이다.

본 문서가 답하는 질문:

> "DGR-010을 표준에 정합시키기 위한 변경은 어떤 개념·단위·영향·Rollback·Validation 관점으로 설계되는가?"

본 문서가 답하지 않는 질문:

- 실제 리네임/수정을 **언제·어떤 명령으로** 적용하는가 (Apply Execution)
- Change Package(CP) 인스턴스를 어떻게 **생성/패키징**하는가 (본 문서는 CP 생성 없음)

본 문서는 Change Design **설계서(narrative)** 만 작성한다.
실제 System JSON / directory / code 수정은 수행하지 않으며(IU-4-05A WC-04/WC-10 준수), Change Package 생성·Apply·Verification은 후속 단계에서 수행한다.

> **근거 표기 규칙:** 본 문서 §2·§3의 "현재 상태 / 영향 범위"는 저장소 **관측(observed) 사실**을 Consume한 것이다(코드/JSON RO 조회). 새로운 분석 Rule을 정의하지 않으며, Impact Level / Risk / Review Level의 **최종 판정은 수행하지 않는다**(WG-AI-001 Consume · 후속 IMP/Review 단계).

---

## 2. 변경 대상 (Change Target)

| 항목 | 값 |
|------|-----|
| Candidate | **AC-B1-01** (01B) |
| Gap | **DGR-010** — Directory naming casing (`Plus_5_system`) |
| Change Design ref (design only) | **CD-B1-01** (설계 식별자 · CP 인스턴스 아님) |
| Disposition Category (hint only) | PD-08 `NamingNormalize` (IU-4-04A) |

### 2.1 현재 상태 (Observed · RO)

| 관측 대상 | 현재 값 |
|-----------|---------|
| Directory | `frontend/src/data/systems/**Plus_5_system**/` (대문자 `P`) |
| `system_meta.json.system_id` | `"Plus_5_system"` |
| `profile.json.system` | `"Plus_5_system"` |
| Registry systemId key | `Plus_5_system` — **디렉토리명에서 파생** (`systemPackageStore.ts` glob `/(data/systems)/([^/]+)/profile.json`) |
| 네이밍 관례 대비 | 인접 시스템은 소문자(`plus_system` · `plus2_system` · `minus_5_system`) → `Plus_5_system`만 casing 비관례 (DGR-010) |
| 관측된 참조 (RO) | `utils/aiPlayStrategyBuilder.ts` · `components/overlays/SysOverlay.jsx` (라이브) · `App.jsx.working` (백업 · 라이브 아님) |
| 4-file 패키지 완결성 | profile / anchors / logic / system_meta **모두 존재** (packageComplete) |

### 2.2 목표 상태 (Target · 설계 의도)

| 대상 | 목표 값 |
|------|---------|
| Directory | naming convention 정합 (소문자 예: `plus_5_system`) — **최종 표기는 W3 설계 확정/Review 대상** |
| `system_meta.json.system_id` | directory와 동일 정합 값 |
| `profile.json.system` | directory와 동일 정합 값 |
| Registry systemId key | directory 파생 → 목표 naming으로 일관 |
| 충돌 여부 (Observed) | 소문자 `plus_5_system` 디렉토리는 **미존재** → 리네임 대상 충돌 없음 |

> 목표 표기(정확한 최종 문자열)는 본 설계에서 **후보로 제시**하며, 확정은 W4 Review에서 검토한다. 본 문서는 표기 강제·리네임 실행을 하지 않는다.

---

## 3. Change Design (CD-B1-01)

실제 수정은 하지 않는다. 아래는 설계 관점 서술이다.

### 3.1 변경 개념 (Change Concept)

- DGR-010은 표면상 "디렉토리 대소문자"이나, **Registry systemId 키가 디렉토리명에서 파생**되므로(관측 §2.1), 리네임은 **Identity(systemId) 정합 변경**을 수반한다.
- 따라서 Change Concept = "**Naming 정규화 + Identity 정합**": directory · `system_meta.system_id` · `profile.system` · systemId 참조를 **하나의 정합 단위**로 맞춘다.
- 계산/궤적/스키마 **내용**은 변경하지 않는다. Naming/Identity 경계에 국한한다.

### 3.2 변경 단위 (Change Unit)

Change Design은 아래 하위 항목을 **하나의 Primary Component(Package 경계 후보 = Identity/Package Naming)** 로 묶는다. (실제 CP 생성은 본 문서 밖 · IU-5-03A)

| # | 변경 단위 (설계 대상) | 성격 |
|---|------------------------|------|
| U1 | Directory rename (`Plus_5_system` → 목표 naming) | Package/Filesystem |
| U2 | `system_meta.json.system_id` 정합 | System JSON (Identity) |
| U3 | `profile.json.system` 정합 | System JSON (Identity) |
| U4 | 라이브 코드 systemId 참조 정합 (`aiPlayStrategyBuilder.ts` · `SysOverlay.jsx`) | Code reference |
| U5 | (검토) 저장 데이터 키 영향 확인 대상 — `positions_dataset` · published `dataset/{공략}/{시스템}/` · signatureKey(systemId+formulaHash+shotType) | Data (영향 식별) |

> U1…U4는 변경 설계 대상, U5는 **영향 식별/검토 대상**(데이터 마이그레이션 필요 여부는 W4 Review·Impact Analysis에서 판단). 본 문서는 데이터 수정을 설계·수행하지 않는다.

### 3.3 예상 영향 범위 (Expected Impact — candidate only)

WG-AI-001 Dimension을 **후보 표기**로만 기록한다. 최종 Y/N·Level 판정은 후속 IMP(IU-5-04A)·Review에서 수행한다.

| Dimension | 후보 | 근거 (Observed · candidate) |
|-----------|:---:|------------------------------|
| Runtime | 후보 Y | systemId 키가 디렉토리 파생 → 등록/조회 키 변경 가능 (`systemPackageStore.ts`) |
| Data | 후보 Y | systemId 기반 dataset 경로·signatureKey 매칭 영향 가능 (U5) |
| Interface | 후보 N | Contract 시그니처 자체 변경 아님 (키 값만) — 검토 필요 |
| Validation | 후보 N/검토 | packageComplete/Identity 검증 대상 여부 검토 |
| Performance | 후보 N | 성능 특성 변화 없음 |
| Architecture | 후보 N | Framework/Pipeline/Component 관계 변경 아님 |

> 참고(cite only): Runtime 후보 Y가 확정되면 WG-AI-001 §2 알고리즘상 Overall Impact Level이 상향(L3 방향)될 수 있고, Review Level도 상향될 수 있다. 본 문서는 이를 **후보로만 표기**하고 판정하지 않는다.

### 3.4 Rollback 관점

- U1 directory rename은 **역방향 rename**으로 복원 가능 (명확한 Rollback 경로) → Risk(Rollback) 후보 낮음.
- U2/U3 Identity 값은 이전 문자열로 복원 가능.
- U5 데이터 키 영향이 확인될 경우, Rollback 범위에 데이터 키 복원이 포함되어야 하는지 W4에서 판단.
- Change Package는 **독립 Rollback 가능**해야 한다(IU-5-03A §3). 본 설계는 U1…U4를 한 단위로 원자적 Apply/Rollback 하는 것을 후보로 제시한다.

### 3.5 Validation 관점

- Change Package는 **독립 Validation Scope**를 가진다(IU-5-03A §3).
- 후보 Validation 관점(설계): (a) Registry가 목표 systemId로 정상 등록/조회되는지, (b) 4-file 패키지 완결성 유지, (c) 라이브 참조(U4)가 목표 systemId로 정합되는지, (d) U5 데이터 키 정합/무영향 확인.
- 실제 Validation Rule/Procedure/Execution은 **P7 범위**이며 본 문서에서 수행하지 않는다(IU-6-06A Consume).

---

## 4. Design Review Point (확인 항목 · 판정 없음)

W4 Review에서 확인할 항목만 정의한다. 본 문서는 Review 판정(PASS/FAIL)을 수행하지 않는다.

| ID | Review 확인 항목 |
|----|------------------|
| RP-01 | 목표 naming 표기 확정 (소문자 규칙 · 최종 문자열) |
| RP-02 | Identity 정합 범위(U1…U4)가 상호 일치하도록 설계되었는가 |
| RP-03 | Runtime/Data 후보 Y에 대한 Impact Analysis(IU-5-04A IMP) 필요성 확인 |
| RP-04 | U5 저장 데이터 키 영향(마이그레이션 필요 여부) 판단 |
| RP-05 | Rollback 원자성(U1…U4 한 단위) 적정성 |
| RP-06 | Validation Scope(§3.5) 충분성 |
| RP-07 | 변경 제외 범위(계산/스키마 내용 불변) 준수 여부 |
| RP-08 | Change Package 경계 단일 Primary Component 원칙 준수 (IU-5-03A §3) |

---

## 5. Apply Preparation (준비사항 · 실행 없음)

Apply 이전 준비사항만 정리한다. 본 문서는 Apply를 수행하지 않는다.

| ID | 준비 항목 | 상태 |
|----|-----------|:---:|
| AP-01 | Change Design(CD-B1-01) Review PASS (W4) | ⏳ pending |
| AP-02 | Change Package(CP) 인스턴스 생성 (IU-5-03A Manifest) | ⏳ pending |
| AP-03 | Impact Analysis Record(IMP) 생성 (IU-5-04A · WG-AI-001) | ⏳ pending |
| AP-04 | Apply Candidate(AC-B1-01) Lifecycle Ready 전이 (IU-6-02A) | ⏳ pending (현재 Draft) |
| AP-05 | Apply Readiness = Ready 판정 (IU-6-04A) | ⏳ pending (현재 Not Ready) |
| AP-06 | Apply Decision Outcome = Approved (IU-6-05A) | ⏳ pending |
| AP-07 | Rollback 경로 확정 · 데이터 키 영향(U5) 결론 | ⏳ pending |

> 위 준비 항목은 후속 세션(01E Review → Apply 단계)에서 순차 충족한다. 본 문서는 항목 정리만 수행한다.

---

## 6. Decision Log

| Decision | Statement |
|----------|-----------|
| **D-STEP7-P6-FLEET-B1-01D-01** | Batch 1 Change Design(CD-B1-01) **설계서 작성** · 실제 변경/Change Package 생성 없음 · Design-only |
| **D-STEP7-P6-FLEET-B1-01D-02** | DGR-010은 Naming 정규화 + **Identity 정합**(systemId 키가 디렉토리 파생) 변경으로 설계 |
| **D-STEP7-P6-FLEET-B1-01D-03** | 변경 단위 = U1 directory · U2 meta.system_id · U3 profile.system · U4 code ref · U5 데이터 키 영향(식별) |
| **D-STEP7-P6-FLEET-B1-01D-04** | Impact = **후보 표기만**(Runtime/Data 후보 Y) · Level/Risk/Review 판정은 후속 IMP/Review |
| **D-STEP7-P6-FLEET-B1-01D-05** | Review Point(RP-01…08) · Apply Preparation(AP-01…07) 정의 · 판정/실행 없음 |
| **D-STEP7-P6-FLEET-B1-01D-06** | 01A/01B/01C · P5 · P6 · WG-AI-001 · D-GAP-R **Consume Only** · 새 Rule / WG / Framework / Pipeline 변경 없음 |

---

## 7. Summary

Fleet Batch 1의 Change Design Authoring(W3) 세션으로서, Candidate AC-B1-01(DGR-010)에 대한 변경 설계서(CD-B1-01)를 작성하였다.
저장소 관측 사실을 Consume하여 현재 상태(디렉토리 `Plus_5_system` · `system_id`/`system` 대문자 · Registry systemId 키가 디렉토리명 파생)와 목표 상태(naming convention 정합)를 정리하고,
변경 개념(Naming 정규화 + Identity 정합) · 변경 단위(U1…U5) · 예상 영향 범위(Runtime/Data 후보 Y) · Rollback 관점 · Validation 관점을 설계 수준으로 서술하였다.
또한 Design Review Point(RP-01…08)와 Apply Preparation(AP-01…07)을 정의하였다.

본 문서는 Design-only 범위이며, System JSON / directory / code / Runtime / Registry / Loader / Framework / Pipeline 변경,
Change Package 생성, Apply, Verification, Git Commit / Push를 수행하지 않았다.
Impact Level / Risk / Review Level의 최종 판정은 수행하지 않았으며(WG-AI-001 Consume · 후속 IMP/Review),
모든 선행 산출물(01A/01B/01C · P5 / P6 Suite · WG-AI-001 · D-GAP-R)은 Consume Only로 사용하였다.

---

## 8. Deliverables

| # | Deliverable | Form | 상태 |
|---|-------------|------|------|
| 1 | Change Design (CD-B1-01) — 개념·단위·영향·Rollback·Validation | 본 문서 §3 | **작성 완료 (설계서)** |
| 2 | 변경 대상 현재/목표 상태 | 본 문서 §2 | **정리 완료** |
| 3 | Design Review Point (RP-01…08) | 본 문서 §4 | **정의 완료** (판정 없음) |
| 4 | Apply Preparation (AP-01…07) | 본 문서 §5 | **정리 완료** (실행 없음) |
| 5 | **STEP7_P6_FLEET_BATCH1_01D.md** | 본 문서 | **생성 (Draft)** |

> MASTER / LOG / HANDOFF 실제 반영은 본 세션에서 수행하지 않는다.

---

## 9. Explicit Non-Outputs

| Item | Status |
|------|--------|
| Runtime 변경 | **없음** (unchanged) |
| System JSON 변경 (`system_meta` / `profile` 등) | **없음** |
| Directory rename | **없음** |
| Code reference 수정 (`aiPlayStrategyBuilder.ts` / `SysOverlay.jsx`) | **없음** |
| Registry / Loader / Contract 변경 | **없음** |
| Framework / Pipeline 변경 | **없음** |
| Change Package (CP) 생성 · 패키징 | **없음** |
| Impact Analysis Record (IMP) 생성 · Impact/Level/Risk 판정 | **없음** (후보 표기만) |
| Apply Candidate 전이(Ready) · Apply Decision · Apply | **없음** |
| Review 판정 (W4 PASS/FAIL) | **없음** (확인 항목만) |
| Verification / Validation 수행 | **없음** (P7 범위) |
| Severity Lock | **없음** (Deferred 유지) |
| D-GAP-R row 변경 | **없음** (RO) |
| WG-AI-001 / P5 / P6 / 01A / 01B / 01C 문서 수정 | **없음** (Consume Only) |
| MASTER / LOG / HANDOFF 실제 반영 | **없음** |
| Git Commit / Push | **없음** |

---

## 10. Next Session

**STEP7_P6_FLEET_BATCH1_01E** — Batch 1 Change Design Review (W4)

Objective

본 문서에서 작성한 Change Design(CD-B1-01)에 대해 Review Point(RP-01…08)를 검토하고,
Change Design Review Gate(IU-4-05A W4) PASS/FAIL 판정을 수행한다.
(Runtime/Data 후보 Y에 대한 Impact Analysis 필요성 및 U5 데이터 키 영향 결론 포함.)

Next Session은

- WG-AI-001
- STEP7 P5 Suite (IU-5-01A…05A)
- STEP7 P6 Suite (IU-6-01A…06A)
- STEP7_P6_FLEET_BATCH1_01A · 01B · 01C · 01D (본 문서)
- D-GAP-R (DGR-010)

를 Consume하며, 새로운 Rule을 정의하지 않는다.
실제 Apply · Verification · System JSON 변경 · Git은 별도 후속 단계에서 수행한다.

---

*End of STEP7_P6_FLEET_BATCH1_01D.md v0.1 (Draft) — Change Design Authoring (W3) · Design-only*
