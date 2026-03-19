# 우측 버튼 패널 레이아웃 재구성 결과 보고서

**작성일:** 2026-03-19

---

## 1. 변경된 JSX 구조

### Before
```jsx
<div style={{ position: 'relative', width: '100%', height: '100%' }}>
  {tableSVG}
  {canEdit && (
    <div className="admin-panel">  // position: absolute, overlay
      ...buttons...
    </div>
  )}
  ...
</div>
```

### After
```jsx
<div className="app-layout">
  <div className="table-area">
    {tableSVG}
    {showHistoryModal && ...}
    {overlayState.open && ...}
    {overlayContent && ...}
  </div>
  {canEdit && (
    <div className="right-panel">
      <input type="file" ... />
      <button className="control-button">Grid</button>
      <div className="right-panel-group">
        <button className="control-button">Recall</button>
        <button className="control-button">History</button>
      </div>
      <div className="right-panel-group">
        <button className="control-button">SAVE</button>
      </div>
    </div>
  )}
</div>
```

---

## 2. CSS 변경 사항

### 추가
| 클래스 | 적용 | 설명 |
|--------|------|------|
| `.app-layout` | display: flex, width/height 100% | 3단 flex 컨테이너 |
| `.table-area` | flex: 1, minWidth: 0, position: relative | 테이블 영역 (자동 축소) |
| `.right-panel` | width: 120px, flex-shrink: 0, background: #0b1a2a | 우측 패널 |
| `.right-panel-group` | margin-top: 20px, gap: 14px | 그룹 간격 |
| `.control-button` | height: 52px, font-size: 16px, font-weight: 600, border-radius: 10px | 좌측 버튼과 동일 스타일 |

### 제거
| 클래스 | 사유 |
|--------|------|
| `.admin-panel` | absolute overlay 제거 |

---

## 3. Before / After

### Before
- 우측 버튼: `position: absolute`, `top: 20px`, `right: 12px`
- 테이블 위에 겹침
- 버튼 크기: 120×34px, font 14px

### After
- 우측 버튼: `right-panel` 내부, 독립 영역
- 테이블과 분리
- 버튼 크기: 52px 높이, font 16px (좌측과 유사)

---

## 4. 버튼 구조

```
[ Grid ]           ← 초록
--- (margin-top: 20px)
[ Recall ]         ← 파랑
[ History ]        ← 보라
--- (margin-top: 20px)
[ SAVE ]           ← 진한 초록
```

---

## 5. 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `frontend/src/App.jsx` | app-layout, table-area, right-panel 구조, admin-panel 제거 |
| `frontend/src/index.css` | app-layout, table-area, right-panel, control-button, right-panel-group 추가, admin-panel 제거 |
