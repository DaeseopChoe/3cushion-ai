# DEVELOPMENT_WORKFLOW.md

```text
Document  : DEVELOPMENT_WORKFLOW.md
Version   : v0.2
Status    : Active Operational SSOT (Draft)
Date      : 2026-07-17
Type      : Project Operational Workflow SSOT
Owner     : Project Operations
Location  : 작업관리/DEVELOPMENT_WORKFLOW.md
Rule      : Document verified operating practice only · Do not invent new process theater
```

---

## 1. Purpose

### 1.1 Document purpose

본 문서는 3Cushion AI 프로젝트의 **운영(Operational Workflow) SSOT**이다.

| 본 문서가 하는 일 | 본 문서가 하지 않는 일 |
|-------------------|------------------------|
| 세션 시작·이관·Freeze·Git·SSOT 갱신 규칙 정의 | 기능 개발 절차서 / API 가이드 |
| AI 역할·컨텍스트·STEP 운영 철학 고정 | Architecture / Schema / Runtime 본문 대체 |
| 이미 합의·검증된 운영 방식 기록 | 미검증 신규 프로세스 발명 |

### 1.2 Role as Operational SSOT

```text
DEVELOPMENT_WORKFLOW.md     ← HOW we operate (this document)
PROJECT_MASTER_INDEX.md     ← WHAT is current (feature · stage SSOT)
PROJECT_LOG_YYYY-MM.md      ← WHEN / history
CURSOR_SESSION_HANDOFF.md   ← WHERE to enter next session
SPS / AAS design docs       ← Domain Architecture / Design SSOTs
```

운영 충돌 시:

1. **Frozen / Locked 설계 SSOT** (Framework · Pipeline · Inventory 등)의 불변 규칙  
2. **본 문서**의 운영 규칙  
3. 세션 Handoff의 Entry 지시  

순으로 해석한다. Handoff는 운영 SSOT를 재정의하지 못한다.

### 1.3 Operating philosophy

| Principle | Statement |
|-----------|-----------|
| **Truth over speed** | 상태·Freeze·SSOT를 속이지 않는다. |
| **Consume before invent** | Locked 문서는 소비하고, 무단 재작성하지 않는다. |
| **One STEP, one job** | 한 STEP에 Analysis와 Catalog와 Engine을 섞지 않는다. |
| **Document what we already do** | 검증된 관행만 올린다. v0.1은 확장 예고만 한다. |

---

## 2. Project Operating Principles

| ID | Principle | Rule |
|----|-----------|------|
| **P1** | **SSOT First** | 기능·단계·Entry는 `PROJECT_MASTER_INDEX` · Handoff · 해당 Design SSOT를 기준으로 한다. |
| **P2** | **Architecture First** | Runtime / Architecture Locked면 구현·문서가 Architecture를 우회하지 않는다. |
| **P3** | **Freeze Respect** | Frozen / Freeze Candidate / Locked 문서는 비공식 수정 금지. 변경은 ADR · Review · 후속 STEP. |
| **P4** | **Analysis → Design → Implementation** | Analysis Only 단계에서 Catalog·Engine·코드를 쓰지 않는다. |
| **P5** | **One Responsibility per STEP** | STEP 목적 밖의 산출물(Register·Report·Namespace 확정 등)을 섞지 않는다. |
| **P6** | **Analysis Only compliance** | Analysis STEP은 Domain/Type/Layer/Family/Dependency 등 **분석만**. 본문 Catalog 금지. |
| **P7** | **Consume Only when Locked** | Framework · Pipeline · Frozen Suite는 Consume. Semantics 재정의 금지. |
| **P8** | **Improvement absorption** | 가능하면 현재 STEP 재작성 대신 **다음 STEP 입력**으로 흡수한다 (§10). |
| **P9** | **Working Tree hygiene** | 마일스톤 Commit에 무관 잔여물·임시 파일을 섞지 않는다. |
| **P10** | **No silent mutation** | Validation / Audit / Inventory는 System JSON · Runtime을 몰래 고치지 않는다. |

---

## 3. AI Role Definition

역할은 **도구 브랜드가 아니라 책임 경계**다. 동일 도구가 여러 역할을 수행할 수 있으나, 한 세션의 주 책임은 하나로 둔다.

| Role | Typical tools | Owns | Does not own |
|------|---------------|------|--------------|
| **Architecture / Design / Review / Planning** | ChatGPT (및 동등) | 구조·원칙·STEP 계획·Review 판정 | 무단 Freeze 해제 · 대량 코드 커밋 |
| **Implementation / Documentation / Refactoring / Git** | Cursor (및 동등) | 코드·운영 문서·Commit/Push · Handoff 갱신 | Architecture 재정의 · Locked SSOT 무단 수정 |
| **Investigation / Architecture Review / Git Audit / Regression** | Codex (및 동등) | 조사·감사·회귀·상태 검증 | 범위 밖 대규모 재설계 |

### 3.1 Collaboration defaults

| Situation | Default owner |
|-----------|---------------|
| STEP Entry · Lock · Consume 범위 확정 | Planning / Handoff |
| Analysis Only 문서 | Cursor Documentation (Design 지시에 따름) |
| Catalog / Framework Design 본문 | Design + Cursor Documentation |
| Runtime / App 구현 | Cursor Implementation |
| “46 files / dirty tree / Freeze 위반?” | Investigation / Git Audit |
| Commit message · Push · SSOT sync | Cursor Git Operation |

---

## 4. Session Start Workflow

### 4.1 New session checklist

새 세션(또는 새 Agent 대화) 시작 시 **순서대로** 확인한다.

| # | Document | Purpose |
|---|----------|---------|
| 1 | **`DEVELOPMENT_WORKFLOW.md`** (본 문서) | 운영 규칙 |
| 2 | **`PROJECT_MASTER_INDEX.md`** | 현재 단계 · 완료/예정 SSOT |
| 3 | **`HISTORY/PROJECT_LOG_YYYY-MM.md`** | 최근 이력 · Decision Log |
| 4 | **`CURSOR_SESSION_HANDOFF.md`** | Entry · Lock · Allowed/Forbidden · Pending |
| 5 | Handoff가 지정한 **Consume SSOT** | 예: Framework · Pipeline · STEP6-3 Analysis |

```text
DEVELOPMENT_WORKFLOW
        ↓
PROJECT_MASTER_INDEX
        ↓
PROJECT_LOG (current month)
        ↓
CURSOR_SESSION_HANDOFF
        ↓
Consume Locked / Completed SSOTs (as listed)
        ↓
Confirm current stage + allowed work
        ↓
Start work
```

### 4.2 Before first edit

- [ ] Current STEP / Entry 확인  
- [ ] Locked / Frozen / Forbidden 목록 확인  
- [ ] 이번 세션 **단일 목적** 확인 (One Responsibility)  
- [ ] Working Tree가 목적과 무관한 잔여면 **정리 또는 분리 Commit** 방침 확인  

---

## 5. Session Context Rule

### 5.1 Do not re-read by default

**동일 AI 세션**에서는 이미 읽은 SSOT를 **관례적으로 다시 읽지 않는다**.  
현재 세션 컨텍스트를 우선 소비한다.

### 5.2 Re-sync triggers (only)

| Trigger | Action |
|---------|--------|
| **새 세션** | §4 Session Start Workflow 전체 |
| **SSOT 업데이트** (Commit/Push로 공식 반영됨) | 변경된 문서만 재읽기 |
| **사용자 재동기화 요청** | 지정 문서 재읽기 |
| **Entry / STAGE 전환** (예: STEP6-3 → STEP6-4) | Handoff + 새 Consume 목록 |

### 5.3 Anti-patterns

| Forbidden habit | Why |
|-----------------|-----|
| 매 턴 MASTER/LOG/Framework 전량 재독 | 컨텍스트·비용 낭비 · 운영 규칙 위반 |
| Handoff 무시하고 “처음부터 재분석” | STEP 목적 파괴 |
| Locked 문서를 “최신화” 명목으로 수정 | Freeze Respect 위반 |

---

## 6. AI Model Selection Rule

### 6.1 User does not pick models by default

사용자는 기본적으로 **모델을 고르지 않는다**.  
작업 성격에 따라 **에이전트(또는 라우터)가** 권장한다.

### 6.2 Recommendation guide

| Work character | Recommendation |
|----------------|----------------|
| 문서 반영 · Handoff · 단순 이동 · Commit/Push | **기본 모델 유지** |
| Analysis Only · Catalog Design · Architecture Review · Cascade/Dependency | **고추론 모델 권장** |
| 대규모 코드 리팩터 · 미지 버그 조사 · Git 감사 | **고추론 또는 Investigation 역할** |
| 기계적 일괄 rename · 형식만 맞추는 편집 | **기본 모델** |

### 6.3 Constraint

모델 선택은 **품질·위험도** 기준이다.  
“항상 최고 모델” 또는 “항상 최저 비용”을 운영 규칙으로 두지 않는다.

---

## 7. STEP Workflow

검증된 SPS / AAS 운영 패턴:

```text
Entry
  ↓
Analysis          ← Analysis Only 가능 (예: STEP6-3)
  ↓
Design            ← Catalog / Framework / Pipeline Design
  ↓
Implementation    ← 코드 · (해당 시) Engine
  ↓
Validation        ← Review · QA · Regression · Build gates
  ↓
Freeze            ← Freeze Candidate / Final Freeze / Lock
```

### 7.1 STEP gates (operational)

| Gate | Rule |
|------|------|
| **Entry** | Handoff + MASTER에 단계가 명시되어야 한다. |
| **Analysis** | Catalog 본문 · Register · Engine · Namespace 확정 금지 (해당 STEP이 Analysis Only인 경우). |
| **Design** | Locked 상위 SSOT Consume · Semantics 재정의 금지. |
| **Implementation** | Design / Freeze 범위만. Architecture 우회 금지. |
| **Validation** | PASS 기준은 해당 STEP SSOT / AC / Review에 따른다. |
| **Freeze** | 이후 비공식 수정 금지 (§12). |

### 7.2 Mixing ban

한 Commit / 한 세션 목적에 **Analysis + Catalog + Engine + Runtime**을 묶지 않는다.  
필요 시 Working Tree 정리 Commit과 Design Commit을 **분리**한다.

---

## 8. Git Workflow

### 8.1 Default sequence

```text
Work (scoped)
  ↓
Commit          ← 논리 단위 · 목적 외 파일 제외
  ↓
Push            ← main (또는 합의 브랜치) 최신화
  ↓
PROJECT_MASTER_INDEX   ← 단계·완료 상태 반영 (필요할 때)
  ↓
PROJECT_LOG            ← 세션/Decision 기록 (필요할 때)
  ↓
CURSOR_SESSION_HANDOFF ← 다음 Entry 갱신 (단계 전환 시)
```

### 8.2 Commit rules (operational)

| Rule | Statement |
|------|-----------|
| **Scope** | 한 Commit = 한 논리 목적 (예: STEP6 Freeze docs only). |
| **No dump** | 임시 `_update_*` · 무관 handoff · 미검증 실험을 마일스톤에 섞지 않는다. |
| **No force** | `main` force push 금지 (명시 요청 없는 한). |
| **No amend** | 실패·거절 후 amend로 덮지 않는다. 새 Commit. |
| **Hooks** | `--no-verify` 기본 금지. |

### 8.3 Push rules

- 마일스톤·SSOT 반영 후 **Push까지** 완료해야 다음 세션 Entry가 유효하다.  
- Local only Commit은 Handoff에 “미Push”를 명시하지 않는 한 **공식 상태로 취급하지 않는다**.

---

## 9. SSOT Update Rule

### 9.1 When to update which document

| Document | Update when | Do not update when |
|----------|-------------|---------------------|
| **PROJECT_MASTER_INDEX** | 단계 전환 · 기능/STEP 완료 · 다음 우선순위 변경 · SSOT 경로 추가 | 매 중간 초안 · 임시 실험 |
| **PROJECT_LOG_YYYY-MM** | 세션 마일스톤 · Decision Log · Freeze/Complete 기록 | 단순 typo · 무관 잡담 |
| **CURSOR_SESSION_HANDOFF** | **다음 세션 Entry**가 바뀔 때 · Lock/Consume/Pending 변경 | 매 Commit마다 습관적 갱신 |
| **DEVELOPMENT_WORKFLOW** | 운영 원칙이 **실제로 바뀌어 검증**된 경우 | 일회성 취향 · 미검증 아이디어 |

### 9.2 Update order (stage complete)

권장 순서 (검증된 STEP6 완료 패턴):

1. 산출물 SSOT Commit (Analysis / Design / Freeze docs)  
2. `PROJECT_MASTER_INDEX` · `PROJECT_LOG` · `CURSOR_SESSION_HANDOFF` 동기화 Commit (또는 동일 논리면 한 Commit)  
3. Push  
4. 다음 세션은 새 Handoff Entry로 시작  

### 9.3 Authority

| Claim | Source of truth |
|-------|-----------------|
| “지금 어느 STEP인가?” | `PROJECT_MASTER_INDEX` + `CURSOR_SESSION_HANDOFF` |
| “지난 세션에서 무엇을 결정했는가?” | `PROJECT_LOG` Decision Log |
| “무엇을 Consume/금지하는가?” | Handoff + Locked Design SSOT |
| “어떻게 운영하는가?” | **본 문서** |

---

## 10. Improvement Rule

### 10.1 Prefer absorb forward

한 STEP에서 발견된 개선·모호·보강은:

| Prefer | Avoid |
|--------|-------|
| **다음 STEP 입력**으로 흡수 (예: STEP6-3 v1.1 보강 → STEP6-4 Catalog Design) | 완료·승인된 STEP을 습관적으로 전면 재작성 |
| Analysis 보강이 필요하면 **Analysis 문서 개정(v1.1)** + 입력 명시 | Framework/Pipeline Locked 본문 수정으로 “해결” |
| Gap은 Gap/Pending으로 남김 | 미결정 항목을 몰래 확정 |

### 10.2 When rewrite is allowed

| Allowed rewrite | Condition |
|-----------------|-----------|
| 동일 STEP 문서 소규모 보강 | 승인된 범위 · Version bump · LOG 기록 |
| Frozen 문서 | **금지** — §12 |
| 잘못된 Entry로 만든 산출물 | 사용자 지시 하에 폐기·대체 Commit |

### 10.3 Goal

불필요한 재작업·재동선·재Freeze를 최소화한다.

---

## 11. Proposal Management Rule

### 11.1 Purpose

작업 흐름을 끊지 않고 의사결정을 효율적으로 관리한다.

프로젝트 진행 중 발생하는 개선 아이디어는 **즉시 반복 제안하지 않고**,  
**작업 단위 종료 시 일괄 제안**하는 것을 원칙으로 한다.

### 11.2 Operating rules

| Rule | Statement |
|------|-----------|
| **No mid-stream spam** | AI는 작업 중 발생한 개선 아이디어를 **연속적으로 제안하지 않는다**. |
| **Batch at unit end** | 개선 아이디어는 현재 작업 단위가 **완료된 후** 하나의 목록으로 정리하여 제안한다. |
| **User decides** | 사용자는 일괄 검토 후 **채택 여부**를 결정한다. |
| **Approved only** | **승인된 항목만** 다음 작업 또는 운영 문서에 반영한다. |

```text
Work unit in progress
  → (ideas noted internally; no repeated proposals)
  ↓
Work unit complete
  ↓
Single proposal list
  ↓
User review / accept / defer / reject
  ↓
Approved items → next STEP input or ops doc update
```

### 11.3 Exceptions (immediate proposal allowed)

다음 사항은 **즉시 제안**할 수 있다.

| Exception | Example class |
|-----------|---------------|
| 프로젝트 **무결성**에 영향 | Corrupt SSOT · inconsistent Entry |
| **SSOT / Frozen Rule** 위반 가능 | Locked Framework 수정 시도 · Freeze bypass |
| **데이터 손실** 위험 | Destructive git · dataset wipe |
| 현재 **STEP 결과가 잘못될** 가능 | Analysis Only 위반 · wrong Consume baseline |
| 지금 고치지 않으면 **다음 STEP 진행 곤란** | 구조적 blocker · missing Entry SSOT |

예외가 아니면 제안은 **작업 단위 종료 후 일괄**로 한다.

### 11.4 Scope

이 규칙은 다음을 포함한 **모든 AI 협업 과정**에 공통 적용한다.

- ChatGPT  
- Cursor  
- Codex  
- (향후) Claude Code · 기타 Agents  

§3 AI Role Definition과 충돌하지 않는다. 역할과 무관하게 **제안 타이밍**만 규율한다.

---

## 12. Freeze Rule

### 12.1 Do not edit Frozen / Locked surfaces informally

| Surface | Policy |
|---------|--------|
| STEP4 Frozen Assets | RO |
| STEP5 Frozen Suite | RO |
| STEP6 Framework Freeze Candidate | Locked · ADR / Framework Review only |
| STEP6 Pipeline Freeze Candidate | Locked · ADR / Pipeline Review only |
| AAS Architecture Constitution / ADR (해당 Freeze) | 프로젝트 Freeze 정책 준수 |
| Runtime Baseline (Batch6 Final Freeze) | 코드 무단 변경 금지 (별도 STEP/승인 없이) |

### 12.2 Change path

```text
Need change to Frozen/Locked?
        ↓
ADR and/or Review (as required by that SSOT)
        ↓
Version bump / explicit unfreeze path
        ↓
Update MASTER · LOG · Handoff
        ↓
Push
```

### 12.3 Downstream rule

후속 STEP은 Frozen 문서를 **Consume**한다.  
“최신화”를 이유로 상위 SSOT를 편집하지 않는다.

---

## 13. Future Expansion

### 13.1 Stable core

다음이 추가되어도 **§2–§12 운영 원칙은 유지**한다.

- Claude Code  
- OpenAI Work / 기타 Coding Agents  
- 추가 Review / CI Agents  

### 13.2 Expansion slots (v1.0 candidates — not normative in v0.2)

| Slot | Intent |
|------|--------|
| Agent matrix (상세 RACI) | 도구별 권한·금지 세분화 |
| Branch / PR workflow | PR 템플릿 · review gates |
| CI / Import Graph / Build gate 운영 | Batch 검증 자동화 연계 |
| Incident / OPEN-* 운영 | Known Issue 승격·종결 규칙 |
| Multi-repo / monorepo ops | 해당 시 |

v0.2도 위 항목을 **예약만** 한다. 검증 전 세칙하지 않는다.

---

## 14. Quick Reference Cards

### 14.1 New session (minimum)

```text
[ ] DEVELOPMENT_WORKFLOW
[ ] PROJECT_MASTER_INDEX
[ ] PROJECT_LOG (month)
[ ] CURSOR_SESSION_HANDOFF
[ ] Consume list from Handoff
[ ] Confirm: stage · allowed · forbidden
```

### 14.2 Stage complete (minimum)

```text
[ ] Scoped Commit(s)
[ ] Push
[ ] MASTER updated (if stage changed)
[ ] LOG entry (decisions)
[ ] HANDOFF → next Entry
[ ] Proposal list (if any) — §11
```

### 14.3 Hard stops

| Stop | Reason |
|------|--------|
| Edit Locked Framework/Pipeline without ADR | Freeze Respect |
| Catalog in Analysis Only STEP | One Responsibility / Analysis Only |
| Re-read all SSOTs every turn | Session Context Rule |
| Milestone Commit with temp scripts | Git hygiene |
| Mid-work repeated improvement spam | Proposal Management (§11) |

---

## 15. Document Control

| Item | Value |
|------|-------|
| Version | **v0.2** |
| Status | Active Operational SSOT (Draft) |
| Next | v1.0 — Expansion slots after verified practice |
| Location | `작업관리/DEVELOPMENT_WORKFLOW.md` |

### Revision History

| Version | Date | Change |
|---------|------|--------|
| **v0.1** | 2026-07-17 | Initial Operational SSOT — verified STEP6 / session / Freeze / Git practice |
| **v0.2** | 2026-07-17 | Add **§11 Proposal Management Rule** · renumber Freeze+ |

---

*End of DEVELOPMENT_WORKFLOW.md v0.2*
