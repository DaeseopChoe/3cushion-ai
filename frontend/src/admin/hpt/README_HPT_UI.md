# HP/T UI 구현 완료 가이드

## 📋 개요

HP/T UI의 v1 구현이 완료되었습니다. 타점(HP)과 두께(T)를 직관적으로 입력하고 즉시 시각화할 수 있습니다.

---

## 📁 파일 구조

```
/frontend/admin/hpt/
 ├─ useHptController.ts       # 상태·계산 로직 (수정 없음)
 ├─ HptOverlay.tsx            # UI 입력 (완전 구현)
 └─ ImpactBallLayer.tsx       # 시각 표현 (좌표 변환 보완)
```

---

## 🎮 HP 조이스틱 구현

### 기능
- 큐볼 중심 기준 타점 입력
- 드래그로 직관적 조작
- 범위 제한: 0.9R 이내 자동 clamp
- Rg 좌표계 기준

### 시각 요소
```
조이스틱 영역 (200x200px)
 ├─ 큐볼 (흰색 원)
 ├─ 최대 범위 (점선 원, 0.9R)
 ├─ 중심선 (십자)
 ├─ 타점 (빨간 점, 12px)
 └─ 조이스틱 핸들 (반투명 원, 24px)
```

### 드래그 로직
```typescript
// Pointer Events 사용
onPointerDown  → 드래그 시작 + Pointer Capture
onPointerMove  → 드래그 중 (isDragging 체크)
onPointerUp    → 드래그 종료 + Release Capture

// 좌표 변환
픽셀 → Rg: (px - center) / SCALE
Rg → 픽셀: rg * SCALE + center

// Clamp
if (dist > MAX_HP_RADIUS) {
  { x, y } = normalize(x, y) * MAX_HP_RADIUS
}
```

---

## 📐 T 드롭다운 구현

### 옵션 (17개 전체)
```typescript
const T_OPTIONS = [
  { value: "8/8", label: "정면 (8/8)" },
  { value: "+7/8", label: "우측 7/8" },
  { value: "+6/8", label: "우측 6/8" },
  { value: "+5/8", label: "우측 5/8" },
  { value: "+4/8", label: "우측 4/8" },
  { value: "+3/8", label: "우측 3/8" },
  { value: "+2/8", label: "우측 2/8" },
  { value: "+1/8", label: "우측 1/8" },
  { value: "+0/8", label: "우측 0/8 (극단적 얇은 두께)" },
  { value: "-0/8", label: "좌측 0/8 (극단적 얇은 두께)" },
  { value: "-1/8", label: "좌측 1/8" },
  { value: "-2/8", label: "좌측 2/8" },
  { value: "-3/8", label: "좌측 3/8" },
  { value: "-4/8", label: "좌측 4/8" },
  { value: "-5/8", label: "좌측 5/8" },
  { value: "-6/8", label: "좌측 6/8" },
  { value: "-7/8", label: "좌측 7/8" },
];
```

### 동작
```typescript
<select
  value={hpt.T}
  onChange={(e) => hpt.setT(e.target.value)}
>
  {T_OPTIONS.map(opt => (
    <option key={opt.value} value={opt.value}>
      {opt.label}
    </option>
  ))}
</select>
```

---

## 🎨 ImpactBallLayer 구현

### 좌표 변환
```typescript
// Rg → 픽셀 변환
const toPixel = (point: Point) => ({
  x: point.x * scale + padding,
  y: point.y * scale + padding,
});

// BALL_RADIUS 적용
const radiusPixel = BALL_RADIUS_RG * scale;
```

### 렌더링
```tsx
<>
  {/* Cue → Impact 점선 */}
  <line
    x1={cuePixel.x}
    y1={cuePixel.y}
    x2={impactPixel.x}
    y2={impactPixel.y}
    stroke="white"
    strokeDasharray="4 4"
    strokeWidth={2}
    opacity={0.6}
  />

  {/* ImpactBall */}
  <circle
    cx={impactPixel.x}
    cy={impactPixel.y}
    r={radiusPixel}
    fill={color}
    opacity={opacity}
    stroke="rgba(255, 255, 255, 0.3)"
    strokeWidth={1}
  />
</>
```

---

## 🔄 데이터 흐름

```
1. HP 조이스틱 드래그
   ↓
2. pixelToRg() 변환 + clamp
   ↓
3. onHpChange({ x, y })
   ↓
4. useHptController.setHp()
   ↓
5. onChange({ hp, T })
   ↓
6. 부모 상태 업데이트

7. T 드롭다운 선택
   ↓
8. hpt.setT(value)
   ↓
9. onChange({ hp, T })
   ↓
10. useHptController → useMemo
    ↓
11. calcImpactBall(cue, target, T)
    ↓
12. impactBall 위치 갱신
```

---

## 🚀 사용 예시

### 기본 사용
```tsx
import { HptOverlay } from "./hpt/HptOverlay";
import { ImpactBallLayer } from "./hpt/ImpactBallLayer";

function AdminMode() {
  const [hptValue, setHptValue] = useState({
    hp: { x: 0, y: 0 },
    T: "8/8"
  });
  
  const [overlayOpen, setOverlayOpen] = useState(false);
  
  return (
    <>
      {/* HP/T 버튼 */}
      <button onClick={() => setOverlayOpen(true)}>
        HP/T
      </button>
      
      {/* HP/T 오버레이 */}
      {overlayOpen && (
        <HptOverlay
          cue={balls.cue}
          target={balls.target}
          value={hptValue}
          onChange={setHptValue}
          onClose={() => setOverlayOpen(false)}
        />
      )}
      
      {/* SVG 레이어 */}
      <svg>
        {/* 기존 요소들 */}
        
        {/* ImpactBall 레이어 */}
        <ImpactBallLayer
          cue={balls.cue}
          impact={calcImpactBall(balls.cue, balls.target, hptValue.T)}
          color="#00ff00"
          opacity={0.7}
          scale={SCALE}
          padding={PADDING}
        />
      </svg>
    </>
  );
}
```

### SAVE 시 저장
```typescript
function handleSave() {
  shot_record.hpt = {
    hit_point: hptValue.hp,
    T: hptValue.T
  };
  
  // 파일 저장
  saveToFile(shot_record, filepath);
}
```

---

## ✅ 구현 완료 체크리스트

### HP 조이스틱
- [x] 큐볼 위에 조이스틱 표시
- [x] 드래그로 타점 이동
- [x] 범위 clamp (0.9R)
- [x] Rg 좌표계 유지
- [x] 빨간 점 시각화
- [x] 현재 값 표시 (X, Y)

### T 드롭다운
- [x] 17개 옵션 전체 구현
- [x] 선택 즉시 반영
- [x] 문자열 값 그대로 전달

### ImpactBallLayer
- [x] Rg → 픽셀 변환
- [x] BALL_RADIUS 적용
- [x] 큐-임팩트 점선 정확 연결
- [x] 초록색 시각화 (관리자)
- [x] pointerEvents="none"

### 통합
- [x] HP + T 독립 입력
- [x] 즉시 화면 반영
- [x] ImpactBall 자동 재계산
- [x] 드래그 방지 (ImpactBall)

---

## 🎯 핵심 특징

### 1️⃣ Pointer Events 사용
- 마우스 + 터치 통합 지원
- Pointer Capture로 안정적 드래그
- touchAction: "none"으로 스크롤 방지

### 2️⃣ 즉시 반영
```typescript
// HP 변경 → 즉시 반영
onHpChange(newHp) → onChange({ hp: newHp, T })

// T 변경 → ImpactBall 즉시 재계산
setT(newT) → useMemo 트리거 → calcImpactBall()
```

### 3️⃣ 자동 Clamp
```typescript
const dist = Math.hypot(rgX, rgY);
if (dist > MAX_HP_RADIUS) {
  return {
    x: (rgX / dist) * MAX_HP_RADIUS,
    y: (rgY / dist) * MAX_HP_RADIUS,
  };
}
```

---

## 🚫 v1 제한사항

### ❌ 구현하지 않은 것
- ImpactBall 직접 드래그
- HP 값으로 시스템 계산
- HP 자동 보정
- 쿠션/궤적 계산

### ✅ v1 범위
- 타점 입력 (조이스틱)
- 두께 입력 (드롭다운)
- ImpactBall 시각화
- 즉시 화면 반영 (draft)
- SAVE 시에만 저장

---

## 📝 주의사항

### 좌표계
- **HP**: Rg 좌표계 (큐볼 중심 기준)
- **ImpactBall**: Rg 좌표계 → SVG 픽셀로 변환 필요

### 스케일
```typescript
// HptOverlay 내부 (조이스틱)
const SCALE = 200 / (2 * BALL_RADIUS_RG);

// ImpactBallLayer (SVG)
scale = 프로젝트의 SCALE 상수
padding = 프로젝트의 PADDING 상수
```

### 스타일
- 예시 코드는 인라인 스타일 사용
- 실제 프로젝트: CSS 모듈 또는 Tailwind 적용 권장

---

**작성자**: Claude (수석 개발자)  
**검토**: PM  
**상태**: v1 구현 완료
