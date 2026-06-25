# 조이스틱 10% 최종 검증 보고서

## 검증 로그 추가 위치

| 위치 | 로그 키 | 설명 |
|------|---------|------|
| useHptController.ts | `[CLAMP BREAK - controller outbound]` | applyHpAndSync, sync 직전 |
| useHptController.ts | `[CLAMP BREAK - local apply]` | applyHpLocal 내부 |
| useHptController.ts | `[CLAMP BREAK - parent→controller]` | useEffect 역주입 직전 |
| App.jsx | `[CLAMP BREAK - parent store]` | onControllerChange, next.hp 수신 시 |
| App.jsx | `[CLAMP BREAK - controllerValue]` | controllerValue 생성 직후 |

---

## 검증 테스트 시나리오

### 테스트 A — 조이스틱
- 8방향 끝까지 드래그
- 빠르게 원 밖으로 던지기
- 마우스 떼기

### 테스트 B — 회전 입력
- 10, 6, 8, 20, -15

### 테스트 C — 당점 입력
- 10 입력

### 테스트 D — TIP → SPIN 전환
- TIP 모드 4팁 설정 후 SPIN 모드 전환

---

## [CLAMP TEST RESULT]

**수동 테스트 시 아래를 채워주세요.**

```
controller outbound break: YES/NO
local apply break: YES/NO
parent store break: YES/NO
parent→controller break: YES/NO
controllerValue break: YES/NO

최대 관측 r 값: ______
```

---

## 테스트 방법

1. `npm run dev` 실행
2. HPT 오버레이가 열리는 경로로 이동 (샷 편집 등)
3. 위 시나리오 수행
4. 브라우저 콘솔(F12)에서 `[CLAMP BREAK` 검색
5. 로그가 하나도 없으면 모든 경로 통과
