# 3Cushion AI — 전체 세션 작업 요약 (2026-03)

> 새 채팅에 그대로 붙여넣기용 컨텍스트 문서

---

## 1. 목표

### 1.1 C2 Reflection & Spin Calibration
- C2 반사 노드 안정화
- HP/T 입력 구조 버그 수정 (r → tipCount)
- spin 과대 적용 해결 (TIP_TO_DELTA_DEG 현실값)
- joystick spin → tip equivalent 보간 도입
- anchor 직접 편집 시스템 도입

### 1.2 저장 구조 재설계 (설계 단계)
- 관리자 작업본 vs 사용자 배포본 분리
- Import → Position Recall 재정의
- SAVE 3단계 구조 (AUTO SAVE / SAVE / EXPORT)

---

## 2. 현재까지 완료된 부분

### 2.1 HP/T 입력 구조 변경 ✅
- **문제:** r = hypot(hp.x, hp.y) → count = round(r). UI는 항상 r=4 → 모든 tip이 count=4
- **해결:** tipCount를 UI에서 직접 전달. r 기반 계산 제거
- **파일:** useHptController.ts, App.jsx (HptOverlay, currentTip)

### 2.2 TIP_TO_DELTA_DEG 보정 ✅ (단계적)
- **기존:** 1: 7.125, 2: 14.036, 3: 20.556, 4: 26.565
- **중간:** 1: 5, 2: 10, 3: 14, 4: 20
- **현재 (2026-03-28):** 1: 5, 2: 10, 3: **13**, 4: **18** (3·4팁 과보정 완화, 테이블 값만)
- **파일:** reflectionEngine.ts

### 2.3 Joystick Spin → Tip Equivalent ✅
- SPIN_TO_TIP_EQUIV: 0→0, 1.4→0.9, 2.8→1.9, 3.6→3.0, 4.0→4.0
- mapSpinToTip, getDeltaFromSpin 함수 추가
- resolveSignedSpinDeg: tip.hp 있으면 joystick 경로 사용
- **파일:** reflectionEngine.ts, App.jsx (currentTip mode 분기)

### 2.4 SPIN_TO_TIP_EQUIV 미세 보정 ✅
- 1.4/2.8 구간 과다 반영 보정
- **파일:** reflectionEngine.ts

### 2.5 Anchor Direct Edit System ✅
- CO, 1C, 2C, 3C 등 더블클릭 → X/Y 좌표 입력
- anchorsOverride 저장, localStorage (ANCHORS_OVERRIDE_V1)
- 좌표 소수점 1자리 제한 (round1)
- **파일:** App.jsx, AnchorPoint.jsx, SystemValueLabels.jsx

### 2.6 프로젝트 문서 업데이트 ✅
- 6_CURRENT_CODE_SNAPSHOT_SUMMARY.md
- 4_CALCULATION_RULES.md (Spin 공식, Joystick 처리)
- 3_SYSTEM_ARCHITECTURE.md (Anchor Override, Edit Flow)
- SESSION_SUMMARY_2026-03_C2_REFLECTION.md
- 5_PROJECT_MASTER_STATE_CURRENT.md

### 2.7 저장 구조 분석 및 설계 문서 ✅
- STORAGE_STRUCTURE_ANALYSIS_REPORT.md (코드 기반 분석)
- POSITION_RECALL_AND_SAVE_REDESIGN.md (설계안, 미구현)

---

## 3. 아직 남은 작업

### 3.1 Position Recall (진행 중 · 2026-03-28 보강)
- Recall = draft만 적용·balls 고정 정책 유지
- **구현됨:** `buildDraftsFromRecord`에서 `calculateByProfileExpr`로 **`draft.sys.outputs.result` 생성** (과거 공백 시 앵커 lookup 실패 문제 해소)
- Import UX·threshold·단일 트랜잭션 확장 등은 설계 문서 참조

### 3.2 SAVE 3단계 구조 구현
- **AUTO SAVE:** debounce + deepEqual + change flag (3단계 방어)
- **SAVE:** workspace snapshot + 히스토리 (metadata: id, timestamp, systemId, note)
- **EXPORT:** 현재 UI 상태 기준 buildFromCurrentState → published JSON

### 3.3 Published JSON Export
- base + override merged anchors
- 파일명: `{systemId}_anchors_published_v001.json`
- round1 적용

### 3.4 dataset mutation 보호 (선택)
- Recall 후 수동 저장만 dataset 반영

### 3.5 persistenceEngine.ts 신규 모듈
- saveWorkspaceAuto, saveWorkspaceSnapshot
- buildFromCurrentState, createPublishedPayload

---

## 4. 주요 파일 변경사항

### 4.1 코드 수정 완료

| 파일 | 변경 내용 |
|------|----------|
| `reflectionEngine.ts` | TIP_TO_DELTA_DEG, SPIN_TO_TIP_EQUIV, mapSpinToTip, getDeltaFromSpin, TipInput 확장 (hp), resolveSignedSpinDeg |
| `useHptController.ts` | tipCount, setHpFromSystem tipCount 전달, sync/applyHpAndSync |
| `App.jsx` | currentTip (tipCount/hp 분기), anchorsOverride, AnchorEditOverlay, openAnchorEdit, defaultHpt tipCount, round1 (anchor apply) |
| `AnchorPoint.jsx` | onDoubleClick, stopPropagation |
| `SystemValueLabels.jsx` | onAnchorDoubleClick prop |

### 4.2 설계 문서 (신규)

| 파일 | 내용 |
|------|------|
| `STORAGE_STRUCTURE_ANALYSIS_REPORT.md` | handleSaveStrategy, positions_dataset, anchorsOverride 등 코드 분석 |
| `POSITION_RECALL_AND_SAVE_REDESIGN.md` | Position Recall 설계, SAVE 3단계, 5가지 핵심 수정사항 |

### 4.3 수정 금지 파일
- reflectAngle, railNormalAngle, intersectRayWithRail
- branch 선택 로직, track 관련 로직
- TIP_TO_DELTA_DEG (값만 변경 완료, 구조 변경 금지)
- anchorCoordinateEngine, calibrationEngine

---

## 5. 앞으로의 계획 (단계별)

### Phase 1: Position Recall 구현
1. Import 버튼 → Position Recall로 변경
2. `runPositionRecall` 또는 `positionRecallEngine` 구현
3. threshold/softThreshold 검증, confirm 후 적용
4. 단일 트랜잭션 (batch) 적용
5. PositionKDIndex.searchTop1AllSignatures 또는 Weighted 통일

### Phase 2: SAVE 3단계 구조
1. AUTO SAVE: debounce + deepEqual + change flag
2. SAVE: workspace snapshot + 히스토리 스택
3. persistenceEngine.ts 신규 생성
4. WORKSPACE_AUTO_V1, WORKSPACE_HISTORY_V1 키 정의

### Phase 3: EXPORT 재설계
1. buildFromCurrentState (현재 UI 상태 기준)
2. merged anchors (base + override)
3. PublishedPayload 형식, round1 적용
4. 파일 다운로드 `{systemId}_anchors_published_v001.json`

### Phase 4: 정리 및 검증
1. PROJECT_MASTER_STATE_CURRENT 전면 재작성
2. 기존 positions_dataset, ANCHORS_OVERRIDE_V1 마이그레이션
3. USER 모드 Published JSON 로드 구조 확정

---

## 6. 참조 문서

| 문서 | 용도 |
|------|------|
| `SESSION_SUMMARY_2026-03_C2_REFLECTION.md` | C2/Spin/Anchor 요약 |
| `STORAGE_STRUCTURE_ANALYSIS_REPORT.md` | 저장 구조 분석 |
| `POSITION_RECALL_AND_SAVE_REDESIGN.md` | Recall & SAVE 설계 (5가지 핵심 포함) |
| `6_CURRENT_CODE_SNAPSHOT_SUMMARY.md` | 코드 스냅샷 |
| `4_CALCULATION_RULES.md` | Spin 공식, Joystick 처리 |
| `3_SYSTEM_ARCHITECTURE.md` | Anchor Override 구조 |

---

## 7. 현재 상태 요약

- **C2 Reflection:** 정상; Δθ 3=13°·4=18° 1차 튜닝 적용
- **Spin (tip/joystick):** 정상, 일관성 확보
- **Anchor 편집:** 가능 (더블클릭, round1); 렌더 SSOT는 anchors lookup
- **1C 표시:** `allAnchors["1C"]` = `C1_rail` (꺾임점 정합)
- **CO (5_half):** `isBottomCO` 조건부 교점; LEFT 구간 CO_prep 유지
- **Recall:** `outputs.result` 채움으로 궤적 복원
- **저장/Export:** 기존 workspace_history 흐름 유지; 추가 설계 항목은 별도 문서

---

## 8. 2026-03 후반 ~ 03-28 서사 (anchors · geometry · 회귀)

### 8.1 잘못된 가설과 교정
- **가설:** “CO_rail = 항상 CO→1C 직선의 하단 교점”이면 모든 트랙에서 성립한다.
- **교정:** `5_half_system` **B2T_R**에서 CO_f>50은 **LEFT 프레임**으로만 올라가고 하단에 없음. 무조건 `mark:"CO"` + BOTTOM이면 교점이 범위 밖 → `computeRailImpactPoint` 내부 fallback이 1C 쪽으로 붙으며 **CO·2C 전체가 붕괴**.

### 8.2 회귀 원인 추적 (git·코드 대조)
- 과거 안정 패턴: **CO가 Fg 하단 근처일 때만** 하단 교점을 쓰고, 그 외에는 **CO 의미점 유지** (`computeRailPoints` / 인라인 조건과 동일).
- 회귀: `CO_rail`을 **무조건** `computeRailImpactPoint(..., CO)`에 둔 변경.
- **복구:** `App.jsx`에서 `isBottomCO` + 교점 성공 시에만 덮어쓰기.

### 8.3 Recall 버그
- **원인:** draft에 `outputs.result` 없음 → sysValues 불완전 → lookup 실패.
- **복구:** `buildDraftsFromRecord`에서 expr 재실행.

### 8.4 Fg snap / C1 의미
- Fg 점을 레일에 스냅하면 **방향점 의미가 깨짐**; `resolveAnchorPoint`는 통과만 수행.
- **최종 꺾임점**은 **C1_rail** (교점 SSOT).

### 8.5 교점 실패 시 설계 선택 (기록)
- **옵션 A (직선·교점 우선):** 1C는 레일과의 교차를 SSOT로 — **채택**.
- **옵션 B (점 스냅 우선):** 직관적이나 C1_f와 렌더가 이중 기준이 됨 — 비채택.
- **CO:** 교점 **조건부**만; 실패 시 **의미점 유지**를 App 가드로 보장 (`computeRailImpactPoint` 내부 fallback이 CO에 악영향 주지 않도록).

---

*최종 업데이트: 2026-03-28*
