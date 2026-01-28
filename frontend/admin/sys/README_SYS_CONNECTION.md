# SYS 버튼 UI ↔ system_calculator 연결 가이드

## 📋 개요

이 문서는 SYS 버튼 관리자 UI와 `system_calculator` v1 연결 구현을 설명합니다.

---

## 📁 파일 구조

```
/frontend/admin/sys/
 ├─ useSysCalculation.ts     # 계산 훅 (핵심)
 ├─ SysOverlay.tsx           # SYS 입력 UI
 └─ saveShotRecord.ts        # 저장 로직

/data/system/calculator/
 ├─ index.ts                 # calculateSystemV1 export
 ├─ types.ts                 # 타입 정의
 └─ calculateSystemV1.ts     # 계산 엔진
```

---

## 🔄 데이터 흐름

```
1. SysOverlay (UI 입력)
    ↓
2. sysState (로컬 상태)
    ↓
3. SystemCalcInputV1 (자동 생성)
    ↓
4. useSysCalculation (훅)
    ↓
5. calculateSystemV1() (계산)
    ↓
6. SystemCalcOutputV1 (결과)
    ↓
7. 화면 반영 (draft)
    ↓
8. SAVE 버튼 → shot_record.sys
```

---

## 🔧 useSysCalculation.ts

### 역할

- `SystemCalcInputV1` 입력 받기
- `calculateSystemV1()` 호출
- 결과를 draft state로 관리
- ❌ 저장하지 않음

### 사용법

```typescript
import { useSysCalculation } from "./useSysCalculation";

const sysCalcInput: SystemCalcInputV1 = {
  system_id: "5_HALF",
  system_version: "v1",
  anchors_input: { CO, C1, C3 },
  hpt: { T: "8/8" },
  corrections: { curve_ratio: 5, slide: 0, draw: 0, departure: 0 }
};

const { result, error } = useSysCalculation(sysCalcInput);

// result.values → 시스템 값
// result.anchors → 앵커 좌표
// result.breakdown → 공식/설명
```

---

## 🎨 SysOverlay.tsx

### 역할

- SYS 입력 UI 제공
- 입력 변경 시 즉시 계산
- 결과를 화면에 draft로 표시
- SAVE 버튼 클릭 시에만 저장

### 핵심 로직

```typescript
// 1. 상태 관리
const [sysState, setSysState] = useState<SysOverlayState>({...});

// 2. SystemCalcInputV1 자동 생성
const sysCalcInput = useMemo(() => ({
  system_id: sysState.systemId,
  anchors_input: sysState.anchors,
  corrections: sysState.corrections
}), [sysState]);

// 3. 자동 계산
const { result, error } = useSysCalculation(sysCalcInput);

// 4. 화면 표시
{result && (
  <div>
    <p>CO_sys: {result.values.CO_sys}</p>
    <p>C1_sys: {result.values.C1_sys}</p>
    <p>[공식] {result.breakdown.formula.original}</p>
  </div>
)}
```

---

## 💾 SAVE 로직

### 저장 시점

- ❌ 입력 변경 시 자동 저장 금지
- ✅ SAVE 버튼 클릭 시 1회만

### 저장 구조

```typescript
shot_record.sys = {
  input: SystemCalcInputV1,      // 재현용
  output: SystemCalcOutputV1,    // SSOT
  system_id: string,
  strategy_type: string
};
```

### 예시 코드

```typescript
function handleSave() {
  if (!result) {
    alert("계산 결과가 없습니다.");
    return;
  }
  
  const sysData = {
    input: sysCalcInput,
    output: result,
    system_id: sysState.systemId,
    strategy_type: sysState.strategyType
  };
  
  // shot_record에 merge
  const updated = saveSysToShotRecord(shotRecord, sysData);
  
  // 파일로 저장
  await saveToFile(updated, filepath);
}
```

---

## 🎯 화면 반영 항목

### SystemCalcOutputV1 → UI 매핑

| 데이터 | 화면 위치 | 설명 |
|--------|-----------|------|
| `result.anchors` | 테이블 위 선분/앵커 | 쿠션 점 위치 |
| `result.values.CO_sys` | SYS 결과 영역 | CO 시스템 값 |
| `result.values.C1_sys` | SYS 결과 영역 | 1쿠션 값 |
| `result.values.C3_sys` | SYS 결과 영역 | 3쿠션 값 |
| `result.values.arrival_sys` | SYS 결과 영역 | 최종 착점 |
| `result.breakdown.formula.original` | 공식 UI | 원공식 |
| `result.breakdown.formula.withCorrections` | 공식 UI | 보정 공식 |
| `result.breakdown.formula.substituted` | 공식 UI | 대입 공식 |

---

## ✅ 완료 기준

- [ ] SYS 입력 변경 시 즉시 계산
- [ ] 계산 결과가 화면에 draft로 표시
- [ ] 공식/보정/대입 과정 표시
- [ ] SAVE 전에는 저장 안 됨
- [ ] SAVE 후 shot_record.sys 정상 저장
- [ ] 에러 발생 시 UI에 경고 표시

---

## 🚫 금지 사항

### ❌ 절대 하지 말 것

1. `calculateSystemV1` 내부 수정
2. `SystemCalcInputV1` / `SystemCalcOutputV1` 타입 변경
3. UI에서 계산식 재구현
4. 입력 변경 시 자동 저장
5. 2C 관련 수동 처리 (capability가 자동 처리)

---

## 📝 참고 사항

### v1 제한사항

- FG → CO 역연결 미구현 (v2 예정)
- 타점(hit_point) 미사용 (v2 예정)
- 순수 시스템 공식 기반 계산만

### 다음 단계

1. ✅ SYS 버튼 연결 (현재)
2. HP/T 버튼 연결 (동일 패턴)
3. STR 버튼 연결 (동일 패턴)
4. AI 버튼 연결 (동일 패턴)
5. USER 모드 읽기 전용 렌더링

---

## 🎯 핵심 원칙

**이 연결의 유일한 목적:**
- ✅ UI ↔ calculator 연결
- ✅ 즉시 화면 반영 (draft)
- ❌ 계산 로직 수정 없음
- ❌ 자동 저장 없음

---

**작성자**: Claude (수석 개발자)  
**검토**: PM  
**상태**: v1 확정
