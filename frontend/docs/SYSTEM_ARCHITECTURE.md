
---

# 2️⃣ `frontend/docs/SYSTEM_ARCHITECTURE.md`

```md
# System Architecture – 3Cushion AI

---

# 1. 전체 구조

[UI]
   ↓
[LayoutContext]
   ↓
[System Profile Loader]
   ↓
[Calculator Engine]
   ↓
[Trajectory Builder]
   ↓
[Stage Rendering]

---

# 2. 시스템 데이터 계층

Layer 1: profile.json  
Layer 2: anchors.json  
Layer 3: logic.json  

profile = 수식 정의  
anchors = 좌표 샘플  
logic = 분기 및 보정

---

# 3. 계산 모드 구분

## Admin Mode

- 좌표 비의존
- expr 기반 계산
- 실험/디버깅 목적

파일:
useSysCalculation.ts

---

## App Mode

- anchors 기반 보정
- trajectory 생성
- 실제 시뮬레이션

파일:
systemCalculator.ts
trajectorySampleBuilder.ts

---

# 4. Formula Evaluation 구조

1. expr 파싱
2. LHS / RHS 분리
3. RHS 토큰화
4. 값 치환
5. new Function 실행
6. LHS 결과 반영

---

# 5. 5_half 특수 구조

- CO_f 기준 보정
- Sn 계산
- C4_f 재정의
- C5_f, C6_f 동기화

---

# 6. 데이터 등록 방식

import.meta.glob 기반 자동 등록

수동 import 금지

---

# 7. 상태 관리 원칙

- 파생 상태는 useMemo 사용
- useEffect에서 재계산 금지
- 계산은 순수 함수로 유지
