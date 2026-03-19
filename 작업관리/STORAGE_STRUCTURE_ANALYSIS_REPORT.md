# 저장 구조 분석 보고서 — 관리자 작업본 vs 사용자 배포본 분리 설계

**작성일:** 2026-03  
**목적:** 저장 구조를 "관리자 작업본"과 "사용자 배포본"으로 분리 설계하기 위한 코드 기반 분석

---

## [1단계] 코드 기반 분석 결과

### 1. handleSaveStrategy

| 항목 | 내용 |
|------|------|
| **UI 이름** | SAVE 버튼 |
| **핸들러 함수** | `handleSaveStrategy(aiOverride = null)` |
| **읽는 데이터** | `slot.applied` (sys, hpt, str, ai), `adminState.balls`, `dataset` |
| **쓰는 데이터** | `dataset` (PositionRecord[]), `localStorage["positions_dataset"]` |
| **localStorage key** | `positions_dataset` |
| **USER 영향 여부** | 간접 (dataset → recommendForUser 등) |
| **현재 의미** | 현재 슬롯의 applied 데이터를 StrategyEntry로 변환 후 dataset에 upsert, localStorage 저장 |
| **문제점** | anchorsOverride 미포함. 관리자 보정 anchor가 dataset/export에 반영되지 않음 |

---

### 2. positions_dataset

| 항목 | 내용 |
|------|------|
| **UI 이름** | (버튼 없음, 내부 상태) |
| **핸들러 함수** | `useState` 초기화, `handleSaveStrategy`, `handleFileImport` |
| **읽는 데이터** | `localStorage.getItem("positions_dataset")` |
| **쓰는 데이터** | `PositionRecord[]` (balls + strategies[]) |
| **localStorage key** | `positions_dataset` |
| **USER 영향 여부** | 있음 (recommendForUser, KD-tree 추천) |
| **현재 의미** | 관리자 저장 전략 데이터셋. balls 배치별 StrategyEntry 목록 |
| **문제점** | anchorsOverride와 분리 저장. USER 배포 시 anchor 보정 누락 |

---

### 3. ANCHORS_OVERRIDE_V1

| 항목 | 내용 |
|------|------|
| **UI 이름** | (버튼 없음, Anchor Edit Overlay 적용 시) |
| **핸들러 함수** | `useState` 초기화, `useEffect` (adminState.anchorsOverride 변경 시) |
| **읽는 데이터** | `localStorage.getItem("ANCHORS_OVERRIDE_V1")` |
| **쓰는 데이터** | `{ [key: string]: { x: number, y: number } }` |
| **localStorage key** | `ANCHORS_OVERRIDE_V1` |
| **USER 영향 여부** | 없음 (USER는 display.anchors 사용) |
| **현재 의미** | 관리자 anchor 좌표 보정값. ADMIN 렌더 시 base + override 병합 |
| **문제점** | positions_dataset과 독립. Export 시 포함되지 않음 |

---

### 4. anchorsOverride

| 항목 | 내용 |
|------|------|
| **UI 이름** | Anchor Edit Overlay (적용 버튼) |
| **핸들러 함수** | `onApply` (AnchorEditOverlay), `useEffect` (localStorage sync) |
| **읽는 데이터** | `adminState.anchorsOverride`, `allAnchors[key].coord` |
| **쓰는 데이터** | `adminState.anchorsOverride`, `localStorage["ANCHORS_OVERRIDE_V1"]` |
| **localStorage key** | `ANCHORS_OVERRIDE_V1` |
| **USER 영향 여부** | 없음 |
| **현재 의미** | anchor별 override 좌표. CO, 1C, 2C 등 키로 저장 |
| **문제점** | base와 분리. published export 시 merged 최종값 필요 |

---

### 5. localStorage.getItem / setItem 전체 사용처

| 위치 | key | 용도 |
|------|-----|------|
| App.jsx (useState 초기화) | `ANCHORS_OVERRIDE_V1` | anchorsOverride 로드 |
| App.jsx (useEffect) | `ANCHORS_OVERRIDE_V1` | anchorsOverride 저장/삭제 |
| App.jsx (useState 초기화) | `positions_dataset` | dataset 로드 |
| App.jsx (handleFileImport) | `positions_dataset` | Import 시 덮어쓰기 |
| App.jsx (handleSaveStrategy) | `positions_dataset` | SAVE 시 저장 |
| App.jsx | `ONE_POINT_LESSON_LIBRARY_V1` | 원 포인트 레슨 라이브러리 |
| useShotSlots.ts | `shot_${slotId}` | 슬롯별 shot 저장 (별도 흐름) |
| useShotSlots.ts | `lastSavedShotId` | 최근 저장 shot ID |

---

### 6. SAVE / Export / Import / 파일 연결 버튼

| UI 이름 | 핸들러 함수 | 읽는 데이터 | 쓰는 데이터 | localStorage key | USER 영향 | 현재 의미 | 문제점 |
|---------|-------------|-------------|-------------|------------------|-----------|-----------|--------|
| **SAVE** | `handleSaveStrategy` | slot.applied, adminState.balls, dataset | dataset | positions_dataset | 간접 | dataset에 StrategyEntry upsert 후 localStorage 저장 | anchorsOverride 미포함 |
| **Export** | 인라인 onClick | dataset | (파일 다운로드) | 없음 | 없음 | `{ version, dataset }` JSON 다운로드 (dataset.json) | anchorsOverride 미포함, USER용 published 형식 아님 |
| **Import** | `handleImportDataset` → `handleFileImport` | (파일 선택) | dataset, localStorage | positions_dataset | 있음 | JSON 파일 → dataset 덮어쓰기, localStorage 갱신 | workspace vs published 구분 없음 |
| **파일 연결** | `initFileHandle` | (없음) | fileHandle (File System Access API) | 없음 | 없음 | Save File Picker로 파일 핸들 확보. Auto Save 시 해당 파일에 저장 | Import 없음, 단방향만 |

---

### 7. adminState 초기화 및 복원 흐름

| 단계 | 동작 |
|------|------|
| **초기화** | `useState(() => { ... })` — anchorsOverride는 localStorage에서 로드, 나머지(sys, hpt, str, ai, balls)는 기본값 |
| **activeSlot 변경** | `useEffect` — `applied?.sys`, `applied?.hpt`, `applied?.str`, `applied?.ai`로 sys/hpt/str/ai만 갱신. **anchorsOverride는 갱신하지 않음** |
| **복원** | anchorsOverride만 localStorage에서 복원. slot별 anchorsOverride 없음 (전역 1개) |

**문제점:** anchorsOverride가 slot/시나리오와 무관하게 전역. 슬롯별 보정 불가.

---

### 8. anchor edit overlay 저장 시 round1 적용 여부

| 항목 | 내용 |
|------|------|
| **적용 여부** | ✅ 적용됨 |
| **위치** | `onApply` 콜백 내 `round1(x)`, `round1(y)` |
| **정의** | `round1 = (v) => Math.round(Number(v) * 10) / 10` |

---

### 9. USER 렌더링 시 anchor 데이터 소스

| 모드 | rawAnchors 소스 | override 적용 |
|------|-----------------|---------------|
| **USER** | `display.anchors` (view.ui.anchors) | ❌ 미적용 |
| **ADMIN** | `getAnchorsForRendering` + `convertCanonicalAnchors` | ✅ `anchors = { ...base, ...override }` |

**결론:** USER는 JSON의 `ui.anchors`만 사용. anchorsOverride는 ADMIN 전용.

---

### 10. AiOverlay "전체 적용"과 SAVE 버튼의 관계

| 항목 | 내용 |
|------|------|
| **전체 적용 동작** | `onSave(newData)` + `onSaveStrategy?.(newData)` 동시 호출 |
| **onSave** | `setAdminState`, `applyAiToSlot` — adminState.ai 및 slot.applied.ai 갱신 |
| **onSaveStrategy** | `handleSaveStrategy(newData)` — newData를 aiOverride로 사용해 createStrategyEntry 호출 |
| **관계** | "전체 적용" = Overlay 적용 + dataset SAVE를 한 번에 수행 |
| **SAVE 버튼** | Overlay 없이 `handleSaveStrategy()` 호출 (aiOverride=null → applied.ai 사용) |

---

## A. 현재 저장 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        현재 저장 흐름                                     │
└─────────────────────────────────────────────────────────────────────────┘

[관리자 작업]
     │
     ├─ SYS/HPT/STR/AI Overlay "적용"
     │       │
     │       └─► slot.applied 갱신 (메모리)
     │
     ├─ AiOverlay "전체 적용"
     │       │
     │       ├─► slot.applied.ai 갱신
     │       └─► handleSaveStrategy(newData) ──► dataset ──► positions_dataset
     │
     ├─ SAVE 버튼
     │       │
     │       └─► handleSaveStrategy() ──► dataset ──► positions_dataset
     │
     ├─ Anchor Edit "적용"
     │       │
     │       └─► adminState.anchorsOverride ──► ANCHORS_OVERRIDE_V1
     │
     └─ Export 버튼
             │
             └─► { version, dataset } ──► dataset.json 다운로드
                   (anchorsOverride 미포함)

[localStorage]
     │
     ├─ positions_dataset  ← dataset (PositionRecord[])
     ├─ ANCHORS_OVERRIDE_V1 ← anchorsOverride
     └─ ONE_POINT_LESSON_LIBRARY_V1

[Auto Save]
     │
     └─ fileHandle 있으면 saveToFile({ version, saved_at, dataset })
         (anchorsOverride 미포함)
```

---

## B. 현재 anchor 보정 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     현재 anchor 보정 흐름                                │
└─────────────────────────────────────────────────────────────────────────┘

[ADMIN 모드]
     │
     ├─ baseAnchors = getAnchorsForRendering(...) 또는 convertCanonicalAnchors(...)
     │
     ├─ override = adminState.anchorsOverride (localStorage 로드)
     │
     ├─ anchors = { ...baseAnchors, ...override }
     │
     └─ allAnchors 표시 (override 우선: CO, 1C 등)

[USER 모드]
     │
     └─ display.anchors (view.ui.anchors) — override 없음

[Anchor Edit Overlay]
     │
     ├─ 더블클릭 → openAnchorEdit(key)
     ├─ X, Y 입력 → round1 적용
     └─ 적용 → setAdminState.anchorsOverride[key] = { x, y }
              → useEffect → localStorage.setItem(ANCHORS_OVERRIDE_V1)
```

---

## [2단계] 설계안 제시

### 1. Workspace 저장 (localStorage)

- **용도:** 관리자 재작업용
- **저장 항목:** anchorsOverride + positions_dataset
- **USER 직접 사용 금지:** USER 모드에서는 workspace localStorage를 읽지 않음

### 2. Published Export (JSON)

- **용도:** USER 적용용 공식 데이터
- **anchor 데이터:** override-only가 아니라 **base + override merged-final 전체 export**
- **파일명:** `{systemId}_anchors_published_v001.json`
- **구조 예시:**
  ```json
  {
    "version": "1.0",
    "systemId": "5_half_system",
    "published_at": "2026-03-17T...",
    "anchors": { "CO": { "x": 40, "y": 0 }, "1C": {...}, "2C": {...}, ... },
    "dataset": [ ... ]
  }
  ```

### 3. 버튼 역할 재정의

| 버튼 | 역할 |
|------|------|
| **SAVE** | 관리자 작업본 저장 (positions_dataset + anchorsOverride → localStorage) |
| **Export** | USER용 공식 JSON 생성 (merged anchors + dataset, 파일 다운로드) |
| **Import** | workspace 또는 published JSON 불러오기 (형식 자동 판별) |
| **파일 연결** | disabled 또는 숨김 검토 (현재 단방향, Import 미지원) |

### 4. 반올림 정책

- anchor 좌표: 소수점 1자리 강제
- 적용 시점: 입력 시, 상태 저장 시, export 직전

---

## [3단계] 실제 수정안 제안

### App.jsx

| 항목 | 내용 |
|------|------|
| **변경 목적** | SAVE 시 anchorsOverride 포함, Export 시 merged anchors 생성 |
| **변경 함수** | `handleSaveStrategy`, Export onClick, `handleFileImport` |
| **추가할 타입/유틸** | `round1` 공통화 (이미 존재), merged anchors 계산 헬퍼 |
| **구조 변경 여부** | 중간 (저장 로직 확장) |
| **PROJECT_MASTER_STATE_CURRENT 전면 재작성** | **권고** (저장 포맷 변경) |

### Anchor edit 관련 컴포넌트

| 항목 | 내용 |
|------|------|
| **변경 목적** | round1 적용 유지, 구조 변경 최소화 |
| **변경 함수** | 없음 (이미 round1 적용됨) |
| **추가할 타입/유틸** | 없음 |
| **구조 변경 여부** | 없음 |
| **PROJECT_MASTER_STATE_CURRENT 전면 재작성** | 불필요 |

### admin/save 관련 파일

| 항목 | 내용 |
|------|------|
| **변경 목적** | workspace 저장 시 anchorsOverride 포함, published export 형식 지원 |
| **변경 함수** | (adminSaveEngine 또는 신규 모듈에서) export 포맷 생성 |
| **추가할 타입/유틸** | `WorkspacePayload`, `PublishedPayload` 타입 |
| **구조 변경 여부** | 있음 (저장 포맷 확장) |
| **PROJECT_MASTER_STATE_CURRENT 전면 재작성** | **권고** |

### domain 저장 엔진 (adminSaveEngine 또는 신규 persistence 모듈)

| 항목 | 내용 |
|------|------|
| **변경 목적** | workspace vs published 분리, merged anchors 계산 |
| **변경 함수** | `createWorkspacePayload`, `createPublishedPayload`, `parseImportPayload` |
| **추가할 타입/유틸** | `WorkspacePayload`, `PublishedPayload`, `roundAnchors` |
| **구조 변경 여부** | 있음 (신규 모듈 또는 adminSaveEngine 확장) |
| **PROJECT_MASTER_STATE_CURRENT 전면 재작성** | **권고** |

### Import/Export 버튼 UI 파일

| 항목 | 내용 |
|------|------|
| **변경 목적** | Import 형식 판별, Export 파일명 정책 적용 |
| **변경 함수** | `handleFileImport`, Export onClick |
| **추가할 타입/유틸** | `isWorkspaceFormat`, `isPublishedFormat` |
| **구조 변경 여부** | 있음 (Import 분기) |
| **PROJECT_MASTER_STATE_CURRENT 전면 재작성** | **권고** |

---

## [판정] PROJECT_MASTER_STATE_CURRENT 전면 재작성 필요 여부

**⚠ 저장 포맷 변경 가능성이 있으므로, 실제 코드 수정 전에 PROJECT_MASTER_STATE_CURRENT 전면 재작성을 권고합니다.**

**이유:**
1. 저장 포맷 변경 (workspace vs published)
2. dataset 구조 확장 (anchorsOverride 또는 merged anchors 포함)
3. Import/Export 로직 변경
4. localStorage 키/구조 변경 가능성

---

*최종 업데이트: 2026-03*
