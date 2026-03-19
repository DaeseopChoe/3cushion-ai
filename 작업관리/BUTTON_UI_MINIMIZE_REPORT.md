# 우측 버튼 UI 최소화 및 Auto Save 재구성 결과 보고서

**작성일:** 2026-03-19

---

## 1. 제거된 버튼 목록

| 버튼 | 비고 |
|------|------|
| Admin | Ctrl+Shift+A로 모드 전환 가능 |
| 파일 연결 | 핸들러 유지 |
| Import | 핸들러 유지 |
| Export | History 모달 Unexported 탭으로 이동 |
| Auto Save | 항상 ON으로 고정 |
| Save Strategy | 핸들러 유지 (AI overlay에서 사용) |

---

## 2. 변경된 버튼 구조

```
[ Grid ]
---------------- (marginTop 22px)
[ Recall ]
[ History ]
---------------- (marginTop 22px)
[ SAVE ]
```

- 기본 간격: margin-bottom 14px
- 그룹 간 간격: margin-top 22px

---

## 3. Auto Save 동작 설명

### 변경 전
- Auto Save 버튼으로 ON/OFF 토글
- handleSaveStrategy 시 autoSave가 true면 saveToFile 호출

### 변경 후
- **항상 ON** (`const autoSave = true`)
- **적용 버튼 클릭 시만 저장**
  - SYS / HPT / STR / AI / Anchor overlay에서 "적용" 클릭 시
  - `handleSaveWorkspaceSnapshot(true)` 호출 (silent 모드)
  - 스냅샷 생성 → workspace_history에 push
- **입력 중에는 저장 안 됨**
  - anchorsOverride useEffect 제거 (입력 시 즉시 localStorage 저장 제거)
  - Anchor 적용 시에만 localStorage + snapshot 저장

---

## 4. Export 위치 변경

| 변경 전 | 변경 후 |
|---------|---------|
| 우측 패널 [ Export ] 버튼 | History 모달 → Unexported 탭 → [ Export ] |

- dataset.json 다운로드 버튼 제거
- Export는 WorkspaceHistoryModal Unexported 탭에서만 수행

---

## 5. 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `frontend/src/App.jsx` | 버튼 제거/재배치, autoSave 고정, anchorsOverride useEffect 제거, overlay onSave에 handleSaveWorkspaceSnapshot 추가 |
| `frontend/src/index.css` | admin-panel gap: 0 |

---

## 6. 핸들러 유지 (삭제 안 함)

- `handleToggleAdminMode` (Ctrl+Shift+A)
- `initFileHandle`, `handleFileImport` (file input ref)
- `handleSaveStrategy` (AI overlay onSaveStrategy)
- `handleImportDataset`
- Export 로직 (History 모달 내부)
