# Maximum Update Depth Exceeded — 수정 보고서

## 1️⃣ App.jsx 순환 구조 분석 결과

### 발견된 순환
```
formData.inputs (매 렌더 새 ref 가능)
    ↓
useEffect([..., formData.inputs, rhsKeys, ...])
    ↓
setCalcResult(result)  ← result는 매번 새 객체
    ↓
baseResultValue/baseResultKey (calcResult에서 파생)
    ↓
useEffect([baseResultValue, baseResultKey])
    ↓
setFormData (prev와 값 비교 후 변경 시에만)
```

### 근본 원인
**`parseExpr(expr)`가 매 렌더마다 새 Set을 반환** → `neededKeys` 새 참조 → `rhsKeys` useMemo가 매번 재계산(새 배열) → **첫 번째 useEffect의 `rhsKeys` 의존성이 매 렌더 변경** → useEffect 매 렌더 실행 → setCalcResult → 무한 루프

### setFormData 필요성
- **LHS 결과를 inputs에 반영하는 로직**은 “계산 결과 → 입력 필드 자동 동기화” 목적
- 선택지: (A) state로 유지하며 동기화, (B) 파생값만 표시
- 현재: (A) 채택. 단, **의존성 안정화**로 루프 제거 후에는 유지 가능

---

## 2️⃣ 적용한 수정

### App.jsx SysOverlay
1. **parseExpr 메모이제이션**
   ```js
   const parsed = useMemo(() => parseExpr(expr), [expr]);
   const { forced, neededKeys, needsHP, needsAn } = parsed;
   ```
2. **rhsKeys 안정화**: `neededKeys`가 expr과 동기화되어 참조 안정화
3. **setCalcResult 가드**: 값이 같으면 state 업데이트 스킵
   ```js
   setCalcResult((prev) => {
     const prevKey = Object.keys(prev)[0];
     const nextKey = Object.keys(result)[0];
     if (prevKey === nextKey && prev[prevKey] === result[nextKey]) return prev;
     return result;
   });
   ```

### LayoutContext.jsx
1. **setLayout 가드**: 실제로 layout이 변경될 때만 state 업데이트
   ```js
   setLayout((prev) => {
     if (!prev) return newLayout;
     if (prev.stageWidth === newLayout.stageWidth && ...) return prev;
     return newLayout;
   });
   ```
2. **console.log 제거**

### layoutCalculator.js
1. **개발용 console.log 제거** (Phase G-2 Layout, 검증 완료)

---

## 3️⃣ 상태 vs 파생값 분리 제안

| 구분 | 현재 | 권장 |
|------|------|------|
| **inputs** (CO_f, C3_r 등) | state (formData.inputs) | ✅ state 유지 — 사용자 입력 |
| **calcResult** | state | ⚠️ **useMemo로 파생** 가능 — inputs + expr로부터 계산 |
| **baseResultValue/Key** | 파생 | ✅ 파생 유지 |
| **finalCalc, adjustedInputs** | useMemo | ✅ 적절 |

### 구조 개선안
```js
// calcResult를 state가 아닌 파생값으로
const calcResult = useMemo(() => {
  if (!expr || !hasAllInputs) return {};
  const payload = buildPayload(formData.inputs, rhsKeys, needsHP, needsAn);
  return calculateByProfileExpr(expr, payload);
}, [expr, hasAllInputs, formData.inputs, rhsKeys, needsHP, needsAn]);
```

- **장점**: setCalcResult 제거 → useEffect 하나 축소 → 루프 가능성 감소
- **주의**: baseResult를 inputs에 반영하는 동기화가 필요하면, **사용자 수동 입력 vs 계산값 반영** 충돌 처리 필요 (현재는 effect로 강제 동기화)

---

## 4️⃣ 의존성 배열 점검 요약

| useEffect | 의존성 | 매 렌더 새 참조? | 조치 |
|-----------|--------|------------------|------|
| calcResult 계산 | expr, hasAllInputs, formData.inputs, rhsKeys, ... | ~~rhsKeys~~ | parseExpr 메모이제이션으로 해결 |
| baseResult → setFormData | baseResultValue, baseResultKey | ❌ primitive | guard 유지 |
| spaceSel | expr | ❌ | 유지 |
