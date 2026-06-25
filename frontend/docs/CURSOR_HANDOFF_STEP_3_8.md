# 3Cushion AI — Cursor 이관문서 (STEP 3.8 전)

## 1. 프로젝트 개요

- **프로젝트:** 3Cushion AI — 당구 시스템·궤적·라벨 UI
- **좌표계**
  - **Fg (Frame / 그리드):** 프레임 근처 값(예: ±2.25, 42.25 등). 궤적·일부 앵커에서 사용.
  - **Rg (Rail / 경기장):** 레일 눈금 0–80(롱), 0–40(숏) 기준. `toPx` 입력은 Rg 전제.
- **원칙:** **시스템 값(sys)** 과 **화면 위치(coord)** 는 분리한다. 표시 숫자는 `systemValues`, 점 위치는 `coord`만 사용한다. sys를 좌표처럼 쓰지 않는다.

---

## 2. 완료된 작업 (요약)

| 단계 | 내용 |
|------|------|
| STEP 1 | `systemSysConfig` 등 설정 모듈 정리 |
| STEP 2 | autoSolve 구조 분리 |
| STEP 3 | CO_eff / Sn 역할 분리 |
| STEP 3.5 | `computeSnPair` 적용 |
| STEP 3.7 | 잘못된 projection·렌더 단계 `rgToPx` 시도 **전부 롤백** (`renderNode` → `toPx(coord)` 복구) |

---

## 3. 현재 상태 (중요)

### 정상

- 궤적(trajectory / cushionPath)
- sys 계산·병합 흐름
- **라벨 위치:** `SystemValueLabels.jsx` — `renderNode`에서 **`toPx(node.coord)`** 만 사용 (렌더 단계는 정상 범주)

### 문제

- **C3_r** 등 `_r` 필드의 **sys 값은 기대대로**인 경우가 많음.
- 그러나 **coord는 Fg 쪽 기준으로 생성·전달**되는 경우가 있어, **「표시·로직은 r, 점 위치는 f」** 식의 불일치가 남아 있음.

---

## 4. 원인 요약 (합의 방향)

- **렌더 버그 아님** (`toPx`·라벨 컴포넌트 자체가 1차 원인은 아님).
- **projection 재도입 이슈 아님** (STEP 3.7에서 시도했던 렌더 단 projection은 롤백됨).
- **원인 범위:** **anchor coord 생성·선택** 단계 — `anchors["C3"]` 등이 어떤 `sysValue`·어떤 `anchors.json` 점으로 보간되는지, Fg/Rg 혼입 여부.

---

## 5. 관련 핵심 파일

| 파일 | 역할 |
|------|------|
| `frontend/src/components/table/SystemValueLabels.jsx` | `collectBaseNodes` → `toPx(node.coord)`. **여기서 coord를 고치지 말 것.** |
| `frontend/src/domain/anchorCoordinateEngine.ts` | `LABEL_SYS_CANDIDATES`, `sysToCoordFromAnchors`, `getAnchorsForRendering` |
| `frontend/src/domain/anchorLookupEngine.ts` | `getAnchorCoordFromSys` — `anchors.json` 보간, `valueSpace` 판별 |
| `frontend/src/utils/geometry/anchorResolve.ts` | `resolveAnchorPoint` — C3는 현재 **coord 그대로 반환**, 변환 없음 |
| `frontend/src/data/systems/*/anchors.json` | 트랙별 앵커 SSOT |

(App.jsx의 `rawAnchors` / `C3_label` / `getAnchorsForRendering` 호출은 coord가 어디서 오는지 추적할 때 참고. **이관 후 STEP 3.8에서 수정 범위를 좁힐 때** 앱 레이어 변경 필요 여부를 판단.)

---

## 6. 조사 결과 요약

- `LABEL_SYS_CANDIDATES["C3"]` = `["C3_f", "C3_r"]` — **먼저 채워진 필드**가 sys 소스로 사용됨.
- 라벨 **숫자**는 `getLabelNumericSuffix`로 위와 동일한 후보 순서를 사용.
- **coord**는 `anchor.coord`를 그대로 쓰고, `resolveAnchorPoint`는 **Fg→Rg 변환을 하지 않음**.
- 따라서 **보간 결과 `coord`가 Fg 프레임 값에 가깝게 나오면**, 렌더는 정직하게 그 위치에 그린다 → **근본은 coord 생성·선택 경로**.

---

## 7. 다음 작업 (하나만)

### STEP 3.8 — `C3_r` coord 생성 경로 수정

- **목표:** sys가 **`_r`** 로 결정될 때(또는 Rg 전용 값일 때), **`coord`도 Rg 기준 앵커/보간 결과**를 쓰도록 **생성 단계**를 맞춘다.
- **금지:** 렌더(`SystemValueLabels`)에서의 projection·sys를 x로 쓰는 식의 우회.
- **금지:** 임의 `fgToRg`를 렌더에 다시 얹는 것.
- **허용:** `anchorCoordinateEngine` / `anchorLookupEngine` / (필요 시) App의 **`getAnchorsForRendering` 입력·보간 분기** 등 **coord가 만들어지는 곳**만.

---

## 8. 이 문서 사용법

새 Cursor 창에서 이 파일을 열고 STEP 3.8만 이어서 진행하면 된다. 디버그 시에는 **coord / keyUsed / valueSpace** 가 한 줄에 나오도록 로깅해 원인을 고정한다.

---

## 9. STEP 3.8 구현 요약 (완료)

**원인:** `sysToCoordFromAnchors` → `getAnchorCoordFromSys`가 `C3_f` / `C3_r` 구분 없이 동일한 `C3` 앵커 polyline을 보간해, `C3_r`일 때도 **Fg 프레임 좌표**가 나올 수 있음. `SystemValueLabels`의 `toPx`는 **Rg(0–80, 0–40)** 를 전제로 하므로 위치가 틀어짐.

**수정:** `extractSysValueWithKey`의 `keyUsed`를 `getAnchorCoordFromSys`에 `sysFieldKey`로 전달. 키가 `*_r`이면 (1) 앵커 점이 `coordValueSpace === "Rg"` 인 것만 있으면 그 점들로만 보간, (2) Rg 점이 없고 보간 결과가 Fg이면 `finalCoordinateEngine.fgToRg`로 **coord 생성 단계에서** Rg로 맞춤.

**파일:** `anchorLookupEngine.ts` (로직), `anchorCoordinateEngine.ts` (`sysFieldKey` 전달).

**빌드:** `frontend`에서 `npm run build` (Vite) 성공.
