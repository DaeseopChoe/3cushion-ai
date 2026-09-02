# PROJECT_LOG_2026-09

Version : v1.00
Period : 2026-09
Status : Active Project Log

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
