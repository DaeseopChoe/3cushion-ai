# 마이그레이션 문서: 기존 창 → 새 창 작업 연속성

**프로젝트:** 3Cushion AI  
**목적:** 새 Cursor 채팅에서 맥락 없이도 이어서 작업할 수 있도록 핵심만 정리한다.

---

## 1. 대화·작업 요약

### 1.1 CO 궤적 회귀 (5_half_system / B2T_R)

- **증상:** CO_f=50은 정상, **CO_f=60·70**에서 CO가 튀고 2C가 사라짐.
- **원인:** `CO_rail`을 **항상** `computeRailImpactPoint(CO_prep, C1_prep, { mark: "CO" })`로 두면, B2T에서 CO 마크는 **BOTTOM 교점**만 시도함. CO_f>50은 SSOT상 **LEFT 레일** `(x≈-2.25, y 증가)`라 하단 교점이 범위 밖 → `lineRailIntersection` 실패 → **fallback이 1C 쪽으로 붙어** CO·2C 입력 붕괴.
- **데이터 특성:** B2T_R에서 CO_50=`(-2.25,-2.25)` 코너, CO_60=`(-2.25,10)` 등 **LEFT 진행** — “CO는 항상 하단 교점”이 아님.
- **결론:** 회귀는 **anchor lookup가 아니라** `App.jsx`의 **CO_rail 계산 방식**에서 발생.

### 1.2 수정 결정 (코드)

- **파일:** `frontend/src/App.jsx`
- **내용:** `isBottomCO = CO_prep && Math.abs(CO_prep.y + 2.25) < 0.5` 일 때만 `computeRailImpactPoint(..., mark: "CO")` 호출하고, **반환값이 있을 때만** `CO_rail` 덮어쓰기. 그 외 **`CO_rail = CO_prep`**.
- **유지:** `C1_rail`은 기존대로 `mark: "1C"` 단일 호출.

### 1.3 그 외 정리된 주제

| 주제 | 요약 |
|------|------|
| **Recall** | `buildDraftsFromRecord`가 `inputs`만 넣어 `outputs.result`가 비면 lookup 실패 → **`calculateByProfileExpr`로 result 채움** (`useShotSlots.ts`). |
| **1C 라벨** | `allAnchors["1C"]`를 **`C1_rail`**에 고정 (override와 꺾임점 일치). |
| **SSOT** | 렌더 좌표는 **`anchors.json`** + `anchorLookupEngine` / `anchorCoordinateEngine`; expr는 스칼라만. |
| **Fg/Rg** | `resolveAnchorPoint`는 Fg에 **snap 하지 않음**; C1_rail은 **교점 SSOT**. |
| **2C spin** | `reflectionEngine.ts` `TIP_TO_DELTA_DEG`: 3=**13°**, 4=**18°** (구조 동일, 값만 튜닝). |

### 1.4 문서 갱신 (이미 반영됨)

- `작업관리/1_PROJECT_MASTER_INDEX.md`, `3_SYSTEM_ARCHITECTURE.md`, `4_CALCULATION_RULES.md`, `5_PROJECT_MASTER_STATE_CURRENT.md`, `6_CURRENT_CODE_SNAPSHOT_SUMMARY.md`, `PROJECT_LOG_2026-03.md`, `SESSION_SUMMARY_FULL_2026-03.md`, `SESSION_SUMMARY_2026-03_C2_REFLECTION.md`

---

## 2. 의사결정 기록

| 항목 | 결정 |
|------|------|
| CO_rail | **조건부 교점만**; 교점 실패 시 CO 의미점 유지 (fallback으로 CO 덮어쓰지 않음). |
| C1_rail | **항상** `computeRailImpactPoint(..., mark: "1C")` (직선–레일 교점 SSOT). |
| `computeRailImpactPoint` 내부 | 당장 수정하지 않음; CO는 App에서 호출 자체를 가드. |
| 회귀 성격 | 설계 오류가 아니라 **최근 App 로직 변경으로 인한 regression**으로 특정. |

---

## 3. 미해결 / 다음 창에서 할 일

1. **검증:** Admin 모드, `systemId=5_half_system`, `track=B2T_R`, C1_f·C3_r 고정, CO_f **50 / 60 / 70** — 궤적·2C·라벨 확인.
2. **2C:** 실전 샷 기준 `TIP_TO_DELTA_DEG` 미세 보정 (문서 TODO).
3. **리팩터링(선택):** `computeRailImpactPoint` fallback 정리, 장기적으로 CO/C1 분기 일원화.

---

## 4. 참조 파일 목록

| 경로 | 비고 |
|------|------|
| `frontend/src/App.jsx` | `isBottomCO`, `CO_rail`, `C1_rail`, `allAnchors["1C"]` |
| `frontend/src/hooks/useShotSlots.ts` | `buildDraftsFromRecord`, `outputs.result` |
| `frontend/src/domain/anchorLookupEngine.ts` | `getAnchorCoordFromSys` |
| `frontend/src/domain/anchorCoordinateEngine.ts` | `getAnchorsForRendering` |
| `frontend/src/utils/geometry/anchorResolve.ts` | `resolveAnchorPoint`, `computeRailImpactPoint` |
| `frontend/src/domain/reflectionEngine.ts` | `TIP_TO_DELTA_DEG` |
| `frontend/src/data/systems/5_half_system/anchors.json` | B2T_R CO/C1/C3 knots |
| `작업관리/5_PROJECT_MASTER_STATE_CURRENT.md` | 현재 상태 v2.4 |
| `작업관리/PROJECT_LOG_2026-03.md` | 2026-03-28 이슈 로그 |

---

## 5. 새 창에서 붙여넣기용 한 줄 (템플릿)

> 3Cushion AI 이어하기. `작업관리/MIGRATION_HANDOFF_CURSOR.md`와 `5_PROJECT_MASTER_STATE_CURRENT.md`를 기준으로 하고, CO는 `App.jsx`의 `isBottomCO` 조건부 `CO_rail`이 적용된 상태다. 다음은 [검증 / 2C 튜닝 / 리팩터] 중에서: ___

---

*생성 기준: 대화 내역 + 현재 코드 구조. 날짜: 2026-03-28*
