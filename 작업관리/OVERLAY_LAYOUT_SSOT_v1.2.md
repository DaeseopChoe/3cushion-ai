# Overlay Layout SSOT v1.2

**Status:** Confirmed  
**Scope:** USER Overlays only (AI · 타점/HPT · 계산/Calculation)  
**Out of scope:** Admin Overlays, Runtime, Formula, Dataset, Calculator Engine  
**Container SSOT:** `.table-area`  
**Last Updated:** 2026-07-28  

> 본 문서는 사용자 Overlay의 **공통 Shell 규약**이다.  
> v1.2는 AI Overlay 실사용 검증 결과를 공통 USER Overlay SSOT로 승격한 버전이다.  
> 2026-07-28: USER Overlay Standard · Close/Toolbar · AI/HPT/CALC mapping · Shell/Content 역할을 증분 반영한다.  
> (과거 v1.2 Decision Summary는 유지한다.)

---

## 0. One-Line Rule

```text
table-area measure
  → Overlay Shell (Layout Layer)
  → Content Renderer (AI | HPT | Calculation)
```

- Overlay는 "창(window)"이 아니라 **텍스트를 보호하는 얇은 glass layer**다.
- Overlay 존재감은 낮게 유지하고, 뒤의 당구대/공/궤적 인지는 유지해야 한다.
- Shell과 Content를 분리한다.
- **AI Overlay = USER Overlay 기준 디자인.**

---

## 0.1 USER Overlay Standard (2026-07-28)

AI Overlay에서 검증된 다음 항목이 USER Overlay 공통 기준이다.

| Item | Rule |
|------|------|
| Container | `.table-area` only |
| Surface | **glassDark** (Dark Glass) |
| Typography | table-area scale token |
| Padding | Shell padding token |
| Drag | Full Surface Drag |
| Position | Center open · Clamp · **No persistence** |
| Close | **Close(X) 없음** · 외부 터치 닫기 |
| Height | `auto` · maxHeight ratio cap |

---

## 1. Shell Contract

Overlay Shell은 **다음 역할만** 담당한다.

- Glass Surface
- Size Ratio
- Typography Scale
- Padding
- Radius
- Border
- Shadow
- Position
- Drag
- Clamp
- (Close UI 없음 — outside tap)

Overlay Shell은 **절대로 Content를 포함하지 않는다.**

### Content Renderer examples

- `UserAiPanel`
- `UserHptPanel`
- `UserCalculationPanel` (DisplayModel Viewer)

### Layer Rule

```text
Shell
  ↓
Content
```

---

## 2. Container SSOT

### Primary
**`.table-area`**

### Measurement sources

1. Runtime: `.table-area.getBoundingClientRect()`
2. Fallback numeric source: `layoutCalculator.js`

### Non-SSOT

- `viewport`
- `vw` / `vh`
- media query width tables
- Admin modal width presets
- absolute px as Width SSOT

---

## 3. Surface Token

Overlay는 Surface **이름만** 선택한다.  
실제 배경/blur/border/shadow는 Shell Layer가 관리한다.

### Catalog

| Surface | Background | Blur | Border | Shadow | Role |
|---------|------------|------|--------|--------|------|
| **Normal** | `rgba(255,255,255,0.70)` | `4px` | light | soft | 일반 |
| **Strong** | `rgba(255,255,255,0.82)` | `4px` | light | soft | 밝은 가독성 우선 |
| **Transparent** | `rgba(255,255,255,0.40)` | `2px` | minimal | minimal | 최소 개입 |
| **Dark / glassDark** | `rgba(30,55,105,0.17)` | `4px` | `1px solid rgba(255,255,255,0.05)` | `0 6px 18px rgba(0,0,0,0.12)` | **기본 USER Overlay** |

### Dark Rule

Dark는 AI Overlay에서 검증 완료된 **low-presence glass**다.

- 뒤의 당구대/공/궤적이 자연스럽게 비쳐야 한다.
- Shell은 텍스트만 보호해야 한다.
- Border/Shadow는 형태만 유지하고 존재감은 최소화한다.

### Default mapping

| Overlay | Default Surface |
|---------|-----------------|
| AI | glassDark |
| HPT | glassDark |
| Calculation | glassDark |

---

## 4. Typography Token

Typography는 `table-area` 기준 scale에서만 계산한다.

### Formula

```text
fontBase = tableHeight × fontBaseRatio
effectiveFontBase = fontBase × contentTypeScale

titleSize = effectiveFontBase × titleRatio
bodySize  = effectiveFontBase × bodyRatio
noteSize  = effectiveFontBase × noteRatio
```

### Tokens

| Token | Value | Rule |
|-------|-------|------|
| `fontBaseRatio` | `0.028` | base |
| `titleRatio` | `1.25` | title |
| `sectionRatio` | `1.10` | section |
| `bodyRatio` | `1.00` | body |
| `noteRatio` | `0.80` | note |
| `metricRatio` | `1.20` | metric |
| `lineHeight` | `1.40` | common |
| `textShadow` | `0 1px 3px rgba(0,0,0,0.55)` | dark-surface readability |

### ContentTypeScale

| Content | `contentTypeScale` | Note |
|---------|--------------------|------|
| AI | `1.456` | 기준 |
| HPT | AI scale 사용 (Shell mapping) | Polish에서 Content 독립 검토 |
| Calculation | AI scale 사용 | AI Typography 언어 |
| Trajectory (legacy) | `1.00` | 이력 |

### Forbidden

- absolute px as SSOT
- per-overlay `vw` / `vh` font sizing
- media query typography overrides as primary rule

---

## 5. Ratio Rule

### Width

```text
overlayWidth = tableWidth × overlayWidthRatio
overlayMaxH  = tableHeight × overlayMaxHeightRatio
```

- Width는 반드시 ratio만 사용한다.
- Height는 고정하지 않는다 (`height: auto`).
- Content에 따라 자연스럽게 증가한다.
- 최대 높이를 넘을 때만 **Content Body**가 scroll 한다.

### Variants (catalog)

| Variant | Width Ratio | MaxHeight Ratio | Use |
|---------|-------------|-----------------|-----|
| Small | `0.55` | `0.82` | (catalog; HPT는 더 이상 기본 매핑 아님) |
| Medium | `0.72` | `0.88` | catalog |
| Large | `0.84` | `0.90` | catalog |

### Overlay mapping (2026-07-28)

| Overlay | Width Ratio | MaxHeight Ratio | sizeVariant | fitContent | Notes |
|---------|-------------|-----------------|-------------|------------|-------|
| **AI** | `0.42` | `0.85` | medium | false | 기준 Shell |
| **HPT** | `0.42` | `0.85` | medium | false | AI와 동일 Shell mapping · Content 크기 독립은 **Polish 보류** |
| **CALC** | `0.62` | `0.85` | medium | false | AI 디자인 언어 · 정보량 전용 폭 · AI Typography |

---

## 6. Padding / Radius / Border / Shadow

모두 Shell Token으로 계산한다.

### Padding formula

```text
padV = effectiveFontBase × outerPadVRatio
padH = effectiveFontBase × outerPadHRatio
gap  = effectiveFontBase × gapRatio
```

### Tokens

| Token | Value |
|-------|-------|
| `outerPadVRatio` | `0.90` |
| `outerPadHRatio` | `1.05` |
| `gapRatio` | `0.65` |
| `radiusRefPx` | `12px` |
| `radiusScaleClamp` | `0.85 ~ 1.10` |

### Rules

- Padding에 media query 직접값을 SSOT로 쓰지 않는다.
- Radius는 공통 token으로 계산한다.
- Border/Shadow는 Surface가 소유한다.
- Content는 border/radius/shadow를 다시 만들지 않는다.
- **Close 예약 gutter 금지** — Content는 정상 Shell padding 한계까지 사용한다.

---

## 7. Drag Rule

AI Overlay에서 검증된 방식으로 **Overlay 전체 Surface Drag**를 공통 규칙으로 확정한다.

### Policy

```text
drag start area = full overlay surface
exclude = [data-overlay-no-drag="1"] (+ interactive controls)
grab bar = not used
Close(X) = not present
```

### Interaction

- Mouse drag
- Touch drag
- 동일 pointer rule 사용
- Calculation Toolbar 버튼은 Drag 제외

---

## 8. Position Rule

### Default
**Center** of `.table-area`

### Lifecycle

- Open → 항상 Center에서 시작
- Drag 가능
- Close → offset 저장 금지
- Session 저장 금지
- LocalStorage 저장 금지
- Runtime cache 저장 금지

### Clamp

```text
overlay must remain inside table-area inset
clampInsetRatio = 0.02
```

---

## 8.1 Close Rule (2026-07-28)

- Common Shell의 **Close(X) 제거**
- **외부 터치(backdrop)** 로 닫기
- Close 예약 gutter (`padding-right` 등) **금지**
- Content는 정상 Shell padding 한계까지 사용

---

## 8.2 Toolbar Rule (Calculation) (2026-07-28)

Calculation Toolbar는 Shell **밖의** 별도 Controller UI다.

| Rule | Value |
|------|-------|
| Placement | Overlay 외부 상단 |
| Layout | 항상 한 줄 · `nowrap` · `fit-content` |
| Typography | table-area token 기반 |
| Style | Glass Button · 선택 Accent |
| Drag | 버튼은 Drag 제외 |
| Lifecycle | Overlay hide 상태에서도 Toolbar 유지 가능 |

버튼: **기준값** · **보정값** · **계산 보기/감추기** · **쿠션 포인트**

---

## 9. Content Rule

Content는 **자기 내부 레이아웃과 렌더링만** 담당한다.

### Content may do

- text flow
- equation / DisplayModel parts layout
- SVG/internal grid
- local structure

### Content must not do

- background
- padding of outer shell
- shadow
- border
- radius
- position
- width SSOT
- height SSOT
- Shell max token(`--uos-w`)을 preferred width로 재사용해 Shell을 팽창시키기

즉, Content는 Shell style을 직접 변경하지 않는다.  
**표시 정보만 소유**한다.

---

## 9.1 Shell / Content 역할 요약

| Layer | Owns |
|-------|------|
| **Shell** | Layout · Ratio · Surface · Typography scale · Padding · Drag · Clamp · Center |
| **Content** | 표시 정보만 · Width SSOT 금지 · Shell max token preferred width 재사용 금지 |

---

## 10. CSS Token Inventory

앞으로 USER Overlay 공통 규약은 아래 token 군으로 한곳에서 관리한다.

### Shell tokens

- `--overlay-width-ratio`
- `--overlay-max-height-ratio`
- `--overlay-font-scale`
- `--overlay-gap`
- `--overlay-pad-v`
- `--overlay-pad-h`
- `--overlay-radius`
- `--overlay-shadow`
- `--overlay-glass`
- `--overlay-border`

### Compatibility / bridge tokens

- `--overlay-scale`
- `--ai-scale`
- `--overlay-svg-scale`
- `--uos-*` (UserOverlayShell runtime)

### Note

bridge token은 기존 content와의 연결용이다.  
장기 SSOT는 ratio / surface / typography / padding token이다.

---

## 11. Implementation Order

```text
1. Overlay Shell SSOT 고정
2. AI 검증 완료
3. HPT Shell 적용 (완료 · Content Polish 보류)
4. Calculation 적용 (완료)
5. USER Overlay 최종 통합 검증
```

---

## 12. Implementation Status (2026-07-28)

### 완료

- Common Shell
- Ratio Rule
- Typography Rule
- Glass Dark Surface
- Drag Rule
- Center Rule
- Clamp Rule
- Close Rule (X 제거)
- AI Overlay 적용
- HPT Overlay AI Shell mapping
- Calculation Overlay + Toolbar + DisplayModel Viewer

### 보류 / 예정

- HPT Content 크기 독립 · SVG intrinsic bounds / viewBox (UX Polish)
- USER Overlay 최종 통합 검증

---

## 13. v1.2 Decision Summary

v1.2에서 공식 확정된 사항:

1. Shell과 Content를 완전히 분리한다.
2. USER Overlay 기본 Surface는 **Dark Glass**다.
3. Typography는 `table-area` scale token만 사용한다.
4. Width는 항상 `tableWidth × Ratio`다.
5. Height는 항상 `auto`다.
6. Padding은 scale token만 사용한다.
7. Drag는 Overlay 전체 surface에서 시작한다.
8. Close 후 reopen 시 항상 Center로 복귀한다.
9. Content는 Shell style을 직접 소유하지 않는다.

### 2026-07-28 Incremental Decisions

10. Close(X) 제거 · 외부 터치 닫기 · Close gutter 금지.
11. AI / HPT Shell mapping = `widthRatio 0.42` · CALC = `0.62`.
12. Calculation Toolbar는 Shell 밖 Controller.
13. HPT Content/Shell 크기 독립은 Polish 보류.

---

**END OF Overlay Layout SSOT v1.2**
