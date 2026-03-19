# 3Cushion AI — 채팅 이관 문서 (2026-03)

> **용도:** 새 채팅 창에 이 문서 전체를 붙여넣으면, 이전 대화 맥락을 이어받아 작업을 계속할 수 있습니다.

---

## 📌 사용 방법

1. 이 문서 전체를 복사
2. 새 채팅 창에 붙여넣기
3. "이 문서를 참고하여 [다음 작업]을 진행해 주세요" 등으로 요청

---

## 1. 프로젝트 개요

**3Cushion AI** — 3쿠션 당구 시뮬레이션/전략 추천 프론트엔드

- **경로:** `d:\3Cushion AI`
- **주요 스택:** React, TypeScript/JSX
- **핵심 기능:** C2 반사 노드 생성, spin 보정, anchor 좌표 편집, dataset 기반 전략 추천
- **역할 전환:** 단순 계산기 → **데이터 생성/관리 플랫폼** (SAVE → History → Export 흐름)

---

## 2. 이번 세션에서 완료한 작업 (상세)

### 2.1 HP/T 입력 구조 버그 수정 ✅

**문제:**
- `count = Math.round(Math.hypot(hp.x, hp.y))` — r 기반 계산
- HP/T UI는 항상 반지름 4로 좌표 생성 → r ≈ 4
- 결과: 1팁, 2팁, 3팁, 4팁 모두 count=4로 처리 → spinAdjustDeg 항상 최대값

**해결:**
- `tipCount`를 UI에서 직접 전달
- r 기반 count 계산 제거

**수정 위치:**
- `frontend/src/admin/hpt/useHptController.ts`
  - `HptState`에 `tipCount?: number` 추가
  - `sync`, `applyHpAndSync`에 `tipCount` 인자
  - `setHpFromSystem(direction, tip)` 호출 시 `applyHpAndSync(x, y, "TIP", clampedTip)`
- `frontend/src/App.jsx`
  - `HptOverlay`: `controllerValue.tipCount`, `onControllerChange`에서 `tipCount` 저장
  - `currentTip`: `count = adminState?.hpt?.tipCount ?? 0` (r 제거)
  - `defaultHpt`: `tipCount: 0` 추가

---

### 2.2 TIP_TO_DELTA_DEG 보정 ✅

**변경:**
- 기존: 1: 7.125, 2: 14.036, 3: 20.556, 4: 26.565
- 현재: 1: 5, 2: 10, 3: 14, 4: 20

**파일:** `frontend/src/domain/reflectionEngine.ts` (55~61행)

---

### 2.3 Joystick Spin → Tip Equivalent 변환 ✅

**추가 로직:**
- `SPIN_TO_TIP_EQUIV`: 0→0, 1.4→0.9, 2.8→1.9, 3.6→3.0, 4.0→4.0
- `mapSpinToTip(spin)`: 선형 보간
- `getDeltaFromSpin(spin)`: tipEquiv → TIP_TO_DELTA_DEG 보간

**TipInput 확장:**
```ts
type TipInput = {
  count?: number;           // discrete tip (1~4)
  hp?: { x: number; y: number };  // joystick
  side: "L" | "R";
};
```

**resolveSignedSpinDeg 분기:**
- `tip.count` 있으면 → TIP_TO_DELTA_DEG[count] (discrete)
- `tip.hp` 있으면 → getDeltaFromSpin(hypot(hp.x, hp.y)) (joystick)

**App.jsx currentTip:**
- `mode === "TIP"` → `{ count, side }`
- `mode === "SPIN"` → `{ hp: { x, y }, side }`

---

### 2.4 SPIN_TO_TIP_EQUIV 미세 보정 ✅

- 1.4→0.9, 2.8→1.9로 조정 (1.4/2.8 구간 과다 반영 완화)
- `frontend/src/domain/reflectionEngine.ts`

---

### 2.5 Anchor Direct Edit System ✅

**기능:**
- CO, 1C, 2C, 3C 등 anchor 더블클릭 → X/Y 좌표 입력 오버레이
- `adminState.anchorsOverride[key] = { x, y }` 저장
- `round1(v) = Math.round(Number(v) * 10) / 10` 적용
- localStorage `ANCHORS_OVERRIDE_V1` 유지

**anchor 적용:**
```ts
const override = adminState?.anchorsOverride ?? {};
anchors = { ...baseAnchors, ...override };
allAnchors에서 CO, 1C는 override 우선 사용
```

**수정 파일:**
- `App.jsx`: AnchorEditOverlay, openAnchorEdit, anchorsOverride, useEffect 저장
- `AnchorPoint.jsx`: onDoubleClick, stopPropagation
- `SystemValueLabels.jsx`: onAnchorDoubleClick prop

---

## 3. 현재 코드 상태 (핵심)

### 3.1 reflectionEngine.ts
- `TIP_TO_DELTA_DEG`: 0, 5, 10, 14, 20
- `SPIN_TO_TIP_EQUIV`: 위 표 참조
- `mapSpinToTip`, `getDeltaFromSpin` (내부 함수)
- `resolveSignedSpinDeg`: tip.count 우선, 없으면 tip.hp → getDeltaFromSpin

### 3.2 useHptController.ts
- `tipCount` 전달 구조
- `setHpFromSystem` → `applyHpAndSync(..., clampedTip)`
- parent sync 시 `tipCount` 반영

### 3.3 App.jsx
- `adminState.anchorsOverride`, `ANCHORS_OVERRIDE_KEY`
- `currentTip`: mode에 따라 count 또는 hp
- `AnchorEditOverlay`, `openAnchorEdit`
- anchor merge: `anchors = { ...anchors, ...override }`

### 3.4 수정 금지
- `reflectAngle`, `railNormalAngle`, `intersectRayWithRail`
- branch 선택 로직, track 로직
- `anchorCoordinateEngine`, `calibrationEngine`

---

## 4. 저장 흐름 (구현 완료)

### 4.1 저장 구조 (현재)

**흐름:** 입력 → 적용 → snapshot 저장 → History → 선택 → Export

| 단계 | 트리거 | 동작 |
|------|--------|------|
| **적용** | SYS/HPT/STR/AI/Anchor overlay "적용" 클릭 | handleSaveWorkspaceSnapshot(true) |
| **SAVE** | SAVE 버튼 클릭 | snapshot 생성 → workspace_history |
| **History** | History 버튼 클릭 | WorkspaceHistoryModal (All/Unexported 탭) |
| **Export** | Unexported 탭 → 선택 → Export | File System (systemId/pattern 폴더) |

### 4.2 Export 구조

- **File System Access API** 사용
- **폴더:** `{선택폴더}/{systemId}/{pattern}/*.json`
- **파일명:** `{systemId}_{pattern}_v{version}_{date}.json`
- **version:** patternDir 내 max+1 (overwrite 금지)
- **exported:** Export 완료 시 snapshot.exported = true

### 4.3 Auto Save 정책

- **항상 ON** (버튼 제거)
- **적용 시에만 저장** (입력 중 저장 금지)

### 4.4 Recall 구조

- **Import 제거** → Position Recall로 완전 대체
- `runPositionRecall` (positionRecallEngine) 사용
- threshold/softThreshold 검증 후 확인 적용

---

## 5. UI 구조 (현재)

### 5.1 버튼

**좌측:** 코칭, S1, S2, S3, SYS, HP/T, STR, AI  
**우측:** Grid, Recall, History, SAVE

**제거된 버튼:** Admin, Import, Export, Auto Save, 파일 연결, Save Strategy  
(Admin 모드: Ctrl+Shift+A)

### 5.2 레이아웃

- **app-layout:** table-area (flex:1) | right-panel (120px)
- right-panel: 독립 패널, 테이블 위 overlay 아님

---

## 6. 남은 작업 (우선순위)

### Phase 1: Recall UI 연결
- Recall 결과 표시 UX 보강
- threshold/softThreshold UI

### Phase 2: Export UX 보강
- 폴더 선택 안내 개선
- 다중 systemId/pattern 일괄 Export

### Phase 3: 정리
- positions_dataset, ANCHORS_OVERRIDE_V1 마이그레이션 검토

---

## 7. 참조 문서 경로

| 문서 | 경로 |
|------|------|
| 전체 세션 요약 | `작업관리/SESSION_SUMMARY_FULL_2026-03.md` |
| C2/Spin/Anchor 요약 | `작업관리/SESSION_SUMMARY_2026-03_C2_REFLECTION.md` |
| 저장 구조 분석 | `작업관리/STORAGE_STRUCTURE_ANALYSIS_REPORT.md` |
| Recall & SAVE 설계 | `작업관리/POSITION_RECALL_AND_SAVE_REDESIGN.md` |
| 코드 스냅샷 | `작업관리/6_CURRENT_CODE_SNAPSHOT_SUMMARY.md` |
| 계산 규칙 | `작업관리/4_CALCULATION_RULES.md` |
| 시스템 구조 | `작업관리/3_SYSTEM_ARCHITECTURE.md` |

---

## 8. 주요 파일 경로

| 구분 | 경로 |
|------|------|
| Reflection 엔진 | `frontend/src/domain/reflectionEngine.ts` |
| HP/T 컨트롤러 | `frontend/src/admin/hpt/useHptController.ts` |
| 메인 앱 | `frontend/src/App.jsx` |
| Anchor 포인트 | `frontend/src/components/table/AnchorPoint.jsx` |
| 시스템 라벨 | `frontend/src/components/table/SystemValueLabels.jsx` |
| 슬롯 자동 추천 | `frontend/src/admin/slotAutoRecommend.ts` |
| KD-Tree 인덱스 | `frontend/src/domain/search/positionKDIndex.ts` |
| 병합 엔진 | `frontend/src/domain/positionMergeEngine.ts` |

---

## 9. 기술 상세 (구현 시 참고)

### 9.1 Weighted Distance (slotAutoRecommend.ts)
```ts
CUE_W = 2.0, TARGET_W = 1.5, SECOND_W = 1.0
weightedDistance(a, b) = CUE_W·Δcue² + TARGET_W·Δtarget² + SECOND_W·Δsecond²
```

### 9.2 normalizeBallsToBall3
- `target` 없으면 `target_center` 사용, 둘 다 없으면 기본값
- `slotAutoRecommend.ts`에 정의됨

### 9.3 localStorage 키
| 키 | 용도 |
|----|------|
| `ANCHORS_OVERRIDE_V1` | anchor override (적용 시 저장) |
| `workspace_history` | WorkspaceSnapshot[] (SAVE/적용 시 push) |
| `positions_dataset` | PositionRecord[] (handleSaveStrategy 시) |

### 9.4 WorkspaceSnapshot 구조
```ts
{
  id: string; name: string; systemId: string; pattern: string;
  version: number; timestamp: string; exported?: boolean;
  state: { adminState, ballsState, dataset, shotEditor };
}
```

---

## 10. 데이터 구조 요약

**adminState.anchorsOverride:**
```ts
{ [key: string]: { x: number; y: number } }  // key: "CO", "1C", "2C" 등
```

**currentTip (reflectionEngine 전달):**
```ts
// TIP 모드
{ count: 1|2|3|4, side: "L"|"R" }

// SPIN 모드
{ hp: { x, y }, side: "L"|"R" }
```

**Ball3 (dataset):**
```ts
{ cue: {x,y}, target: {x,y}, second: {x,y} }
```

---

## 11. 주의사항

- **Recall:** 자동 적용 금지. 반드시 검증 후 확인 적용
- **Export:** History → Unexported → 선택 snapshot만. File System API 사용
- **AUTO SAVE:** 적용 시에만 저장 (입력 중 저장 금지)
- **anchor round1:** 입력, 저장, export 직전 모두 적용

---

## 12. 주요 파일 (추가)

| 구분 | 경로 |
|------|------|
| Workspace History | `frontend/src/domain/workspaceHistory.ts` |
| History 모달 | `frontend/src/components/WorkspaceHistoryModal.jsx` |
| Position Recall | `frontend/src/domain/positionRecallEngine.ts` |

---

*이관 문서 작성일: 2026-03 | 최종 업데이트: 2026-03-19*
