# Calculation Rules – 3Cushion AI

---

# 1. 표기 규칙

C1, C2, C3 ... C6 사용
1C, 2C 금지

f = frame grid
r = rail grid

---

# 2. expr 규칙

profile.formula.expr 형식:

"LHS = RHS"

예:
C1_f = CO_f - C3_r

---

# 3. RHS 토큰 규칙

허용:

- 변수명
- 숫자
- + - * / ( )
- Math 객체

금지:

- 외부 객체 접근
- anchors 참조

---

# 4. Admin 계산 규칙

- expr 기반 직접 계산
- system_values에서 RHS 변수만 사용
- 미입력 값은 0 처리

---

# 5. App 계산 규칙

- value_domains 검증
- space_rule 검증
- anchors 기반 보정
- trajectory 생성

---

# 6. 보정 규칙

## 5_half_system

Sn = (CO_f - 50) * 0.5  
C4_f = C3_r + Sn  
C5_f = C4_f  
C6_f = C4_f  

---

# 7. 확장 원칙

새 시스템 추가 시:

1. profile.json 작성
2. anchors.json 작성
3. logic.json 작성
4. value_domains 정의
5. formula.expr 정의
6. Admin 계산 검증
7. App 시뮬레이션 검증
