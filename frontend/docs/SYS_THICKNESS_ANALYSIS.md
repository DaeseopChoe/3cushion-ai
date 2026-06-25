# SYS 두께(Thickness) 시각 반영 문제 조사 보고서

## 1. SYS 두께 입력 → 전달 경로

### 현재 구조

| 입력 소스 | 저장 위치 | 사용 함수 | 파라미터 |
|-----------|-----------|-----------|----------|
| view.ui.display_options.thickness | opts.thickness | calculateImpact | thicknessStr ("1/2", "3/8") |
| adminState.hpt.T / view.ui.hpt.T | systemCtrl.T | calcImpactBall | T ("8/8", "+3/8") |

**결론:** 두께가 **두 개의 서로 다른 경로**로 전달된다.

- **opts.thickness** → `calculateImpact` (궤적/시스템 라인)
- **T (HPT)** → `calcImpactBall` (cue→impact 가이드, 임팩트볼 시각화)

---

## 2. 실제 Impact 좌표 계산식 비교

### calcImpactBall (data/system/calculator/index.ts)

**입력:** cue, target, T ("8/8", "+2/8", "+3/8" 등)

**두께 파싱:**
```
"2/8" → numerator=2, denominator=8
offset = (2/8) * BALL_DIAMETER_RG = 0.25 * D
```

**접점 계산 (2/8 예시):**
1. ux, uy = (target - cue) / dist (진행 방향)
2. surface = target - (ux,uy) * R
3. vx, vy = direction * (uy, -ux) (수직)
4. rawContact = surface + (vx,vy) * offset
5. contact = target + normalize(rawContact - target) * R (타겟 표면 위)
6. ImpactBall = contact + (cue - contact).normalize() * R

### calculateImpact (utils/physics/impact.ts)

**입력:** cue, target, CO_fg, C1_fg, thicknessStr, pattern

**두께 파싱:**
```
"1/2" → t = 0.5
"3/8" → t = 0.375
offset = (1 - t) * BALL_DIAMETER_RG
```

**접점 계산 (1/2 예시):**
1. t = 0.5 → offset = 0.5 * D
2. ux, uy = (target - cue) / dist
3. rotation, impactSign = CO_fg, C1_fg, pattern 기반
4. vx, vy = impactSign * (uy, -ux)
5. **결과:** target - (ux,uy)*R + (vx,vy)*offset

**차이:** calculateImpact는 CO-1C 시스템 라인의 선회 방향을 사용.

---

## 3. 시각화에 사용되는 Impact

| 시각 요소 | 사용 함수 | 파라미터 소스 |
|-----------|-----------|---------------|
| cue → impact 흰색 점선 | calcImpactBall | T (adminState.hpt.T) |
| 임팩트볼 원 (CoachingOverlay) | calcImpactBall | T |
| calculateImpact 결과 | calculateImpact | opts.thickness (view.ui.display_options) |
| cushion path | anchors (C1, C2, C3) | impact 사용 안 함 |

**calculateImpact 결과**는 `derivedRef.current.impact`에 저장되나, **현재 렌더링에는 직접 사용되지 않음**. 드래그 freeze 시 참조용.

---

## 4. 두 함수 결과 차이 요약

| 항목 | calcImpactBall | calculateImpact |
|------|----------------|-----------------|
| 두께 형식 | T: "2/8", "+3/8" | thicknessStr: "1/2", "3/8" |
| offset 계산 | (n/8) * D | (1 - t) * D |
| 2/8 동등 | offset = 0.25*D | thicknessStr "6/8" → t=0.75 → offset=0.25*D |
| 방향 | T 부호 (±) | CO_fg, C1_fg, pattern (선회) |
| 용도 | HP/T, cue→impact 가이드 | (미사용/보조) |

**핵심 불일치:**
- "2/8" (T) = offset 0.25*D
- "2/8" (thicknessStr) 파싱 시 "2/8" → t=0.25 → offset=(1-0.25)*D=0.75*D (반대 의미!)

thicknessStr "a/b"는 **t = a/b**로 파싱되며, offset = (1-t)*D.
따라서 thicknessStr "2/8" = t=0.25 → offset=0.75*D (얇은 두께가 아님).

---

## 5. 정확한 두께 표시를 위한 수정 방법

### 방안 A: T를 단일 출처로 통일 (권장)

1. **시각화 전부 calcImpactBall(T) 사용**
   - cue→impact, 임팩트볼, 궤적 모두 T 기반
2. **T와 display_options.thickness 동기화**
   - SYS/시스템 입력이 thickness 문자열이면 → T로 변환해서 저장
   - 예: "2/8" → T "+2/8" 또는 "-2/8" (선회는 CO-1C에서 유도)

### 방안 B: thicknessStr를 단일 출처로 통일

1. **calculateImpact를 시각화의 기본 함수로 사용**
   - thicknessStr를 T 형식으로 변환하는 유틸 추가
2. **T와 thicknessStr 변환 규약**
   - T "8/8" ↔ thicknessStr "1/2" (정면)
   - T "+2/8" ↔ thicknessStr "2/8" (방향은 CO-1C에서 결정)

### 방안 C: formatThickness / parseThickness 유틸 활용

- `formatThickness(hpt.T)`가 이미 존재
- `tipClockConverter` 또는 유사 모듈에서 T ↔ thicknessStr 변환 구현
- 변환 후 한쪽 함수만 사용하도록 통일

---

## 6. 권장 조치 (우선순위)

1. **즉시:** `opts.thickness`와 `T`의 출처/의미 정리
2. **단기:** cue→impact 시각화가 `T`만 사용하는지 확인 (이미 calcImpactBall 사용 중)
3. **중기:** thicknessStr ↔ T 변환 유틸 도입 후, 궤적·임팩트 계산 경로 단일화

---

## 7. 적용된 수정 (2026-03)

### thicknessStr → T 변환 (useSystemController.ts)

- `view.ui.hpt.T`가 없을 때 `display_options.thickness`를 T 형식으로 변환
- 변환식: thicknessStr "a/b" → t=a/b, offset=(1-t)*D → T "+(8*(1-t))/8"
- 예: "3/8" → t=0.375 → offset=0.625D → T "+5/8"
- cue→impact 가이드가 `display_options.thickness`를 반영하도록 통일
