# Workspace History 구현 결과 보고서

**작성일:** 2026-03-19  
**목적:** SAVE 시 스냅샷 누적 저장, 리스트에서 선택하여 복원

---

## 1. 생성 파일

| 파일 | 설명 |
|------|------|
| `frontend/src/domain/workspaceHistory.ts` | UUID, version, name 생성 및 history CRUD |
| `frontend/src/components/WorkspaceHistoryPanel.jsx` | 스냅샷 리스트 UI (복원/삭제) |

---

## 2. 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `frontend/src/App.jsx` | workspaceHistory import, handleSaveWorkspaceSnapshot, handleLoadWorkspaceSnapshot, handleDeleteWorkspaceSnapshot, WorkspaceHistoryPanel 렌더, SAVE 버튼 연결 |
| `frontend/src/hooks/useShotSlots.ts` | `restoreShotEditor` 액션 추가 |

---

## 3. localStorage 구조

| 키 | 용도 |
|----|------|
| `workspace_current` | (예약, 미사용) |
| `workspace_history` | WorkspaceSnapshot[] 배열 |

---

## 4. WorkspaceSnapshot 구조

```ts
type WorkspaceSnapshot = {
  id: string;           // uuid
  name: string;         // 뒤돌리기_5_half_system_v003_2026-03-19
  systemId: string;
  pattern: string;
  version: number;
  timestamp: string;    // ISO
  state: AppState;
};

type AppState = {
  adminState: any;
  ballsState: any;
  dataset: any[];
  shotEditor: { activeSlot, slots };
};
```

---

## 5. 스냅샷 이름 예시

```
뒤돌리기_5_half_system_v001_2026-03-19
뒤돌리기_5_half_system_v002_2026-03-19
옆돌리기_rodriguez_v001_2026-03-19
```

---

## 6. UI 구성

- **Workspace History Panel**: ADMIN 모드 시 테이블 오른쪽 상단에 표시
- **SAVE 버튼**: 스냅샷 생성 → `workspace_history`에 push
- **Save Strategy 버튼**: 기존 handleSaveStrategy (dataset upsert)
- **스냅샷 행 클릭**: `loadWorkspaceSnapshot(id)` 실행
- **삭제 버튼**: 해당 스냅샷 제거

---

## 7. 복원 방식

`handleLoadWorkspaceSnapshot(id)` 동작:

1. `workspace_history`에서 id로 스냅샷 검색
2. `snapshot.state`로 전체 상태 overwrite:
   - `setAdminState(s.adminState)`
   - `setBallsState(s.ballsState)`
   - `setDataset(s.dataset)`
   - `localStorage.setItem("positions_dataset", ...)`
   - `actions.restoreShotEditor(s.shotEditor)`

**주의:** `applyPositionRecall`과 다름. 전체 상태를 덮어씀.

---

## 8. workspaceHistory.ts 함수

| 함수 | 설명 |
|------|------|
| `generateUUID()` | UUID v4 생성 |
| `getNextVersion(history, systemId, pattern)` | 동일 systemId+pattern 기준 다음 버전 |
| `buildSnapshotName(pattern, systemId, version, timestamp?)` | 표시 이름 생성 |
| `loadWorkspaceHistory()` | localStorage에서 배열 로드 |
| `saveWorkspaceHistory(history)` | localStorage에 저장 |
| `findSnapshotById(history, id)` | ID로 스냅샷 찾기 |
| `deleteSnapshotById(id)` | ID로 스냅샷 삭제 후 저장 |

---

## 9. Export 연동 준비

스냅샷에 포함된 필드:

- `systemId`
- `pattern`
- `version`
- `state` (adminState, ballsState, dataset, shotEditor)

Export 시 `snapshot` 기반으로 파일 생성 가능.

---

## 10. 테스트 체크리스트

- [ ] SAVE 클릭 → 스냅샷 생성됨
- [ ] 여러 개 저장됨
- [ ] 리스트에 최신순 표시됨
- [ ] 클릭 시 상태 복원됨
- [ ] version 자동 증가 (동일 systemId+pattern)
- [ ] 이름 규칙 정상 (pattern_systemId_vNNN_YYYY-MM-DD)
- [ ] 삭제 버튼 동작
