# 3Cushion AI – 구조 정리 완료 상태 (2026-02-15)

## ✅ 시스템 데이터 단일화
- 최종 사용 경로: frontend/src/data/systems
- SYSTEM_PROFILES: import.meta.glob 기반 자동 로딩
- 기존 frontend/src/systems 제거 완료

## ✅ Admin 위치
- frontend/src/admin 로 통합
- useSysCalculation.ts는 ../../data/systems 참조

## ✅ dist 제거 완료
- 빌드시 자동 생성
- Git 추적 안 함

## ✅ public 유지
- icons, samples, manifest.json 유지

## ⚠️ 중요 원칙
- systems 폴더는 src/data/systems 하나만 사용
- 1C → C1 표기 통일 완료
- 수식은 profile.formula.expr 기준 계산
