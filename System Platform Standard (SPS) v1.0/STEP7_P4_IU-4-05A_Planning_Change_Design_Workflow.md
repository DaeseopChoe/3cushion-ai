# STEP7_P4_IU-4-05A_Planning_Change_Design_Workflow.md

```text
Document  : STEP7_P4_IU-4-05A_Planning_Change_Design_Workflow.md
Version   : v1.0
Status    : Complete · Official
Date      : 2026-07-20
STEP      : STEP7 / Phase P4 Standardization Plan
Session   : S7-P4-IU-4-05A
IU        : IU-4-05A
Owner     : System Standardization / Planning
Type      : Planning → Change Design Workflow
Depends on: IU-4-01A … IU-4-04A (PASS)
Rule      : Define Planning → Change Design handoff stages & transitions only ·
            No Change Design body · No Resolution / Apply / Verification detail ·
            No prior IU / D-GAP / Runtime / System JSON mutation
VG-P4     : PASS (Cross Review)
```

---

## 1. Workflow Objective

본 Workflow의 목적은  
P4 Standardization Plan 산출물이 **후속 Change Design 단계로 어떻게 전달되는지**  
**Stage와 Transition 경로만** 정의하는 것이다.

답하는 질문:

> “Planning 결과를 Change Design 착수 조건으로 **어떤 단계·전이로 넘기는가?**”

답하지 않는 질문:

- Change Design을 **무엇으로** 쓸 것인가 (내용)
- Resolution / Apply / Verification을 **어떻게** 수행할 것인가 (절차 본문)
- Gap을 **어떻게 해결**할 것인가 (설계)

Workflow = **전달 경로**.  
Design / Apply / Verification ≠ Workflow.

---

## 2. Workflow Entry Conditions

| ID | Entry Condition |
|----|-----------------|
| **E-01** | IU-4-01A Scope = **PASS** |
| **E-02** | IU-4-02A Principles = **PASS** |
| **E-03** | IU-4-03A Gap → Planning Mapping = **PASS** |
| **E-04** | IU-4-04A Planning Disposition Taxonomy = **PASS** |
| **E-05** | Target Gap이 D-GAP-R에 존재한다 (`DGR-NNN`) |
| **E-06** | Mapping상 `planningState` = **`Plan-Include`** (Defer/Out은 본 Workflow 진입 대상 아님) |
| **E-07** | `dispositionCategory` Primary가 Taxonomy(PD-01…PD-14) 중 하나로 **지정 가능**한 상태 |
| **E-08** | Runtime / System JSON / Register / Analysis에 대한 **선행 무단 변경 없음** |
| **E-09** | Severity Lock은 **요구하지 않는다** (Candidate hint만으로 진입 가능) |

**Non-Entry:**

| State / Case | Action |
|--------------|--------|
| `Plan-Defer` | 후속 Phase/IU 대기 — 본 Workflow 미진입 |
| `Plan-Out` | Workflow 대상 제외 |
| Mapping/Taxonomy 미완 | P4 Plan 잔여 — 진입 금지 |
| Change Design 본문부터 착수 | 금지 (Workflow Stage 순서 위반) |

---

## 3. Workflow Stages

```text
W0 Plan Complete
        ↓
W1 Planning Package Ready
        ↓
W2 Change Design Entry Gate
        ↓
W3 Change Design Authored          ← stage exists; body NOT defined here
        ↓
W4 Change Design Review Gate
        ↓
W5 Apply-Ready Handoff             ← handoff only; Apply procedure NOT defined here
```

| Stage | Name | Meaning (path only) |
|-------|------|---------------------|
| **W0** | Plan Complete | P4 Plan 경계·원칙·Mapping·Taxonomy가 PASS로 존재 |
| **W1** | Planning Package Ready | 대상 `DGR-NNN`에 대해 Planning 연결 정보(Package)가 후속으로 넘길 준비가 됨 |
| **W2** | Change Design Entry Gate | Change Design Session 착수 **허용/거부** 판정 |
| **W3** | Change Design Authored | Change Design 산출물이 **작성되는 단계** (본문 범위는 본 IU 밖) |
| **W4** | Change Design Review Gate | Change Design Review **PASS/FAIL** 판정 단계 |
| **W5** | Apply-Ready Handoff | Apply Phase/IU로 **인계만** 수행 (Apply 절차 본문 없음) |

### Planning Package (W1) — contents list only

| Package Item | Source |
|--------------|--------|
| `gapId` (`DGR-NNN`) | D-GAP-R cite |
| `dGapAId` | D-GAP-A cite |
| `planningState` | IU-4-03A Mapping |
| `planningSlot` | IU-4-03A Mapping |
| `dispositionCategory` | IU-4-04A Taxonomy |
| Scope / Principles cite | IU-4-01A / IU-4-02A |
| Forbidden cite | Runtime / JSON / Freeze surfaces RO |

---

## 4. Stage Transition Rules

| ID | From → To | Rule |
|----|-----------|------|
| **TR-01** | — → **W0** | E-01…E-04 충족 시에만 Plan Complete로 본다. |
| **TR-02** | **W0 → W1** | 대상 Gap이 E-05…E-07을 충족하고 Planning Package 항목이 식별 가능할 때만. |
| **TR-03** | **W1 → W2** | Package가 완전하고, Forbidden(E-08) 위반이 없을 때만 Entry Gate로 이동. |
| **TR-04** | **W2 → W3** | Entry Gate **PASS**일 때만 Change Design Authored로 진행. |
| **TR-05** | **W2 → (stop)** | Entry Gate **FAIL**이면 W3 금지. Plan/Package 보정 후 W1부터 재시도. |
| **TR-06** | **W3 → W4** | Change Design 산출물 **존재**가 확인될 때만 Review Gate로 이동. |
| **TR-07** | **W4 → W5** | Review Gate **PASS**일 때만 Apply-Ready Handoff. |
| **TR-08** | **W4 → W3** | Review Gate **FAIL**이면 Apply 금지. Change Design 재작성(W3)만 허용. |
| **TR-09** | **W5 → (next Phase/IU)** | Handoff cite만 전달. Apply/Verification 세부 절차는 후속 IU에서 정의. |
| **TR-10** | Skip 금지 | W0→W3, W1→W5, W2→W5 등 **Stage skip 금지**. |
| **TR-11** | Reverse silent 금지 | 승인 없는 W5→W3 역행·silent reopen 금지. FAIL 경로(TR-05/TR-08)만 허용. |
| **TR-12** | One Gap / One Path | 전이 단위는 `DGR-NNN` 단건 Primary path. 묶음 skip으로 Gate 우회 금지. |

### Entry Gate (W2) checklist (gate only · no design)

| Check | PASS if |
|-------|---------|
| G1 | `planningState` = `Plan-Include` |
| G2 | `dispositionCategory` ∈ PD-01…PD-14 |
| G3 | Planning Package items present as cites |
| G4 | No Resolution/Change Design body required at this gate |
| G5 | No Runtime/System JSON mutation requested by Plan alone |

---

## 5. Workflow Constraints

| ID | Constraint |
|----|------------|
| **WC-01** | IU-4-01A / 02A / 03A / 04A 변경 금지. |
| **WC-02** | D-GAP-A / D-GAP-R 변경 금지. |
| **WC-03** | Resolution Design 금지. |
| **WC-04** | Change Design **내용** 작성 금지 (W3는 단계 존재만 정의). |
| **WC-05** | Implementation 설계 금지. |
| **WC-06** | Apply 절차 작성 금지. |
| **WC-07** | Verification 절차 작성 금지. |
| **WC-08** | Severity Lock 금지. |
| **WC-09** | Register 수정 금지. |
| **WC-10** | Runtime / System JSON / Analysis 변경 금지. |
| **WC-11** | Workflow는 Stage·Transition만 정의. Stage별 설계 본문 금지. |
| **WC-12** | 본 Workflow PASS가 Change Design PASS / Apply PASS를 의미하지 않는다. |
| **WC-13** | 산출물은 Workflow **단일**만 허용. |

---

## 6. Success Criteria

| # | Criterion |
|---|-----------|
| 1 | Workflow Objective가 Planning → Change Design **전달 경로**만 서술한다. |
| 2 | Entry Conditions(E-01…E-09)가 선행 P4 PASS 및 `Plan-Include`를 요구한다. |
| 3 | Stages(W0…W5)가 순서 있는 handoff chain으로 정의된다. |
| 4 | Transition Rules가 skip 금지 · Gate FAIL 경로 · 단건 `DGR-NNN` path를 포함한다. |
| 5 | W3/W5에서 Change Design·Apply **본문/절차가 비어 있음**이 명시된다. |
| 6 | Workflow Constraints가 선행 IU/D-GAP RO 및 Resolution·Change Design 내용·Apply/Verification 금지를 포함한다. |
| 7 | 산출물이 Planning → Change Design Workflow **한 개**뿐이다. |

```text
IU-4-05A = Planning → Change Design Workflow (stages + transitions) only
Path = W0 → W1 → W2 → W3 → W4 → W5
Status = Complete · Official · VG-P4 PASS
```

---

*End of STEP7_P4_IU-4-05A_Planning_Change_Design_Workflow.md v1.0*
