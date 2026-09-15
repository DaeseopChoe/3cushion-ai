# Signed Correction Authoring SSOT

**Status:** Active · FINALIZED (user manual validation PASS 2026-09-15)  
**Scope:** ADMIN SYS correction sign ownership · domain separation · CO label semantic · legacy compatibility  
**Out of scope:** Curve geometry redesign · 5&Half formula · q/K · R0/R1b/P7 · HPT · Impact · C2 · Display ceiling · corpus rewrite  
**Related:** `HISTORY/PROJECT_LOG_2026-09.md` · `PROJECT_MASTER_INDEX.md` (pointer) · code: `correctionSignMode.ts` · `sysOverlayCalcHelpers.unifiedSlideFromCorrections` · `SysOverlay.jsx`  
**Last Updated:** 2026-09-15

---

## 1. Core principle

보정 **종류(label)** 또는 **shotType**이 부호를 결정하지 않는다.

관리자가 authoring한 **signed correction value**가 해당 보정값의 부호 SSOT이다.

```text
authored signed value  →  calculation (해당 domain에 그대로 가산)
                       →  display / AI semantic (동일 의미)
```

authored mode에서 금지:

- `abs(value)`로 부호 제거 후 재구성
- draw를 자동 `-abs`로 강제 (legacy path 제외)
- `getShotTypeCorrectionSign(shotType)`로 authored sign 재반전

---

## 2. Per-field `[-]` UI

각 correction 필드는 **독립** `[-]` toggle을 가진다. 공용 minus 금지.

| Field | UI label | Default | `[-]` ON |
|-------|----------|---------|----------|
| `slide` | 밀림 | +magnitude | −magnitude |
| `draw` | 끌림 | +magnitude | −magnitude |
| `curve_ratio` | 기울기 | +magnitude | −magnitude |
| `spin` | 스핀 | +magnitude | −magnitude |

입력은 magnitude + `[-]` 분리 (직접 `-2` 타이핑 UX가 아님).

예: `slide` 2 + `[-]` OFF → `+2` · ON → `-2` (draw / 기울기 / 스핀 동일).

---

## 3. Correction domains (do not mix)

| Correction | Domain | Effect |
|------------|--------|--------|
| 밀림 `slide` / 끌림 `draw` | **CO (출발값)** | `CO_corrected = CO_base + signed(slide\|draw)` |
| 기울기 `curve_ratio` / 스핀 `spin` | **C3 (3쿠션 도착)** | C3에 authored signed 가산 |
| `departure` / 5&Half Sn | C4+ 계열 | 기존 계약 유지 (본 SSOT 1·2차 비대상 확장) |

slide/draw를 C3로, spin/기울기를 CO로 옮기지 않는다.

---

## 4. Mutual exclusion (slide ↔ draw only)

밀림과 끌림은 반대 운동 → **동시 non-zero 금지**.

```text
slide ≠ 0  ⇒  draw = 0
draw  ≠ 0  ⇒  slide = 0
```

판정은 **부호 무관 non-zero**. `slide = -2`도 active slide.

**허용 공존:** slide|draw + spin · slide|draw + 기울기 · spin + 기울기 · 및 그 조합.

---

## 5. CO display label semantic

「보정한 출발값」은 field 존재 여부가 아니라 **실제 CO 결과**로 판정.

```text
CO_corrected == CO_base  →  「출발값」
CO_corrected ≠  CO_base  →  「보정한 출발값」
```

예: CO=30, slide=draw=0, 기울기=+2.5 → CO 불변 → 「출발값(30)」 (「보정한 출발값(30)」 금지).

SYS 보정 계산 표시와 AI/lesson/trajectory card semantic이 동일 원칙을 따른다.

---

## 6. Legacy compatibility

| Mode | Marker | Behavior |
|------|--------|----------|
| **authored** | `corrections.signMode: "authored"` | 저장된 signed value가 SSOT · shotType 반전 없음 |
| **legacy** | marker 없음 (또는 명시 legacy) | 기존 `abs`/`-abs` + `getShotTypeCorrectionSign` 의미 보존 (slide/draw) |

- 기존 corpus **일괄 rewrite 금지**
- legacy를 authored 규칙으로 강제 재해석 금지
- 신규 SAVE는 authored marker + signed values

---

## 7. Curve geometry — LOCK / KEEP

Signed Authoring 1·2차에서 **curve geometry를 변경하지 않았다**.

```text
CURVE GEOMETRY = LOCK / KEEP
```

금지(후속 별도 작업 전까지): curve shape/length · Bézier/Hermite · bend strength · control points · transition · magnitude scale 재설계.

현재 Impact 직후 curve는 장기간 조정·**사용자 수동 검증 PASS** 상태이다.  
향후 `signedDelta = correctedResult − baselineResult`를 curve input으로 연결하는 작업은 **별도 프로젝트**로 취급한다.

---

## 8. Implementation provenance

| Phase | Commit | Summary |
|-------|--------|---------|
| 1차 | `82f8296` | authored ownership · 밀림/끌림 `[-]` · legacy · SAVE/Recall |
| 2차 | `84b753b` | 스핀/기울기 `[-]` · CO label conditional · UI/AI semantic align |

상세 이력: `HISTORY/PROJECT_LOG_2026-09.md`.

---

## 9. Manual validation (2026-09-15) — PASS

1. 밀림/끌림 각각 독립 `[-]` authoring  
2. 기울기 독립 `[-]`  
3. 스핀 독립 `[-]`  
4. CO correction 없을 때 「출발값」(「보정한 출발값」 아님)  
5. CO 불변 시 CO→C1에 불필요 curve 없음  
6. spin → C3 정상  
7. 밀림/끌림으로 CO 변경 시 현재 curve 정상  
8. 밀림|끌림 + spin 동시 → CO / C3 각각 정상  
9. 보정 계산식 표시 일치  
