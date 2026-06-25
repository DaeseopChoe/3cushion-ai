# FG → RG 투영 로직 분석

**목적:** 예전 정상 경로와 현재 끊긴 지점 정리 (수정 없음)

---

## 1. offset_fg2rg 정의 위치

| 위치 | 경로 | 값 |
|------|------|-----|
| **profile.json** (5_half_system 등) | `safety.offset_fg2rg` | 2.25 |
| **convertCanonicalAnchors.js** | `canonical.coords.offset_fg2rg` (인자에서) | 2.25 fallback |
| **App.jsx hasConversionData** | `system.values.offset_fg2rg` | **여기서 찾지 못함** |

- `system` = `view?.ui?.system` (로드된 샷 JSON의 `ui.system`)
- canonical.json의 `ui.system.values` = `{ CO: 40, 1C: 20, 2C: null, 3C: 20, 4C: 15, ... }`  
  → **offset_fg2rg 없음** (시스템 값만 있음)
- profile.json의 `safety.offset_fg2rg`는 `system`에 **merge되지 않음**

---

## 2. FG → RG 투영 함수

### 2.1 convertCanonicalAnchors (lib/convertCanonicalAnchors.js)

- **역할:** FG 앵커 → RG 레일 위 좌표 변환
- **방식:** baseDir(CO→C1 방향) + 레일 교점 계산
- **투영식:** 기울기 반영
  - `calculateRailIntersection(p_fg, baseDir, rail)`
  - 예: BOTTOM – `t = (2.25 - p_fg.y) / dy` 후 `x: p_fg.x + t*dx - offset`, `y: 0`
- **offset 사용:** `canonical.coords.offset_fg2rg || 2.25`

### 2.2 fgToRg (finalCoordinateEngine, anchorCoordinateEngine)

- **역할:** FG 좌표 → RG 비례 좌표
- **방식:** 단순 비례 변환 (기울기 무시)
- **식:**  
  - `x = (pt.x - FG_X_MIN) / (FG_X_MAX - FG_X_MIN) * RG_W`  
  - `y = (pt.y - FG_Y_MIN) / (FG_Y_MAX - FG_Y_MIN) * RG_H`  
  - FG: [-2.25, 82.25] x [-2.25, 42.25] → RG: [0, 80] x [0, 40]

---

## 3. convertCanonicalAnchors 호출 경로

**예전 정상 경로 (의도):**

```
rawAnchors (FG 또는 RG)
    ↓
hasConversionData == true
    ↓
convertCanonicalAnchors(rawAnchors, canonical)
    ↓
anchors (RG, 레일 위)
```

**현재 끊긴 지점:**

- `hasConversionData` 조건:
  - `canonical` 존재
  - `canonical !== "canonical"`
  - `system.values` 존재
  - `typeof system.values.offset_fg2rg === "number"`
- **system.values.offset_fg2rg**가 없어 조건 실패 → **convertCanonicalAnchors 미호출**

---

## 4. "system.values.offset_fg2rg 없음" 로그가 뜨는 이유

| 항목 | 설명 |
|------|------|
| **원인** | `view.ui.system.values`에 `offset_fg2rg`가 없음 |
| **system.values 구조** | 샷 JSON 기준 `{ CO, 1C, 2C, 3C, 4C, ... }` 등 sys 값만 포함 |
| **offset_fg2rg 위치** | profile의 `safety.offset_fg2rg`에만 존재 |
| **연결** | profile의 safety가 `system`/`system.values`에 합쳐지지 않음 |

→ `system.values.offset_fg2rg`를 찾을 수 없어 `hasConversionData === false` → 변환 스킵

---

## 5. 현재 값이 기대 위치에 없는 이유

- 기대: `system.values.offset_fg2rg` = 2.25 (또는 profile에서 온 값)
- 실제: `system.values` = sys 숫자만, `offset_fg2rg` 없음
- 구조 불일치:  
  - `offset_fg2rg`는 **profile.safety**에 정의  
  - App.jsx는 **system.values**에서만 참조  
  - 샷 로드 시 profile이 system에 merge되지 않음

---

## 6. convertCanonicalAnchors 전달 인자 불일치

| 항목 | App.jsx | convertCanonicalAnchors 기대 |
|------|---------|-----------------------------|
| **canonical** | 문자열 `"B2T_R"` (track) | `canonical.coords.offset_fg2rg`를 쓰는 **객체** |
| **결과** | `canonical.coords` = undefined | `offset = undefined || 2.25` → 2.25 기본 사용 (호출 시) |

- 현재는 `hasConversionData`가 false라 `convertCanonicalAnchors` 자체가 호출되지 않음.
- 호출된다면, canonical이 문자열이어도 `offset`은 2.25 fallback으로 동작할 수 있음.

---

## 7. 정리: 예전 정상 경로 vs 현재 끊긴 지점

### 예전 정상 경로 (의도된 설계)

1. profile 또는 샷 데이터에서 `offset_fg2rg` 취득
2. `hasConversionData === true`로 `convertCanonicalAnchors` 호출
3. FG 앵커 → RG 레일 위 좌표 (baseDir 기반 투영)
4. 이후 CO_rail, C1_rail 등 계산

### 현재 끊긴 지점

1. `system.values.offset_fg2rg`가 존재하지 않음
2. `hasConversionData === false` → `convertCanonicalAnchors` 미호출
3. `anchors = rawAnchors` 유지 (FG/RG 혼합 또는 변환 없음)
4. `convertCanonicalAnchors`의 레일 교점 투영 로직 미사용

### 투영 로직 상태

- **convertCanonicalAnchors**  
  - 코드는 존재  
  - `system.values.offset_fg2rg` 조건 때문에 **호출이 되지 않아** 연결이 끊김  
- **fgToRg**  
  - 단순 비례 변환  
  - anchorCoordinateEngine, SystemGrid 등에서 사용 중
