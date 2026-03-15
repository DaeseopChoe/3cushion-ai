# Trajectory Line (CO → C1 → C2) Computation Analysis

## 1. Code Path from App.jsx

### Entry Point
All trajectory rendering originates from `App.jsx` around lines 2943–3432. The flow:

```
rawAnchors (getAnchorsForRendering / display.anchors)
    ↓
convertCanonicalAnchors (FG→RG, rail projection)
    ↓
anchors { CO, 1C, 2C, 3C, 4C, 5C, 6C }
    ↓
computeRailPoints(CO_fg, C1_fg) → CO_rail, C1_rail
    ↓
buildCushionPath(C1_rail, C2, C3, lastAnchor) → cushionPath
    ↓
ImpactLines { CO_line, C1_line, cushionPath, cushionPathAttr }
```

---

## 2. Where Values Are Created

### CO_line, C1_line
| Location | File | Line |
|----------|------|------|
| Assignment | `App.jsx` | 3320–3321 |
| Source | `computeRailPoints(CO_fg, C1_fg)` | `rail.ts` L67 |

```javascript
const CO_line = CO_rail;
const C1_line = C1_rail;
```

`CO_rail` and `C1_rail` are the intersections of the CO→C1 line with the table rails (BOTTOM/TOP only).

### C2, C3, C4
| Location | File | Line |
|----------|------|------|
| Assignment | `App.jsx` | 3310–3314 |
| Source | `anchors` (after `convertCanonicalAnchors`) | — |

```javascript
const C2 = anchors["2C"];
const C3 = anchors["3C"];
const C4 = anchors["4C"];
// ...
```

`anchors` comes from `convertCanonicalAnchors(rawAnchorsCalibrated, canonical)` or `rawAnchorsCalibrated` when conversion is skipped.

### ImpactLines Component
| Location | File | Line |
|----------|------|------|
| Import | `App.jsx` | 51 |
| Rendering | `App.jsx` | 3424–3432 |

---

## 3. Function Details

### convertCanonicalAnchors
- **File:** `frontend/src/lib/convertCanonicalAnchors.js`
- **Role:** FG→RG and rail projection for anchors
- **Input:** `anchors` (CO, 1C, 2C, … in FG/RG), `canonical` (track + `offset_fg2rg`)
- **Output:** Same keys with RG coordinates; points on rails projected using CO–1C direction

### computeRailPoints
- **File:** `frontend/src/utils/geometry/rail.ts` L67–108
- **Role:** Intersection of CO→C1 line with table rails
- **Logic:** Uses `computeLineFromPoints(CO_fg, C1_fg)` then `lineRailIntersection` for BOTTOM and TOP
- **Limitation:** Only handles B2T/T2B; CO and C1 must be near `y=-2.25` (bottom) or `y=42.25` (top). Short rails (LEFT/RIGHT) are not supported.

### lineRailIntersection
- **File:** `frontend/src/utils/geometry/rail.ts` L27–60
- **Role:** Intersection of a line with one rail (BOTTOM y=0, TOP y=40, LEFT x=0, RIGHT x=80)

### buildCushionPath
- **File:** `frontend/src/utils/geometry/rail.ts` L165–171
- **Role:** Build array for cushion polyline

```javascript
return [C1_rail, C2, C3, lastAnchor].filter((p) => p != null);
```

Order is fixed: C1 → C2 → C3 → lastAnchor (C4/C5/C6). No ordering or geometric checks.

---

## 4. ImpactLines Rendering

- **Line (orange):** CO_line → C1_line
- **Line (white):** CO_corrected_line → C1_line (if corrections)
- **Polyline (red):** Points from `cushionPathAttr` (C1_rail, C2, C3, lastAnchor)

Visual path: **CO_rail → C1_rail → C2 → C3 → C4** (when `last_cushion === "4C"`).

---

## 5. Why the Trajectory “Jumps” Across the Table

### Root cause: C2 is missing for 5&half

- **anchorCoordinateEngine.ts** (L136–144) defines `MARK_TO_OUTPUT_KEY`:
  - CO, C1, C3, C4, C5, C6
  - **C2 is not included**

- **5_half_system anchors.json** defines CO, C1, C3, C4, C5, C6 — no C2.

- `getAnchorsForRendering` therefore never returns `2C`.

- `sysValuesToAnchors` can add 2C only if `C2_f`, `C2_r`, or `"2C"` exists in `sysValues`. 5&half uses CO_f, C1_f, C3_r; 2C is not required.

- Result: **`anchors["2C"]` is often `undefined`**.

### Effect on cushionPath

```javascript
buildCushionPath(C1_rail, undefined, C3, C4)
// → [C1_rail, C3, C4].filter(...)
// → [C1_rail, C3, C4]
```

The polyline becomes **C1_rail → C3 → C4**, skipping the second cushion (2C).

### Visual effect

- Intended: CO → 1C → **2C** → 3C → 4C  
- Actual: CO → 1C → ~~2C~~ → 3C → 4C

The drawn segment **C1_rail (top) → C3 (bottom)** is a direct diagonal across the table because 2C (e.g. on the right rail) is omitted. That is the “jump” across the table.

### Summary

| Issue | Detail |
|-------|--------|
| **Cause** | C2 (2C) is not emitted by `getAnchorsForRendering` for 5&half and is not filled by `sysValuesToAnchors`. |
| **Effect** | `buildCushionPath` produces [C1_rail, C3, C4], omitting 2C. |
| **Result** | The polyline draws C1 → C3 directly, creating the visible “jump”. |

### Suggested direction

1. Add C2 to 5&half `anchors.json` or adjust the interpolation/coordinate logic so 2C is computed.
2. Extend `anchorCoordinateEngine` and `MARK_TO_OUTPUT_KEY` to support C2 for systems that use it.
3. Add geometric validation (or ordering rules) in `buildCushionPath` so invalid segments are not drawn when intermediate cushions are missing.
