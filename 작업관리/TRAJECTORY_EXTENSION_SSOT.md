# Trajectory Extension SSOT v1.4

**Status:** Architecture Freeze + **Product Implementation Complete (Task Closed)**  
**Phase:** Phase 2 · Overlay Implemented  
**Scope:** Trajectory Extension Overlay Domain (ADMIN 편집 · USER 투영)  
**Out of scope (계산 계층):** Trajectory Builder · Formula · Display Cap · Runtime Contract · System Calculation · Dataset Formula  
**In scope:** Extension Overlay · SAVE/Hydrate · USER Search Runtime Activation  
**Code Baseline:** Extension Runtime · `activateStrategySlot` (2026-08-04) · prior `abeca84` · `7ef9601`  
**Last Updated:** 2026-08-04

> 본 문서는 Trajectory Extension 구현의 **유일한 기준(SSOT)** 이다.
> Architecture Freeze(v1.3) 이후 Product 구현이 완료되었다 (v1.4).
> 계산 계층(Out of scope) 수정이 필요하면 구현을 중단하고 Architecture Review를 거친다.

### 개정 이력

| Version | 변경 |
|---------|------|
| v1.0 | Architecture Freeze 최초 확정 |
| v1.1 | Attachment를 Dataset → Runtime State로 이관 · Snap / Constraint 분리 · Geometry Ownership · 3계층 정합성 |
| v1.2 | Reflection Table 철학 명문화 — Reverse Spin 물리 엔진이 아님 · 표준 Default Proposal만 생성 |
| v1.3 | Runtime Snap / Constraint / Attachment 제거 · Target Lock + DoubleClick Projection · Role vs Slot · Handle Pointer Priority |
| **v1.4** | **Product Complete** · USER Search Runtime Activation · **`activateStrategySlot`** · Search ↔ Strategy Pick **단일 Runtime 경로** · Search 전용 Hydrate **없음** |
| v1.4.1 | **POLICY A** · Recall view-only · Reset = only Recall→Edit · Target dblclick ≠ session resume while view-only · Search ≠ trajectory proximity · Role Ball3 unchanged |

---

## 0. One-Line Rule

```text
System Formula
  → Calculated Trajectory (불변)
  → Trajectory Extension Overlay (신규 · 독립 Layer)
  → Second Ball (자유 배치 · Owner 변경 없음 · 명시적 Projection만)
```

**Trajectory Extension은 계산하지 않는다. 계산 결과를 읽고 그 위에 덧그린다.**

### 3대 불변 원칙

| 원칙 | 내용 |
|------|------|
| **계산 불변** | 계산 계층은 읽기만 한다. 쓰지 않는다. |
| **Geometry Ownership** | Geometry의 Owner는 **항상 Extension**이다. Second Ball은 Geometry를 변경할 권한이 없다. (§8) |
| **Dataset은 좌표만** | Dataset은 **좌표만** 저장한다. Runtime Attachment / Snap 상태는 **존재하지 않는다.** (§7 · §12) |

---

## 1. 목적

Trajectory Extension은 Calculated Trajectory를 **수정하는 기능이 아니다.** Calculated Trajectory 위에 추가되는 **독립 Overlay Layer**이다.

계산 종료 이후(Reverse End 등) 실제 공의 진행을 표현하되, 그 표현이 계산 계층을 오염시키지 않도록 계층을 완전히 분리한다.

### 절대 비수정 계층

| 계층 | 대상 |
|------|------|
| Trajectory Builder | `domain/trajectory/trajectoryBuilder.ts` |
| Reflection Policy / Engine | `domain/trajectory/reflectionPolicy.ts` · `domain/reflectionEngine.ts` |
| Display Cap | `domain/trajectoryPathDisplayPolicy.ts` |
| Runtime Contract | `runtime/contract/` · `runtime/registry/` · `runtime/loader/` |
| System Calculation | `utils/systemCalculator.ts` · `admin/sys/useSysCalculation.ts` |
| Dataset Formula | `domain/canonicalStrategy.ts` strip 정책 · `domain/positionMergeEngine.ts` · `domain/positionId.ts` |
| System JSON | `data/systems/*` |

Extension은 위 계층에 **쓰지 않는다.** 읽기만 한다.

---

## 2. 공식 용어

| 항목 | 값 |
|------|-----|
| 공식 명칭 | **Trajectory Extension** |
| 관리자 버튼명 | **궤적 연장** |
| 코드 네임스페이스 | `trajectoryExtension` |
| Domain 폴더 | `frontend/src/domain/trajectoryExtension/` |
| ID Prefix | `EXT` |
| Decision Prefix | `D-EXT-nn` |

### 명칭 결정 근거

`Reverse End Extension`은 채택하지 않는다. 프로젝트에 `reverse_end_system`이 실재 시스템 ID로 존재하며(`data/systems/reverse_end_system/`, Fleet Contract Book B4/B5 Apply 대상), 전 시스템 공통 기능에 동일 명칭을 쓰면 코드·문서·Dataset 경로에서 충돌한다.

`Continuation Trajectory` · `Post Calculation Trajectory`는 주어가 "Trajectory"라서, `domain/trajectory/`가 계산 소유 네임스페이스인 현 구조에서 계산 계층으로 오독될 여지가 있다.

---

## 3. Origin

### 정의

Origin은 **마지막 계산 Node**이다. Display Cap의 마지막 Render Node가 **아니다.**

```text
Origin Index = min( chainBreakCap.endIndex , sameRailCap.endIndex )
Origin Point = pathNodes[ Origin Index ]
```

### Origin Index 정책

second-ball Cap은 **적용하지 않는다.** chain-break Cap과 same-rail Cap은 **적용한다.**

| Cap | Origin 판정 적용 | 사유 |
|-----|------------------|------|
| `computeChainBreakCapEndIndex` | **적용** | 존재하지 않는 노드에서 출발할 수 없다 |
| `computeSameRailCapEndIndex` | **적용** | 2026-06 표시 안전 정책이 신뢰하지 않는 segment는 Extension도 신뢰하지 않는다 |
| `computeSecondBallCapEndIndex` | **미적용** | 궤적 종료 책임을 Extension이 인수한다 |

두 함수는 `domain/trajectoryPathDisplayPolicy.ts`에서 **이미 export되어 있다**(98행 · 121행). Extension Domain은 순수 함수로 read-only 호출만 하며, `resolveTrajectoryDisplayCap`의 동작과 기존 호출부는 일절 변경하지 않는다.

### Origin 참조 저장 규칙

Origin **좌표를 저장하지 않는다.** 참조만 저장하고 매 렌더 시 해소한다.

```ts
type ExtensionOrigin = {
  kind: "path_node";
  source: "corrected" | "baseline";
};
```

SYS 값이 변하면 계산 노드 좌표가 전부 이동한다. 좌표를 복사해 두면 Extension이 stale geometry가 되고, 이를 보정하려면 Extension이 계산 결과를 추적·보정해야 하며 그 순간 "계산 엔진이 아닌 독립 Overlay" 원칙이 깨진다. 참조 방식은 Extension이 현재 계산 결과에 자동으로 붙게 한다.

`TrajectoryBuildResult`는 `corrected.pathNodes`와 `baseline.pathNodes`를 모두 노출하므로 두 source 모두 지원 가능하다.

### Origin 유효 조건

Extension 생성은 다음을 모두 만족할 때만 허용한다.

- `Origin Index >= 1` — 입사 방향을 만들 이전 segment가 존재해야 한다
- `detectRail(Origin Point)` 성공 — 반사 기준 쿠션이 판정되어야 한다

불충족 시 **궤적 연장 버튼을 비활성화**한다. 임의 fallback으로 Extension을 생성하지 않는다.

### Calculated Segment Reveal (시각적 단절 방지)

Extension이 존재할 때, Extension Layer는 **Display Cap 종료 지점부터 Origin까지의 계산 Segment(C4~C6 포함)를 함께 Render**한다.

```text
Extension 미존재:  CO — C1 — C2 — C3                              (기존과 동일)

Extension 존재:    CO — C1 — C2 — C3 ⋯ C4 ⋯ C5 ⋯ C6 ●— E1 —● E2
                   └── 기존 ImpactLines ──┘└─ Extension Layer ─┘
```

이는 Display Cap **우회가 아니다.** Extension Layer는 same-rail Cap과 chain-break Cap을 그대로 지키며, second-ball Cap만 적용하지 않는다. second-ball Cap의 목적은 "세컨드볼에서 궤적을 종료시키는 것"인데 Extension이 그 종료 책임을 인수하므로 의미상 정합한다.

`trajectoryPathDisplayPolicy.ts`는 **한 줄도 수정하지 않는다.**

---

## 4. Extension 구조

### Extension1

| 항목 | 규칙 |
|------|------|
| 시작점 | Origin (§3) · 저장하지 않음 · 런타임 해소 |
| 초기 방향 | Reflection Table **표준 반사각** (Default Proposal) |
| 초기 끝점 | 반사 방향의 **다음 쿠션 접점까지** 자동 생성 |
| 끝점 제약 | **쿠션 위에서만 이동** (1축 Drag) |
| 최종 교정 | 관리자가 **끝 Handle Drag**로 Reverse End를 수정한다 |
| 저장 대상 | 끝점 좌표 (Rg) |

생성 시 Reflection Table의 표준 반사각으로 Proposal을 만들고, **실제 Reverse End는 관리자 Handle Drag의 최종 교정 결과**이다.

### Extension2

| 항목 | 규칙 |
|------|------|
| 시작점 | Extension1 끝점 · 저장하지 않음 · 런타임 해소 |
| 초기 방향 | **동일 Reflection Table** 기준 표준 반사각 (Default Proposal) |
| 기본 길이 | **약 20 Rg** (`EXTENSION2_DEFAULT_LENGTH_RG`) |
| 끝점 제약 | **자유 이동** (2축 Drag) |
| 최종 교정 | 관리자가 **끝 Handle Drag**로 길이·방향을 자유롭게 수정한다 |
| 저장 대상 | 끝점 좌표 (Rg) |

### 방향

Extension은 항상 단방향이다. `Origin → E1.endpoint → E2.endpoint`. 역방향 해석을 하지 않는다.

### Chain 무결성 — 자료구조로 보장

**시작점을 저장하지 않는다.** Extension1의 시작점은 Origin에서, Extension2의 시작점은 Extension1 끝점에서 매번 해소한다.

따라서 Chain은 규칙으로 지키는 것이 아니라 **구조적으로 끊어질 수 없다.** Extension1을 수정하면 Extension2 시작점은 자동으로 따라온다. 별도 동기화 로직이 존재하지 않는다.

### Chaining 확장

v1.0에서 Extension은 **최대 2개**다. Extension3 이상은 만들지 않는다. `origin.kind`를 union으로 열어 두었으므로 향후 `{ kind: "extension_node", extensionId }`를 추가하면 스키마 파괴 없이 확장 가능하다.

---

## 5. Reflection Table

### 5.1 정의 — 물리 엔진이 아니다

Reflection Table은 **Reverse Spin의 실제 물리 반사를 계산하는 엔진이 아니다.**

Trajectory Extension 생성 시 관리자가 수정하기 위한 **"표준 초기 Proposal(Default Proposal)"** 을 생성하는 **기준 데이터**이다.

실제 Reverse End는 관리자가 **Handle Drag로 최종 교정**한다. 표가 산출한 각도는 정답이 아니라 **편집 시작점**이다.

### 5.2 실제 Reverse Reflection

역회전 입사는 다음 요인에 의해 반사각이 **일정하지 않다.**

- 회전량
- 잔존 에너지
- 속도
- 마찰
- 충돌 위치

따라서 **절대적인 Reflection Model은 존재하지 않는다.**

Trajectory Extension은 이 물리 현상을 재현하지 않는다. 관리자가 편집하기 위한 **표준 Proposal만** 생성한다.

### 5.3 성격 · 규칙

| 항목 | 규칙 |
|------|------|
| 역할 | 표준 초기 Proposal (Recommendation) — **정답 계산 아님** |
| 입사각 | 현재 Segment 방향으로 산출 |
| 표 사이 값 | **선형 보간(interpolation)** · 외삽 금지(Clamp) |
| 적용 범위 | **Global Table** (v1) |
| 소유 | Extension Domain 내부 자산 |
| 위치 | `domain/trajectoryExtension/reflectionTable/` |
| 최종 권한 | **관리자 Handle Drag** (표보다 우선) |

### 5.4 Extension 생성 시 적용

| Extension | Reflection Table 사용 | 자동 생성 범위 | 관리자 교정 |
|-----------|----------------------|----------------|-------------|
| **Extension1** | 표준 반사각 → 반사 방향 | **다음 쿠션까지** | 끝 Handle · 쿠션 1축 Drag |
| **Extension2** | 동일 표 기준 표준 반사각 | **약 20 Rg** | 끝 Handle · 길이·방향 자유 Drag |

### 5.5 배치 제약 (필수)

Reflection Table은 다음 위치에 **두지 않는다.**

- `data/systems/*` — Fleet Contract Book Ch.8 L4 / Ch.9 L5 Ratified 표면 진입 → Amendment 절차 발생
- `runtime/contract` 경유 — Ch.10 L6 Runtime Contract 개정 → ADR + Ratified 챕터 개정 발생

Extension Domain 내부 자산으로 두는 것이 "계산이 아니라 추천 초기값"이라는 정의와도 일치한다.

### 5.6 기존 Reflection과의 관계

`resolveReflectionC2()`는 `co / c1 / c3`를 받는 **C2 전용 함수**이지 범용 반사기가 아니다. Extension이 이를 호출하거나 시그니처를 확장하는 것은 TRJ-003 수정에 해당하므로 **금지**한다. Extension은 자체 Reflection Table(Default Proposal)을 별도로 가진다.

단, Reflection Safety 파라미터(`m_min`, `theta_t_max`)는 Runtime Contract 소유이므로 Extension이 직접 읽지 않고 **App 주입**으로만 받는다.

---

## 6. Second Ball — Ownership

| 항목 | 값 |
|------|-----|
| Owner | **`ballsState` (App)** — 기존과 동일 |
| Extension의 권한 | **Geometry 소유** · Ball에 대한 **명시적 1회 Projection만** 제공 |
| Owner 변경 | **없음** |

### 6.1 Role vs Color (Clean Cut Phase 1–7C — COMPLETE)

| 계층 | 값 | 의미 |
|------|-----|------|
| **Role (Ball3 / Dataset)** | `cue` · `target` · `second` | **필드명 = physical role** |
| **Color metadata** | `targetBall` / `targetColor` | physical Target의 색 (`red` \| `yellow`)만 · paint / filter metadata |
| **App UI (Phase 7B)** | Role field identity | color-slot Role consumer **0** |
| **Search / Recall (Phase 7C)** | **ROLE → ROLE direct** | Target↔Second **permutation removed** |
| **Phase 7A** | dead Product/bridge helpers DELETED | — |

**Canonical Ball3**

- `balls.cue` = physical Cue (white)
- `balls.target` = physical Target (red 또는 yellow)
- `balls.second` = physical Second (나머지 object ball)
- Color는 Role이 아니다. `targetBall`로 Target/Second **필드를 고르지 않는다.**

```text
CASE A targetBall=red    → balls.target=red pos · balls.second=yellow pos
CASE B targetBall=yellow → balls.target=yellow pos · balls.second=red pos
```

**SEARCH BALL3 = ROLE-BASED DIRECT MATCH (Phase 7C)**

- `query.target` ↔ `candidate.target`, `query.second` ↔ `candidate.second`
- Target/Second permutation = **removed**
- `allowTargetSecondPermutation` / `usedPermutation` / swap helpers = **deleted**
- color metadata does not determine Role
- FIELD NAME == PHYSICAL ROLE

**App Ball3 consumer = Role-based (Phase 7B)** · **C3+/Product/Coverage = balls.second for P (Phase 6)**

Projection / DoubleClick Lock의 목표는 **Role 필드**다. Extension은 Second Ball을 **소유하지 않는다.**

**Runtime Attachment / Snap / Follow / Continuous Constraint는 존재하지 않는다 (v1.3).**

### Second Ball은 여전히 Display Cap의 입력이다

**중요.** Second Ball(역할) 좌표는 궤적 *생성*에는 관여하지 않지만, *표시 Cap*의 입력이다. Cap 계산기는 기존과 같이 좌표를 읽는다. §3 Origin이 Display Cap과 독립인 이유도 동일하다.

---

## 7. Target Lock + Projection (v1.3 final)

> **자동 Snap / Attachment / Follow는 제거한다.**
> Projection은 **Target Lock 이후 · Second Role Ball DoubleClick 1회**로만 수행한다.

### 7.1 Target 선택 · Role Lock

| 입력 | 조건 | 동작 |
|------|------|------|
| Object Ball DoubleClick | Target **미지정** | 해당 색 → **Target Role** · 나머지 색 → **Second Role** · **Lock** |
| Second Role Ball DoubleClick | Target **Lock 이후** | **Nearest Segment Projection 1회** — Target 변경 금지 |
| Target Role / Cue DoubleClick | Target **Lock 이후** | **no-op** (Target 변경 금지) |
| Target 변경 | 입력 종료 · 명시적 초기화만 | 새 버튼 없음 |

```text
입력 시작
  DoubleClick → Target Role 지정 → Role Lock
Lock 유지 중
  Second Role DoubleClick → Projection만
  어떤 Ball DoubleClick도 Target Role 변경 금지
```

**POLICY A — Recall → Edit (ADMIN)** · *canonical edit-session contract*

```text
Recall (LocalDB / History) = view-only
  → isAdminInputSessionActive = false
  → Target Lock hydrate is explicit (meta → lock; no meta → unlock; no stale lock)
  → Target dblclick does NOT resume edit session while view-only
  → Second dblclick Projection unchanged (§7.3)
Reset = ONLY canonical Recall→Edit transition
  → unlock Target Lock
  → restore Target Ready metadata (color / slot targetBall)
  → session true → SYS / HP/T / STR / AI / SAVE when Ready
Role-based Ball3 SSOT unchanged (field name == physical role)
```

> Status pointer / Issue B: `PROJECT_MASTER_INDEX.md` · detail log: `HISTORY/PROJECT_LOG_2026-08.md`.  
> Impl (non-SSOT): `App.jsx` · `adminLocalDbFlow.ts` · `adminEditSessionContract.ts` · `useSettings.js`.

### 7.1.1 LocalDB Search vs trajectory (existing contract — clarified)

Search space = **persisted Ball3 samples** on each `PositionRecord` (Role-direct Euclidean; adminSearch **2.0 Rg / ball** — metrics in MASTER).  
Trajectory / Product Coverage **display** ≠ Search candidate set.  
Ball on a drawn trajectory line **does not** guarantee LocalDB match.

### 7.2 Runtime Attachment — **없음**

| 항목 | v1.3 |
|------|------|
| Detached / Attached 상태 | **없음** |
| Snap Radius | **없음** |
| Handle Drag → Ball Follow | **없음** |
| Drag 중 자동 Projection | **없음** |

### 7.3 DoubleClick Projection

| 항목 | 값 |
|------|-----|
| 트리거 | Target Lock 이후 · **Second Role** Ball DoubleClick |
| 대상 Ball | `getSecondBall()` — Role == second 인 슬롯만 |
| 후보 Segment | **Displayed** Calculated Trajectory + Reveal + Extension |
| 연산 | `projectPointToSegment` · nearest · 1회 |
| 결과 | **Second Role Ball 좌표만** 수정 |
| Geometry | **불변** |

Active Handle이 없어도 nearest Projection이 가능하다. Builder / Display Cap / Reflection은 수정하지 않고 **Render가 이미 만든 경로만** 읽는다.

### 7.4 Handle Pointer Priority

```text
Extension Handle → Baseline Handle → Joystick → Ball
```

Handle Hit 성공 시 Ball Drag / Joystick / selection을 즉시 clear하고 Capture를 확보한다.

### 7.5 Recall

Recall은 저장된 슬롯 좌표를 그대로 복원한다. Attachment Resolve / 자동 재투영은 없다.

---

## 8. Geometry Ownership

### 8.0 Geometry Ownership (절대 규칙)

**Geometry의 Owner는 항상 Extension이다. Second Ball은 Geometry를 변경할 권한이 없다.**

| 주체 | Extension Geometry | Second Ball 좌표 |
|------|--------------------|------------------|
| **Extension Handle Drag** | **변경한다 (Owner)** | **변경하지 않는다** (Follow 없음) |
| **Second Ball Drag** | **절대 변경하지 않는다** | **자유 이동** |
| **Second Ball DoubleClick Projection** | **변경하지 않는다** | **1회 투영으로만 변경** |

```text
[허용]
Handle Drag → Geometry만 변경 · Ball 고정
Second Ball Drag → Ball만 자유 이동 · Geometry 고정
DoubleClick → Ball만 Projection · Geometry 고정

[금지]
Second Ball Drag / Projection → Extension Geometry write
Handle Drag → Ball 자동 Follow
자동 Snap / Continuous Projection
```

> **구현 금지 조항.** Second Ball drag / Projection handler에서 `TrajectoryExtension` geometry 필드에 write하는 코드는 금지한다. Extension geometry의 유일한 쓰기 경로는 Extension Handle drag이다.

### 8.1 Dataset 영향

Projection으로 Second Ball 좌표가 바뀌면 `positionId` / MERGE 판정에 영향을 줄 수 있다. 이는 관리자가 **명시적으로** Projection한 결과이며, 자동 Follow로 인한 암묵적 이동은 발생하지 않는다.

---

## 9. Ball Drag

Second Ball은 **완전 자유 이동**한다. 자동 Snap · Slide · Attachment 없음.

| 동작 | 규칙 |
|------|------|
| Second Ball Drag | 테이블 범위 clamp만 · Extension과 무관 |
| Target Lock 중 Drag | Target 변경 금지 |
| Extension Geometry | Drag로 변경하지 않음 (§8.0) |

`runBallDrag()`가 `second`를 제외하는 기존 안전성은 유지한다. Second Ball Drag는 SYS 역산을 유발하지 않는다.

---

## 10. 제거된 규칙 (v1.3)

다음 개념은 **폐기**한다. 구현·문서·코드에 재도입하지 않는다.

| 제거 | 비고 |
|------|------|
| Runtime Attachment State | Detached / Attached |
| `followAttachedSecondBall` | Handle Drag Follow |
| `applyAttachedSecondBallConstraint` | Geometry 변경 시 자동 Projection |
| Snap Radius (`ATTACH_RADIUS_RG` / 2Rg) | 상태 전환 판정 |
| AutoSeparate 예외 (Attached skip) | Attachment 전제 |
| Continuous / Drag-time Projection | Slide Constraint |

**유지:** `projectPointToSegment` (또는 동일 기능) — DoubleClick Projection 전용.

---

## 11. 편집 순서

```text
① 궤적 연장 생성          Extension1 · Extension2 (Reflection Table)
        ↓                  Second Ball 이동 없음
② Target 지정             Object Ball DoubleClick → Target/Second Role · Lock
        ↓
③ Extension 교정          Handle Drag (우선) · Ball Follow 없음
        ↓
④ Second Role 배치        자유 Drag · 자동 Snap 없음
        ↓
⑤ Projection (선택)       Second Role DoubleClick
                          → Calculated+Reveal+Extension 중 nearest 1회
                          → Second Role 좌표만 수정
        ↓
⑥ SAVE                    Extension 끝점 + 슬롯 좌표 (Role 아님)
        ↓
⑦ Recall / Search         저장 좌표·궤적 그대로 재현
```


---

## 12. Dataset

> **Dataset은 좌표만 저장한다. Runtime Attachment는 존재하지 않으며 저장하지도 않는다.**

### 12.0 저장 대상 / 비저장 대상

| 구분 | 항목 | 저장 |
|------|------|------|
| 좌표 | Extension1 끝점 (Rg) | **저장** |
| 좌표 | Extension2 끝점 (Rg) | **저장** |
| 좌표 | Second Ball 좌표 | **저장** (기존 `balls.second`) |
| 상태 | Attached / Detached / Snap | **해당 없음 (v1.3 제거)** |
| 상태 | 활성 Handle 선택(✔) | 저장하지 않음 — UI 상태 |
| 파생 | Extension 시작점 · Origin 좌표 | 저장하지 않음 — Runtime 해소 |
| 파생 | Second Ball 파라미터 `t` | 저장하지 않음 |

SAVE 시점에 영속화되는 것은 **Extension 끝점 좌표**와 **최종 Second Ball 좌표**뿐이다.

### 저장 위치

| 대상 | 저장 위치 |
|------|-----------|
| Extension payload (좌표) | **`StrategyEntry.trajectoryExtensions`** |
| Second Ball 좌표 | `PositionRecord.balls.second` (기존 · 변경 없음) |
| Attachment 상태 | **없음 (Runtime 전용)** |

### `PositionRecord` 최상위 저장 금지

`normalizePositionRecord()`가 명시적 whitelist로 record를 재구성한다.

```140:148:frontend/src/domain/positionMergeEngine.ts
  return {
    positionId,
    balls,
    strategies,
    schemaVersion,
    ...(targetBall === "yellow" || targetBall === "red" ? { targetBall } : {}),
    ...(source ? { source } : {}),
  };
}
```

이 함수는 export 빌드 · export normalize · published load · localStorage load **네 지점**에서 호출된다. 최상위 신규 필드는 네 번 전부 폐기된다.

반면 `normalizeCanonicalStrategyEntry()`는 `...entry` spread이므로 Entry 필드는 왕복 전 구간을 통과한다.

### Payload 구조

```ts
type TrajectoryExtensionId = string;   // "EXT-S1-01" · slot 내 단조 증가 · 재사용 금지

type TrajectoryExtension = {
  id: TrajectoryExtensionId;
  index: 1 | 2;
  endpoint: { x: number; y: number };   // Rg · 끝점만 저장 (시작점은 런타임 해소)
  userEdited: boolean;                  // provenance 표시 전용 (아래 주의 참조)
  createdAt: string;
  updatedAt: string;
};

type TrajectoryExtensionPayload = {
  extensionSchemaVersion: 1;
  origin: { kind: "path_node"; source: "corrected" | "baseline" };
  items: TrajectoryExtension[];         // 최대 2
};
```

**Attachment / Snap 필드는 payload에 존재하지 않는다 (v1.3 — Runtime에도 없음).**

### `userEdited`는 재계산 트리거가 아니다

`endpoint`는 `userEdited` 값과 무관하게 **항상 저장하고 항상 그대로 복원**한다. Hydrate 시 Reflection Table로 재제안(re-propose)하지 **않는다.**

Reflection Table은 **생성 시점(§4)의 초기 제안**에만 사용한다. Hydrate 시 재계산하면 표 값이 개정될 때 저장된 중심선이 이동하여 관리자가 교정한 Geometry가 깨진다. `userEdited`는 관리자 교정 여부를 나타내는 **표시 정보(provenance)** 로만 사용한다.

### 저장 금지 사항

| 금지 | 사유 |
|------|------|
| **Attached / Detached / Snap 상태 저장** | **해당 개념 없음 (v1.3)** |
| **`secondBallAttachedTo` 등 결합 대상 ID 저장** | **동일** |
| `sysInputs` 하위 저장 | `stripRuntimeSysInputs()`가 유한 숫자만 남기고 제거 |
| `CANONICAL_STRIP_TOP_LEVEL_KEYS` 15개 이름 사용 | strip 대상 · 특히 `trajectorySamples`와 혼동 주의 |
| Extension 시작점 저장 | Chain 무결성이 자료구조로 보장되지 않게 됨 |
| Origin 좌표 저장 | stale geometry 발생 |
| Second Ball `t` 저장 | 좌표와 이중 SSOT 발생 |

`trajectoryExtensions`는 strip 목록에 **없다.** 향후 유지보수자가 실수로 추가하지 않도록 ADR에 **DO NOT STRIP**을 명시한다.

### Version

`extensionSchemaVersion`을 자체 보유한다. Export envelope(`schemaVersion: 2`) 및 record(`CANONICAL_SCHEMA_VERSION: 1`)와 무관하다.

프로젝트에 마이그레이션 인프라가 없으므로(로드 시 버전 비교 코드 부재) 규칙은 **미지 버전은 무시하되 보존**이다. 렌더하지 않고 삭제하지도 않는다.

### Draft / Applied

Baseline 원칙("Draft는 절대 저장하지 않는다 · Applied만 저장한다")을 따른다.

- Draft Extension Geometry는 **Runtime에서만** 유지한다
- SAVE 시점에만 최종 Second Ball 좌표와 Extension **끝점 좌표**를 영속화한다
- Runtime Attachment는 존재하지 않으므로 Draft/Applied 구분 대상이 아니다

### Search 비참여

Extension payload는 검색에 참여하지 **않는다.**

| 대상 | 참조 필드 | Extension 영향 |
|------|-----------|----------------|
| recall 매칭 | `balls` 좌표 · `targetBall` | 없음 |
| signature | `systemId` + `formulaHash` | 없음 |
| `positionId` | 세 공 좌표 | 없음 (payload 자체는) |
| KD-Index | 6D 좌표 + `positionId` | 없음 |

단, 명시적 Projection으로 Second Ball 좌표가 바뀌면 `positionId`에 **간접 영향**은 존재한다.

### Runtime 도달 (필수 주의)

Record에 살아남아도 **runtime slot에는 자동으로 도달하지 않는다.** `useShotSlots.ts`의 hydrate 3곳이 전부 whitelist다.

| 함수 | 위치 |
|------|------|
| `buildDraftsFromRecord()` | `hooks/useShotSlots.ts` |
| `loadDraftsFromPositionRecord()` | `hooks/useShotSlots.ts` |
| `loadDraftFromStrategyEntry()` | `hooks/useShotSlots.ts` |

세 곳에 `trajectoryExtensions`를 명시적으로 넣지 않으면 **SAVE는 성공하는데 Recall하면 사라지는** 형태가 된다. (구현 완료 · whitelist 포함)

`createStrategyEntry()`(`domain/adminSaveEngine.ts`)도 명시적 부착이 필요하다. (구현 완료)

### USER Search Runtime Activation (v1.4 · D-EXT-26)

draft에 payload가 있어도 USER Extension Layer는 **`userTableDisplaySlotId`가 설정된 뒤에만** hydrate된다.

**Search 전용 Hydrate는 존재하지 않는다.** Strategy Pick과 동일한 Runtime Activation만 사용한다.

#### 공용 함수 `activateStrategySlot(slotId)` (`App.jsx`)

```text
actions.switchSlot(slotId)
  → setUserTableDisplaySlotId(slotId)
  → hydrateSlotRuntime(slotId)
```

Overlay/UI 처리는 포함하지 않는다. `pickStrategySlot`만 Overlay clear 후 본 함수를 호출한다.

#### slot 결정 (`resolveUserSearchDisplaySlotId`)

1. `activeSlot`이 `record.strategies`에 있으면 그대로 사용  
2. 없으면 `S1 → S2 → S3` 중 record에 존재하는 첫 슬롯  

#### USER Search 최종 Runtime Flow

```text
USER Search
  ↓
runUserSearch / runSpatialRecall
  ↓
applyUserSearchRecall
  ↓
buildDraftsFromRecord  (+ trajectoryExtensions whitelist)
  ↓
resolveUserSearchDisplaySlotId
  ↓
activateStrategySlot(slotId)
  ↓
switchSlot
  ↓
setUserTableDisplaySlotId
  ↓
hydrateSlotRuntime
  ↓
기존 App hydrate effects
  ↓
Trajectory · Extension (payloadToDraft) · Target · Layer Render
```

#### Strategy Pick

```text
pickStrategySlot(slotId)
  → Overlay clear (버튼 전용)
  → activateStrategySlot(slotId)   ← Search와 동일
```

| 진입 | draft 적용 | Runtime Activation |
|------|------------|-------------------|
| USER Search | `applyUserSearchRecall` | `activateStrategySlot` |
| Strategy Pick | (이미 Search로 draft 존재) | `activateStrategySlot` |
| ADMIN Local DB / Published Search | `applyPositionRecall` | ADMIN hydrate (`activeSlot` · `userTableDisplaySlotId` 게이트 없음) |

---

## 13. USER

USER는 다음을 **보지 않는다.**

- Handle
- Joystick
- Draft 상태
- Extension 번호 / Extension 상태
- 기타 모든 편집 정보

USER는 **최종 Extension 결과만** Render한다.

```text
USER 화면 = Calculated Trajectory (+ Reveal Segment) + Extension1 + Extension2 + Second Ball + Label
```

USER Projection Rule을 따른다. Extension Label 텍스트는 ADMIN 저작이며 USER에서 재생성하지 않는다.

---

## 14. Interaction

### 두 방향의 비대칭 (Geometry Ownership — §8.0 · v1.3)

```text
Extension Handle Drag
    ↓
Extension Geometry 수정        ← Geometry Owner
    ↓
Ball은 따라오지 않음


Second Ball Drag
    ↓
자유 이동
    ↓
Extension Geometry는 변경하지 않는다   ← 권한 없음


Second Ball DoubleClick (Target Lock 후)
    ↓
선택 Extension 중심선에 1회 Projection
    ↓
Ball 좌표만 수정 · Geometry 불변
```

**Handle은 Geometry만 바꾼다. Ball은 자기 위치만 바꾸고 Geometry를 바꾸지 않는다.** 이 비대칭이 순환을 막는다.

| Interaction | Extension Geometry | Ball 좌표 |
|-------------|--------------------|-----------|
| Extension Handle Drag | **write** | **변경 없음** |
| Second Ball Drag | **read only** | **자유 write** |
| Second Ball DoubleClick Projection | **read only** | **1회 write** |

### Pointer Capture Timing SSOT 준수

Extension Handle은 Drag 전용 기능이므로 기존 CO/C1 Baseline Handle과 동일한 취급이 가능하다.

DoubleClick Projection은 Ball 좌표만 바꾸며 Capture 시점을 변경하지 않는다.

---

## 15. 삭제 규칙

| 동작 | 결과 |
|------|------|
| Extension2 삭제 | 가능 · `items`에서 index 2 제거 |
| Extension1 삭제 | Extension2도 **함께 삭제** · `items` 전체 비움 |

Extension1 삭제 시 Extension2가 남으면 시작점을 해소할 수 없으므로, 이는 선택이 아니라 구조적 필연이다.

### 삭제 시 Second Ball 처리

Extension 삭제 후 **Second Ball 좌표는 변경하지 않는다.** 마지막 위치에 그대로 남는다. (Attachment Resolve 없음 · v1.3)

### Origin 해소 실패 시

SYS 변경으로 Origin이 무효해지면 Extension을 **삭제하지 않는다.**

- `unresolved` 상태로 두고 **렌더하지 않는다**
- ADMIN에만 해소 실패를 표시하고 USER에는 아무것도 표시하지 않는다
- 좌표를 자동 보정하지 않는다 (자동 보정은 곧 계산 행위다)
- Second Ball 좌표는 유지한다

---

## 16. Domain Ownership

### 위치

`trajectoryExtension`은 `trajectory`의 **하위가 아니라 형제 Domain**이다.

```text
frontend/src/domain/
  ├── trajectory/              ← 계산 소유 (TRJ-001/003 · Batch 5 Frozen · AD-B5-01~11)
  │     trajectoryBuilder.ts
  │     reflectionPolicy.ts
  │     pathNodeHelpers.ts
  └── trajectoryExtension/     ← Overlay 소유 (신규)
        model.ts
        origin.ts
        snapPolicy.ts          ← Projection policy only (v1.3 · Snap/Attachment 제거)
        secondBallConstraint.ts ← projectPointToSegment (DoubleClick 전용)
        reflectionTable/
```

`domain/trajectory/`는 Batch 5에서 Frozen된 계산 네임스페이스다. 하위에 두면 향후 리팩터링에서 병합 대상이 될 구조적 위험이 있다.

### Import 방향 (Import Graph Gate 검증 대상)

```text
trajectoryExtension  →  trajectory              허용 (타입 · 순수 함수 read-only)
trajectory           →  trajectoryExtension     금지
trajectoryExtension  →  runtime/*               금지 (App 주입만)
trajectoryExtension  →  data/systems/*          금지
```

### 소유권 표

| 대상 | Owner | Extension 권한 |
|------|-------|----------------|
| `pathNodes` (CO~C6) | `trajectory/trajectoryBuilder.ts` | 읽기 전용 |
| Display Cap 계산기 | `trajectoryPathDisplayPolicy.ts` | 순수 함수 read-only 호출 |
| C2 Reflection | `trajectory/reflectionPolicy.ts` (TRJ-003) | 호출·확장 모두 금지 |
| Reflection Safety | Runtime Contract → `supplyReflectionSafety()` | 주입 수령만 |
| `balls.second` 좌표 | `ballsState` (App) | 명시적 Projection만 · 직접 소유 아님 |
| **Extension Geometry (끝점 · 방향 · 길이)** | **Extension** | **소유 — 유일한 쓰기 주체 (§8.0)** |
| Extension Chain | **Extension** | 소유 |
| Reflection Table | **Extension** | 소유 |
| Second Ball Attachment 상태 | **해당 없음 (v1.3 제거)** | — |

### Dataset · Geometry Ownership 정합성 (v1.3)

| 항목 | Geometry Owner | Runtime | Dataset | 정합 |
|------|----------------|---------|---------|------|
| Extension1 끝점 | Extension | 편집 중 Draft | **저장** (좌표) | OK |
| Extension2 끝점 | Extension | 편집 중 Draft | **저장** (좌표) | OK |
| Extension 시작점 | Extension (파생) | Chain / Origin 해소 | 저장 안 함 | OK — 단일 SSOT |
| Origin | `trajectory` (읽기 전용) | Node 참조 해소 | 참조만 저장 | OK — stale 없음 |
| Second Ball 좌표 | **Extension이 아님** (`ballsState`) | 자유 배치 · 명시적 Projection | **저장** (기존 경로) | OK — Owner 변경 없음 |
| Attached / Detached | 해당 없음 | **없음 (v1.3)** | **없음** | OK |
| 활성 Handle (✔) | 해당 없음 | UI 상태 · Projection 대상 | 저장 안 함 | OK |

**정합성 근거**

1. **단방향성.** Geometry Owner가 Extension 하나뿐이므로 Ball 좌표가 Geometry를 되돌려 바꾸는 경로가 없다.
2. **명시적 Projection.** Ball 정렬은 DoubleClick 1회로만 발생하며 Dataset에는 결과 좌표만 남는다.
3. **Hydrate 불변.** Extension 끝점은 항상 그대로 복원하며 Reflection Table로 재계산하지 않는다.

**모순 차단**

| 잠재 모순 | 차단 |
|-----------|------|
| Hydrate 시 Extension 끝점을 Reflection Table로 재계산 | §12 `userEdited`는 재계산 트리거 아님 |
| Ball Drag가 Geometry를 바꿈 | §8.0 구현 금지 조항 |
| Handle Drag가 Ball을 자동 이동 | §8.0 · v1.3 Follow 금지 |

---

## 17. Architecture Freeze — Blocker 현황

### Resolved

| ID | 항목 | 해소 근거 |
|----|------|-----------|
| **R1** | Second Ball ↔ Display Cap 순환 의존 | Origin을 `min(chainBreakCap, sameRailCap)`로 정의 — Display Cap과 독립 (§3) |
| **R2** | Slot 단위 Extension ↔ Record 단위 Second Ball | Owner를 `ballsState` 단일로 고정 · 불변식을 "편집 시점 강제"로 한정 (§6 · §8) |
| **B1-a** | Extension Origin 정의 | `pathNodes` chain end + same-rail Cap 적용 (§3) |
| **B1-b** | C4~C6 표시 정책 | Extension Layer가 Reveal Segment 자체 렌더 · 정책 파일 무수정 (§3) |
| **B2** | Second Ball 자동 배치가 `positionId` 재정의 | 생성 시 자동 이동 금지 (§11) |
| **B4** | Reflection Table 키 범위 | **Global Table** 확정 (§5) |
| **NB-1** | Second Ball 결합 상태 | **v1.3에서 Attachment 폐기** · Target Lock + DoubleClick Projection (§7) |
| **NB-3** | 명시적 Projection이 `positionId` 변경 | 명시적 수용 · SSOT에 문서화 (§8.1) |
| **NB-4** | Attachment 결합 대상 판정 모호성 | **폐기 (v1.3)** — Attachment 없음 |
| **NB-5** | Hydrate 재제안이 중심선을 이동 | `userEdited`는 재계산 트리거 아님 · 끝점은 항상 그대로 복원 (§12) |
| **D-4** | Origin 정밀 정의 | `min(chainBreakCap, sameRailCap)` (§3) |
| **D-EXT-21/22** | Snap/Follow UX 문제 | Target Lock + DoubleClick Projection · Handle/Ball 분리 (v1.3) |

### Pending

| ID | 항목 | 해결 시점 | 사유 |
|----|------|-----------|------|
| **B3** | Extension Handle ↔ Second Ball Pointer 우선순위 | 회귀 모니터링 | Handle hit vs Ball pick 겹침 가능 — Capture Timing |
| **NB-2** | Origin 비-쿠션 시 Reflection Fallback | **구현 중 해결 가능** | §3에 유효 조건은 확정 · 버튼 비활성 UX 문구만 미정 |

#### B3 상세

| 항목 | 값 |
|------|-----|
| `BALL_PICK_RADIUS_RG` = `BALL_RADIUS_RG × 5` | **4.325 Rg** |
| Baseline Handle hit 반경 | **2.5 Rg** |
| Handle 판정 순서 | `handlePointerDown` 최우선 · 적중 시 early-return |
| Handle Capture 시점 | **pointerdown** |

v1.3에서 Ball이 중심선 Slide로 Handle에 강제 근접하지는 않으나, 자유 Drag로 Handle 근처로 올 수 있다. Handle 적중 시 Ball dblclick이 가려질 수 있으므로 회귀 관찰 대상이다.

### 구현 착수 조건

```text
Domain / Overlay 구현은 v1.3 SSOT를 따른다
```

### Freeze 판정

| 항목 | 판정 |
|------|------|
| Architecture Freeze | **PASS (v1.3)** |
| Extension Object SSOT | 확정 (§3 · §4) |
| Extension Lifecycle SSOT | 확정 (§7 · §11 · §15) |
| Dataset Schema SSOT | 확정 (§12) — **좌표만 저장** |
| Rendering Pipeline SSOT | 확정 (§13 · §18) |
| Geometry Ownership SSOT | 확정 (§8.0) |
| Target Lock + Projection SSOT | 확정 (§7 · v1.3) |
| 3계층 정합성 | 확정 (§16) |
| P2 Overlay | **진행 중 — Snap/Attachment 제거 완료** |

---

## 18. 영향 범위

### 신규 파일

| 경로 | 역할 |
|------|------|
| `domain/trajectoryExtension/model.ts` | 타입 · 상태 정의 |
| `domain/trajectoryExtension/origin.ts` | Origin 참조 해소 · 유효 조건 |
| `domain/trajectoryExtension/chainPolicy.ts` | Chain 해소 · 삭제 규칙 |
| `domain/trajectoryExtension/snapPolicy.ts` | Projection policy · Geometry ownership types (v1.3 · Snap/Attachment 제거) |
| `domain/trajectoryExtension/secondBallConstraint.ts` | `projectPointToSegment` · DoubleClick Projection |
| `domain/trajectoryExtension/reflectionTable/table.ts` | Global Default Proposal 데이터 |
| `domain/trajectoryExtension/reflectionTable/interpolate.ts` | 선형 보간 |
| `renderer/trajectory/trajectoryExtensionRenderModel.ts` | Rg → px · Reveal Segment 포함 |
| `components/table/TrajectoryExtensionLayer.jsx` | SVG Layer |
| `overlay/state/trajectoryExtensionHandleDrag.ts` | Handle Drag (Geometry only) |

### 수정 파일 (전부 Additive)

| 경로 | 변경 |
|------|------|
| `App.jsx` | model 조립 · Layer 삽입 · Target Lock · DoubleClick Projection · Handle 분기 |
| `hooks/useShotSlots.ts` | `DraftState` 필드 1개 + **hydrate whitelist 3곳** |
| `domain/adminSaveEngine.ts` | `createStrategyEntry` pass-through |
| `application/flows/saveFlow.ts` | applied → entry 전달 |
| `domain/positionSearchEngine.ts` | `StrategyEntry` optional 필드 |
| `components/table/SystemValueLabels.jsx` | ✔ Apply 버튼 재사용 |

### 절대 비변경 (보증)

`trajectoryBuilder.ts` · `trajectoryPathDisplayPolicy.ts` · `reflectionPolicy.ts` · `reflectionEngine.ts` · `pathNodeHelpers.ts` · `trajectoryPathAttrModel.ts` · `trajectoryRenderModel.ts` · `baselineHandleModel.ts` · `runtime/*` · `data/systems/*` · `ModalShell.jsx` · `canonicalStrategy.ts` strip 정책 · `positionMergeEngine.ts` · `positionId.ts` · `domain/recall/*`

### 렌더 순서

Extension Layer는 `<ImpactLines>` **직후, Ball 요소 이전**에 배치한다(`App.jsx` 3916–3942 사이). 공보다 아래에 깔려야 공의 클릭·더블클릭이 막히지 않는다. Extension polyline에는 `pointerEvents="none"`을 적용한다.

Extension Label은 `PATH_NODE_MARKS`와 다른 네임스페이스를 사용한다. `SystemValueLabels`의 Caption Engine 배치와 충돌해서는 안 된다.

---

## 19. 상수 SSOT

| 상수 | 값 | 출처 |
|------|-----|------|
| `BALL_DIAMETER_RG` | 1.7299 (`61.5 / 35.55`) | `App.jsx` 309–311 |
| `BALL_RADIUS_RG` | 0.8650 | `App.jsx` 312 |
| `BALL_PICK_RADIUS_RG` | 4.3248 (`× 5.0`) | `App.jsx` 315 |
| `HIT_TOLERANCE` | 3.4599 (`max(2, R × 4)`) | `App.jsx` 3382 |
| Baseline Handle hit 반경 | 2.5 Rg | `baselineDraftState.ts` 53 |
| `MERGE_EPSILON` | 0.5 Rg | `positionMergeEngine.ts` — **LEGACY constant name**; Authoring SAVE **no longer** uses proximity merge. Current policy: **Cue-Only Edit Snap** / **Exact Position Replacement** (`GLOSSARY_SSOT` · LOG 2026-08-10). |
| `positionId` 양자화 | 0.1 Rg | `positionId.ts` |
| **Extension2 기본 길이** | **20 Rg** | 본 문서 §4 |
| **Extension 최대 개수** | **2** | 본 문서 §4 |

> v1.3: `ATTACH_RADIUS_RG` / Snap Radius **제거**.

---

## 20. 구현 순서 및 검증 게이트

| Phase | 내용 | 상태 (v1.4) |
|-------|------|-------------|
| **P1** | 타입 · Domain 순수 함수 (Origin · Reflection Table) | **완료** |
| **P2** | Render Layer · Handle · Target Lock + DoubleClick Projection | **완료** |
| **P3** | 영속화 왕복 · hydrate whitelist | **완료** |
| **P4** | ADMIN 편집 · Pointer Capture 회귀 없음 | **완료** |
| **P5** | USER 투영 · Search Runtime Activation (`activateStrategySlot`) | **완료** |
| **P6** | Regression · Closure · LOG / MASTER / SSOT 갱신 | **완료 (Task Closed)** |

후속(비차단): Handle First Drag 잔여 간섭 · build `tsc --noEmit` / ESLint `.ts` 게이트 보강(후속 후보).

---

## 21. 금지 사항 요약

- 계산 Trajectory(C1~C6) 및 계산 엔진 수정 금지
- `trajectoryPathDisplayPolicy.ts` 수정 금지 (순수 함수 read-only 호출만 허용)
- `resolveReflectionC2()` 호출 · 시그니처 확장 금지
- Extension을 계산 엔진 내부에 편입 금지
- Reflection Table을 `data/systems/*` 또는 Runtime Contract에 배치 금지
- System JSON 직접 접근 금지 (debug · 표시 전용 필드도 예외 없음)
- Extension 시작점 / Origin 좌표 / Second Ball `t` 저장 금지
- **Runtime Attachment / Snap / Follow / Continuous Projection 재도입 금지 (v1.3)**
- **Second Ball Drag · Projection handler에서 Extension Geometry 필드 write 금지 (§8.0)**
- **Handle Drag 시 Ball 자동 Follow 금지 (§8.0 · v1.3)**
- **Hydrate 시 Extension 끝점을 Reflection Table로 재계산 금지 (§12)**
- **Search 전용 Hydrate / Extension / Trajectory 경로 신설 금지** — `activateStrategySlot` · `hydrateSlotRuntime` 재사용 (v1.4 · D-EXT-26)
- `PositionRecord` 최상위에 Extension 필드 저장 금지
- Second Ball Owner 변경 금지
- pointerdown 시점 Pointer Capture 규칙을 B3 확정 없이 확장 금지
- USER에 편집 정보 노출 금지
- USER Projection Rule 위반 금지

---

## 22. Decision Log

| ID | Decision |
|----|----------|
| **D-EXT-01** | 공식 명칭은 Trajectory Extension · 관리자 버튼명은 "궤적 연장" |
| **D-EXT-02** | Extension은 계산 엔진이 아니라 독립 Overlay Layer · 계산 계층 무수정 |
| **D-EXT-03** | Origin = `pathNodes[min(chainBreakCap, sameRailCap)]` · second-ball Cap 미적용 |
| **D-EXT-04** | Extension Layer가 Reveal Segment(C4~C6)를 자체 렌더 · Display Cap 파일 무수정 |
| **D-EXT-05** | Origin은 좌표가 아니라 참조로 저장 · 런타임 해소 |
| **D-EXT-06** | Extension 시작점을 저장하지 않음으로써 Chain 무결성을 자료구조로 보장 |
| **D-EXT-07** | Reflection Table은 Global · Extension Domain 내부 테이블 · **표준 Default Proposal만 생성** (Reverse Spin 물리 엔진 아님 · 절대 Reflection Model 없음) · 최종 Reverse End는 관리자 Handle Drag (v1.2) |
| **D-EXT-08** | Second Ball Owner는 `ballsState` 유지 · Extension은 Geometry만 소유 (v1.3: Constraint/Snap 제거) |
| **D-EXT-09** | ~~Detached/Attached Runtime State~~ → **폐기 (v1.3)** · Attachment 개념 없음 |
| **D-EXT-10** | Handle 선택(✔)과 Projection 대상을 분리하지 않음 — Projection은 **현재 선택된 Extension** 기준 (v1.3) |
| **D-EXT-11** | Extension 생성 시 Second Ball 자동 이동 금지 |
| **D-EXT-12** | 명시적 Projection이 `positionId`를 변경할 수 있음을 수용 |
| **D-EXT-13** | Dataset 저장 위치는 `StrategyEntry.trajectoryExtensions` · `trajectoryExtensions` DO NOT STRIP |
| **D-EXT-14** | `trajectoryExtension`은 `trajectory`의 형제 Domain · Import 단방향 |
| **D-EXT-15** | B3(Pointer 우선순위) 확정 전 P4 착수 금지 |
| **D-EXT-16** | ~~Attachment Resolve~~ → **폐기 (v1.3)** |
| **D-EXT-17** | ~~Snap / Constraint 이원화~~ → **폐기 (v1.3)** · DoubleClick 1회 Projection만 |
| **D-EXT-18** | Geometry Owner는 항상 Extension · Second Ball은 Geometry write 권한 없음 |
| **D-EXT-19** | `userEdited`는 provenance 표시 전용 · Hydrate 재제안 트리거 아님 |
| **D-EXT-20** | Dataset은 좌표만 저장 · Runtime Attachment 없음 (v1.3) |
| **D-EXT-21** | Target Lock 이후 Second Role DoubleClick = Projection · Target 변경 금지 (v1.3) |
| **D-EXT-22** | Handle Drag는 Geometry만 · Ball Follow 없음 · Second Role은 자유 Drag (v1.3) |
| **D-EXT-23** | Role(cue/target/second) ≠ Slot(cue/target_center/second) · Slot은 좌표 저장만 (v1.3 final) |
| **D-EXT-24** | Projection 후보 = Displayed Calculated + Reveal + Extension · nearest 1회 (v1.3 final) |
| **D-EXT-25** | PointerDown 우선순위: Extension Handle → Baseline → Joystick → Ball (v1.3 final) |
| **D-EXT-26** | USER Search와 Strategy Pick은 **`activateStrategySlot()`** 단일 Runtime Activation을 공유한다 · Search 전용 Hydrate **없음** (v1.4) |

---

*End of TRAJECTORY_EXTENSION_SSOT.md — v1.4 Product Complete / Task Closed · 2026-08-04*
