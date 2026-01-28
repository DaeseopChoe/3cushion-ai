# AI 버튼 v1 구현 가이드

## 📋 개요

AI 버튼 v1은 **관리자 코칭 텍스트 입력 및 저장**만 담당합니다.

**v1 범위**:
- ✅ 텍스트 입력
- ✅ 화면 즉시 반영
- ✅ SAVE 시 shot_record.ai 저장

**v1 제외**:
- ❌ AI 자동 생성
- ❌ AI 추천
- ❌ system_calculator 연동
- ❌ 드롭다운 자동 생성

---

## 📁 파일 구조

```
/frontend/admin/ai/
 ├─ useAiController.ts    # AI 상태 관리
 └─ AiOverlay.tsx         # 텍스트 입력 UI

/frontend/admin/save/
 └─ saveShotRecord.ts     # AI 저장 블록 추가됨
```

---

## 🔧 useAiController.ts

### 역할
- AI 텍스트 상태 관리만 담당
- ❌ 계산 없음
- ❌ 저장 없음

### 인터페이스
```typescript
export interface AiState {
  text: string;  // 코칭 텍스트
}

interface UseAiControllerProps {
  ai?: AiState;
  onChange: (next: AiState) => void;
}
```

### 사용법
```typescript
import { useAiController } from "./useAiController";

const ai = useAiController({
  ai: draftShotRecord.ai,
  onChange: handleAiChange
});

// 텍스트 변경
ai.setText("새로운 코칭 텍스트");
```

---

## 🎨 AiOverlay.tsx

### UI 구성
- **Textarea**: 멀티라인 텍스트 입력
- **글자 수 표시**: 실시간 표시
- **예시 텍스트**: 참고용 (접을 수 있음)
- **버튼**: 취소 / 적용

### 동작
1. 오버레이 열림
2. Textarea에 텍스트 입력
3. 로컬 상태에 임시 저장
4. "적용" 버튼 → `onChange` 호출
5. "취소" 버튼 → 변경사항 무시

### Props
```typescript
interface Props {
  value?: AiState;           // 현재 AI 텍스트
  onChange: (next: AiState) => void;  // 변경 핸들러
  onClose: () => void;       // 닫기 핸들러
}
```

---

## 💾 saveShotRecord.ts 수정

### 수정 내용

#### AI 타입 수정
```typescript
// AI (텍스트)
ai?: {
  text: string;  // comment → text ✅
};
```

#### AI 저장 블록 수정
```typescript
/* =====================
   AI 저장
===================== */
if (ai) {
  shotRecord.ai = {
    text: ai.text,                    // ✅
    updated_at: new Date().toISOString()  // ✅ 추가
  };
}
```

---

## 📦 저장 구조

### shot_record.ai
```typescript
{
  text: string;          // 코칭 텍스트 (필수)
  updated_at: string;    // ISO timestamp (자동 생성)
}
```

### 저장 결과 예시
```json
{
  "meta": {
    "shot_id": "shot_001",
    "created_at": "2026-01-21T08:00:00.000Z"
  },
  "sys": { ... },
  "hpt": { ... },
  "str": { ... },
  "ai": {
    "text": "이 각도에서는 커브가 과하게 먹을 수 있으니\n출발 시 스트로크를 부드럽게 가져가세요.",
    "updated_at": "2026-01-21T08:30:00.000Z"
  }
}
```

---

## 🔄 데이터 흐름

```
1. AI 버튼 클릭
   ↓
2. AiOverlay 열림
   ↓
3. Textarea에 텍스트 입력
   ↓
4. 로컬 상태 업데이트 (임시)
   ↓
5. "적용" 버튼 클릭
   ↓
6. onChange 호출
   ↓
7. Admin → handleAiChange
   ↓
8. setDraftShotRecord({ ...prev, ai: { text } })
   ↓
9. draftShotRecord.ai 업데이트 (draft)
   ↓
10. SAVE 버튼 클릭
    ↓
11. saveShotRecord(draftShotRecord)
    ↓
12. shot_record.ai 저장
```

---

## 🎯 Admin 컨테이너 연결

### handleAiChange 함수
```typescript
const handleAiChange = (ai: AiState) => {
  setDraftShotRecord(prev => ({
    ...prev,
    ai: {
      text: ai.text
    }
  }));
  
  console.log("✅ [AI_DRAFT_UPDATE]", ai);
};
```

### AiOverlay JSX
```tsx
{aiOverlayOpen && (
  <AiOverlay
    value={draftShotRecord.ai}
    onChange={handleAiChange}
    onClose={() => setAiOverlayOpen(false)}
  />
)}
```

---

## ✅ 구현 완료 체크리스트

### 파일 생성
- [x] `useAiController.ts` ✅
- [x] `AiOverlay.tsx` ✅
- [x] `saveShotRecord.ts` AI 블록 추가 ✅

### 기능 동작
- [x] AI 버튼 클릭 → 오버레이 열림
- [x] 텍스트 입력 → 로컬 상태 업데이트
- [x] "적용" 클릭 → draft 업데이트
- [x] SAVE 클릭 → shot_record.ai 저장
- [x] updated_at 자동 생성

### 패턴 일치
- [x] SYS / HP/T / STR과 동일한 구조
- [x] draft → save 흐름
- [x] 조건부 저장

---

## 🚫 금지 사항 (재확인)

### ❌ v1에서 하지 않는 것
1. **AI 자동 생성**
   ```typescript
   // ❌ 금지
   async function generateAiCoaching() { ... }
   ```

2. **system_calculator 호출**
   ```typescript
   // ❌ 금지
   import { calculateSystemV1 } from "@/data/system/calculator";
   ```

3. **shot_record 구조 변경**
   ```typescript
   // ❌ 금지
   shotRecord.ai = {
     text,
     suggestions: [...],  // ❌
     confidence: 0.95     // ❌
   };
   ```

---

## 🎨 UI 특징

### Textarea
- **rows**: 8 (기본 높이)
- **resize**: vertical (세로 크기 조절 가능)
- **minHeight**: 150px
- **길이 제한**: 없음

### 예시 텍스트
- 접을 수 있는 `<details>` 사용
- 3개의 예시 제공
- 참고용으로만 표시

### 버튼
- **취소**: 회색 배경, 변경사항 무시
- **적용**: 파란색 배경, 변경사항 저장

---

## 📝 사용 예시

### 기본 사용
```typescript
import { AiOverlay } from "./ai/AiOverlay";

function AdminMode() {
  const [aiValue, setAiValue] = useState<AiState>();
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setOpen(true)}>AI</button>
      
      {open && (
        <AiOverlay
          value={aiValue}
          onChange={setAiValue}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
```

### SAVE 시
```typescript
import { saveShotRecord } from "./save/saveShotRecord";

function handleSave() {
  saveShotRecord({
    shotId: "shot_001",
    sys: draftShotRecord.sys,
    hpt: draftShotRecord.hpt,
    str: draftShotRecord.str,
    ai: draftShotRecord.ai  // ⭐ AI 포함
  });
}
```

---

## 🎯 SYS / HP/T / STR / AI 비교

| 항목 | SYS | HP/T | STR | AI |
|------|-----|------|-----|-----|
| 핸들러 | `handleSysChange` | `handleHptChange` | `handleStrChange` | `handleAiChange` |
| 저장 키 | `shot_record.sys` | `shot_record.hpt` | `shot_record.str` | `shot_record.ai` |
| 입력 즉시 반영 | ✅ | ✅ | ✅ | ✅ |
| draft 저장 | ✅ | ✅ | ✅ | ✅ |
| SAVE 전 영구 저장 | ❌ | ❌ | ❌ | ❌ |
| SAVE 시 함께 저장 | ✅ | ✅ | ✅ | ✅ |

**모든 버튼이 동일한 패턴!** ✅

---

## 🚀 다음 단계 (v2 예정)

v1 완료 후 v2에서 추가 예정:
1. AI 자동 생성 기능
2. 누적 텍스트 → 드롭다운화
3. 다국어 지원
4. AI 추천 기능

---

**작성자**: Claude (수석 개발자)  
**검토**: PM  
**상태**: v1 구현 완료
