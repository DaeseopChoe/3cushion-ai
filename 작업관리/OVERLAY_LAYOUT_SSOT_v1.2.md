# Overlay Layout SSOT v1.2

**Status:** Confirmed  
**Scope:** USER Overlays only (AI · 타점/Aim · 계산/Calculation · Trajectory)  
**Out of scope:** Admin Overlays, Runtime, Formula, Dataset, Formatter  
**Container SSOT:** `.table-area`  
**Last Updated:** 2026-07-27  

> 본 문서는 사용자 Overlay의 **공통 Shell 규약**이다.  
> v1.2는 AI Overlay 실사용 검증 결과를 공통 USER Overlay SSOT로 승격한 버전이다.  
> 다음 단계부터 타점 → 계산 순으로 동일 Shell을 적용한다.

---

## 0. One-Line Rule

```text
table-area measure
  → Overlay Shell (Layout Layer)
  → Content Renderer (AI | Aim | Calculation | Trajectory)
```

- Overlay는 "창(window)"이 아니라 **텍스트를 보호하는 얇은 glass layer**다.
- Overlay 존재감은 낮게 유지하고, 뒤의 당구대/공/궤적 인지는 유지해야 한다.
- Shell과 Content를 분리한다.

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
- Close

Overlay Shell은 **절대로 Content를 포함하지 않는다.**

### Content Renderer examples

- `UserAiPanel`
- `UserAimPanel` (or current HP/T renderer)
- `UserCalculationPanel`
- `UserTrajectoryInfoCard`

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
| **Dark** | `rgba(30,55,105,0.17)` | `4px` | `1px solid rgba(255,255,255,0.05)` | `0 6px 18px rgba(0,0,0,0.12)` | **기본 USER Overlay** |

### Dark Rule

Dark는 AI Overlay에서 검증 완료된 **low-presence glass**다.

- 뒤의 당구대/공/궤적이 자연스럽게 비쳐야 한다.
- Shell은 텍스트만 보호해야 한다.
- Border/Shadow는 형태만 유지하고 존재감은 최소화한다.

### Default mapping

| Overlay | Default Surface |
|---------|-----------------|
| AI | Dark |
| Aim / HP(T) | Dark |
| Calculation | Dark |
| Trajectory | 별도 카드 규칙 유지, 향후 정렬 |

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

| Content | `contentTypeScale` |
|---------|--------------------|
| AI | `1.456` |
| Aim / HP(T) | `1.00` |
| Calculation | `1.00` |
| Trajectory | `1.00` |

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
- Height는 고정하지 않는다.
- Content에 따라 자연스럽게 증가한다.
- 최대 높이를 넘을 때만 **Content Body**가 scroll 한다.

### Variants

| Variant | Width Ratio | MaxHeight Ratio | Use |
|---------|-------------|-----------------|-----|
| Small | `0.55` | `0.82` | Aim / HP(T) |
| Medium | `0.72` | `0.88` | 기본 중간형 |
| Large | `0.84` | `0.90` | Calculation |

### AI validated example

| Overlay | Width Ratio | MaxHeight Ratio | Notes |
|---------|-------------|-----------------|-------|
| AI | `0.42` | `0.85` | 약 `6:4` silhouette, `height: auto`, long text reflow |

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

---

## 7. Drag Rule

AI Overlay에서 검증된 방식으로 **Overlay 전체 Surface Drag**를 공통 규칙으로 확정한다.

### Policy

```text
drag start area = full overlay surface
exclude = X button + [data-overlay-no-drag="1"]
grab bar = not used
```

### Interaction

- Mouse drag
- Touch drag
- 동일 pointer rule 사용

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

## 9. Content Rule

Content는 **자기 내부 레이아웃과 렌더링만** 담당한다.

### Content may do

- text flow
- equation layout
- SVG/internal grid
- tabs / buttons / local structure

### Content must not do

- background
- padding of outer shell
- shadow
- border
- radius
- position
- width SSOT
- height SSOT

즉, Content는 Shell style을 직접 변경하지 않는다.

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

### Note

bridge token은 기존 content와의 연결용이다.  
장기 SSOT는 ratio / surface / typography / padding token이다.

---

## 11. Implementation Order

```text
1. Overlay Shell SSOT 고정
2. AI 검증 완료
3. Aim / HP(T) 적용
4. Calculation 적용
5. Trajectory 정렬
```

이번 v1.2는 **공통 Shell 기준 확정**이 목적이며,  
타점/계산 content 수정은 다음 단계 범위다.

---

## 12. Implementation Status (2026-07-27)

### 완료

- Common Shell
- Ratio Rule
- Typography Rule
- Glass Dark Surface
- Drag Rule
- Center Rule
- Clamp Rule
- Close Rule
- AI Overlay 적용
- 타점 Overlay Common Shell 이전

### 진행 예정

- 타점 Overlay Content Fit
- 계산 Overlay 적용
- USER Overlay 최종 통합

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

---

**END OF Overlay Layout SSOT v1.2**
