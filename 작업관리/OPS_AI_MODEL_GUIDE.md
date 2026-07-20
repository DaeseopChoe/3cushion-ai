# OPS_AI_MODEL_GUIDE.md

```text
Document  : OPS_AI_MODEL_GUIDE.md
Type      : Operations SSOT (AI Usage Guidance)
Layer     : Operations — NOT Project SSOT
Version   : v0.1
Status    : Active Draft
Date      : 2026-07-20
Owner     : Project Operations
Rule      : Recommendation only · Never mandatory · Never Gate/PASS/FAIL ·
            Never mutates Project SSOT · Runtime · System JSON · Register
Family    : OPS_* (extensible Operations documentation hierarchy)
```

---

## 0. Filename Rationale

| Choice | `OPS_AI_MODEL_GUIDE.md` |
|--------|-------------------------|
| Why | `OPS_` = Operations layer prefix (extensible family). `AI_MODEL` = this guide’s subject. `GUIDE` = non-binding operational guidance (not Gate, not Project state). |
| Not chosen | `OPS_AI_USAGE_GUIDE.md` — broader than current scope (chat style, prompts, etc.). `OPS_OPERATION_GUIDE.md` — too generic; would become a dump for unrelated ops. |
| Extension path | Sibling docs later: e.g. `OPS_SESSION_ENTRY.md`, `OPS_VALIDATION_CHECKLIST.md`, under the same `OPS_*` hierarchy. Optional index: `OPS_README.md` (future). |

---

## 1. Purpose

본 문서는 **미래 Session / IU 착수 전**에 AI가 작업 난이도를 평가하고  
**권장 모델 모드(Instant / Thinking)** 를 제안하기 위한 **Operations SSOT**이다.

```text
Project SSOT (MASTER · LOG · HANDOFF · Decomposition …)
        ≠
Operations SSOT (OPS_* · this document)
```

- Project SSOT = 무엇가 완료·현재 상태인가  
- Operations SSOT = 세션을 **어떻게 운영**할 것인가 (도구·절차 가이드)

---

## 2. Ownership

| Field | Value |
|-------|-------|
| **Owner** | Project Operations |
| **Consumers** | Cursor Agent · Human operator · Session Entry checklist (cite only) |
| **Authority** | Operations guidance only |
| **Does not own** | Project state · IU Done · VG Gate · Runtime · System JSON · Register |

Amendments: new Ops Session; silent rewrite of Project SSOT via this file is forbidden.

---

## 3. Scope

### In Scope

| # | Item |
|---|------|
| 1 | AI model recommendation policy (Instant / Thinking) |
| 2 | Difficulty classification (LOW / MEDIUM / HIGH) |
| 3 | Session Entry recommendation behavior |
| 4 | Mid-session recommendation update (optional) |
| 5 | Recommendation principles (non-binding) |
| 6 | Future `OPS_*` extension notes |

### Out of Scope

| # | Item |
|---|------|
| 1 | PROJECT_MASTER_INDEX / PROJECT_LOG / CURSOR_SESSION_HANDOFF content |
| 2 | DEVELOPMENT_WORKFLOW body (may **cite** this OPS doc later; not edited by this file) |
| 3 | IU Done · VG-* PASS/FAIL criteria |
| 4 | P4 Planning rules · D-GAP · Change Design · Resolution |
| 5 | Runtime / System JSON / Register / Analysis mutation |
| 6 | Mandatory model lock · quota / billing policy |
| 7 | Specific vendor model slug mandates (Claude/GPT SKU names) |

---

## 4. AI Model Recommendation Policy

| ID | Policy |
|----|--------|
| **AMP-01** | Before starting a **new Session** or **new IU**, the Agent **SHOULD** emit one model recommendation. |
| **AMP-02** | Recommendation is **advisory only**. It is **never mandatory**. |
| **AMP-03** | User override is **always allowed** with no penalty. |
| **AMP-04** | Recommendation is **never** an input to IU Done, VG-*, Freeze Gate, or any PASS/FAIL. |
| **AMP-05** | Recommendation **MUST NOT** modify Project SSOT, Runtime, System JSON, or Registers. |
| **AMP-06** | Output **SHOULD** be short: difficulty + recommended mode + **1–3 lines** rationale. |
| **AMP-07** | If uncertain, prefer stating uncertainty and a **conservative (Thinking)** lean — still non-binding. |

### Output shape (recommended)

```text
Difficulty     : LOW | MEDIUM | HIGH
Recommended    : Instant | Thinking
Rationale      : (1–3 short lines)
Nature         : Recommendation only · override OK · not a Gate
```

---

## 5. Difficulty Classification

Classification is a **heuristic for recommendation**, not an audit score.

### LOW

| Signal (examples) | Typical work |
|-------------------|--------------|
| Single IU · docs-only · fixed template sections | Scope cite, Principles list, Review checklist fill |
| No Runtime/JSON · no new architecture decision | Ops sync wording, handoff checklist tick |
| Consume-only · RO analysis | Read + summarize existing SSOT |

### MEDIUM

| Signal (examples) | Typical work |
|-------------------|--------------|
| Multi-section design draft · cross-doc consistency | Mapping rules, Taxonomy, Workflow stages |
| Several constraints · trace across 2–4 artifacts | Gate criteria drafting, Cross-review prep |
| Still docs/planning · no code/JSON apply | P4-style Planning IUs |

### HIGH

| Signal (examples) | Typical work |
|-------------------|--------------|
| Runtime / System JSON / Contract / Engine touch | Apply IU, migration, schema align patches |
| Cross-phase contradiction hunt · VG with many artifacts | Large cross review, freeze package |
| Ambiguous ownership · high regression risk | Change Design with multiple Gap coupling |

> Bands may overlap. When in doubt between two bands, state both and lean **higher** for recommendation only.

---

## 6. Recommended Model Selection

Modes are **capability bands**, not vendor product SKUs.

### Instant

| Use when | Avoid when |
|----------|------------|
| LOW difficulty dominant | Deep cross-file contradiction analysis |
| Short, structured fill-in | Multi-hop design with many constraints |
| Fast iteration on known template | Runtime/JSON apply or high regression risk |

### Thinking

| Use when | Avoid treating as |
|----------|-------------------|
| MEDIUM or HIGH difficulty | Mandatory for all Sessions |
| Cross-review · Gate design · Workflow/dependency rules | A substitute for human approval |
| Change Design / Apply / Validation-heavy work | A PASS/FAIL condition |

### Mapping hint (non-binding)

| Difficulty | Default recommendation |
|------------|------------------------|
| LOW | **Instant** |
| MEDIUM | **Thinking** (or Instant if user prefers speed and scope is narrow) |
| HIGH | **Thinking** |

---

## 7. Session Entry Recommendation

At **Session / IU Entry** (before Agent Task body):

1. Identify Session ID · IU · Phase (from Handoff / user prompt) — cite only.  
2. Classify difficulty (LOW / MEDIUM / HIGH) using §5.  
3. Recommend Instant or Thinking using §6.  
4. Print §4 output shape (1–3 line rationale).  
5. Proceed with user-chosen (or default) mode — **no blocking wait** unless user asks to stop.

**Do not** delay Entry on missing model switch.  
**Do not** record recommendation as Project SSOT state.

---

## 8. Mid-session Recommendation Update

Optional. Emit an **updated** recommendation when work **materially changes** band:

| Trigger (examples) | Action |
|--------------------|--------|
| Docs-only IU expands into Runtime/JSON apply | Re-classify → often HIGH / Thinking |
| User narrows scope to single template fill | Re-classify → often LOW / Instant |
| VG / Cross Review added mid-flight | Re-classify → MEDIUM–HIGH / Thinking |

Rules:

- Still **recommendation only**.  
- Do not spam; update only on material scope change.  
- Do not tie update to Gate re-open unless user requests review.

---

## 9. Recommendation Principles

| ID | Principle |
|----|-----------|
| **RP-01** | **Recommend, don’t command.** |
| **RP-02** | **User override always wins.** |
| **RP-03** | **Never Gate-coupled** — no PASS/FAIL / VG / Freeze dependency. |
| **RP-04** | **Never Project-SSOT-coupled** — no MASTER/LOG/HANDOFF mutation from this rule alone. |
| **RP-05** | **Never Runtime-coupled** — no code/JSON/Register side effects. |
| **RP-06** | **Short rationale** — 1–3 lines; no essay. |
| **RP-07** | **Conservative when unsure** — lean Thinking; still non-binding. |
| **RP-08** | **One concern** — model advice ≠ IU design content. |

---

## 10. Future Extension

This file is the **first** document in the `OPS_*` Operations hierarchy.

### Intended hierarchy (future · not created here)

```text
작업관리/
  OPS_AI_MODEL_GUIDE.md          ← this document (v0.1)
  OPS_README.md                  ← (future) Ops index / reading order
  OPS_SESSION_ENTRY.md           ← (future) Session Entry checklist ops
  OPS_VALIDATION_CHECKLIST.md    ← (future) ops-side checklists (≠ VG body)
  OPS_CURSOR_WORKFLOW.md         ← (future) Cursor-specific operator habits
  DEVELOPMENT_WORKFLOW.md        ← existing Ops SSOT (cite OPS_* ; do not merge blindly)
```

### Extension rules

| ID | Rule |
|----|------|
| **FE-01** | New operational topics → new `OPS_<TOPIC>_*.md` (or section in index), not Project SSOT. |
| **FE-02** | Project state changes stay in MASTER / LOG / HANDOFF. |
| **FE-03** | Gate / IU Done criteria stay in Decomposition / Phase Review docs — not in OPS AI guide. |
| **FE-04** | Cross-links: Ops → Project = **cite only**; Project may cite Ops with one line later (separate Session). |
| **FE-05** | This guide may grow sections for additional AI habits only if they remain **non-Gate** recommendations. |

---

## 11. Document Control

| Item | Value |
|------|-------|
| Version | **v0.1** |
| Status | **Active Draft** |
| Layer | **Operations SSOT** |
| Freeze | Not a Project Freeze surface |
| Next | Optional: HANDOFF checklist cite · DEVELOPMENT_WORKFLOW § cite (separate Sessions) |

### Revision History

| Version | Date | Change |
|---------|------|--------|
| v0.1 | 2026-07-20 | Initial OPS AI Model Guide — Recommendation Policy · Difficulty · Instant/Thinking · Entry/Mid-session · Extension |

---

*End of OPS_AI_MODEL_GUIDE.md v0.1 — Operations layer only · Recommendation only · no commit*
