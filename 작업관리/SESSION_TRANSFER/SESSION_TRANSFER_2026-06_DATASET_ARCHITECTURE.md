# SESSION TRANSFER — Dataset Architecture (2026-06)

Version: v1.0  
Created: 2026-06-05  
Scope: Dataset 계층 설계 · Phase 1 Export 구현 · Export 범위 분석 · 후속 Phase 계획  

**읽는 순서 (신규 세션 온보딩):**

1. `../PROJECT_MASTER_INDEX.md` — 프로젝트 전체 현재 상태 SSOT  
2. `../HISTORY/PROJECT_LOG_2026-06.md` — 2026-06 월별 작업 이력 (본 작업 요약 포함)  
3. **본 문서** — Dataset Architecture 전용 이관 문서  

**관련 코드 SSOT:**

| 역할 | 경로 |
|------|------|
| Export 변환 | `frontend/src/domain/datasetExport.ts` |
| Export 경로 | `frontend/src/domain/datasetPath.ts` |
| Export 실행 | `frontend/src/hooks/useSettings.js` |
| History UI Export | `frontend/src/components/WorkspaceHistoryModal.jsx` |
| Snapshot 저장 | `frontend/src/hooks/useSettings.js` → `commitWorkspaceHistoryWithStrategyDataset` |
| SAVE → dataset 갱신 | `frontend/src/App.jsx` → `handleSaveStrategy` |
| Recall (현재) | `frontend/src/domain/recall/recallEngine.ts` — **아직 `positions_dataset` 사용** |

---

## 1. 작업 배경

### 1.1 기존 구조

| 저장소 | 위치 | 역할 |
|--------|------|------|
| **positions_dataset** | localStorage | 작업 중 포지션·전략 누적 데이터 |
| **workspace_history** | localStorage | SAVE 시점 스냅샷 (adminState, ballsState, embedded dataset 등) |

**기존 동작:**

- **ADMIN Search** — `positions_dataset` 기반 공간 검색 (`runSpatialRecall`)  
- **USER Search** — 동일하게 `positions_dataset` 기반  
- **Recall** — 동일하게 `positions_dataset` 기반  
- **Export** — History 스냅샷을 `WorkspaceSnapshot` 형태로 파일 저장 (published 형식 아님)

Recall과 Search가 **같은 working dataset**을 공유하여 역할이 혼재되어 있었다.

### 1.2 문제점

1. **Recall과 Search 역할 혼재** — 둘 다 `positions_dataset`(작업 데이터)를 읽음  
2. **Export와 작업 데이터 미분리** — Export 결과가 published dataset 표준이 아니었음  
3. **USER가 Published Dataset 사용 불가** — GitHub/파일 기반 사용자 데이터 경로 없음  
4. **운영·테스트 데이터 혼재** — working dataset에 테스트 record가 쌓이면 Export에도 포함됨  

### 1.3 목표 (Dataset Architecture)

작업 데이터(Working)와 배포 데이터(Published)를 분리하고, Search/Recall/Reset 의미를 재정의한다.

---

## 2. 최종 데이터 계층 구조

```
┌─────────────────────────────────────────────────────────────┐
│  Working Dataset                                            │
│  positions_dataset (localStorage)                           │
│  용도: ADMIN 작업용                                          │
│  사용: ADMIN Search                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Workspace History                                          │
│  workspace_history (localStorage)                           │
│  용도: 작업 이력 (스냅샷)                                    │
│  사용: History UI (Load / Delete / Export)                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Published Dataset                                          │
│  dataset/ (파일 시스템)                                      │
│  용도: 사용자용·배포용 데이터                                  │
│  사용 (목표): ADMIN Recall, USER Search                     │
│  사용 (현재): Export만 — Loader 미구현                       │
└─────────────────────────────────────────────────────────────┘
```

| 계층 | SSOT | 현재 소비자 | 목표 소비자 |
|------|------|-------------|-------------|
| Working | `positions_dataset` | ADMIN Search, Recall, USER Search | ADMIN Search만 |
| History | `workspace_history` | History 모달 | 동일 |
| Published | `dataset/{공략}/{시스템}/positions.json` | (없음 — Export만 생성) | ADMIN Recall, USER Search |

---

## 3. Search / Recall / Reset 최종 정의

> **주의:** 아래는 **목표 정책**이다. Phase 1은 Export만 구현했으며 Recall/Search 전환은 **미완료**.

### 3.1 ADMIN Search

- **데이터:** `positions_dataset`  
- **의미:** 최근 작업 데이터 검색 (working corpus)  
- **현재 상태:** ✅ 기존과 동일 (`runSpatialRecall` on localStorage)

### 3.2 ADMIN Recall

- **데이터:** Published Dataset (`dataset/`)  
- **의미:** Export 완료·검증된 데이터 조회  
- **현재 상태:** ❌ 아직 `positions_dataset` 사용 (Phase 2 대상)

### 3.3 USER Search

- **데이터:** Published Dataset (`dataset/` 또는 GitHub manifest)  
- **의미:** 사용자 위치 기반 검색  
- **현재 상태:** ❌ 아직 `positions_dataset` 사용 (Phase 3 대상)

### 3.4 Reset

**초기화가 아님** — 조회 세션 종료.

| 유지 | 제거 |
|------|------|
| 공 위치 | search session |
| SYS | recall session |
| trajectory | display metadata (검색 결과 오버레이 등) |

**현재 상태:** UX 정의 확정 수준. `clearSearchSlotRuntime` 등 일부 USER reset 경로는 미정비 (별도 이슈).

---

## 4. Dataset Export 구조 (Phase 1 — 구현 완료)

### 4.1 Export 경로

```
dataset/{공략명}/{시스템명}/positions.json
```

**예시:**

```
dataset/
└─ 뒤돌리기/
   └─ 파이브앤하프/
      └─ positions.json
```

- **공략명** = `snapshot.pattern` (shotType, 예: `뒤돌리기`)  
- **시스템명** = `systemIdToFolderLabel(systemId)` (예: `5_half_system` → `파이브앤하프`)  
- 폴더 없으면 `getDirectoryHandle(..., { create: true })`로 **자동 생성**

### 4.2 Export 파일 envelope

```json
{
  "schemaVersion": 2,
  "shotType": "뒤돌리기",
  "systemId": "5_half_system",
  "systemLabel": "파이브앤하프",
  "exportedAt": "2026-06-05T12:00:00.000Z",
  "sourceSnapshotId": "<uuid>",
  "records": [ /* PositionRecord[] */ ]
}
```

- `schemaVersion`: `DATASET_EXPORT_SCHEMA_VERSION = 2` (`datasetPath.ts`)  
- `records`: 필터된 `PositionRecord` 배열 (WorkspaceSnapshot envelope 아님)

### 4.3 UI / 실행 흐름

- History 모달 **Export 버튼 1개** 유지  
- 내부적으로 **Dataset Export** 수행 (`handleExportSnapshots` → `saveDatasetExportToFile`)  
- 폴더 선택: `showDirectoryPicker` — **user activation** 유지를 위해 picker를 첫 `await`로 호출 (alert 선행 제거)  

**호출 체인:**

```
WorkspaceHistoryModal.handleExport(ids)
  → handleExportSnapshots(ids)          [useSettings.js]
      → resolveExportRootDir()          // 폴더 picker (첫 await)
      → for each snapshot:
            saveDatasetExportToFile(snap, rootDir)
              → buildDatasetExport(snapshot)
              → normalizeDatasetExport(...)
              → write dataset/{shotType}/{systemLabel}/positions.json
      → updateSnapshotsExported(ids)
```

### 4.4 구현 파일

| 파일 | 함수/상수 | 역할 |
|------|-----------|------|
| `domain/datasetPath.ts` | `buildDatasetExportPathSegments`, `systemIdToFolderLabel` | 경로 SSOT |
| `domain/datasetExport.ts` | `buildDatasetExport`, `filterRecordsForDatasetExport` | 변환·필터 |
| `hooks/useSettings.js` | `saveDatasetExportToFile`, `handleExportSnapshots` | 파일 쓰기·루프 |
| `components/WorkspaceHistoryModal.jsx` | `handleExport` | `await onExport(ids)` |

### 4.5 다중 스냅샷 Export

동일 `shotType` + `systemId` 조합이면 **같은 `positions.json` 경로**에 쓰여 **마지막 스냅샷이 덮어씀**.  
병합(append) 로직 없음.

---

## 5. 현재 Export 동작 분석 결과

### 5.1 Export 단위 (코드 기준 확정)

```
선택 Snapshot 1건
        ↓
snapshot.state.dataset          ← SAVE 시점 전체 positions_dataset 복사본
        ↓
normalizeDatasetFromStorage
        ↓
filterRecordsForDatasetExport(systemId, shotType)
        ↓
payload.records[] → positions.json
```

**판정:**

| 선택지 | 해당 |
|--------|------|
| A. Snapshot 1개 → PositionRecord 1개 | ❌ |
| B. Snapshot 1개 → state.dataset 전체 (무필터) | ❌ |
| **C. Snapshot 1개 → state.dataset 중 systemId+shotType 필터** | **✅** |

즉 **Position 1건 Export가 아니라 Dataset Export**이다.

### 5.2 스냅샷에 전체 dataset이 embed되는 이유

SAVE 시 `handleSaveStrategy`가 `upsertPositionRecord`로 **한 position만 갱신**하지만, History commit 시 **갱신된 전체 배열**을 스냅샷에 저장한다.

```javascript
// useSettings.js — commitWorkspaceHistoryWithStrategyDataset
state: {
  ...
  dataset: JSON.parse(JSON.stringify(strategyUpdatedDataset)),  // 전체 positions_dataset
}
```

Export는 이 embedded array를 읽는다 (`buildDatasetExport` → `snapshot.state?.dataset`).

### 5.3 필터 규칙 (`filterRecordsForDatasetExport`)

각 `PositionRecord`의 S1/S2/S3 strategy에 대해:

1. `signature.systemId` === export `systemId` (canonical: `5_HALF` → `5_half_system`)  
2. `signature.shotType` === export `shotType` **또는** legacy (`default`, `_`, 빈 값) → shotType 조건 통과  

조건 맞는 slot이 1개 이상이면 **해당 record 전체**(balls 좌표 + 필터된 strategies)가 export에 포함된다.

### 5.4 디버그 관측 포인트 (미구현 — 분석용)

런타임 로그 추가 시 확인할 값:

| 항목 | 의미 |
|------|------|
| `selectedSnapshotIds.length` | 선택 스냅샷 수 |
| `snapshot.state.dataset.length` | embed된 working dataset 크기 |
| `filteredRecords.length` | 필터 후 record 수 |
| `datasetExport.records.length` | 최종 저장 record 수 |

현재 `saveDatasetExportToFile`에는 `recordCount`만 `console.log`됨.

### 5.5 Recall 저장소 관점 판정

- Published file에 **다수 PositionRecord** — spatial recall corpus로는 **정상**  
- **「스냅샷 1개 = record 1개」** 기대와는 **불일치** (기능 갭이지 recall 품질 버그는 아님)

---

## 6. 테스트 데이터 이슈

### 6.1 현상

`positions_dataset`에 남아 있는 **테스트·실험용 PositionRecord**도 Export 시 함께 포함될 수 있다.

### 6.2 원인

- Export가 **Dataset 단위**(embedded `state.dataset` + signature 필터)로 동작  
- 테스트 데이터도 동일 `systemId` / `shotType`(또는 legacy shotType)을 가지면 필터 통과  

### 6.3 권장 운영 (Export 전)

1. `positions_dataset` 정리 (불필요 record 제거)  
2. `workspace_history` 정리 (오래된·테스트 스냅샷 삭제)  
3. 운영 데이터만 다시 SAVE하여 스냅샷 생성  
4. 이후 Export  

### 6.4 향후 개선 옵션 (미구현)

- Export 시 **해당 SAVE의 positionId/ballsState만** 포함  
- 스냅샷 메타에 `lastSavedPositionId` 저장 후 Export 시 사용  
- `shotType` legacy 통과 조건 강화  

---

## 7. Published Dataset 구조

### 7.1 최종 폴더 레이아웃

```
dataset/
├─ {공략명}/           ← shotType (예: 뒤돌리기, 앞돌리기, …)
│  ├─ {시스템명}/      ← systemLabel (예: 파이브앤하프, 플러스투, …)
│  │  └─ positions.json
│  └─ …
└─ …
```

### 7.2 자동 생성

- 새 공략(shotType) → `dataset/{공략명}/` 생성  
- 새 시스템(systemId) → `dataset/{공략명}/{시스템명}/` 생성  
- `systemIdToFolderLabel` 오버라이드: `5_half_system` → `파이브앤하프` 등 (`datasetPath.ts`)

### 7.3 Recall Loader (Phase 2) 예상

- Export root 또는 GitHub clone에서 `dataset/` 트리 스캔  
- `positions.json` envelope 파싱 → `normalizeDatasetExport`  
- in-memory published corpus로 `runSpatialRecall` 입력 전환  

---

## 8. Spatial Index 계획 (Phase 4)

### 8.1 테이블·셀

| 항목 | 값 |
|------|-----|
| 테이블 | 80 × 40 (논리 단위) |
| Cell 크기 | 10 × 10 |
| Grid | **8 × 4 = 32 cells** |

### 8.2 PositionRecord 확장 (예정)

```typescript
spatialCells?: {
  cue: string;      // cue ball cell id
  target: string;   // target ball cell id
  second: string;   // second ball cell id
}
```

### 8.3 목적

Recall **1차 필터** — 전체 record linear scan 전에 cell bucket으로 후보 축소.

**현재 상태:** 미구현. Export envelope·`positions.json` 단일 파일 구조와 충돌 없음.

---

## 9. Chunk 확장 계획

### 9.1 현재

- 시스템당 **`positions.json` 1개**  
- envelope 내 `records[]` 전체 포함  

### 9.2 향후 (충돌 없는 확장)

```
dataset/뒤돌리기/파이브앤하프/
├─ manifest.json          ← chunk 목록, schemaVersion, 메타
├─ positions_001.json
├─ positions_002.json
└─ …
```

- Loader는 manifest 우선, 없으면 legacy `positions.json` fallback 가능  
- Phase 1 envelope (`schemaVersion: 2`)와 호환 유지  

---

## 10. 현재 완료 상태

### 10.1 Phase 1 완료 ✅

| 항목 | 상태 |
|------|------|
| Dataset Export envelope (`schemaVersion: 2`) | ✅ |
| 경로 `dataset/{공략}/{시스템}/positions.json` | ✅ |
| 폴더 자동 생성 | ✅ |
| History Export → Dataset 구조 전환 | ✅ |
| Export 폴더 picker user activation 수정 | ✅ |
| 단위 테스트 `domain/datasetExport.test.ts` | ✅ |

### 10.2 미완료 ❌

| Phase | 항목 | 상태 |
|-------|------|------|
| 2 | Published Dataset Loader | ❌ |
| 2 | ADMIN Recall → Published Dataset 전환 | ❌ |
| 3 | USER Search → Published Dataset 전환 | ❌ |
| 3 | GitHub manifest 연동 | ❌ |
| 4 | Spatial Index (`spatialCells`, 8×4 grid) | ❌ |
| — | Search/Recall/Reset UX 정책 코드 반영 | ❌ (정의만) |
| — | Export 단위 = 단일 position (선택) | ❌ (정책 미결) |

### 10.3 Phase 1에서 의도적으로 변경하지 않은 것

- `runSpatialRecall` / Recall 엔진  
- USER·ADMIN Search 입력 소스 (`positions_dataset`)  
- Import 경로  
- `positions_dataset` SAVE·merge 로직  

---

## 11. 다음 작업 우선순위

### Phase 2 — Published Dataset Loader (최우선)

**목표:**

```
ADMIN Recall
  positions_dataset (localStorage)
        ↓
  Published Dataset (dataset/ 파일)
```

**작업 항목 (초안):**

1. `dataset/` 디렉터리 로드 API (File System Access / static import / GitHub)  
2. `normalizeDatasetExport`로 envelope 통합  
3. Recall 엔진 입력을 published corpus로 스위치 (feature flag 권장)  
4. Working vs Published 소스 표시 (ADMIN UI)  

### Phase 3 — USER Search 전환

- Published Dataset + (선택) GitHub manifest  
- USER는 working `positions_dataset` 비접근  

### Phase 4 — Spatial Index

- Save/Export 시 `spatialCells` 계산·persist  
- Recall 1차 cell bucket 필터  

### 부가 (정책·UX)

- Search = History, Recall = Dataset, Reset = session close — UI 라벨·핸들러 정합  
- Export 범위 정책 결정 (full filtered dataset vs single position)  

---

## 부록 A. Export 관련 버그 수정 이력

| 이슈 | 원인 | 수정 |
|------|------|------|
| Export 클릭 시 폴더 picker 미표시 | `alert()`가 user activation 소비 후 `showDirectoryPicker` 호출 | `resolveExportRootDir()`를 첫 `await`로 이동, picker 전 alert 제거 |

---

## 부록 B. 관련 테스트

- `frontend/src/domain/datasetExport.test.ts` — `buildDatasetExport`, `filterRecordsForDatasetExport`, path segment 연동  

---

*End of SESSION_TRANSFER_2026-06_DATASET_ARCHITECTURE*
