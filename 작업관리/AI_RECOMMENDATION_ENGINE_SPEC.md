📘 AI_RECOMMENDATION_ENGINE_SPEC.md

3Cushion AI Recommendation Engine Specification
Version 1.0

1. 목적 (Purpose)

본 문서는 3Cushion AI 전략 추천 엔진의 전체 구조를 정의하는 설계 문서이다.

엔진의 역할은 다음과 같다.

사용자 입력
   ↓
포지션 검색
   ↓
전략 후보 선택
   ↓
보간 / 보정
   ↓
추천 전략 생성

이 엔진은 다음 목표를 가진다.

프로급 실전 추천 정확도 95%
2. 데이터 모델
PositionRecord
PositionRecord
 ├ positionId
 ├ balls
 │   ├ cue
 │   ├ target
 │   └ second
 └ strategies[]
StrategyEntry
StrategyEntry
 ├ slot
 ├ signature
 ├ sysInputs
 ├ hpT
 ├ str
 ├ ai
 └ meta
StrategyMeta
meta
 ├ impact
 ├ final
 ├ angle_ci
 └ angle_fs

meta는 저장 시 계산된다.

계산 위치

adminSaveEngine
buildStrategyMeta()
3. 전략 분리 규칙 (Critical Rule)

다음 전략은 절대 섞지 않는다.

systemId
formulaHash
shotType

즉

signature = systemId + formulaHash + shotType

보간 / 검색 / 추천은 같은 signature 안에서만 허용된다.

4. Position 병합 규칙

동일한 물리 배치는 하나의 PositionRecord로 유지한다.

판단 기준

MERGE_EPSILON = 0.5

비교 대상

cue.x
cue.y
target.x
target.y
second.x
second.y

판단 함수

isSameBalls()

파일

positionMergeEngine.ts
5. 관리자 모드 엔진

관리자 모드는 **데이터 입력 도구(Data Builder)**이다.

동작

볼 배치
↓
S1 S2 S3 선택
↓
가장 가까운 기존 데이터 자동 로딩
↓
관리자 수정
↓
SAVE
↓
dataset 업데이트

자동 추천은 draft에만 로딩된다.

applied는 절대 자동 변경 금지
6. 관리자 추천 엔진

관리자 추천은 가장 가까운 포지션 1개를 사용한다.

검색 엔진

KD-tree

파일

kdTree6d.ts
positionKDIndex.ts

검색 기준

signatureKey
+
balls

출력

Top1 PositionRecord

이 PositionRecord에서

S1
S2
S3

전략을 draft에 로딩한다.

7. 사용자 추천 엔진

사용자 모드는 관리자와 다르다.

관리자

Top1 Position

사용자

Nearest Positions
+ 보간

추천 과정

1 Position 검색
2 전략 후보 생성
3 보간
4 Δ_sys 보정
5 최종 추천
8. 검색 엔진 구조

검색은 3단계 구조이다.

1차 필터
signature

같은 전략만 검색

2차 필터

대략적 위치 범위

예

cue ± 3 grid
target ± 3 grid
second ± 3 grid
3차 검증

좌표 epsilon

|Δ| ≤ 0.5
9. Weighted Distance Search (향후)

나중 단계에서 사용한다.

거리 계산

distance =
w1 * cue distance +
w2 * target distance +
w3 * second distance

초기 값

w1 = 1
w2 = 1
w3 = 1

추후 조정 가능

10. 보간 (Interpolation)

사용자 모드에서만 사용

조건

3~5 nearest positions

보간 대상

sysInputs
hpT
str

단 전략 자체는 섞지 않는다

11. Δ_sys 보정

실전 오차 보정

예

cue-target angle
거리
쿠션 접근 각도

Δ_sys는

AI comment

과 함께 표시된다.

12. 추천 전략 출력

추천 전략 수

3개

표시 방식

S1
S2
S3

한 슬롯에

전략 1개만

허용

13. 데이터 저장 구조

관리자 입력 데이터

localStorage
positions_dataset

운영 데이터

dataset.json

관리자가 수동 export 한다.

14. 엔진 파일 구조
domain
 ├ strategyEngine.ts
 ├ positionSearchEngine.ts
 ├ positionMergeEngine.ts
 ├ adminSaveEngine.ts
 ├ evaluateStrategy.ts
 └ finalCoordinateEngine.ts

검색

kdTree6d.ts
positionKDIndex.ts
signatureKey.ts

관리자

slotAutoRecommend.ts
15. 개발 로드맵

현재 상태

Phase 1

완료

데이터 입력
병합
저장

다음 단계

검색 엔진

그 다음

사용자 추천

마지막

보간
Δ_sys
AI 코멘트