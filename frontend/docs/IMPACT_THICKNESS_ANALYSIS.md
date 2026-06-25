# ImpactEngine 두께 방향/크기 분석

## 1. 개념 정리 (cue → impact → target)

- **큐볼이 타겟볼을 겨냥하는 두께 위치** = impactBall
- **정면 두께 (8/8)**: cue 중심 ↔ target 중심 연결 = impact는 target에 접하며 cue-target 직선 위
- **좌측 7/8**: impact가 **왼쪽**으로 1/8 이동 → 타겟볼 좌측 7/8을 덮음
- **우측 1/8**: impact가 **오른쪽**으로 7/8 이동 → 얇게 우측만 맞음

---

## 2. UI vs ImpactEngine 부호 규약 불일치

| UI 표시      | T 저장값  | formatThickness |
|-------------|-----------|------------------|
| 우측 7/8     | "+7/8"    | `+` → 우측       |
| 좌측 1/8     | "-1/8"    | `-` → 좌측       |

**확인된 UI 규약:**
- `+` = **우측 (RIGHT)**  (aiPlayStrategyBuilder.formatThickness, HptOverlay)
- `-` = **좌측 (LEFT)**

**ImpactEngine parseLegacyT 주석 (잘못됨):**
- "+7/8" => left 1/8
- "-5/8" => right 3/8

→ **ImpactEngine이 `+`=left, `-`=right로 해석**하여 UI와 **반대**입니다.

---

## 3. computeImpactFromLegacyT / orbitPoint 방향

- `orbitPoint`: base = (target - cue), left = perpLeft(base)
- side=1 → `lat = sin(angle)*D` → impact를 **left** 방향으로 배치
- side=-1 → `lat = -sin(angle)*D` → impact를 **-left (right)** 방향으로 배치

**결론**: orbitPoint 자체는 side 부호를 일관되게 쓰고 있으나,  
**parseLegacyT에서 UI `+`(우측)를 side=1로 넘기면**, orbit이 **left**로 가서 방향이 반대로 됩니다.

---

## 4. 수직 벡터 perpLeft(v) = (-v.y, v.x)

- SVG: x→오른쪽, y→아래
- v=(1,0)일 때 perpLeft=(0,1) → 화면 상 **아래** 방향
- cue→target이 동쪽(1,0)이면, perpLeft은 **남쪽**.  
  당구 테이블 회전에 따라 이게 “좌/우” 중 어느 쪽인지는 뷰에 따라 달라짐.

**문제**: perpLeft 방향이 “물리적 좌/우”와 고정 매핑되어 있지 않을 수 있음.  
더 본질적인 문제는 **UI `+`/`-`와 엔진 side 1/-1의 매핑이 반대**인 것입니다.

---

## 5. computeThicknessFromImpact 기준

- `approach = impact - cue`  (cue → impact)
- `lateralAxis = perpLeft(approach)`
- `rel = target - impact`
- `signedPerp = dot(rel, lateralAxis)`

→ **cue → impact** 방향을 기준으로 계산하고 있어, 당구 두께 기준에 맞습니다.

---

## 6. orbitPoint 기준

- `base = target - cue`  (cue → target)
- orbit은 target을 중심으로 반지름 D 원 위

→ orbit 자체는 cue→target을 축으로 회전하며,  
angle=0이 cue 방향, angle이 커질수록 옆으로 갈 때 **left/right는 base에 대한 perpLeft**로 정해짐.

---

## 7. 수정 방향

1. **parseLegacyT**: UI 규약에 맞게 side 반전
   - UI `+`(우측) → side = -1
   - UI `-`(좌측) → side = 1

2. **computeThicknessFromImpact → legacyT**: 출력 부호 반전
   - side = 1 (orbit left) → legacyT `"-"`  (좌측)
   - side = -1 (orbit right) → legacyT `"+"` (우측)

---

## 8. magnitude (1/8 vs 7/8) - **근본 원인**

UI 라벨:
- "+7/8" = "우측 7/8" = **7/8 두께** (거의 정면)
- "+1/8" = "우측 1/8" = **1/8 두께** (얇게)

즉 **n/8 = hitFraction (직접)**. n이 크면 두꺼움, 작으면 얇음.

**기존 parseLegacyT (잘못됨)**:
```
offsetFraction = n/8
hitFraction = 1 - offsetFraction
```
→ "+7/8" → hitFraction = 1/8 (얇게 해석)
→ "+1/8" → hitFraction = 7/8 (두껍게 해석)

**올바른 해석**:
```
hitFraction = n/8  (직접)
```
→ "+7/8" → hitFraction = 7/8
→ "+1/8" → hitFraction = 1/8

**computeThicknessFromImpact legacyT 출력**도 반대로 되어 있음:
- fraction8 = 7 (hitFraction 7/8)일 때
- 기존: offset8 = 8-7 = 1 → "+1/8" 출력 (잘못됨)
- 올바름: fraction8 그대로 "+7/8" 출력

---

## 9. 렌더링 gap 가능 원인

물리: |impact - target| = BALL_DIAMETER_RG (접촉)
렌더링: r = RENDER_RADIUS_RG = BALL_RADIUS_RG - AA_EPSILON (0.08)

두 공이 물리적으로 접촉해도, 그려지는 원이 반지름 0.08씩 작으면
볼 사이에 0.16 rg 상당의 gap처럼 보일 수 있음.
gap이 남아있다면 RENDER_RADIUS_RG vs BALL_RADIUS_RG 사용처 확인.
