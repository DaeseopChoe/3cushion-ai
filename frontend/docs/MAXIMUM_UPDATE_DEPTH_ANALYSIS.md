# Maximum Update Depth Exceeded — 분석 보고서

## 1. 결론: GPT 의견과의 일치

**무한 렌더 루프는 SYS(Admin SysOverlay)가 아니라 Layout/Context/App 레벨에서 발생하는 것이 거의 확실합니다.**

스택 트레이스가 `installHook.js` → `LayoutContext.jsx` → `layoutCalculator.js` → `App.jsx`를 가리키며, SysOverlay는 언급되지 않습니다.

---

## 2. 확인된 코드 구조

### LayoutContext.jsx
- `useEffect` 의존성: `[]` (마운트 시 1회 + resize/orientationchange)
- `setLayout(newLayout)` 호출: 초기 1회 + 창 크기 변경 시에만
- **단독으로는 무한 루프를 만들 구조는 아님**

### layoutCalculator.js
- `calculateLayout()`: 호출될 때마다 **새 객체** 반환
- `validateLayout()`: 개발 모드에서 `console.log` 다수 (성능 부담 가능)

### App.jsx
- SYS 관련 `useEffect`:
  - `[baseResultValue, baseResultKey]`: `setFormData` 호출
  - `[expr, hasAllInputs, formData.inputs, ...]`: `setCalcResult` 호출
- **순환 가능성**: `formData` 변경 → calcResult 재계산 → baseResult 변경 → `formData` 재설정

---

## 3. SYS가 트리거 역할을 하는 이유

1. SYS 오버레이가 열리면 `adminState.sys` 등 state 변경
2. App 전체가 재렌더링되며 LayoutContext 자식 트리도 함께 렌더
3. App 내부에 Layout 의존 로직이 있으면, layout/context 변경 → 다시 setState → 재렌더 → 반복 가능

---

## 4. 추가로 의심되는 부분

### (a) App.jsx 709행 useEffect
```javascript
useEffect(() => {
  if (!baseResultKey || baseResultValue == null) return;
  setFormData(prev => { ... });
}, [baseResultValue, baseResultKey]);
```
- `baseResultValue` / `baseResultKey`가 `calcResult`에서 파생
- `calcResult`가 바뀔 때마다 effect 실행 → `setFormData` → `formData` 변경
- 다른 effect가 `formData`에 의존해 `setCalcResult`를 호출하면 순환이 발생할 수 있음

### (b) LayoutContext / layoutCalculator의 console.log
- `LayoutContext 업데이트`, `Phase G-2 Layout`, `Layout 검증 완료`가 반복 출력
- 로그 자체가 루프 원인은 아니지만, **로그가 반복된다는 것은 계속 재렌더/재계산이 일어난다는 의미**

---

## 5. 권장 수정 단계

1. **LayoutContext.jsx, layoutCalculator.js의 console.log 제거/비활성화**
   - 개발용 로그가 매 렌더마다 실행되는지 확인
   - 문제 재현 시 디버깅이 쉬워짐

2. **App.jsx 676행, 709행 useEffect 의존 관계 분석**
   - `formData` ↔ `calcResult` ↔ `baseResultValue` 순환 여부 확인
   - 가능하면 `useMemo` 등으로 파생값을 고정하고, effect 의존성을 최소화

3. **LayoutContext value 안정화**
   - `layout`이 바뀌지 않았을 때는 이전 객체 참조를 유지
   - `calculateLayout` 결과를 `useMemo` 또는 이전값 비교 후 `setLayout`으로 저장

---

## 6. 확인 요청

다음 파일에서 `useEffect` + `setState` 조합을 검색해 보세요:
- `LayoutContext.jsx`
- `layoutCalculator.js`
- `App.jsx`
- `useLayout*.js`, `useImpact*.js` (존재 시)
