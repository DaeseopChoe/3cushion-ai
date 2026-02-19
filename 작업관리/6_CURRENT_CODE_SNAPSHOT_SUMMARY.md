# CURRENT_CODE_SNAPSHOT_SUMMARY
3Cushion AI – Session Change Summary
Version: v0.1
Date: 2026-02-20
Author: 목계님

------------------------------------------------------------
이 문서는 “최근 세션에서 발생한 코드 변경 사항”을 요약하는 문서이다.
PROJECT_MASTER_STATE_CURRENT와 다르며,
구조 변화 여부 판단을 위한 보조 문서이다.
------------------------------------------------------------
본 문서는 구조 변경이 아닌 **경미 변경**(UI 수정, 내부 수치 조정, 스타일 변경 등)만 기록한다.
구조/계산/상태 엔진 변경 시 PROJECT_MASTER_STATE_CURRENT를 재작성한다.
------------------------------------------------------------

# 1. 이번 세션 작업 목적

- App.jsx 내부 HptOverlay에 HP_n UI 반영 (1줄 구조)
- App.jsx 계산 블록 한 구역으로 정리 (Physics Engine Block 마커)
- SYS → HP_n → HP/T 1단계 연동 (SYS 적용 시 HP_n 결과를 sysHpNResult에 저장, HP/T 열릴 때만 반영)

------------------------------------------------------------

# 2. 변경 파일 목록

## 수정된 파일

- frontend/src/App.jsx

## 신규 파일

- 없음

## 삭제된 파일

- 없음

------------------------------------------------------------

# 3. 변경 내용 요약 (기능 단위)

### 3.1 UI 변경
- App.jsx 내부 HptOverlay: HP_n 입력칸 추가 (number input, 기본값 0)
- 두께 / HP_n / 타점X / 타점Y 1줄 배치 (flex, gap 12px)

### 3.2 계산 흐름 변경
- 없음

### 3.3 상태 변경
- sysHpNResult 상태 추가 (SYS에서 HP_n 계산 결과 임시 저장, UI 동기화용)
- SYS onSave 시 newData.calculated?.HP_n 있으면 setSysHpNResult 호출
- HptOverlay mount 시 useEffect로 sysHpNResult → hpN 반영 (열릴 때만 1회)

### 3.4 코드 정리
- Physics Engine Block 구역 마커 추가 (toPx, toRg, calcImpactBall, calculateImpact, determineRotation, adjustSystemLine 등)
- Phase 2 분리 대상으로 표시

3.5 HP/T 설정 UI 전면 개선 (최종 구조 안정화)
▪ 상단 구조 재정비

상단 2줄 3등분 레이아웃 구성

1행: 두께 | 회전 | 당점

2행: 각 필드 값

각 영역 flex: 1 균등 배분

▪ 회전 필드 UX 개선

Collapsed 기본 표시:

회전 0팁

좌측 n팁

우측 n팁

클릭 시 Expanded UI 전환:

[좌측/우측 토글 버튼 1개]

[숫자 input (0~4, 소수 1자리)]

팁 고정 텍스트

0 입력 시 자동 Collapsed 복귀

방향 상태를 rotationDir state로 분리

▪ 당점 필드 UX 개선

회전과 동일한 Collapsed/Expanded 구조 적용

verticalDir state 분리

0 입력 시 자동 Collapsed

▪ HP_n 분리 구조

HP_n은 별도 줄로 분리

sysHpNResult != null일 때만 표시

형식: HP_n : [ − 우측 3팁 + ]

HP_n → hit_point 변환 로직 유지

hpToTipXY() 사용 (0~4, 22.5° 단위, 반지름 4)

▪ 입력 안정성

입력 중간 상태 허용: "", "-", ".", "-."

safeNum 헬퍼로 계산 보호

조이스틱 NaN 방지

▪ 계산/구조 영향

hit_point 구조 유지 ({ x, y })

Strategy / Trajectory / Physics Engine 영향 없음

Draft/Applied 구조 변경 없음

계산 파이프라인 변경 없음

🔵 구조 영향 재판정

기존 판정 유지:

계산 파이프라인 변경: ❌
구조 변경: ❌
UI/UX 개선: ✅
→ PROJECT_MASTER_STATE_CURRENT 수정 불필요

🔵 기술 부채 변화 (업데이트)

기술 부채:

감소 ⬇

설명:

회전/당점 상태 책임 분리

HP_n 조건부 UI 분리

입력 안전성 강화

확장 대비 구조 안정화
------------------------------------------------------------

# 4. 구조 영향 분석 (중요)

아래 항목 중 변경이 있었는가?

□ 폴더 구조 변경
□ 계산 파이프라인 변경
□ Draft/Applied 구조 변경
□ 전략 → 궤적 → 물리 연결 변경
□ 저장 포맷 변경
□ 물리 계산 로직 변경

판정:

- 계산 파이프라인 변경: ❌
- 구조 변경: ❌
- UI만 변경: ✅

→ PROJECT_MASTER_STATE_CURRENT 업데이트 필요 여부: 불필요


------------------------------------------------------------

# 5. 전략 → 궤적 → 물리 영향도

이번 변경이 다음 중 어디에 영향을 주는가?

Strategy Engine (useShotSlots): 영향 없음
Trajectory Engine: 영향 없음
Physics Engine: 영향 없음
Rendering Layer: UI 레이아웃 변경만

------------------------------------------------------------

# 6. App.jsx 영향도 분석

- 물리 계산 수정 여부: 없음
- 좌표계 변환 수정 여부: 없음
- Overlay 연결 수정 여부: SYS onSave → setSysHpNResult, HptOverlay sysHpNResult prop → hpN (열릴 때만 반영)

------------------------------------------------------------

# 7. 기술 부채 변화

이번 세션으로 기술 부채가:

동일 (약간 감소)

설명:

- Physics Engine Block 마커 추가 → Phase 2 분리 준비, 감소 방향
- App.jsx 내 HptOverlay UI 정리

------------------------------------------------------------

# 8. 다음 세션 준비 메모

- Phase 2 리팩터링: Physics Engine Block 분리 (utils/physics/)
- HP_n sys 연결, 4팁 로직 등은 추후 세션

------------------------------------------------------------

# 9. 세션 종료 체크 (강제)

아래 중 하나라도 체크되면
PROJECT_MASTER_STATE_CURRENT 재작성:

□ 구조 변경
□ 계산 구조 변경
□ 상태 구조 변경
□ 저장 포맷 변경
□ 물리 계산 변경

판정: 불필요
🔷 문서 간 역할 정리
문서	목적	갱신 방식
PROJECT_MASTER_INDEX	헌법	거의 고정
FRONTEND_ARCHITECTURE	구조 설계	Phase 단위
SYSTEM_ARCHITECTURE	계산 설계	구조 변경 시
CALCULATION_RULES	수식 규칙	규칙 변경 시
PROJECT_MASTER_STATE_CURRENT	현재 코드 상태	구조 변경 시 전면 재작성
CURRENT_CODE_SNAPSHOT_SUMMARY	세션 변경 요약	세션마다 생성