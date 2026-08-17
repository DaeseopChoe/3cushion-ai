# Display Boundary Policy SSOT v1.4

**Status:** Active · Phase 1 Cap + Phase 2A Overlay Gate · **Reading Mode Implemented** · **C2 Reflection Rail Handle Implemented** · **same-rail identity nearest-rail (BUG-A) Implemented** · Corrected Minimum·Continuation·Boundary 잔여  
**Scope:** USER 기준값 / 보정값 Display Layer · USER Overlay Reading Mode · ADMIN C2 Reflection Override (Display)  
**Out of scope:** Trajectory Extension Runtime redesign · Formula · Search · `activateStrategySlot` · Reflection Engine 수식 변경 · `detectRail` 공통 시그니처/Y-first 순서 변경  
**Related (Consume · Do Not Modify here):** `TRAJECTORY_EXTENSION_SSOT.md` v1.4 (Task Closed) · `OVERLAY_LAYOUT_SSOT_v1.2.md` (Shell 규약) · `trajectoryPathDisplayPolicy.ts`  
**Last Updated:** 2026-08-17

> 본 문서는 **Display Layer의 단일 제품 정책(SSOT)** 이다.  
> Trajectory Extension Runtime은 Completed / Freeze이며, 본 문서는 Extension을 재설계하지 않는다.  
> Reading Mode(§15)는 Display Cap/Boundary와 **독립된 Presentation UX**이며, USER Overlay Shell에서만 처리한다.  
> C2 Reflection Rail Handle(§16)은 ADMIN Presentation + Dataset Override이며, Reflection Engine 수식을 변경하지 않는다.

### 개정 이력

| Version | 변경 |
|---------|------|
| v1.0 | Display Boundary Policy 최초 정의 · Cap / Boundary / Overlay Attach 역할 분리 · C4 Minimum · Continuation Rule |
| v1.1 | **Corrected Display Minimum Guarantee** · Baseline/Corrected 공통 최소 C4 · Cap Priority 보강 · D-DBP-10/11 |
| v1.2 | **Phase 2A** Overlay Attach/Visibility Gate 구현 상태 · CASE B · CASE A 확장점 |
| v1.3 | **Reading Mode (Overlay UX)** 정책 · D-DBP-13…15 · 문서 확정 |
| **v1.4** | Reading Mode **Implemented** · C2 Reflection Rail Handle **Implemented** · Corner Cap skipSameRail · D-DBP-16…18 |
| **v1.4.1** | **BUG-A:** same-rail **presence** = `detectRail(eps)` · **identity** = `resolveNearestRail` (LEFT/RIGHT tie-break). `detectRail` 함수 자체 미변경. `skipSameRail`은 C2 override 예외로 **유지** (BUG-B와 별개 · BUG-B는 현재 **UNCONFIRMED / reproduction required**). |

---

## 1. Purpose

USER에게 보이는 궤적은 **계산 결과의 표현**이다. Display는 계산하지 않는다.

현재 코드에는 다음이 **각각** 존재한다.

- baseline path / corrected path (Builder)
- Display Cap (절단)
- Trajectory Extension Overlay (Runtime Geometry)

그러나 **“사용자에게 기준 계산 결과와 보정 계산 결과를 어떻게 보여줄 것인가”** 라는 제품 정책(Display Boundary)은 SSOT로 정의되어 있지 않았다.

그 결과:

- Extension Runtime 존재 여부가 표시 차이를 대신하는 것처럼 보이거나
- baseline이 corrected Cap에 종속되어 C4 최소 표시가 깨지거나
- corrected가 `second_ball` 기본값으로 **C3에서 종료**되어 5&Half 계산 결과(C4)가 가려지거나
- 동일 계산 결과가 모드마다 다르게 보이는 혼선이 발생할 수 있다

본 문서는 그 혼선을 막기 위한 **Display Layer 상위 정책**이다.

```text
사용자가 이해해야 할 것
  = 기준 계산 결과  vs  보정 계산 결과

사용자가 이해할 필요가 없는 것 (1차)
  = Trajectory Extension Runtime 객체의 존재 여부 그 자체
```

---

## 2. Definitions

| 용어 | 정의 |
|------|------|
| **Baseline** | 기준 SYS(보정 전)로 조립된 **계산 궤적** 결과. USER UI **기준값**. |
| **Corrected** | 보정 SYS가 반영된 **계산 궤적** 결과. USER UI **보정값**. |
| **Display Cap** | **하나의** 계산 결과(path)를 **어디까지** 표시할지 결정하는 절단 정책. |
| **Display Boundary** | baseline 표시 결과와 corrected 표시 결과를 **비교·조립**하여, 사용자에게 같음/다름을 표현하는 정책. |
| **Continuation** | C4 이후, **동일 C4 값 계열**로 다음 쿠션(C5·C6)을 **정상 선회**로 계속 표시해도 되는지의 Display 판정. **새 계산이 아니다.** |
| **Minimum Guarantee** | 세컨드볼과 무관하게 **최소 C4(path index 4)** 까지 표시를 보장하는 Cap 하한. Baseline·Corrected 공통. |
| **Trajectory Extension** | 계산 종료 이후 관리자가 저작·저장하는 **Runtime Overlay Geometry** (`trajectoryExtensions`). 계산 엔진이 아니다. |
| **Overlay** | 계산 path 위에 덧그리는 표시 Layer (Extension Layer 등). |
| **Difference** | baseline 표시 결과와 corrected 표시 결과의 **차이**. 사용자에게 보이는 “기준 vs 보정”의 분기. |

### 2.1 Trajectory Extension ≠ Difference

```text
Trajectory Extension  =  Runtime Geometry (저장 · Hydrate · Overlay 후보)
Difference            =  baseline 표시 결과 vs corrected 표시 결과의 비교 결과
```

| | Extension | Difference |
|--|-----------|------------|
| 본질 | Overlay Geometry | Display 비교 결과 |
| Dataset | `StrategyEntry.trajectoryExtensions` | 저장하지 않음 |
| Boundary 입력 | **아님** | Boundary의 **출력 개념** |
| 존재만으로 표시 차이? | **아니오** | 표시 차이의 정의 자체 |

**Trajectory Extension은 Difference가 아니다.**  
Extension Runtime이 있다고 해서 보정값 전용 차이선이 되는 것이 아니며, Extension이 없다고 해서 기준/보정이 항상 동일하게 보이는 것도 아니다.

---

## 3. Design Principles

1. **Display는 계산을 하지 않는다.** pathNodes·SYS·Formula를 쓰지 않는다. 이미 계산된 결과를 읽고 표현한다.
2. **Builder는 표시 정책을 결정하지 않는다.** Builder는 baseline/corrected path를 **생성**만 한다.
3. **Trajectory Extension은 Difference가 아니다.** Runtime Geometry이며 Boundary의 비교 입력이 아니다.
4. **Display Boundary는 사용자 관점의 정책이다.** “기준값/보정값 화면에 무엇을 보여줄까”가 중심이다.
5. **동일 계산 결과(동일 Display Path)는 동일하게 표시한다.**
6. **Display Policy는 Runtime으로부터 독립적이다.** Extension draft 존재·부재가 Boundary를 결정하지 않는다.
7. **Cap과 Boundary를 혼동하지 않는다.** Cap = 분기별 절단 · Boundary = 두 결과 비교/조립.
8. **Continuation은 Display Cap의 하위 규칙이다.** Boundary에 두지 않는다.
9. **Baseline과 Corrected는 최소 표시 정책(C4)을 공유한다.** 차이는 **계산 path**이며, 최소 표시 하한이 아니다.

---

## 4. Display Flow

```text
Builder
  (baseline pathNodes · corrected pathNodes)
        ↓
Display Cap
  (분기별: 어디까지 표시 path로 자를까)
        ↓
Display Boundary
  (두 Display Path 비교 · 같음/다름 조립)
        ↓
Overlay Attach
  (Boundary 결과에 따라 Extension Overlay attach 여부)
        ↓
Render
  (ImpactLines · Labels · Extension Layer 등)
```

| 계층 | 책임 | 비책임 |
|------|------|--------|
| **Builder** | baseline / corrected 계산 path 생성 | 표시 길이 · 기준/보정 UI · Overlay |
| **Display Cap** | **단일** path의 표시 종료점 | 두 path 비교 · Extension Runtime |
| **Display Boundary** | 두 Cap 결과의 비교·조립 · USER 모드별 표현 | Geometry 생성 · Hydrate · Dataset |
| **Overlay Attach** | Extension Overlay를 **붙일지** | Boundary/Difference 판정 · Runtime 삭제 |
| **Render** | 픽셀/SVG 표현 | 정책 결정 |

---

## 5. Display Cap

### 5.1 역할

Display Cap은 **하나의 계산 결과**를 사용자에게 **어디까지** 그릴지 결정한다.

- 입력: 해당 분기의 `pathNodes` (및 Cap 규칙에 필요한 표시용 메타)
- 출력: `endIndex` · reason · (선택) stoppedSegment
- **하지 않는 일:** baseline vs corrected 비교 · Extension Runtime 해석

### 5.2 Cap Priority (권장)

낮은 번호가 우선한다. 최종 `endIndex`는 적용된 규칙들의 교집합(유효 상한의 최솟값)으로 해석하되, **Minimum Guarantee는 하한**으로 작용한다 (안전 규칙이 C4 미만만 허용하면 그 안전 상한을 따른다).

| 순위 | 규칙 | 역할 |
|------|------|------|
| **1** | **Invalid Path** | 좌표 무효 · 표시 불가 segment |
| **2** | **Chain Break** | null/missing node 이전까지 |
| **3** | **Minimum Guarantee** (Baseline / Corrected) | 세컨드볼과 무관하게 **최소 C4**까지 표시 (§6). second_ball이 C3로 자르지 못함 |
| **4** | **Continuation Rule** | **C4 이후** 정상 선회 여부만 결정 (§7). C4 Minimum과 **독립** |
| **5** | **Physical Limit** | 시스템별 표시 상한(예: 5&Half C4 값 기반). Continuation과 병행 시 관계 명시 |
| **6** | **Second Ball** | 세컨드볼 hit로 **C4 이후** 표시를 더 자를 수 있음. **C3 이하로 Minimum을 깨뜨리면 안 됨** |

### 5.3 same-rail (안전)과의 관계

기존 **same-rail Cap**(연속 segment 양 끝 **동일 rail**)은 **비물리·퇴화 segment 차단**용 안전 규칙이다.

**Continuation Rule(§7)과 동일하지 않다.**

| | same-rail | Continuation |
|--|-----------|--------------|
| 판정 | 한 segment의 양 끝 **동일 rail** | 연속 쿠션의 **axis** (long/short) |
| 목적 | 안전 절단 | C4 이후 정상 선회 vs Reverse End **표시** |

same-rail은 Invalid/Chain 계열 안전망으로 유지한다. Continuation과 혼용·동의어로 쓰지 않는다.

**v1.4.1 (BUG-A):** same-rail **identity**는 `detectRail` Y-first EPS band가 아니라 `resolveNearestRail`이다. `detectRail`은 “쿠션 근처 여부”(presence)에만 쓴다. 코너 side-rail C2를 TOP/BOTTOM으로 훔쳐 C1–C2를 거짓 same_rail로 자르지 않는다. 진짜 동일 rail(C4–C5 등) truncation은 유지. 구현: `trajectoryPathDisplayPolicy.ts` · helper: `reflectionEngine.resolveNearestRail`. `detectRail` 공통 함수 본문/호출 순서는 reflection 경로에서 **변경하지 않는다**.

### 5.4 분기별 Cap

| 분기 | Cap 정책 |
|------|----------|
| **baseline** | Minimum Guarantee C4 (§6.1) + Continuation (§7) + 안전(chain / same-rail). **corrected second_ball · corrected ceiling에 종속하지 않음.** |
| **corrected** | **Corrected Display Minimum Guarantee** (§6.2) + Continuation (§7) + 안전. **second_ball로 C3 종료 금지.** C5/C6는 Continuation. |

### 5.5 Baseline ↔ Corrected (최소 표시)

```text
Baseline
  - 최소 C4 표시 보장
  - 이후는 Continuation Rule

Corrected
  - 계산 결과(C4)까지 표시 보장
  - 이후는 Continuation Rule
```

**둘 다 최소 C4까지는 동일한 표시 정책**을 가진다.  
차이는 **계산 결과(path)** 이며, **최소 표시 정책이 아니다.**

---

## 6. Minimum Guarantee

### 6.1 Baseline C4 Minimum Guarantee

```text
baseline은 세컨드볼 위치와 관계없이
최소 C4(path index 4)까지 반드시 표시한다.
```

- 세컨드볼이 baseline 선상에 없어도 C4까지 표시한다.
- C4 이후는 Continuation Rule(§7)을 만족할 때만 C5·C6로 연장한다.

#### 비종속 (필수)

| 금지 종속 | 이유 |
|-----------|------|
| corrected `second_ball` Cap | 보정 분기의 세컨드볼 종료가 기준 표시를 C3 등으로 끌어내리면 안 됨 |
| **corrected ceiling** (`CorrectedDisplayEnd`로 baseline을 상한) | C4 Minimum · baseline 독립 Cap과 충돌 |

> Phase 1에서 baseline Cap의 corrected ceiling 종속을 제거하는 방향이 확정되었다. Builder/Extension Runtime이 아니다.

### 6.2 Corrected Display Minimum Guarantee (v1.1)

**정책명:** Corrected Display Minimum Guarantee

```text
Corrected Display는 세컨드볼 위치와 관계없이
실제 계산 결과가 존재하는 마지막 계산 쿠션(C4)까지는
항상 표시한다.

Corrected Display는 second_ball Display Cap에 의해
C3에서 종료되어서는 안 된다.

C5 / C6의 표시 여부는 Continuation Rule에 따른다.
```

| 항목 | 내용 |
|------|------|
| 대상 | corrected Display Cap (`resolveTrajectoryDisplayCap` 계열) |
| 하한 | path index **4 (C4)** — 5&Half 등 계산 결과가 C4까지 존재하는 시스템 |
| 금지 | second_ball 미교차 시 기본 endIndex=**3 (C3)** 로 절단 |
| C5/C6 | Continuation Rule (§7)만 결정. Minimum과 독립 |
| Builder | **수정하지 않음** — 노드는 이미 생성됨 · Display만 자른다 |

#### 현행 코드와의 불일치 (구현 과제)

현행 `computeSecondBallCapEndIndex`는 미히트 시 `endIndex = min(3, maxChain)` 이다.  
이는 본 §6.2와 **불일치**한다. 해소는 **Display Cap 계층만**에서 하며, Builder·Extension·Hydrate·Search는 비대상이다.

### 6.3 Physical Limit와의 관계

5&Half 등에서 C4 SYS 값에 따른 Physical Limit(예: C4 &lt; 20 → C4, C4 ≥ 20 → C6 상한)이 있을 수 있다.

- Physical Limit는 **상한** 후보이다.
- Minimum Guarantee는 **하한**이다.
- Continuation=false이면 C4에서 종료하므로, Physical Limit가 C6를 허용해도 Continuation이 막으면 C4에서 끝난다 (§7).

---

## 7. Continuation Rule

### 7.1 위치

Continuation은 **Display Cap의 하위 규칙**이다. Display Boundary에 두지 않는다.

**C4 Minimum(§6)과 독립 정책이다.** Continuation은 **C4 이후** 표시 여부만 결정한다 (D-DBP-11).

### 7.2 성격

- **새 계산이 아니다.**
- 시스템상 기준 궤적은 흔히 `C4 = C5 = C6` (값 sync)이다. Display는 **동일 값 계열로 다음 쿠션 진행이 기하적으로 성립하는지**만 본다.
- Builder·Formula·anchors를 수정하지 않는다.
- **Baseline · Corrected 모두** C4 확보 후 동일 Continuation 규칙을 적용한다.

### 7.3 Axis 정의 (Rg)

기존 `detectRail` 결과와 정합한다.

| Axis | Rails | Rg 기준 (현행) |
|------|-------|----------------|
| **long** | TOP · BOTTOM | y ≈ 40 · y ≈ 0 |
| **short** | LEFT · RIGHT | x ≈ 0 · x ≈ 80 |

Fg 프레임 좌표(`±2.25`, `42.25` 등)가 아닌, **궤적 path의 쿠션 노드(레일 접점)** 에 적용한다.

### 7.4 판정

C4 이후 연속 쿠션의 axis가

```text
long → short → long → short
  또는
short → long → short → long
```

처럼 **교차**하면 `Continuation = true`.

**동일 axis가 연속**하면 (`long → long` 또는 `short → short`)

```text
Continuation = false
→ Reverse End로 간주 (Display 의미)
```

### 7.5 종료 정책 (확정)

```text
Continuation = false 이면
  다음 Segment를 표시하지 않는다.
  해당 분기는 C4에서 종료한다.
  실패 Segment는 표시하지 않는다.
```

즉 C4→C5 또는 그 이후에서 Continuation이 깨지면 **C4까지**만 표시한다. (실패 구간의 “직전까지만 C5” 같은 부분 연장은 본 정책에서 채택하지 않는다.)

### 7.6 적용 구간

- **시작:** C4 확보 후 (Minimum Guarantee 이후)
- **대상 segment:** C4→C5, C5→C6
- rail 판정 실패(`detectRail` null) 시: Continuation=false로 **보수 처리** (C4 종료)

---

## 8. Display Boundary

### 8.1 역할

Display Boundary는 **이미 Cap을 거친** baseline Display Path와 corrected Display Path를 비교한다.

```text
동일하면  → 동일한 종료점·동일한 궤적으로 표시
다르면    → 차이가 발생한 시점부터 다르게 표시
```

사용자가 보는 것은 Extension 객체가 아니라 **기준 계산 결과 vs 보정 계산 결과**이다.

### 8.2 입력 / 비입력

| 입력 | 비입력 |
|------|--------|
| baseline Display Path (Cap 후) | Trajectory Extension Runtime draft |
| corrected Display Path (Cap 후) | Dataset payload 존재 여부 |
| USER 표시 모드 (기준값 / 보정값) | Builder 내부 상태 |

**Display Boundary는 Trajectory Extension Runtime을 Difference 판단 기준으로 사용하지 않는다.**

### 8.3 모드별 표현 (제품)

| USER 모드 | 보여 줄 것 |
|-----------|------------|
| **기준값** | Cap을 거친 **baseline** 계산 결과 (Boundary 조립 결과의 baseline 측) |
| **보정값** | Cap을 거친 **corrected** 계산 결과 (Boundary 조립 결과의 corrected 측) |

동일 Display Path이면 두 모드의 궤적 표현이 같아야 한다.  
다를 때만 divergence 이후가 달라진다.  
(최소 C4 정책은 양쪽에 동일하게 적용되므로, divergence는 path 기하·Continuation 결과에서만 발생한다.)

### 8.4 비교 단위 (구현 시 확정 · 정책 방향)

- Cap 이후 path node / segment 기하를 비교한다.
- Extension Geometry는 비교 집합에 **넣지 않는다.**

동등성 허용 오차(Rg epsilon)는 구현 설계에서 정하고, 본 정책은 “동일하면 동일 표시”만 규범으로 둔다.

---

## 9. Overlay Attach Policy

### 9.1 원칙

```text
Overlay는 Boundary를 결정하지 않는다.
Boundary 결과에 따라 Overlay Attach 여부를 결정한다.
Runtime Geometry(draft/payload)는 그대로 유지한다.
```

- Attach / Detach는 **표시** 결정이다.
- hydrate 제거 · draft null · Search 전용 경로 · Runtime 삭제로 “안 보이게” 만들지 않는다.

### 9.2 Trajectory Extension Overlay

| 항목 | 정책 |
|------|------|
| Runtime | Freeze · 본 문서가 변경하지 않음 |
| Difference | Extension ≠ Difference (§2.1) |
| Attach | Boundary/모드 정책에 따라 Render에 붙이거나 붙이지 않음 |
| Reveal | Cap continuity용 Overlay 조각일 수 있으나, **Difference의 정의가 아니다** |

구체적 attach 표는 구현 Architecture Review에서 Boundary 결과와 함께 확정한다. **“Runtime으로 Boundary를 대체하지 말 것”** 을 규범으로 고정한다.

### 9.3 Overlay Attach / Visibility Gate (Phase 2A · Implemented)

**코드:** `frontend/src/renderer/trajectory/trajectoryExtensionOverlayVisibility.ts`  
**소비:** `App.jsx` — `TrajectoryExtensionLayer` mount 조건

| 모드 | Attach |
|------|--------|
| ADMIN + draft 존재 | **true** (Handle = canEdit) |
| USER **corrected** + draft 존재 | **true** |
| USER **baseline** + `baselineContinuationAllowed !== true` | **false** (CASE B · Phase 2A) |
| USER **baseline** + `baselineContinuationAllowed === true` | **true** (CASE A · Continuation Phase 이후 확장) |

- draft / hydrate / Dataset **변경 없음** — mount만 제어한다.
- “USER baseline이면 무조건 숨김”을 **고정 규칙으로 두지 않는다.** attach 허용 입력으로 CASE A를 연다.
- Phase 2A App 호출: `baselineContinuationAllowed: false` (CASE B 적용). Continuation 구현 후 true 전달로 확장.

---

## 10. Out of Scope

본 문서의 **비대상** (변경·재설계 금지 대상으로 기술하지 않음):

- Trajectory Builder (`domain/trajectory/trajectoryBuilder.ts` 등)
- Formula · System Calculator · anchors / profile / logic JSON
- Hydrate whitelist · slot draft 구조
- Dataset · Export · Published corpus
- Search · `activateStrategySlot` · `hydrateSlotRuntime`
- Trajectory Extension Runtime Domain (model · proposal · SAVE 스키마) — **Task Closed / Freeze**
- Runtime Contract / Registry / Loader

Extension Overlay의 **표시 attach**만 Display Layer 범위이며, Extension **기능·스키마·Activation**은 `TRAJECTORY_EXTENSION_SSOT.md` 소유이다.

---

## 11. Expected Implementation

구현 시 **수정 허용 계층** (예상):

| 계층 | 예시 | 비고 |
|------|------|------|
| Display Cap | `trajectoryPathDisplayPolicy.ts` 및 호출 조립 | Baseline Minimum · **Corrected Minimum** · Continuation · second_ball이 C3로 자르지 않도록 |
| Display Boundary | 신규 순수 함수 또는 App 조립부 | 두 path 비교 |
| Overlay Attach | Layer mount 조건 (Presentation) | Runtime state 유지 |
| Render | ImpactLines / Extension Layer **소비만** | 정책은 상위에서 |

**수정 금지 (본 정책 구현 범위에서):**

- Builder · Hydrate · Dataset · Search · `activateStrategySlot`
- Trajectory Extension Runtime Domain · Extension payload 스키마
- Extension을 Difference로 재정의하는 구조 변경

**절차:** 본 SSOT Consume → Architecture Review → 구현.

**Phase 참고**

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | Baseline C4 Minimum · corrected ceiling 제거 | Cap 코드 |
| 1.5 | Corrected Display Minimum Guarantee | 문서 |
| **2A** | **Overlay Attach/Visibility Gate (CASE B)** | **Implemented** |
| **RM** | **Reading Mode (USER Overlay Shell UX)** | **Implemented** |
| **C2H** | **C2 Reflection Rail Handle (ADMIN)** | **Implemented** |
| 2+ | Continuation · Boundary · CASE A attach · Corrected Cap Minimum 코드 | 미착수 |

---

## 12. Future Extensions

다음 UX/Product 기능도 **본 Display Boundary Policy를 기준**으로 동작해야 한다.

| 후보 | 관계 |
|------|------|
| **C2 Reflection Rail Handle** | **Implemented (§16)** — ADMIN Override · Cap은 `skipSameRail` 예외 |
| **Reading Mode** | **Implemented (§15)** — USER Overlay Shell Presentation UX |
| Derived Dataset Generator | 데이터 생성. Display Policy를 우회하는 “다른 표시 엔진”을 만들지 않음 |

Freeze된 Extension Runtime을 깨고 Display를 맞추지 않는다. Display를 Runtime에 종속시키지도 않는다.

---

## 13. Decision Log (본 문서)

| ID | Decision |
|----|----------|
| **D-DBP-01** | Display Layer 상위 SSOT는 본 문서이다. Extension SSOT와 역할을 분리한다. |
| **D-DBP-02** | Trajectory Extension ≠ Difference. Runtime Geometry는 Boundary 입력이 아니다. |
| **D-DBP-03** | Flow: Builder → Cap → Boundary → Overlay Attach → Render. |
| **D-DBP-04** | Continuation은 Display Cap 하위 규칙이다. Boundary에 두지 않는다. |
| **D-DBP-05** | baseline C4 Minimum Guarantee. corrected second_ball / corrected ceiling에 비종속. |
| **D-DBP-06** | Continuation=false → 다음 segment 미표시 · **C4에서 종료**. |
| **D-DBP-07** | Axis(long/short) 교차 = Continuation true · 동일 axis 연속 = Reverse End(Display). |
| **D-DBP-08** | Overlay Attach는 Boundary 결과에 따른다. Runtime을 삭제·null 처리하지 않는다. |
| **D-DBP-09** | 구현 전 Architecture Review 필수. Builder/Hydrate/Dataset/Search/Extension Runtime 비대상. |
| **D-DBP-10** | **Corrected Display Minimum Guarantee** — Corrected는 계산 결과가 존재하는 마지막 계산 쿠션(**C4**)까지 항상 표시한다. second_ball로 **C3 종료 금지**. |
| **D-DBP-11** | **Continuation Rule은 C4 이후 표시 여부만 결정한다.** C4 Minimum과 **독립** 정책이다. Baseline·Corrected 공통. |
| **D-DBP-12** | Phase 2A: Overlay Attach/Visibility Gate — USER baseline은 `baselineContinuationAllowed`일 때만 attach. CASE B 기본 미부착 · Runtime 유지. |
| **D-DBP-13** | **Reading Mode는 Presentation UX이며 Display Cap / Display Boundary와 독립이다.** 궤적 표시 정책·Extension Runtime을 변경하지 않는다. |
| **D-DBP-14** | **Reading Mode는 USER Overlay Shell에서만 처리한다.** AI / 계산 / 타점 **Content Panel 수정 금지.** ADMIN Overlay 비대상. |
| **D-DBP-15** | **Reading Mode 상태는 Overlay 종료 시 초기화한다.** localStorage / persistence 없음. |
| **D-DBP-16** | **Reading ON Width는 kind별 originalAspect를 사용한다.** AI/HPT=`AI_OVERLAY_ASPECT_RATIO`(6:4). CALC는 OFF max-box aspect 유지. widthRatio는 OFF 전용. |
| **D-DBP-17** | **Reading Mode 토글 시 Overlay Center를 유지한다.** Drag/clamp/pointer 로직은 변경하지 않는다. |
| **D-DBP-18** | **ADMIN C2 Reflection Override:** rail+t persist · Builder는 `anchors.C2` 존재 시 Reflection skip · Display Cap은 override 경로에서 **sameRail 절단 생략** (`skipSameRail`). `detectRail`/Reflection Engine 수식 **비변경**. USER Handle 비표시. |

---

## 14. 관련 문서

| 문서 | 관계 |
|------|------|
| `TRAJECTORY_EXTENSION_SSOT.md` | Extension Overlay Runtime SSOT (Freeze · **본 문서가 수정하지 않음**) |
| `OVERLAY_LAYOUT_SSOT_v1.2.md` | USER Overlay Shell 규약 (Close 없음 · Ratio · glassDark) — Reading Mode는 본 문서 §15가 UX 정책을 보완 |
| `PROJECT_MASTER_INDEX.md` | 현재 상태 · 문서 등록 |
| `HISTORY/PROJECT_LOG_2026-08.md` | 본 SSOT 작성·개정 이력 |
| `3_SYSTEM_ARCHITECTURE.md` | 계산·데이터 계층 |
| `4_CALCULATION_RULES.md` | C4=C5=C6 등 계산 규칙 (Display가 재계산하지 않음) |
| `domain/trajectoryPathDisplayPolicy.ts` | Cap 구현 · `skipSameRail` (C2 override) |
| `renderer/trajectory/trajectoryExtensionOverlayVisibility.ts` | Phase 2A Overlay Attach Gate |
| `domain/trajectory/c2ReflectionOverride.ts` | C2 rail+t override geometry |
| `overlay/layout/overlayLayoutTokens.ts` | ReadingFontScale · originalAspect |

---

## 15. Reading Mode (Overlay UX)

**상태:** **Implemented** (v1.4)  
**계층:** Presentation UX only · Display Cap / Boundary / Extension Attach와 **독립**

### 15.1 목적

- 모바일 환경에서 Overlay **가독성** 향상
- 시력이 좋지 않은 사용자도 편하게 읽을 수 있도록 지원
- Display Policy(기준값/보정값 궤적)·Extension Runtime과 **분리된** Shell Presentation UX

### 15.2 적용 범위

| 적용 | 비적용 |
|------|--------|
| USER Overlay — **AI** · **계산(CALC)** · **타점(HPT)** | ADMIN Overlay (`ModalShell`) |
| `UserOverlayShell` (Layout Layer) | Content Panel (`UserAiPanel` · `UserCalculationPanel` · `UserHptPanel`) **수정 금지** |
| | Runtime · Builder · Dataset · Search · Extension SSOT · Reflection Engine |

공통 Shell을 쓰는 USER Overlay에만 적용한다. Content는 Shell 토큰(`--uos-*` / `--ai-scale`)을 **소비만** 한다.

### 15.3 동작

#### OFF (기본)

현재 Overlay Layout SSOT / `resolveUserOverlayLayout`과 **동일** (기존 widthRatio · maxHeightRatio · typography).

#### ON (Reading Mode)

| 항목 | 정책 |
|------|------|
| **Max Height** | **Table Inner Height** (`.table-area` 측정 높이의 **100%**) |
| **Aspect Ratio** | kind별 **originalAspect** 유지 (AI/HPT: 6:4 · CALC: max-box aspect) |
| **Width** | `min(tableInnerWidth, tableInnerHeight × originalAspect)` |
| **Typography** | §15.5 `ReadingFontScale` 적용 (확대) |
| **Backdrop** | opacity **증가** (당구대는 인지 가능 수준 유지 · glass 철학 유지) |
| **Scroll** | 긴 내용은 Shell **내부 scroll** 허용 (기존 body scroll 경로) |
| **Center** | 토글 시 **기존 Overlay 중심 유지** (양방향 확대) · Drag 로직 비변경 |

Reading Mode는 궤적·Display Cap·Extension attach를 **변경하지 않는다.**

### 15.4 토글 UI

```text
우측 상단
  돋보기(+)  →  클릭  →  Reading ON · 아이콘 돋보기(-)
  돋보기(-)  →  클릭  →  Reading OFF · 아이콘 돋보기(+)
```

| 규칙 | 내용 |
|------|------|
| 위치 | Overlay Shell **우측 상단** chrome |
| 방식 | **단일 토글** (상태 따라 +/- 아이콘) |
| Close(X) | 기존 SSOT대로 **없음** · 외부 탭 닫기 유지 |
| Drag | 토글 버튼은 drag 제외 (`button` / `data-overlay-no-drag`) |
| 툴바 | `UserCalcToolbar`와 **분리** — Reading 컨트롤은 Shell 소유 |

### 15.5 Reading Typography (고정)

```text
ReadingFontScale = 1.45
```

- OFF typography(effective font / contentTypeScale 기준)에 **1.45를 곱한다.**
- 수치는 본 SSOT에 **고정**한다. 구현 중 임의 변경 금지 · 변경 시 본 문서 개정.
- Content Panel에 절대 px를 새로 심지 않는다. Shell 토큰 증폭으로 처리한다.

### 15.6 Animation

| 항목 | 값 |
|------|------|
| Duration | **150–180ms** (구현: 165ms) |
| Easing | **ease-out** |
| 대상 | Overlay size (width / max-height / left / top) · typography · backdrop opacity |

Drag 중에는 transition을 끈다.

### 15.7 Reset

| 규칙 | 내용 |
|------|------|
| Overlay 종료 시 | Reading Mode **OFF**로 복귀 |
| Persistence | **localStorage 사용하지 않음** |
| 종류 전환 | `layoutKey`(AI↔HPT↔CALC) 변경 시에도 **OFF로 리셋** |

### 15.8 구현 범위 (Implemented)

| 허용 (구현됨) | 금지 (유지) |
|------|------|
| `UserOverlayShell.jsx` | Content Panel 수정 |
| `overlayLayoutTokens.ts` | Reflection / Extension Runtime |
| `index.css` | ADMIN ModalShell Reading Mode |
| Shell-owned readingMode state | Persistence |

---

## 16. C2 Reflection Rail Handle (ADMIN)

**상태:** **Implemented** (v1.4)  
**계층:** ADMIN Presentation + Dataset Override · Reflection Engine **비변경**

### 16.1 목적

- Reflection으로 생성된 C2를 관리자가 **레일 위 1D Drag**로 실전 감각 보정
- 계산식(분리각 규칙)을 수정하지 않고 **Override**만 적용

### 16.2 적용 범위

| 적용 | 비적용 |
|------|--------|
| **ADMIN** only · C2 위치에 작은 노란 점 Handle (`r≈2.5`) | USER · Handle 비표시 |
| 1D Rail Drag (`projectPointToRail`) | 2D 자유 Drag |
| Persist: `StrategyEntry.reflectionOverride = { rail, t }` | 절대좌표 저장 |
| Builder: `anchors.C2` 있으면 Reflection **skip** | Reflection Engine / `detectRail` 수식 변경 |

### 16.3 Corner · Display Cap

Manual Reflection Override가 있으면 Display Cap **sameRail 절단을 수행하지 않는다** (`displayCapOpts.skipSameRail`).

- `detectRail` 공통 함수 **수정 금지** (v1.4.1도 동일 — identity만 display-cap에서 nearest-rail)
- Builder 계산 경로 유지 · Cap 옵션 전달만
- Corner 근처에서도 C1→C2→C3 표시 유지
- **BUG-A 수정 후** override/`skipSameRail` 없이도 코너 side-rail C2는 nearest-rail identity로 거짓 same_rail이 나지 않아야 한다. `skipSameRail`을 BUG-A 성공 기준으로 쓰지 말 것 (BUG-B는 현재 **UNCONFIRMED / reproduction required**).

### 16.4 구현 앵커

| 파일 | 역할 |
|------|------|
| `domain/trajectory/c2ReflectionOverride.ts` | rail+t · snap · edge ε |
| `overlay/state/c2RailHandleDrag.ts` | ADMIN 1D drag |
| `renderer/trajectory/c2HandleModel.ts` | C2 위치 작은 점 |
| `trajectoryPathDisplayPolicy.ts` | `skipSameRail` |
| `positionSearchEngine` / saveFlow / hydrate | persist · restore |

---

*End of DISPLAY_BOUNDARY_POLICY_SSOT.md — v1.4 · 2026-08-04*
