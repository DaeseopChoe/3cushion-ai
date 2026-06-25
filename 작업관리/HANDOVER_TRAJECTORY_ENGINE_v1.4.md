# 🔥 HANDOVER — TRAJECTORY ENGINE v1.4

## 🎯 목적

이 문서는 다음 세션에서 현재 상태를 그대로 이어가기 위한 기준 문서이다.

---

# 1. 현재 시스템 상태 (핵심 요약)

## 1.1 Rendering SSOT

resolvedSlotSys = slot.draft.sys ?? slot.applied.sys

- 모든 궤적 계산은 resolvedSlotSys 기반
- adminState.sys는 렌더링에서 완전히 제외됨

---

## 1.2 Trajectory Pipeline

anchors  
→ pathNodesRaw  
→ adjustedNodes (spin 보정)  
→ pathNodes  

✔ anchor / sys / epsilon 로직은 변경 없음  
✔ path 단계에서만 보정 수행

---

# 2. Spin Correction Layer (현재 핵심 기능)

## 2.1 적용 구간

- C3 이후 (C4 ~ C6)
- C7 확장 시 자동 적용 가능

---

## 2.2 Progress 기반 감쇠

progress = 누적 거리 / 전체 거리

- progress ≥ 0.85 → spin 50%

---

## 2.3 Direction 판별

cross = (B-A) × (C-B)

- cross ≥ 0 → forward
- cross < 0 → reverse

---

## 2.4 Spin 적용

r_final = rotate(r, spin * k)

- k ≈ 0.015
- forward → +
- reverse → -

---

## 2.5 현재 구현 특징

- 누적 방식 (adjustedNodes overwrite)
- 자연스러운 곡선 생성
- 일부 오차 누적 존재

---

# 3. Position 시스템 (저장 구조)

## 3.1 positionId

- Ball3 기반 deterministic id
- round(v * 10) → pad → concat

---

## 3.2 구조

PositionRecord

- positionId
- balls
- strategies:
  - S1
  - S2
  - S3

---

## 3.3 규칙

- 슬롯당 전략 1개
- 동일 positionId → merge
- family 단위 저장

---

# 4. Recall 시스템

## 4.1 방식

- nearest 1 family만 호출

---

## 4.2 알고리즘

1. exact match (positionId)
2. fallback: 거리 합 최소

epsilon = 2.0

---

# 5. 해결된 문제들

✔ S1 trajectory flicker  
✔ admin ↔ slot overwrite 충돌  
✔ C4~C6 anchor missing  
✔ C3 fallback 불안정  

---

# 6. 현재 한계

## 6.1 물리 모델

- 충돌 두께 반영 없음
- 회전 증가/감소 없음
- spin decay 단순 모델

---

## 6.2 궤적

- 누적 보정 방식 → 오차 누적 가능
- reverse 판정 단순 (cross product)

---

## 6.3 구조

- C7 앵커 없음
- reflection 확장 미구현

---

# 7. 다음 작업 우선순위

## 🔥 HIGH

1. 누적 오차 제거 옵션 추가  
   (raw 기준 계산 vs 누적 방식 선택)

2. STR → spin 매핑 정교화  

---

## ⚡ MEDIUM

3. reverse 판정 개선  
   (패턴 + 벡터 혼합)

4. C7 reflection 확장  

---

## 🧠 LONG TERM

5. 충돌 물리 (두께 기반 회전)  
6. spin energy 모델  
7. 고급 trajectory physics  

---

# 8. 절대 금지 사항

❌ anchorCoordinateEngine 수정 금지  
❌ sys 계산 로직 수정 금지  
❌ epsilon / HIT_TOLERANCE 변경 금지  

---

# 9. 개발 원칙

✔ 모든 확장은 path 레이어에서만  
✔ SSOT 유지 (resolvedSlotSys)  
✔ 비파괴적 구조 유지  

---

# 🔚 결론

현재 상태는:

👉 구조 완성 단계 (엔진 1차 완료)  
👉 이후는 “정밀도 개선 단계”

---
