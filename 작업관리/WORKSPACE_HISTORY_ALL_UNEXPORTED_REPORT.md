# Workspace History All vs Unexported 재구성 결과 보고서

**작성일:** 2026-03-19  
**목적:** 탭 구조, Export/Delete 통합

---

## 1. 변경된 파일 목록

| 파일 | 변경 내용 |
|------|------------|
| `frontend/src/domain/workspaceHistory.ts` | exported 필드, deleteOldest30, updateSnapshotsExported, downloadSnapshotAsJson |
| `frontend/src/App.jsx` | SAVE 시 exported: false, handleDeleteOldest30, handleExportSnapshots |
| `frontend/src/components/WorkspaceHistoryModal.jsx` | 탭 구조, 체크박스, Delete 30개, Export 버튼 |

---

## 2. 추가된 state 구조

### WorkspaceHistoryModal
```js
const [tab, setTab] = useState("all");           // "all" | "unexported"
const [selectedIds, setSelectedIds] = useState([]);  // Export 대상 ID 목록
```

### 데이터 필터링
```js
const allList = history (최신순)
const unexportedList = history.filter(h => !h.exported)
const currentList = tab === "all" ? allList : unexportedList
```

---

## 3. exported 필드 동작 방식

| 시점 | 동작 |
|------|------|
| **SAVE** | `snapshot.exported = false` |
| **Export** | 선택 스냅샷에 대해 JSON 다운로드 후 `snapshot.exported = true` |
| **기존 데이터** | loadWorkspaceHistory 시 `exported === true` 아니면 false로 마이그레이션 |

---

## 4. Export 흐름

1. Unexported 탭에서 체크박스로 스냅샷 선택
2. [ 전체 선택 ] 클릭 시 현재 리스트 전체 선택
3. [ Export ] 클릭
4. `handleExportSnapshots(selectedIds)` 호출
5. 각 snapshot에 대해:
   - `downloadSnapshotAsJson(snap)` → `{systemId}_{pattern}_v{version}_{timestamp}.json` 다운로드
   - 새 파일 생성 (덮어쓰기 없음, 파일명에 timestamp 포함)
6. `updateSnapshotsExported(ids)` → localStorage에 exported: true 반영
7. `setWorkspaceHistoryVersion` → UI 갱신
8. `selectedIds` 초기화

---

## 5. Delete 흐름

### Delete 30개 (All 탭)
1. [ Delete N개 ] 클릭 (N = min(30, 전체 개수))
2. confirm("가장 오래된 N개를 삭제하시겠습니까?")
3. `deleteOldest30()`:
   - 최신순 정렬
   - 마지막 30개(가장 오래된) ID 수집
   - history에서 해당 ID 제거
   - localStorage 저장
4. `setWorkspaceHistoryVersion` → UI 갱신
5. `selectedIds` 초기화

### 개별 삭제 (❌ 삭제)
- 기존 `handleDeleteWorkspaceSnapshot(id)` 유지

---

## 6. UI 구성

| 영역 | All 탭 | Unexported 탭 |
|------|--------|---------------|
| **리스트** | [ 체크박스(비활성) ] [ 이름 ] [ ❌ 삭제 ] | [ 체크박스 ] [ 이름 ] [ ❌ 삭제 ] |
| **전체 선택** | - | [ 전체 선택 ] |
| **Footer** | [ Delete N개 ] [ 닫기 ] | [ Export ] [ 닫기 ] |

---

## 7. 테스트 체크리스트

- [ ] SAVE → Unexported에 나타남
- [ ] Export → Unexported에서 사라짐
- [ ] All에는 계속 존재
- [ ] Delete 30개 → 오래된 것 제거됨
- [ ] 체크박스 선택 정상
- [ ] 전체 선택 정상
- [ ] row 클릭 → 복원
