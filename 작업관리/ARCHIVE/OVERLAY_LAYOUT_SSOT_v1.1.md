# Overlay Layout SSOT v1.1

**Status:** Confirmed  
**Scope:** USER Overlays only (AI · 타점/HP(T) · 계산/SYS User · Trajectory)  
**Out of scope:** Admin Overlays (SYS/HPT/STR/AI admin edit modals), Runtime, Formula, Dataset  
**Container SSOT:** `.table-area`  
**Last Updated:** 2026-07-27  

> 본 문서는 사용자 Overlay의 **공통 Layout 규약**이다.  
> React / CSS 구현 전 Consume 한다.  
> 계산 로직·Formatter·Domain은 본 SSOT의 대상이 아니다.

---

## 0. 한 줄 원칙

```text
table-area (측정)
  → Ratio / Surface / Position (SSOT)
  → Overlay Shell (Layout Layer)
  → Content Layer (AI | 타점 | 계산 | Trajectory)
```

- Overlay 절대 px Width를 SSOT로 관리하지 않는다.
- Viewport `vw` / `vh` / 개별 media width는 Overlay Size SSOT가 아니다.
- Layout과 Content를 분리한다.

---

## 1. Container SSOT

### Primary
**`.table-area`**

이유:
1. Overlay는 당구대 표시 영역 안에만 존재해야 한다.
2. Trajectory가 이미 `.table-area` 기준 clamp/배치를 사용한다.
3. Stage는 버튼 레일까지 포함해 Overlay 비율 기준이 오염된다.
4. Viewport는 기기마다 당구대 점유율이 달라 동일 비율 UX가 깨진다.

### Secondary (입력 소스)
- `layoutCalculator.js` → `tableWidth` / `tableHeight` (수치 fallback)
- Runtime: `.table-area.getBoundingClientRect()` (실측 SSOT)

### Non-SSOT
- `viewport`
- `MobileWrapper` (미사용/회전 보조)
- Admin ModalShell 기본 `820px` 패널

---

## 2. Size Rule (Ratio SSOT)

### 2.1 계산식

```text
overlayWidth  = tableWidth  × overlayWidthRatio
overlayMaxH   = tableHeight × overlayMaxHeightRatio
```

- Width / MaxHeight의 SSOT는 **Ratio**다.
- 최종 px는 파생 값이며, 문서 SSOT에 고정하지 않는다.

### 2.2 Size Variant (Small / Medium / Large)

Overlay는 Variant만 선택한다. Overlay별 px를 지정하지 않는다.

| Variant | `overlayWidthRatio` | `overlayMaxHeightRatio` | 용도 |
|---------|---------------------|-------------------------|------|
| **Small** | **0.55** | **0.82** | 타점 (HP/T) |
| **Medium** | **0.72** | **0.88** | AI |
| **Large** | **0.84** | **0.90** | 계산 (SYS User) |

#### Mapping

| Overlay | Variant | Notes |
|---------|---------|-------|
| 타점 / HP(T) | Small | 실제 width는 `fit-content` 허용, **max = tableW × 0.55** |
| AI | Medium | 장문 reflow |
| 계산 / SYS User | Large | 계산식 한 줄 가독성 |
| Trajectory | Medium 계열 (`0.70`) | card 폭; Shell Variant와 동일 스케일 곡선 사용 |

> Trajectory는 Modal Shell이 아니어도 Size Ratio 곡선은 동일 SSOT를 따른다.

### 2.3 Height Rule

| Rule | Statement |
|------|-----------|
| Default | `height: auto` |
| Grow | 내용이 많으면 Shell이 커진다 |
| Shrink | 내용이 적으면 Shell이 작아진다 |
| Cap | `maxHeight = tableH × overlayMaxHeightRatio` |
| Scroll | Cap 초과 시에만 **Content 영역** scroll |
| Forbidden | Shell 전체 scroll을 기본으로 쓰지 않는다 |

### 2.4 Clamp

```text
overlay must remain inside table-area inset
insetRatio = 0.02   (table 짧은 변 기준 권장)
```

---

## 3. Typography Rule (Ratio SSOT)

### 3.1 계산식

```text
fontBase = tableHeight × fontBaseRatio
titleSize   = fontBase × titleRatio
sectionSize = fontBase × sectionRatio
bodySize    = fontBase × bodyRatio
noteSize    = fontBase × noteRatio
metricSize  = fontBase × metricRatio
```

### 3.2 Typography Ratios (권장 값)

| Token | Value | Role |
|-------|-------|------|
| `fontBaseRatio` | **0.028** | tableH 대비 본문 기준 |
| `titleRatio` | **1.25** | Block title |
| `sectionRatio` | **1.10** | `[공식]`, `[보정]` |
| `bodyRatio` | **1.00** | Body / 계산식 |
| `noteRatio` | **0.80** | ※ 참고 |
| `metricRatio` | **1.20** | HP 숫자 |
| `lineHeight` | **1.40** | 공통 |

### 3.3 Optional Content Density

콘텐츠 성격상 절대 크기가 달라야 하면 **contentTypeScale**만 추가한다 (px 복귀 금지).

| Content | contentTypeScale |
|---------|------------------|
| AI | 1.10 ~ 1.15 |
| 타점 | 1.00 |
| 계산 | 1.00 |
| Trajectory | 1.00 |

```text
effectiveFontBase = fontBase × contentTypeScale
```

### 3.4 Padding / Gap (Scale)

동일 `fontBase` 또는 `overlayScale (= fontBase / referenceBase)`로 파생:

| Token | Ratio to fontBase (권장) |
|-------|---------------------------|
| outerPadV | 0.90 |
| outerPadH | 1.05 |
| innerPad | 0.70 |
| gap | 0.65 |
| sectionGap | 0.55 |

---

## 4. Surface Token

Glass Rule을 **Surface Token**으로 승격한다.

Overlay는 Surface **이름만** 선택한다.  
실제 rgba / blur / border는 Surface Layer가 관리한다.

### Catalog

| Surface | Background | Blur | Use |
|---------|------------|------|-----|
| **Normal** | `rgba(255,255,255,0.70)` | `4px` | 기본 |
| **Strong** | `rgba(255,255,255,0.82)` | `4px` | 가독성 우선 (AI 권장) |
| **Transparent** | `rgba(255,255,255,0.40)` | `2px` | 약한 오버레이 |
| **Dark** (optional) | `rgba(15,23,42,0.72)` | `6px` | 향후 확장 |

### Mapping (권장)

| Overlay | Surface |
|---------|---------|
| AI | Strong |
| 타점 | Normal |
| 계산 | Strong 또는 Normal |
| Trajectory | Normal |

### Radius / Shadow (Surface companion)

| Token | Rule |
|-------|------|
| radius | `12px × clamp(scale, 0.85, 1.10)` |
| shadow | `0 8px 28px rgba(15,23,42,0.14)` |
| border | Surface catalog에 포함 |

Outer Shell만 공통. Content 내부 viz radius는 Content Layer 재량.

---

## 5. Position Rule

### Default
**Center** of `.table-area`

### Interaction
- Mouse Drag
- Touch Drag
- AI / 타점 / 계산 **동일 Drag 규칙**
- Trajectory도 동일 원칙 (이미 center + drag + table clamp)

### Policy

```text
position: center          // default start
draggable: true           // USER overlays
clamp: table-area inset
```

`draggable`은 position enum이 아니라 **능력/정책 플래그**다.

### Reserved positions (optional future)
`top-center` · `bottom-center` · `left` · `right` · `custom(offset)`

v1.1 필수 구현 범위: **center + draggable + clamp**

### Scope
Admin edit overlays는 본 Position Rule 적용 대상이 아니다.

---

## 6. Layer Architecture

```text
┌──────────────────────────────────────┐
│ Overlay Shell (Layout Layer)         │
│ - table-area measure                 │
│ - Size Variant (S/M/L ratios)        │
│ - Typography / Padding scale         │
│ - Surface resolve                    │
│ - Center + Drag + Clamp              │
│ - MaxHeight + Content scroll policy  │
└──────────────────┬───────────────────┘
                   │
┌──────────────────▼───────────────────┐
│ Content Layer                        │
│ - AI Content                         │
│ - 타점 Content                       │
│ - 계산 Content                       │
│ - Trajectory Content                 │
└──────────────────────────────────────┘
```

### Separation Rules
| Layer | May do | Must not do |
|-------|--------|-------------|
| Shell | sizing, surface, position, scroll policy | own copy/formula/SVG semantics |
| Content | text, equations, SVG, tabs | `vw`/`vh`/absolute overlay width |

---

## 7. Token Inventory

### 7.1 SSOT Tokens (문서·코드 규약에 남김)

**Size**
- `sizeVariant`: `small | medium | large`
- `overlayWidthRatio` (via variant)
- `overlayMaxHeightRatio` (via variant)
- `clampInsetRatio`

**Typography**
- `fontBaseRatio`
- `titleRatio` · `sectionRatio` · `bodyRatio` · `noteRatio` · `metricRatio`
- `lineHeight`
- `contentTypeScale` (optional)

**Surface**
- `surface`: `normal | strong | transparent | dark`

**Position**
- `position`: `center` (default)
- `draggable`: `true`

### 7.2 Computed Tokens (파생 — SSOT 아님)

구현 편의를 위해 CSS 변수로 노출할 수 있으나, **문서 SSOT 값이 아니다.**

- `--overlay-w`, `--overlay-max-h`
- `--overlay-title-size`, `--overlay-body-size`, …
- `--overlay-pad-v`, `--overlay-gap`
- `--overlay-bg`, `--overlay-blur`

### 7.3 Removed / Demoted from SSOT

| Item | Action |
|------|--------|
| Absolute overlay width px as SSOT | Removed |
| `20px × scale` typography SSOT | Demoted → Ratio |
| Viewport `80vw` / `72vh` as size SSOT | Removed |
| Standalone “Glass Rule” name | Replaced by Surface |
| Per-overlay media-query width tables | Non-SSOT / temporary only |

---

## 8. Scroll Policy

1. Prefer wider ratio / lower font scale / reflow  
2. Hit `maxHeight` → **Content** `overflow-y: auto`  
3. Shell does not scroll by default  
4. Exceptions:
   - Trajectory tab row may allow horizontal overflow
   - Extremely long AI lessons → content scroll only

---

## 9. Responsive Policy

```text
table size change
  → ratios unchanged
  → computed px change automatically
```

- PC / Tablet / Mobile share the **same ratios**
- Media queries must not redefine overlay width SSOT
- Allowed media use: accessibility (reduced transparency), extreme orientation floor only

---

## 10. File Roles (구현 시 Consume)

| File | Role |
|------|------|
| `.table-area` (App/Stage DOM) | Container SSOT |
| `utils/layoutCalculator.js` | tableW/H source |
| `contexts/LayoutContext.jsx` | layout value distribution |
| `components/common/ModalShell.jsx` | Overlay Shell candidate |
| `App.jsx` | mount + token host |
| `index.css` | computed CSS vars + Surface catalog |
| `UserAiPanel.jsx` | AI Content |
| `UserHptPanel.jsx` | 타점 Content |
| `UserSystemLessonPanel.jsx` / SYS User panel | 계산 Content |
| `UserTrajectoryInfoCard.jsx` | Trajectory Content (+ existing table clamp) |

---

## 11. 권장 구현 순서

```text
1. Overlay Shell 구현
   - table-area measure
   - Size Variant (S/M/L)
   - Surface + Position(center, drag, clamp)
   - Height auto + content scroll policy
        ↓
2. AI 적용 (Medium + Strong)
        ↓
3. 타점 적용 (Small + Normal)
        ↓
4. 계산 적용 (Large + Strong/Normal)
        ↓
5. Trajectory typography/surface 정렬
   (sizing는 table-area 유지, token만 공유)
```

각 단계 완료 조건:
- Ratio 기반 sizing만 사용 (viewport width SSOT 제거)
- Drag center rule 동작
- Content가 Shell size를 직접 지정하지 않음
- Build PASS (구현 단계에만 해당)

---

## 12. Compatibility with v1.0

```text
v1.0 --overlay-w     ≈ tableW × v1.1 overlayWidthRatio
v1.0 20px × scale    ≈ (tableH × fontBaseRatio) × titleRatio
v1.0 glass           ⊆ Surface.Normal / Strong
v1.0 table-area SSOT = unchanged (confirmed)
```

v1.1은 v1.0의 Container/Layer 분리를 유지한 채  
**값 Token → Ratio SSOT**, **Glass → Surface**, **Position Rule 추가**로 확정한다.

---

## 13. Non-Goals

- Admin Overlay Layout 통일 (별도 문서)
- Domain / Formula / Runtime / Dataset 변경
- Formatter / SYS 계산 로직 변경
- 본 문서 단계에서의 React/CSS 구현

---

**END OF Overlay Layout SSOT v1.1**
