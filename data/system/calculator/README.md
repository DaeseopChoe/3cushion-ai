# System Calculator (SYS v1 자동 계산 엔진)

## 📋 개요

SYS v1 자동 계산 엔진은 3Cushion AI 프로젝트에서 시스템별 공식을 적용하여 1쿠션, 3쿠션, 착점 등을 자동 계산하는 엔진입니다.

## 📁 디렉토리 구조

```
calculator/
├─ index.ts                 # 단일 진입점 export
├─ types.ts                 # 타입 정의 (계약)
├─ calculateSystemV1.ts     # 라우터 (단일 진입점)
├─ registry.ts              # 시스템 등록 레지스트리
├─ base.ts                  # 공통 유틸리티
├─ systems/                 # 시스템별 구현
│   └─ five_and_half.ts     # 5&half 시스템
└─ test_example.ts          # 테스트 예제
```

## 🚀 사용 방법

### 1. 기본 사용

```typescript
import { calculateSystemV1 } from "./calculator";

const result = calculateSystemV1({
  system_id: "5_HALF",
  system_version: "v1",
  anchors_input: {
    CO: { x: 40, y: 10 },
    C1: { x: 20, y: 5 },
    C3: { x: 15, y: 8 }
  },
  hpt: { T: "+3/8" },
  corrections: {
    curve_ratio: 5,
    slide: 2,
    draw: -1,
    departure: 3
  }
});

console.log(result.values.C1_sys); // 1쿠션 계산값
```

### 2. 결과 구조

```typescript
{
  values: {
    CO_sys: 45,        // CO + curve_ratio
    C1_sys: 30,        // 1쿠션 계산값
    C3_sys: 16,        // 3쿠션 계산값
    arrival_sys: 19    // 최종 착점
  },
  
  anchors: {
    CO: { x: 40, y: 10 },
    C1: { x: 20, y: 5 },
    C3: { x: 15, y: 8 }
  },
  
  breakdown: {
    formula: {
      original: "1C = CO - 3C",
      withCorrections: "1C = (CO + curve_ratio) - 3C",
      substituted: "30 = 45 - 15"
    },
    steps: [/* 계산 단계 */]
  },
  
  debug: {
    warnings: [],
    intermediate: {/* 중간값 */}
  }
}
```

## 🔌 새 시스템 추가 방법

### 1. 시스템 계산기 구현

```typescript
// systems/my_system.ts
import { SystemCalculator, SystemCalcInputV1, SystemCalcOutputV1 } from "../types";

export class MySystemCalculator implements SystemCalculator {
  calculate(input: SystemCalcInputV1): SystemCalcOutputV1 {
    // 시스템 공식 구현
    return { values, anchors, breakdown };
  }
}
```

### 2. 레지스트리에 등록

```typescript
// registry.ts

// 프로필 추가
const SYSTEM_PROFILES: Record<string, SystemProfile> = {
  "MY_SYSTEM": {
    id: "MY_SYSTEM",
    display_name: { ko: "내 시스템", en: "My System" },
    capabilities: {
      uses2C: false,
      usesArrival: true,
      requiresC4Plus: false,
      supportsRailFirst: false
    }
  }
};

// 계산기 추가
const SYSTEM_CALCULATORS: Record<string, SystemCalculator> = {
  "MY_SYSTEM": new MySystemCalculator()
};
```

## ✅ 완료 기준

- [x] calculateSystemV1 단일 진입점 존재
- [x] SystemProfile + capability 정상 작동
- [x] 5&half 시스템 예제 동작
- [x] 출력이 SystemCalcOutputV1 계약 100% 준수

## 🚫 금지 사항

- ❌ UI 로직 포함
- ❌ ImpactBall 계산 포함
- ❌ 기존 시스템 공식 변경
- ❌ shot_record 직접 저장 (반환만)

## 📝 참고

- v1에서는 FG → CO 역연결 로직 미구현 (v2 예정)
- 관리자 드래그한 앵커를 그대로 사용
- 계산 결과는 반환만 하며, 저장은 호출자가 담당
