#!/usr/bin/env python3
"""
==============================================================================
5&half System - JSON 형식 대칭 변환 스크립트
==============================================================================
작성일: 2025-12-04
용도: GPT 작업 형식(JSON) → 4개 트랙 자동 생성

기능:
1. B2T_L JSON 파일 파싱
2. 대칭 연산자 적용 (H, V, RPI)
3. 나머지 3개 트랙 JSON 생성
4. 세컨드볼 파생 샘플 생성

사용법:
  python3 json_symmetry_generator.py --input B2T_L_canonical.txt --output-dir ./5_half_system
==============================================================================
"""

import json
import os
import math
from typing import Dict, List, Tuple, Optional
from pathlib import Path


# ==============================================================================
# 좌표 변환 함수
# ==============================================================================

def transform_H_Fg(x: float, y: float) -> Tuple[float, float]:
    """수평 대칭 (Fg 좌표계)"""
    return (80 - x, y)


def transform_V_Fg(x: float, y: float) -> Tuple[float, float]:
    """수직 대칭 (Fg 좌표계)"""
    return (x, 40 - y)


def transform_RPI_Fg(x: float, y: float) -> Tuple[float, float]:
    """180도 회전 (Fg 좌표계)"""
    return (80 - x, 40 - y)


def transform_H_Rg(x: float, y: float) -> Tuple[float, float]:
    """수평 대칭 (Rg 좌표계)"""
    return (80 - x, y)


def transform_V_Rg(x: float, y: float) -> Tuple[float, float]:
    """수직 대칭 (Rg 좌표계)"""
    return (x, 40 - y)


def transform_RPI_Rg(x: float, y: float) -> Tuple[float, float]:
    """180도 회전 (Rg 좌표계)"""
    return (80 - x, 40 - y)


# ==============================================================================
# 타점 변환 함수
# ==============================================================================

def transform_hitpoint(hp_str: str, operation: str) -> str:
    """
    타점 시계 변환
    
    좌선회 ↔ 우선회
    예: "09:45" ↔ "02:15"
    
    Args:
        hp_str: 원본 타점 (예: "01:50")
        operation: "H", "V", "RPI"
    
    Returns:
        변환된 타점
    """
    if not hp_str or hp_str == "NA":
        return hp_str
    
    # 시간 파싱
    try:
        hour, minute = map(int, hp_str.split(':'))
    except:
        return hp_str
    
    # H, RPI: 좌우 반전
    if operation in ["H", "RPI"]:
        # 12시 기준 대칭
        new_hour = 12 - (hour - 12) if hour != 12 else 12
        if new_hour <= 0:
            new_hour = 12
        return f"{new_hour:02d}:{minute:02d}"
    
    return hp_str


# ==============================================================================
# 샘플 대칭 변환
# ==============================================================================

def transform_sample(sample: Dict, operation: str, target_track: str) -> Dict:
    """
    샘플 전체를 대칭 변환
    
    Args:
        sample: 원본 샘플 (JSON)
        operation: "H", "V", "RPI"
        target_track: "B2T_R", "T2B_L", "T2B_R"
    
    Returns:
        변환된 샘플 (JSON)
    """
    import copy
    new_sample = copy.deepcopy(sample)
    
    # 트랙 정보 변경
    new_sample['track'] = target_track
    new_sample['sample_id'] = sample['sample_id'].replace('B2T_L', target_track)
    
    # balls 좌표 변환 (Rg 기준)
    if 'ui' in new_sample and 'balls' in new_sample['ui']:
        for ball_key in ['cue', 'target_center', 'impact', 'second']:
            if ball_key in new_sample['ui']['balls'] and new_sample['ui']['balls'][ball_key]:
                ball = new_sample['ui']['balls'][ball_key]
                if operation == "H":
                    x, y = transform_H_Rg(ball['x'], ball['y'])
                elif operation == "V":
                    x, y = transform_V_Rg(ball['x'], ball['y'])
                else:  # RPI
                    x, y = transform_RPI_Rg(ball['x'], ball['y'])
                
                ball['x'] = round(x, 2)
                ball['y'] = round(y, 2)
    
    # anchors 좌표 변환
    if 'ui' in new_sample and 'anchors' in new_sample['ui']:
        anchors = new_sample['ui']['anchors']
        
        for anchor_key in ['CO', '1C', '2C', '3C', '4C', '5C', '6C', 'target_center']:
            if anchor_key in anchors and anchors[anchor_key]:
                anchor = anchors[anchor_key]
                
                # 좌표계 결정
                if anchor_key in ['CO', '1C', '4C', '5C', '6C']:
                    space = 'Fg'
                else:  # 2C, 3C, target_center
                    space = 'Rg'
                
                # 변환
                if space == 'Fg':
                    if operation == "H":
                        x, y = transform_H_Fg(anchor['x'], anchor['y'])
                    elif operation == "V":
                        x, y = transform_V_Fg(anchor['x'], anchor['y'])
                    else:  # RPI
                        x, y = transform_RPI_Fg(anchor['x'], anchor['y'])
                else:  # Rg
                    if operation == "H":
                        x, y = transform_H_Rg(anchor['x'], anchor['y'])
                    elif operation == "V":
                        x, y = transform_V_Rg(anchor['x'], anchor['y'])
                    else:  # RPI
                        x, y = transform_RPI_Rg(anchor['x'], anchor['y'])
                
                anchor['x'] = round(x, 2)
                anchor['y'] = round(y, 2)
    
    # 타점 변환
    if 'ui' in new_sample and 'display_options' in new_sample['ui']:
        hp = new_sample['ui']['display_options'].get('hitpoint_clock', '')
        new_sample['ui']['display_options']['hitpoint_clock'] = transform_hitpoint(hp, operation)
    
    # sys 값은 변경하지 않음!
    
    return new_sample


# ==============================================================================
# 세컨드볼 파생 샘플 생성
# ==============================================================================

def generate_second_ball_variants(sample: Dict, divisions: int = 5) -> List[Dict]:
    """
    세컨드볼 좌표를 [직전쿠션]→[최종쿠션] 선분으로 분할하여 파생 샘플 생성
    
    Args:
        sample: 원본 샘플
        divisions: 분할 개수
    
    Returns:
        파생 샘플 리스트
    """
    variants = []
    
    # 최종 쿠션 결정
    last_cushion = sample.get('last_cushion', '4C')
    
    # 직전 쿠션 결정
    cushion_order = ['3C', '4C', '5C', '6C']
    try:
        last_idx = cushion_order.index(last_cushion)
        prev_cushion = cushion_order[last_idx - 1] if last_idx > 0 else '2C'
    except:
        prev_cushion = '3C'
        last_cushion = '4C'
    
    # 좌표 추출
    anchors = sample.get('ui', {}).get('anchors', {})
    
    if prev_cushion not in anchors or last_cushion not in anchors:
        print(f"⚠️ {sample['sample_id']}: {prev_cushion} 또는 {last_cushion} 없음")
        return variants
    
    prev_anchor = anchors[prev_cushion]
    last_anchor = anchors[last_cushion]
    
    if not prev_anchor or not last_anchor:
        return variants
    
    x1, y1 = prev_anchor['x'], prev_anchor['y']
    x2, y2 = last_anchor['x'], last_anchor['y']
    
    # 선분 분할
    dx = x2 - x1
    dy = y2 - y1
    
    for i in range(1, divisions + 1):
        import copy
        variant = copy.deepcopy(sample)
        
        # 세컨드볼 좌표 계산
        t = i / divisions
        sb_x = x1 + t * dx
        sb_y = y1 + t * dy
        
        # 샘플 ID 변경
        base_id = sample['sample_id']
        variant['sample_id'] = f"{base_id}_SB{i}"
        
        # 세컨드볼 좌표 업데이트
        if 'ui' in variant and 'balls' in variant['ui']:
            variant['ui']['balls']['second'] = {
                'x': round(sb_x, 2),
                'y': round(sb_y, 2)
            }
        
        # 메타데이터 추가
        variant['second_ball_meta'] = {
            'division': i,
            'percentage': round(t * 100, 1),
            'segment': f"{prev_cushion}→{last_cushion}"
        }
        
        variants.append(variant)
    
    return variants


# ==============================================================================
# 메인 함수
# ==============================================================================

def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='5&half 시스템 JSON 대칭 변환 + 세컨드볼 생성',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument('--input', required=True, help='입력 JSON 파일 (B2T_L_canonical.txt)')
    parser.add_argument('--output-dir', default='./5_half_system', help='출력 디렉토리')
    parser.add_argument('--divisions', type=int, default=5, help='세컨드볼 분할 개수')
    parser.add_argument('--no-second-ball', action='store_true', help='세컨드볼 생성 스킵')
    
    args = parser.parse_args()
    
    # 입력 파일 읽기
    print(f"📖 입력 파일 읽기: {args.input}")
    
    try:
        with open(args.input, 'r', encoding='utf-8') as f:
            b2t_l_sample = json.load(f)
    except Exception as e:
        print(f"❌ 파일 읽기 오류: {e}")
        return
    
    print(f"✅ 샘플 로드: {b2t_l_sample.get('sample_id', 'unknown')}")
    
    # 출력 디렉토리 생성
    output_dir = Path(args.output_dir)
    output_dir.mkdir(exist_ok=True, parents=True)
    
    # B2T_L 저장 (원본)
    b2t_l_path = output_dir / "B2T_L_canonical.json"
    with open(b2t_l_path, 'w', encoding='utf-8') as f:
        json.dump(b2t_l_sample, f, indent=2, ensure_ascii=False)
    print(f"💾 B2T_L 저장: {b2t_l_path}")
    
    # 대칭 변환
    print("\n🔄 대칭 변환 시작...")
    
    # B2T_R (H 변환)
    b2t_r_sample = transform_sample(b2t_l_sample, "H", "B2T_R")
    b2t_r_path = output_dir / "B2T_R_generated.json"
    with open(b2t_r_path, 'w', encoding='utf-8') as f:
        json.dump(b2t_r_sample, f, indent=2, ensure_ascii=False)
    print(f"✅ B2T_R 생성: {b2t_r_path}")
    
    # T2B_L (RPI 변환)
    t2b_l_sample = transform_sample(b2t_l_sample, "RPI", "T2B_L")
    t2b_l_path = output_dir / "T2B_L_generated.json"
    with open(t2b_l_path, 'w', encoding='utf-8') as f:
        json.dump(t2b_l_sample, f, indent=2, ensure_ascii=False)
    print(f"✅ T2B_L 생성: {t2b_l_path}")
    
    # T2B_R (V 변환)
    t2b_r_sample = transform_sample(b2t_l_sample, "V", "T2B_R")
    t2b_r_path = output_dir / "T2B_R_generated.json"
    with open(t2b_r_path, 'w', encoding='utf-8') as f:
        json.dump(t2b_r_sample, f, indent=2, ensure_ascii=False)
    print(f"✅ T2B_R 생성: {t2b_r_path}")
    
    # 세컨드볼 파생 샘플 생성
    if not args.no_second_ball:
        print(f"\n🎯 세컨드볼 파생 샘플 생성 (분할: {args.divisions}개)...")
        
        all_samples = {
            'B2T_L': b2t_l_sample,
            'B2T_R': b2t_r_sample,
            'T2B_L': t2b_l_sample,
            'T2B_R': t2b_r_sample
        }
        
        total_variants = 0
        
        for track_name, sample in all_samples.items():
            variants = generate_second_ball_variants(sample, args.divisions)
            
            if variants:
                # 트랙별 폴더 생성
                track_dir = output_dir / track_name
                track_dir.mkdir(exist_ok=True)
                
                # 각 파생 샘플 저장
                for variant in variants:
                    variant_path = track_dir / f"{variant['sample_id']}.json"
                    with open(variant_path, 'w', encoding='utf-8') as f:
                        json.dump(variant, f, indent=2, ensure_ascii=False)
                
                total_variants += len(variants)
                print(f"  - {track_name}: {len(variants)}개 파생 샘플 생성")
        
        print(f"✅ 총 {total_variants}개 파생 샘플 생성 완료")
    
    # 최종 통계
    print(f"\n📊 최종 통계:")
    print(f"  - 기본 트랙: 4개 (B2T_L, B2T_R, T2B_L, T2B_R)")
    if not args.no_second_ball:
        print(f"  - 파생 샘플: {total_variants}개 (각 트랙 × {args.divisions}개)")
    print(f"  - 출력 디렉토리: {output_dir.absolute()}")
    
    print(f"\n✅ 작업 완료!")
    print(f"\n📂 생성된 파일:")
    for file in sorted(output_dir.rglob('*.json')):
        print(f"  - {file.relative_to(output_dir)}")


if __name__ == '__main__':
    main()