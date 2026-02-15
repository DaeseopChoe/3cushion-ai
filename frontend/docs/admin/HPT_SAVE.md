# HP/T → shot_record.hpt 저장 연결 가이드

## 📋 개요

HP/T 입력값을 draft shot_record에 연결하여 SAVE 시 함께 저장되도록 구현합니다.

**패턴**: SYS 버튼과 완전히 동일 ✅

---

## 🎯 작업 목적

1. HP/T 입력 → 즉시 화면 반영 ✅
2. SAVE 전까지 영구 저장 안 함 ✅
3. SAVE 시 SYS와 함께 저장 ✅

---

## 📦 저장 구조

### shot_record.hpt
```typescript
{
  hp: { x: number; y: number },  // Rg 좌표
  T: string                       // 예: "+3/8"
}
```

### 전체 구조
```typescript
interface ShotRecordDraft {
  id: string;
  name: string;
  
  sys?: SysRecord;
  hpt?: {
    hp: Point;
    T: string;
  };
  str?: StrRecord;
  ai?: AiRecord;
}
```

---

## 🔧 구현 방법

### 1️⃣ handleHptChange 함수 추가

**위치**: Admin 컨테이너

**코드**:
```typescript
const handleHptChange = (hpt: { hp: Point; T: string }) => {
  setDraftShotRecord(prev => ({
    ...prev,
    hpt: {
      hp: hpt.hp,
      T: hpt.T
    }
  }));
  
  console.log("✅ [HPT_DRAFT_UPDATE]", hpt);
};
```

**역할**:
- HP/T 입력값을 `draftShotRecord.hpt`에만 저장
- 실제 영구 저장은 하지 않음
- 입력 즉시 draft 업데이트

---

### 2️⃣ HptOverlay 연결

**JSX**:
```tsx
<HptOverlay
  cue={balls.cue}
  target={balls.target_center}
  value={draftShotRecord.hpt || { hp: { x: 0, y: 0 }, T: "8/8" }}
  onChange={handleHptChange}
  onClose={() => setHptOverlayOpen(false)}
/>
```

**Props 설명**:
- `cue`: 큐볼 위치 (Rg)
- `target`: 타겟볼 위치 (Rg)
- `value`: 현재 HP/T 값 (draft에서 가져옴)
- `onChange`: HP/T 변경 시 호출 → `handleHptChange`
- `onClose`: 오버레이 닫기

---

### 3️⃣ SAVE 버튼 (기존 유지)

**코드**:
```typescript
const handleSave = () => {
  // 검증
  if (!draftShotRecord.hpt && !draftShotRecord.sys) {
    alert("저장할 데이터가 없습니다.");
    return;
  }
  
  // 저장 (예시: localStorage)
  const json = JSON.stringify(draftShotRecord, null, 2);
  localStorage.setItem(`shot_record_${draftShotRecord.id}`, json);
  
  console.log("💾 [SAVE_SHOT_RECORD]", draftShotRecord);
  alert("저장되었습니다!");
};
```

**특징**:
- HP/T는 이미 `draftShotRecord.hpt`에 포함
- SYS / HP/T / STR / AI 모두 한 번에 저장
- 추가 작업 불필요

---

## 🔄 데이터 흐름

```
1. HP 조이스틱 드래그 / T 선택
   ↓
2. HptOverlay 내부 상태 변경
   ↓
3. useHptController → onChange({ hp, T })
   ↓
4. HptOverlay → props.onChange({ hp, T })
   ↓
5. Admin → handleHptChange({ hp, T })
   ↓
6. setDraftShotRecord({ ...prev, hpt: { hp, T } })
   ↓
7. draftShotRecord.hpt 업데이트 (draft)
   ↓
8. 화면 즉시 반영 (리렌더링)
   ↓
9. SAVE 버튼 클릭
   ↓
10. saveShotRecord(draftShotRecord)
    ↓
11. DB/파일 영구 저장
```

---

## ✅ 완료 체크리스트

### 기능 동작
- [ ] HP 조이스틱 이동 → 화면 즉시 반영
- [ ] T 드롭다운 변경 → 화면 즉시 반영
- [ ] 입력 변경 시 draft 업데이트 확인
- [ ] SAVE 전에는 영구 저장 안 됨
- [ ] SAVE 시 shot_record.hpt 저장 확인

### 코드 구조
- [ ] `handleHptChange` 함수 추가
- [ ] `HptOverlay` 연결 완료
- [ ] SAVE 로직 기존 유지
- [ ] SYS와 동일한 패턴 확인

### 저장 검증
- [ ] `shot_record.hpt.hp` 저장됨
- [ ] `shot_record.hpt.T` 저장됨
- [ ] `impactBall` 저장 안 됨 ✅
- [ ] SYS와 함께 저장됨

---

## 📝 저장 결과 예시

### 성공 케이스
```json
{
  "id": "shot_001",
  "name": "테스트 샷",
  "sys": {
    "system_id": "5_HALF",
    "input": { ... },
    "output": { ... }
  },
  "hpt": {
    "hp": { "x": 0.12, "y": -0.18 },
    "T": "+3/8"
  }
}
```

### 실패 케이스 (금지)
```json
{
  "hpt": {
    "hp": { "x": 0.12, "y": -0.18 },
    "T": "+3/8",
    "impactBall": { "x": 100, "y": 100 }  // ❌ 저장하면 안 됨!
  }
}
```

---

## 🚫 금지 사항 (재확인)

### ❌ 절대 하지 말 것

1. **HP/T 전용 save 함수**
   ```typescript
   // ❌ 금지
   function saveHptOnly(hpt) {
     saveShotRecord({ hpt });
   }
   ```

2. **useHptController에서 저장**
   ```typescript
   // ❌ 금지
   export function useHptController({ ... }) {
     // ...
     saveShotRecord({ hpt });  // ❌
   }
   ```

3. **impactBall 저장**
   ```typescript
   // ❌ 금지
   setDraftShotRecord({
     hpt: {
       hp,
       T,
       impactBall  // ❌
     }
   });
   ```

4. **SYS와 다른 흐름**
   - HP/T만 따로 저장 ❌
   - SAVE 버튼 외 저장 ❌

---

## 🧪 검증 테스트

### 테스트 실행
```typescript
import { runHptSaveTests } from "./tests/hptSaveTest";

// 전체 테스트 실행
runHptSaveTests();
```

### 테스트 항목
1. `handleHptChange` 동작 확인
2. SAVE 시 HP/T 포함 확인
3. 여러 번 변경 시 덮어쓰기 확인
4. impactBall 저장 안 됨 확인

### 예상 결과
```
🧪 HP/T 저장 검증 테스트 시작

Test 1 (handleHptChange): ✅ PASS
Test 2 (SAVE with HP/T): ✅ PASS
Test 3 (Multiple Changes): ✅ PASS
Test 4 (No ImpactBall): ✅ PASS

🎯 전체 결과: ✅ ALL PASS
```

---

## 🎯 SYS vs HP/T 비교

### 공통점 (동일한 패턴)
| 항목 | SYS | HP/T |
|------|-----|------|
| 입력 즉시 반영 | ✅ | ✅ |
| draft 저장 | ✅ | ✅ |
| SAVE 전 영구 저장 | ❌ | ❌ |
| SAVE 시 함께 저장 | ✅ | ✅ |

### 차이점
| 항목 | SYS | HP/T |
|------|-----|------|
| 핸들러 이름 | `handleSysChange` | `handleHptChange` |
| 저장 키 | `shot_record.sys` | `shot_record.hpt` |
| 저장 데이터 | input, output, ... | hp, T |

---

## 🚀 다음 단계

### 완료 후
1. ✅ HP/T 저장 연결 완료
2. STR 버튼 구현 (동일 패턴)
3. AI 버튼 구현 (동일 패턴)
4. USER 모드 읽기 전용 표시

---

**작성자**: Claude (수석 개발자)  
**검토**: PM  
**상태**: v1 구현 완료
