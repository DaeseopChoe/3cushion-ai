# PROJECT_LOG_2026-09

Version : v1.00
Period : 2026-09
Status : Active Project Log

---

# 2026-09-09 — Finalize: Display Ceiling + Active C2 Handle Ownership

## Mode

**Agent** · Docs finalize · Regression · Commit/Push

## User manual validation

**PASS** (ADMIN 실화면):

1. Baseline ON → C2 handle = Baseline C2 꼭지점
2. Corrected ON → C2 handle = Corrected C2 꼭지점
3. Baseline ↔ Corrected 전환 시 handle owner 정상 전환
4. Corrected C4 종료 → Baseline display도 C4까지만 (C5/C6 미표시)

## Final contracts

**A. 5&Half Baseline Display Ceiling** (`fb1e5cf` + preserved):
BaselineDisplayEnd = min(existingBaselineCap, correctedDisplayEnd); pathNodes C5/C6 preserved; no spatial second-ball truncate.

**B. C2 Handle Active Ownership** (this commit):
`resolveActiveC2HandleRg` + `showBaseLine` → display ≡ hit ≡ drag seed; click-only/zero-move no mutate; override dual inject after actual drag.

## Non-goals

formula · q/K · R0/R1b/P7 · HPT · Impact · USER semantics · `incidenceAngle.ts` (unrelated WT preserved)

## Verification

- targeted ownership + display policy + C2 reflection — 72 tests PASS
- full `npm test` — PASS (finalize)
- `npm run build` PASS
- User manual ADMIN validation — PASS
- Commit/Push — this finalize

---

# 2026-09-09 — C2 Handle Active Trajectory Ownership SSOT

## Mode

**Agent** · Option B active C2 owner · Tests/Build · later finalized (see entry above)

## Discovery

직전 uncommitted fix가 Handle을 `baseline.pathNodes[2] always`로 고정 →
Corrected 화면에서도 Baseline C2에 핸들이 남음.

## Product contract

```text
C2 HANDLE OWNER = ACTIVE TRAJECTORY C2
ADMIN showBaseLine=true  → baseline.pathNodes[2]
ADMIN showBaseLine=false → correctedPathNodes[2]
display XY ≡ c2HandleRgRef ≡ pointer-down seed
```

## Fix

- `resolveActiveC2HandleRg({ active, baselineNodes, correctedNodes, override })`
- App: `active: showBaseLine ? "baseline" : "corrected"`
- click-only / zero-move no-mutate · override dual inject · display ceiling **preserved**

## Non-goals

formula · q/K · R0/R1b/P7 · HPT · Impact · ceiling · `incidenceAngle.ts` · Commit/Push

## Verification

- targeted ownership + display policy + C2 tip invalidate + admin history — PASS
- full `npm test` — 130 files / 1382 tests PASS
- `npm run build` PASS
- User manual + Commit/Push: see finalize entry above

---

# 2026-09-08 — Baseline C2 Handle Ownership + Click-Snap Fix

## Mode

**Agent** · C2 handle interaction ownership · Tests/Build · **No Commit/Push** (await user review)

## Discovery

ADMIN Baseline 표시에서 C2 handle이 Corrected C2에 놓이고,
handle 클릭만으로 Baseline 궤적이 Corrected C2로 snap.

## Root cause

1. `App.jsx` `c2PathRg` ← `correctedPathNodes[2]` (Baseline C2 무시)
2. `tryStartC2HandleDrag` pointer-down 즉시 `setOverride(pointer)` → anchors+anchorsBase inject

## Fix

- Handle display: `resolveC2HandleDisplayRg(baseline.pathNodes[2] | override)` — Corrected fallback **금지**
- Drag session: click/zero-move **no mutate**; first differing rail+t → setOverride + Undo begin
- Display ceiling (v1.5) **unchanged**

## Non-goals

formula · q/K · R0/R1b/P7 · HPT · Impact · ceiling contract · `incidenceAngle.ts` · Commit/Push

## Verification

- targeted `c2HandleOwnership` (11) + display policy + admin history + C2 tip invalidate — PASS
- full `npm test` — 130 files / 1380 tests PASS
- `npm run build` PASS
- Commit/Push: **NONE** (await user review)

---

# 2026-09-08 — 5&Half Baseline Display Ceiling (corrected Cn)

## Mode

**Agent** · Display Cap product-contract change · Docs · Commit/Push

## Discovery

5&1/2 검증 중: corrected는 second-ball로 C4에서 DISPLAY 종료되나,
baseline은 PhysicalLimit(C4≥20→C6)으로 C5/C6까지 표시되어 비교 화면이 과밀해짐.
계산(q/K/R0/…/pathNodes)은 정상 — **DISPLAY Cap 정책** 문제.

## Product contract (확정)

```text
5&Half baseline calculation (pathNodes) = independent / may retain C5·C6
5&Half baseline DISPLAY end
  = min(existingBaselineCap, correctedDisplayEndIndex)

existingBaselineCap = min(chain, same-rail, PhysicalLimit)
```

- corrected second-ball **XY**로 baseline을 spatial clip **금지**
- baseline은 매칭 Cn까지 **자신의** geometry (예: 자신의 C4)
- cushionPath + C labels = **동일** Cap
- **5&Half only** · 타 시스템 baseline Cap 불변

## OLD → NEW

| OLD (D-DBP-05 Phase 1) | NEW (D-DBP-05 v1.5) |
|------------------------|---------------------|
| baseline DISPLAY ≠ corrected ceiling | baseline DISPLAY ≤ corrected DISPLAY Cn |
| pathNodes 독립 | pathNodes 독립 **유지** |

## Implementation

- `trajectoryPathDisplayPolicy.resolveBaselineTrajectoryDisplayCap` — corrected ceiling 적용 · reason `corrected_ceiling`
- `trajectoryBuilder.buildBaselineBranch` — `capCorrected.endIndex` 전달
- labels: 기존 `buildTrajectoryRenderModel` / `visibleKeysForLabels`가 `capBaseline` 공유
- tests: “no corrected ceiling” 회귀 → 새 계약 검증으로 교체

## Non-goals / untouched

formula · q/K · R0/R1b/P7 · C2 · HPT/tip · anchors/sys/dataset · Impact · Undo/Recall · Save · `incidenceAngle.ts`

## Verification

- targeted `trajectoryPathDisplayPolicy` — PASS
- full `npm test` — 129 files / 1369 tests PASS
- `npm run build` PASS
- formula / q/K / R0/R1b/P7 / C2 / HPT — untouched

## Docs

- `DISPLAY_BOUNDARY_POLICY_SSOT.md` **v1.5**
- `PROJECT_MASTER_INDEX.md` pointer
- this log

---

# 2026-09-08 — AI Writing Assistant (Proofreading) finalize

## Mode

**Agent** · AI Proofreading 최종 정리 · Docs · Commit/Push

## Feature

관리자 AI 코멘트 / One-Point Lesson 전용 **교정 편집자**.

```text
Admin AiOverlay (onePointDraft)
  → [AI 교정]
  → POST /api/proofread
  → Vite middleware / Vercel Function
  → Style Contract + numericGuard
  → OpenAI Responses API (structured output)
  → before/after preview
  → [교정안 적용] → setOnePointDraft
  → 기존 Apply / Save / 전체 적용 / SAVE
```

- **자동 overwrite 금지** · 관리자 승인 필수
- Auto Comment (`buildAiAutoCommentModel`) **제외** (read-only · OpenAI 미전송)
- 별도 persistence layer 없음 (기존 draft/save owner 재사용)
- native browser `spellCheck` 실험 **폐기** · Category IME Enter guard **유지**

## Architecture / Provider

| Item | Value |
|------|--------|
| Endpoint | `POST /api/proofread` |
| Provider | OpenAI Responses API |
| Model | env `OPENAI_PROOFREAD_MODEL` (local: `gpt-5.6-luna`) |
| `temperature` | **absent** (gpt-5.6-luna unsupported) |
| Output | json_schema structured (`corrected_text`, `changed`) |
| Timeout | ~25s |
| Local env | Vite `loadEnv` → middleware `runProofread({ body, env })` |

## Root causes resolved

1. **503 CONFIG** — `.env.local` 존재했으나 middleware가 `process.env`만 사용 → `loadEnv` + explicit `env` 전달.
2. **502 PROVIDER / 400** — Responses payload의 `temperature: 0`이 모델에서 unsupported → 해당 parameter **제거**.

## Security

- `OPENAI_API_KEY` server-only · `frontend/.env.local` gitignored · no `VITE_*` secrets
- browser에 upstream detail / Authorization / user text 미노출
- non-2xx 시 server terminal safe diagnostics만 (`status` / `type` / `code` / sanitized `message` / `param`)

## Calculation isolation

SYS · formulas · Fg/Rg · mappings · Δ_sys · anchors · trajectory · Impact · Ball Guide · CO/C1 · dataset/schema · SAVE/History semantics — **UNTOUCHED**.

AI Writing Assistant는 calculation engine과 분리된 UI/text/service 기능.

## Verification

- targeted proofreading + IME guard tests PASS
- full `npm test` — 129 files / 1364 tests PASS
- `npm run build` PASS
- live OpenAI call during Agent finalize — **NONE** (mock only)
- user local live proofreading success — **CONFIRMED**

## Docs

- `PROJECT_MASTER_INDEX.md` — AI Writing Assistant 상태 · 코드 SSOT 맵
- `3_SYSTEM_ARCHITECTURE.md` — 계산 비변경 · UI/text 경계 한 줄
- this log

## Protected / excluded from commit

- `frontend/src/domain/trajectory/incidenceAngle.ts` (unrelated WT)
- `frontend/.env.local` (secrets)

## Non-goals

Manual Vercel deploy · Vercel env mutation · billing/account notes · calculation rule changes

---

# 2026-09-07 — ADMIN Impact CONTACT ownership · HP/T zero-tip side intent

## Mode

**Agent** · ADMIN UX finalize · Commit/Push · user practical PASS

## A. Impact Ball CONTACT ownership

### Symptom

Target 선택·이동 후 Impact가 Target contact relation에서 분리됨. Impact dblclick이 Target contact 복귀처럼 보이던 잘못된 UX.

### Root cause

Long-lived FREE `balls.impact`가 CONTACT SSOT(`calcImpactBall`)를 가림. Target 변경 시 Impact 재바인딩 부재.

### Fix / contract

- Runtime Impact ownership = CONTACT (`resolveContactImpactRg` / `calcImpactBall`).
- Temporary `balls.impact` only during active Impact drag; cleared on drag end / Target mutation.
- Impact drag end → HPT/T update → CONTACT derived 복귀.
- Impact dblclick → `projectImpactOntoNearestTrajectory` → thickness/T → CONTACT 복귀 (Target contact 단순 복귀 UX 제거).
- `trajectoryBuilder` no longer prefers stale authored `balls.impact`.
- Undo / Recall / SAVE 계약 유지.

### Practical

USER 실전 확인 PASS (Target rebind · drag · dblclick nearest trajectory · Undo).

## B. HP/T zero-tip tipSideIntent

### Symptom

우측 0에서 tipCount를 먼저 넣어야만 좌측 변경 가능. side-first 입력 불가.

### Root cause

`hpDirection = hpX >= 0 ? "right" : "left"`. tipCount=0이면 L/R 모두 center `(≈0,4)`로 붕괴 → UI가 항상 right.

### Fix / contract

- UI-only `tipSideIntent` (`left`|`right`); `hpDirection = tipSideIntent`.
- tipCount=0: side click → intent만 변경, center geometry 유지 (fake ε/spin 금지).
- 0→N / N→0→N: intent + tipCount → 기존 `setHpFromSystem`.
- left 0 calc == right 0 calc; Apply canonical 의미 불변.
- Modal 내부 zero-tip side click ≠ Undo transaction.

### Practical

USER 실전 확인 PASS (right 0 → left 0 → left N · N→0 intent 유지).

## C. Verification

Targeted Impact + HPT zero-tip tests · full frontend suite · `npm run build` — PASS (finalize run).

## Non-goals

HP/T formula · thickness · q/K · R0/R1b/P7 · C2 · Undo/Recall architecture · anchors/sys/dataset · USER semantics · `incidenceAngle.ts` (unrelated WT preserved / not committed).

## Docs

this log · `PROJECT_MASTER_INDEX.md` pointer (architecture ownership / HPT UI intent only)

---

# 2026-09-07 — ADMIN Undo + Recall (Reset 교체) · Persistent Recall Origin

## Mode

**Agent** · ADMIN edit UX · Undo/Recall · Commit/Push

## Change

- Removed ADMIN **Reset** button / `handleAdminWorkReset` view-only unlock gate.
- Added ADMIN **되돌리기** (repeatable authored-transaction Undo) + **Recall** (restore immutable Load Origin S0).
- SSOT: `useAdminEditHistory` + `adminEditHistory` — `undoStack` and `recallOriginSnapshot` are separate.
- Load (LocalDB / History / Published Search match) → immediately editable; capture Origin S0.
- SAVE does not replace Origin and does not clear Undo.
- Recall clears Undo; new Load replaces Origin; refresh clears Origin.
- Snapshot = authored canonical inputs only (no calculated C2 / trajectory / q-K).
- UX: Recall runs **without confirm** — direct Origin restore.

## Non-goals

q/K · R0/R1b · P7 · tip table · anchors/sys/dataset · USER semantics · calculation formulas · Ctrl+Z / Redo (deferred)

## Docs

`TRAJECTORY_EXTENSION_SSOT.md` POLICY updated · this log entry

---

# 2026-09-07 — ADMIN C2 manual override lifecycle · HPT tip dependency invalidate

## Mode

**Agent** · ADMIN C2 Reflection Override · tipCount invalidate · Commit/Push

---

## Problem

After C2 handle drag (`c2ReflectionOverride` `{rail,t}`), same tip-side **tipCount** changes kept the override. `anchors.C2` continued to bypass `resolveReflectionC2`, so calculated C2 never became effective.

## Fix

`shouldClearReflectionOverrideOnHptDependencyChange`: clear on tip **side** L↔R **or** **tipCount** change. Thickness `T` alone does **not** clear (not a C2 reflection tip input).

Wired in `App.jsx` HPT Apply + `useShotSlots.applyHptToSlot` (draft/applied strip).

## Contract

ADMIN C2 manual override lifecycle: C2-dependent HPT condition change invalidates stale manual C2 override.

## Non-goals

C2 formula / q/K / R0/R1b/P7 / USER search semantics unchanged.

---

# 2026-09-07 — Phase 2B q/K Option 1 · 각비 기준 회전량 v1 실전 승인

## Mode

**Agent** · Phase 2B Option 1 SSOT 확정 · USER live practical validation · Commit/Push

---

## A. Architecture (Option 1)

| Stage | Rule |
|-------|------|
| Base selection (Phase 2A) | P7 PASS → R1b; P7 FAIL → R0 |
| Spin scale (Phase 2B) | Eligible C1_f: `finalθ = baseθ + rawSpin × K(q)` exactly once |
| tip=0 | `effectiveSpin = 0` → Phase 2A bit-identical |

q/K는 R1b base law의 일부가 아니다. P7과 q eligibility는 분리된다.  
Short-rail C1_f는 base=R0를 유지하면서 tip≠0 시 K(q) 적용 가능.

## B. q/K v1 SSOT

| Item | Value |
|------|-------|
| q (TOP/BOTTOM) | `|B.x − H.x|` |
| q (LEFT/RIGHT) | `|B.y − H.y|` |
| K knots | q=3 → 1.00; q=6 → 0.50; lerp + clamp |
| Live fixture | q≈6.3 → K≈0.50 |
| Status | **Phase 2B 각비 기준 회전량 v1** — USER practical approved |
| Future | Real-table / data accumulation 후 calibration **허용** (영구 물리값 아님) |

## C. USER live practical check

동일 live scene (LEFT_F → BOTTOM_F, P7 fail, baseLaw=R0, q≈6.3 / K≈0.50):

| Tip | Result |
|-----|--------|
| TIP=4 | PASS — 실전 감각상 합리적 |
| TIP=3 | PASS |
| TIP=2 | PASS |
| TIP=1 | PASS |
| TIP=0 | PASS — Phase 2A base geometry 복귀 |

TIP 감소에 따라 C2 반사 진행이 base 방향으로 연속 이동함을 확인.

## D. Docs / code SSOT

- `작업관리/4_CALCULATION_RULES.md` — Phase 2B Option 1 + v1 승인 문구
- Code SSOT: `applyAngleRatioSpin.ts` · `angleRatioCalibration.ts` · `angleRatioGeometry.ts` · `reflectionPolicy.ts`

---

# 2026-09-02 — USER Display Runtime HPT Android Production 검증 완료

## Mode

**Agent** · USER Display Runtime HPT · Production Deploy · Android Remote DevTools 실기 검증 · Documentation only (no code change in this entry)

---

## A. 문제 배경

PC/local에서는 USER Search 후 HPT 및 trajectory 방향이 정상인데, Android Production 사용자 화면에서는 일부 opposite-handedness 상황에서 Modal의 두께 표시는 정상인 반면 table의 red trajectory 두께 방향이 반대로 보이는 문제가 있었다.

조사 과정에서 PC Working Tree/local과 Android Production이 서로 다른 실행 artifact를 사용하고 있음이 확인되었고, 이후 USER Display Runtime HPT chain 수정사항을 commit/push하여 Production에 배포하였다.

**조사 중간 판정 (2026-09-01):** EXECUTION ARTIFACT DIVERGENCE CONFIRMED — Mobile Production이 구 bundle(`index-BpBu-j5C.js`)을 실행 중이었고, `window.__3CUSHION_BUILD_MARKERS__`가 `undefined`였음. USER table thickness fix는 WT/local build에만 존재.

---

## B. 적용된 기준 commit

| Field | Value |
|-------|--------|
| **Commit** | `73c7ac0` |
| **Message** | `fix: unify user display HPT across modal coaching and table impact` |
| **Branch** | `main` |
| **Role** | USER Display Runtime HPT 관련 수정의 **Production 기준점** |

**포함 범위 (요약):**

- `resolveUserTableDisplayThicknessT` / `displayHptCoaching.ts`
- USER `thicknessForCalc` → `buildTrajectory` / `displayImpactContactThicknessT`
- Display Runtime HPT hydrate (`displayHpt`, `resolveDisplayFamilyHpt` 등)
- Modal / coaching / table display T parity wiring
- Build marker (`__3CUSHION_BUILD_MARKERS__`) 및 `[USER_DISPLAY_HPT_TRACE]` diagnostic
- 관련 Vitest contract (displayHptCoaching, hptDisplayRuntime, viewport parity 등)

**Pre-commit 검증 (2026-09-01):** Vitest 107 files / 1123 tests PASS · `npm run build` PASS · `git diff --check` PASS

---

## C. Production artifact 교체 확인

| Field | Value |
|-------|--------|
| **Production URL** | `https://www.3cushionai.com/` |
| **배포 전 bundle** | `index-BpBu-j5C.js` |
| **배포 후 bundle** | `index-DBuPhVvp.js` |
| **배포 경로** | GitHub `main` → Vercel Production |

Production bundle에 diagnostic/build marker 문자열이 포함된 것을 확인하였다.

**확인된 marker / wiring 증거:**

- `DISPLAY_RUNTIME_HPT_SSOT` (`3cushion-display-runtime-hpt-ssot-20260901`)
- `USER_TABLE_DISPLAY_HPT` (`3cushion-user-table-display-hpt-wt-20260901`)
- `USER_DISPLAY_HPT_TRACE`
- `displayImpactContactThicknessT`

→ **배포 artifact가 실제로 교체되었음**을 서버 HTML/JS 및 Android runtime 양쪽에서 확인.

---

## D. Android 실기 Remote DevTools 검증

| Field | Value |
|-------|--------|
| **Device** | Samsung SM-A516N |
| **Browser** | Chrome (Remote DevTools) |
| **Environment** | Android Production · `https://www.3cushionai.com/` |

**Runtime marker:**

- `window.__3CUSHION_BUILD_MARKERS__` — **정상 존재** (배포 전 `undefined`에서 전환)

**Diagnostic trace:**

- USER Search 실행 후 `[USER_DISPLAY_HPT_TRACE]` — Android Production console에서 **정상 출력**

**대표 trace (canonical → runtime/display 분리 실측 예):**

| Field | Value |
|-------|--------|
| `track` | `T2B_L` |
| `authoredTrack` | `T2B_L` |
| `persistedT` | `-5/8` |
| `runtimeT` | `+5/8` |

→ persisted canonical HPT와 USER display/runtime HPT의 **분리가 Android Production에서도 동작**함을 확인.

---

## E. 4개 trajectory track 실기 검증

Android Production USER Search 후 4-track **육안 + trace** 검증.

| Track | Handedness (Five-and-Half family) | Result |
|-------|-----------------------------------|--------|
| **B2T_L** | opposite (L) | **PASS** |
| **B2T_R** | same (R) | **PASS** |
| **T2B_L** | opposite (L) | **PASS** |
| **T2B_R** | same (R) | **PASS** |

각 Search에서 `[USER_DISPLAY_HPT_TRACE]` 출력 확인.

**특히 opposite-handedness (B2T_L, T2B_L):** USER display/runtime thickness와 table red trajectory 두께 방향이 **Modal과 일치**함을 사용자 화면에서 확인.

---

## FINAL VERDICT

```text
USER DISPLAY RUNTIME HPT
— RESOLVED / ANDROID PRODUCTION VERIFIED
```

**근거:**

1. 수정 commit `73c7ac0`이 `main` / `origin/main`에 반영됨.
2. Production bundle `index-BpBu-j5C.js` → `index-DBuPhVvp.js` 교체 확인.
3. Production build marker / diagnostic 문자열 포함 확인.
4. Android Remote DevTools에서 `__3CUSHION_BUILD_MARKERS__` 및 `[USER_DISPLAY_HPT_TRACE]` 실측.
5. persisted canonical HPT → USER display/runtime HPT 변환 실측 (`persistedT` / `runtimeT`).
6. B2T_L / B2T_R / T2B_L / T2B_R 4-track 실기 검증 **PASS**.
7. Android 사용자 화면 trajectory 두께 방향 정상 확인.

→ **추가 HPT/trajectory 코드 수정 불필요.** 현재 상태를 **regression baseline**으로 고정.

---

## 다음 검증 단계 (별도 이슈)

**5&1/2 시스템 전체 검증은 아직 종료하지 않음.**

다음 실기 검증 대상 (순차):

| # | System / Shot type |
|---|-------------------|
| 1 | 옆돌리기 |
| 2 | 뒤돌리기 대회전 |
| 3 | 옆돌리기 대회전 |

위 항목을 순차 검증한 뒤 5&1/2 시스템 전체 검증 완료 여부를 최종 판정한다.

**관리 원칙:**

- 이번 HPT 이슈 해결과 각 시스템/공략법 검증은 **별도 이슈**로 관리.
- 새 검증에서 문제가 발견되더라도, **근거 없이** 현재 정상 검증된 USER Display Runtime HPT 코드(`73c7ac0` baseline)를 재수정하지 않음.

---

## Explicit Non-Claims

- 옆돌리기 / 뒤돌리기 대회전 / 옆돌리기 대회전 Production 실기 검증 **미완** (본 항목 범위 외)
- 5&1/2 전체 시스템 검증 **미완**
- persisted canonical `StrategyEntry.hpT` 계약 변경 **없음**
- physics/calculator runtime HPT mirror 규칙 변경 **없음**

---

## Current Status

```text
USER Display Runtime HPT (Five-and-Half · 4-track) : RESOLVED · Android Production VERIFIED
Production baseline commit                        : 73c7ac0
Production bundle                                 : index-DBuPhVvp.js
Regression baseline                               : FIXED (do not rework without new evidence)
Next manual QA                                    : 옆돌리기 · 뒤돌리기 대회전 · 옆돌리기 대회전
```

---

## Next

1. 옆돌리기 Production USER Search 실기 검증
2. 뒤돌리기 대회전 Production USER Search 실기 검증
3. 옆돌리기 대회전 Production USER Search 실기 검증
4. 5&1/2 시스템 전체 검증 완료 판정 (위 3항 PASS 후)

---

# 2026-09-02 — ADMIN Published Search Target Hydrate Parity 완료

## Mode

**Agent** · ADMIN Published Search · target-meta hydrate parity · behavioral regression test · commit/push

---

## A. 문제 / 잔여 작업 발견

5&1/2 USER 검증을 시작하기 전 Working Tree hygiene 과정에서 기존 미커밋 변경 2개가 발견됨:

- `frontend/src/application/flows/adminSearchFlow.ts`
- `frontend/src/application/flows/publishedSearchLeafResolution.contract.test.ts`

단순 잔여/쓰레기 변경으로 폐기하지 않고 provenance와 diff를 조사함.

조사 결과 두 파일은 하나의 유효한 **ADMIN Published Search target hydrate parity** 작업 단위임을 확인.

---

## B. Runtime 변경 목적

ADMIN Published Search recall 성공 후 target metadata 처리 계약을 LocalDB Search와 일치시킴.

**핵심 흐름:**

```text
Published Search match
→ applyPositionRecall(record)
→ resolveAdminRecallTargetMeta({
     searchQueryTargetBall,
     recordTargetBall: record.targetBall
   })
→ targetMeta 존재 시 patchSlotRuntimeMeta(...)
→ hydrateAdminRecallTarget(targetMeta)
```

**변경 파일:**

- `frontend/src/application/flows/adminSearchFlow.ts` — runtime parity
- `frontend/src/application/flows/publishedSearchLeafResolution.contract.test.ts` — `hydrateAdminRecallTarget` mock companion (3곳)

---

## C. SSOT

**`resolveAdminRecallTargetMeta` 의미:**

1. 유효한 `searchQueryTargetBall` 우선
2. 없으면 `record.targetBall` fallback
3. 둘 다 없으면 `null`

**Ball Role SSOT 준수:**

- red/yellow는 물리 색상
- target/second는 논리 역할
- `red = second` 또는 `yellow = target` 같은 intrinsic binding **금지**

---

## D. LocalDB ↔ Published Search

target-meta **의미 계약 parity** 확인.

LocalDB와 Published Search 모두 동일 계약 사용:

```text
resolveAdminRecallTargetMeta
→ patchSlotRuntimeMeta
→ hydrateAdminRecallTarget
```

---

## E. Behavioral regression 보강

**파일:** `frontend/src/domain/family/hptDisplayRuntime.test.ts`

**신규 behavioral regression test 1개:**

`Target=NONE role permutation: resolved logical target identity reaches patchSlotRuntimeMeta and hydrateAdminRecallTarget identically`

**검증 내용:**

Target=NONE + role permutation 상황에서 resolved logical target identity가 `patchSlotRuntimeMeta`와 `hydrateAdminRecallTarget` 양쪽에 **동일하게** 전달되는지 직접 검증.

**결과:** PASS

---

## F. 관련 테스트

| Suite | Result |
|-------|--------|
| `hptDisplayRuntime.test.ts` — ADMIN Published Search target hydration | **2/2 PASS** |
| `publishedSearchLeafResolution.contract.test.ts` | **17/17 PASS** |
| `adminTargetBallRules.contract.test.ts` | **27/27 PASS** |
| `adminEditSessionContract.test.ts` — target resolver | **1/1 PASS** |
| **Full frontend suite** | **107 files / 1124 tests PASS** |

FAIL 없음.

---

## FINAL VERDICT

```text
ADMIN PUBLISHED SEARCH TARGET HYDRATE PARITY
— VERIFIED / REGRESSION COVERED
```

**관리 원칙:**

- 이번 작업은 USER 5&1/2 시스템 검증과 **독립적인 ADMIN 작업**.
- 완료 후 Working Tree hygiene 회복.

---

## Explicit Non-Claims

- USER 5&1/2 옆돌리기 / 뒤돌리기 대회전 / 옆돌리기 대회전 Production 실기 검증 **미완** (본 항목 범위 외)
- USER Display Runtime HPT regression baseline (`73c7ac0`) 변경 **없음**
- Search matcher / Euclidean threshold / dataset records 변경 **없음**

---

## Current Status

```text
ADMIN Published Search target hydrate parity : VERIFIED · REGRESSION COVERED
USER Display Runtime HPT (Five-and-Half)   : RESOLVED · Android Production VERIFIED (unchanged)
Next manual QA                               : 옆돌리기 · 뒤돌리기 대회전 · 옆돌리기 대회전
```

---

## Next

1. 옆돌리기 Production USER Search 실기 검증
2. 뒤돌리기 대회전 Production USER Search 실기 검증
3. 옆돌리기 대회전 Production USER Search 실기 검증
4. 5&1/2 시스템 전체 검증 완료 판정 (위 3항 PASS 후)

---

# 2026-09-02 — USER Validation Positioning UX 개선 완료

## Mode

**Agent** · USER table Validation Positioning UX · Interaction/Presentation only · PC Manual QA PASS · Commit/Push

---

## A. 목적

5&1/2 canonical/derived 데이터 실기 검증을 빠르고 정확하게 수행할 수 있도록 USER table positioning UX를 개선하였다.

**핵심 목표:**

- Ball / guide coordinate direct input (numeric keypad)
- Guide end-handle visual/hit-area 2× 확대 (coarse drag)
- Snap/확정 버튼 주변 4방향 triangle fine controller (±0.1 Rg tap)
- Guide coordinate 실시간 1-decimal 표시
- Rg tenth normalization (floating-point artifact 방지)

---

## B. 구현 범위

| 영역 | 내용 |
|------|------|
| **Direct coordinate input** | Joystick coordinate label 클릭 → X/Y editor · 내장 numeric keypad · Apply/Cancel · Enter/Escape · ±0.1 fine adjust |
| **Guide end-handle** | Visual radius 2× · hit-area 2× (fine/coarse) · coarse drag 유지 |
| **Triangle fine controller** | Snap/확정 버튼 `(verticalX+3, horizontalY+3)` 중심 상/하/좌/우 배치 · tap = ±0.1 Rg nudge (drag 아님) |
| **Coordinate display SSOT** | Guide active 시 `(verticalX, horizontalY)` 표시 · ball center 아님 · 모든 이동 경로에서 즉시 갱신 |
| **Display formatting** | `formatRgCoordinateDisplay` — 사용자-facing 1-decimal round |
| **Normalization** | `normalizeRgTenth` — nudge path에서 `Math.round(v*10)/10` |

**주요 파일:**

- `frontend/src/App.jsx`
- `frontend/src/components/table/JoystickCoordinateEditor.jsx`
- `frontend/src/components/table/BallGuideLayer.jsx`
- `frontend/src/hooks/useBallGuide.ts`
- `frontend/src/interaction/ballGuideInteractionPolicy.ts`
- `frontend/src/interaction/ballGuideCoordinatePolicy.ts`
- `frontend/src/interaction/ballPositionDirectInputPolicy.ts`
- 관련 test files (policy · tap runtime · layer render)

---

## C. Triangle tap white-screen 수정

| Field | Value |
|-------|--------|
| **증상** | Triangle tap 직후 화면 전체 white screen |
| **Root cause** | `useBallGuide.ts` `nudgeGuide()`에서 `normalizeRgTenth` **import 누락** |
| **Exception** | `ReferenceError: normalizeRgTenth is not defined` |
| **Fix** | `ballGuideCoordinatePolicy.ts`에서 `normalizeRgTenth` import 추가 |

---

## D. Horizontal triangle orientation

Snap/확정 버튼 주변 triangle visual 방향을 **outward** (이동 방향)로 수정:

- ◀ LEFT → `verticalX - 0.1`
- ▶ RIGHT → `verticalX + 0.1`
- ▲ UP → `horizontalY + 0.1`
- ▼ DOWN → `horizontalY - 0.1`

---

## E. Manual QA

| Environment | Result |
|-------------|--------|
| **ADMIN UI (PC)** | PASS |
| **USER UI (PC)** | PASS |
| Guide end-handle drag | PASS |
| Snap/확정 버튼 | PASS |
| Triangle 4방향 표시/방향 | PASS |
| Triangle tap ±0.1 Rg | PASS |
| Coordinate label 실시간 갱신 | PASS |
| Direct coordinate input / keypad | PASS |
| White-screen regression | PASS (해결 확인) |

---

## F. 테스트

| Suite | Result |
|-------|--------|
| `ballGuideTriangleTap.test.ts` | **8/8 PASS** |
| `ballGuideCoordinatePolicy.test.ts` | **9/9 PASS** |
| `ballGuideInteractionPolicy.test.ts` | **11/11 PASS** |
| `ballPositionDirectInputPolicy.test.ts` | **13/13 PASS** |
| `BallGuideLayer.test.jsx` | **2/2 PASS** |
| `useBallGuide.test.ts` | **23/23 PASS** |
| **Full frontend suite** | **112 files / 1168 tests PASS** |
| **Production build** | **PASS** |

---

## FINAL VERDICT

```text
USER VALIDATION POSITIONING UX
— COMPLETE · PC MANUAL QA PASS · REGRESSION COVERED
```

---

## Explicit Non-Claims

- 5&1/2 sys calculation / Δ_sys / trajectory symmetry 변경 **없음**
- USER Display Runtime HPT 변경 **없음**
- ADMIN/USER Search semantics 변경 **없음**
- Dataset / anchors 변경 **없음**
- Ball Role SSOT / target/second logical role semantics 변경 **없음**

---

## Current Status

```text
USER Validation Positioning UX : COMPLETE · PC Manual QA PASS
Next manual QA                   : 옆돌리기 · 뒤돌리기 대회전 · 옆돌리기 대회전 (5&1/2 Production Search)
```

---

# 2026-09-02 — USER Validation Positioning UX · Mobile Snap + Compact Editor

## Mode

**Agent** · Mobile snap confirm touch fix · triangle spacing · compact coordinate editor · commit/push · interaction/presentation only

---

## A. 문제 배경 (Mobile Manual QA)

Phase 1 (`8bdfbd6`) PC Manual QA PASS 이후 Android 실기 검증에서:

- Yellow snap/확정 버튼 tap이 triangle coarse hit에 가로채져 **nudge만 발생**하고 snap이 안 되는 경우 발생
- Triangle offset 3.0 Rg + coarse triangle hit 4.0 Rg → snap center가 triangle hit 영역 **내부**에 위치
- Pointer priority: `handle → triangle → snap` — triangle이 snap보다 먼저 처리
- Coordinate editor가 mobile viewport에서 과도하게 큼

---

## B. 적용 변경

| 영역 | 내용 |
|------|------|
| **Triangle spacing** | `BALL_GUIDE_TRIANGLE_OFFSET_RG` **3.0 → 6.5 Rg** · snap center ↔ triangle center distance = 6.5 Rg · visual edge gap = 4.1 Rg |
| **Snap coarse hit** | `BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG_COARSE = 2.8` · `resolveBallGuideHitRadii()`에 `snapHitRadiusRg` 추가 |
| **Coarse pointer priority** | `(pointer: coarse)` 시 hit 순서: `handle → snap → triangle` (fine은 기존 `handle → triangle → snap` 유지) |
| **Compact coordinate editor** | `isCoarsePointerEnvironment()` → `(pointer: coarse)` 기준 · `joystickCoordinateEditorLayout.ts` SSOT · panel `min(88vw, 260px)` · padding 8px · field/keypad compact |
| **Desktop preserved** | PC fine pointer → desktop editor 336px · viewport 축소만으로 compact **미적용** (의도된 동작) |
| **Triangle semantics** | ±0.1 Rg tap nudge **변경 없음** · descriptor → render 단일 SSOT 유지 |

**변경 파일:**

- `frontend/src/interaction/ballGuideInteractionPolicy.ts`
- `frontend/src/App.jsx`
- `frontend/src/components/table/JoystickCoordinateEditor.jsx`
- `frontend/src/components/table/joystickCoordinateEditorLayout.ts` (신규)
- 관련 test files

---

## C. Pre-Push Visual Verification

| 항목 | 결과 |
|------|------|
| `BALL_GUIDE_TRIANGLE_OFFSET_RG` | **6.5 Rg** |
| descriptor → render SSOT | **정상** |
| 3.0 Rg 잔존 render path | **없음** |
| Compact activation | `(pointer: coarse)` only |
| PC viewport 축소 | desktop editor 유지 (**정상**) |

**판정:** `A. READY FOR MOBILE PUSH QA`

---

## D. 테스트

| Suite | Result |
|-------|--------|
| `ballGuideInteractionPolicy.test.ts` | **14/14 PASS** |
| `ballGuideTriangleTap.test.ts` | **8/8 PASS** |
| `joystickCoordinateEditorLayout.test.ts` | **4/4 PASS** |
| `JoystickCoordinateEditor.test.jsx` | **2/2 PASS** |
| `useBallGuide.test.ts` | **23/23 PASS** |
| **Targeted (5 files)** | **51/51 PASS** |
| **Full frontend suite** | **114 files / 1177 tests PASS** |
| **Production build** | **PASS** |

---

## E. Commit / Deploy

| Field | Value |
|-------|--------|
| **Commit** | `58b9ee1` |
| **Message** | `fix: improve mobile validation positioning controls` |
| **Branch** | `main` |
| **Deploy path** | GitHub `main` → Vercel Production |

---

## FINAL VERDICT

```text
USER VALIDATION POSITIONING UX — MOBILE SNAP + COMPACT EDITOR
— PUSHED · READY FOR ANDROID MANUAL QA
```

---

## Explicit Non-Claims

- calculation / trajectory / search / dataset / HPT / Ball Role SSOT 변경 **없음**
- Triangle ±0.1 Rg nudge semantics 변경 **없음**
- USER Display Runtime HPT 변경 **없음**

---

## Current Status

```text
USER Validation Positioning UX : PC PASS · Mobile fix pushed (58b9ee1)
Next manual QA                   : Android snap/triangle/compact editor · 옆돌리기 · 뒤돌리기 대회전 · 옆돌리기 대회전
```

---

# 2026-09-02 — USER Validation Positioning UX · Mobile Coordinate Editor 50% Compact

## Mode

**Agent** · Mobile coarse coordinate editor footprint reduction · commit/push · interaction/presentation only

---

## A. 문제 배경

Android Manual QA (`58b9ee1` push 이후) snap/triangle/nudge/coordinate label은 **PASS**였으나, `(pointer: coarse)` Guide/Ball Coordinate Editor 숫자 입력판이 table을 과도하게 가림.

초기 compact layout (`min(88vw, 260px)`, keypad hit 40px) 기준 footprint **260 × 417 px = 108,420 px²**.

---

## B. 적용 변경

| 영역 | 내용 |
|------|------|
| **Footprint** | **108,420 px² → 54,900 px²** (약 **49.4%** area reduction) |
| **Panel** | 260×417 → **180×305** (@ 360vw) · `min(50vw, 180px)` |
| **Activation** | `(pointer: coarse)` only · desktop fine-pointer **unchanged** (336px) |
| **Keypad UX** | visual **18px** / hit-area **32px** 분리 (`KeypadButton` wrapper) · overlap test PASS |
| **SSOT** | Guide/Ball editor 동일 `joystickCoordinateEditorLayout.ts` policy |
| **Implementation** | layout token 조정 only · `transform: scale()` **미사용** |

**변경 파일:**

- `frontend/src/components/table/JoystickCoordinateEditor.jsx`
- `frontend/src/components/table/joystickCoordinateEditorLayout.ts`
- `frontend/src/components/table/JoystickCoordinateEditor.test.jsx`
- `frontend/src/components/table/joystickCoordinateEditorLayout.test.ts`

---

## C. 테스트

| Suite | Result |
|-------|--------|
| `joystickCoordinateEditorLayout.test.ts` | **6/6 PASS** |
| `JoystickCoordinateEditor.test.jsx` | **3/3 PASS** |
| **Targeted** | **9/9 PASS** |
| **Full frontend suite** | **114 files / 1180 tests PASS** |
| **Production build** | **PASS** |

---

## D. Commit / Deploy

| Field | Value |
|-------|--------|
| **Commit** | `48029c5` |
| **Message** | `fix: compact mobile coordinate editor` |
| **Branch** | `main` |
| **Deploy path** | GitHub `main` → Vercel Production |

---

## FINAL VERDICT

```text
USER VALIDATION POSITIONING UX — MOBILE COORDINATE EDITOR 50% COMPACT
— PUSHED · READY FOR ANDROID MANUAL QA
```

---

## Explicit Non-Claims

- triangle spacing 6.5 Rg / snap / nudge semantics 변경 **없음**
- calculation / trajectory / search / dataset / HPT / Ball Role SSOT 변경 **없음**

---

## Current Status

```text
USER Validation Positioning UX : Mobile snap PASS · Editor 50% compact pushed
Next manual QA                   : Android compact editor footprint · 옆돌리기 · 뒤돌리기 대회전 · 옆돌리기 대회전
```
