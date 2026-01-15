"""
even_ratio_runtime.py
---------------------
입력을 스키마에 맞춰 검증(경량)하고, 등비 시스템 계산의
*앵커 경로 일치성*과 *결과 유효성*을 반복 점검한다.
외부 라이브러리 없이 동작.

사용 예:
  # 단일 케이스
  python even_ratio_runtime.py --rail long_left --co 10 10 --ob 20 40

  # 무작위 100회 테스트
  python even_ratio_runtime.py --rail long_left --random 100 --seed 7

  # JSON 입력 파일 사용 (스키마 호환)
  python even_ratio_runtime.py --input even_ratio_input.json
"""

import argparse, json, math, random, sys
from dataclasses import dataclass
from typing import Literal, Tuple

MM_PER_GRID = 35.55
BALL_RADIUS_MM = 30.75

Rail = Literal["long_left", "long_right", "short_bottom", "short_top"]

@dataclass
class Point:
    x: float
    y: float

def _edge_distance_rg(p: Point, rail: Rail) -> float:
    if rail == "long_left":
        d_mm = p.x * MM_PER_GRID - BALL_RADIUS_MM
    elif rail == "long_right":
        d_mm = (80 - p.x) * MM_PER_GRID - BALL_RADIUS_MM
    elif rail == "short_bottom":
        d_mm = p.y * MM_PER_GRID - BALL_RADIUS_MM
    elif rail == "short_top":
        d_mm = (40 - p.y) * MM_PER_GRID - BALL_RADIUS_MM
    else:
        raise ValueError(f"Unknown rail: {rail}")
    return max(d_mm / MM_PER_GRID, 0.0)

def _rail_anchor(rail: Rail) -> Tuple[float | None, float | None]:
    if rail == "long_left":  return (0.0, None)
    if rail == "long_right": return (80.0, None)
    if rail == "short_bottom": return (None, 0.0)
    if rail == "short_top":    return (None, 40.0)
    raise ValueError(f"Unknown rail: {rail}")

def compute_c1(co: Point, ob: Point, rail: Rail, division: str = "internal"):
    d1 = _edge_distance_rg(co, rail)
    d2 = _edge_distance_rg(ob, rail)
    denom = (d1 + d2) if division == "internal" else (d1 - d2)
    if abs(denom) < 1e-9:
        raise ZeroDivisionError("Degenerate configuration: denominator ~ 0.")
    x_anchor, y_anchor = _rail_anchor(rail)
    t = d1 / denom
    if x_anchor is not None:
        # long rail: y varies
        c1 = Point(x_anchor, co.y + (ob.y - co.y) * t)
        F1 = Point(x_anchor, co.y)
        F2 = Point(x_anchor, ob.y)
    else:
        # short rail: x varies
        c1 = Point(co.x + (ob.x - co.x) * t, y_anchor)  # type: ignore[arg-type]
        F1 = Point(co.x, y_anchor)  # type: ignore[arg-type]
        F2 = Point(ob.x, y_anchor)  # type: ignore[arg-type]
    return c1, d1, d2, F1, F2, t

def _within(v: float, target: float, tol: float) -> bool:
    return abs(v - target) <= tol

def validate_input(obj: dict):
    # 경량 검증: 키 존재, 타입, 범위
    def need(k): 
        if k not in obj: raise ValueError(f"Missing required field: {k}")
    need("rail"); need("CO"); need("OB")
    rail = obj["rail"]
    if rail not in {"long_left","long_right","short_bottom","short_top"}:
        raise ValueError("rail must be one of: long_left,long_right,short_bottom,short_top")
    for name in ("CO","OB"):
        node = obj[name]
        if not isinstance(node, dict): raise ValueError(f"{name} must be object")
        for c, lo, hi in (("x",0,80), ("y",0,40)):
            if c not in node: raise ValueError(f"{name}.{c} is required")
            v = float(node[c])
            if not (lo <= v <= hi):
                raise ValueError(f"{name}.{c} out of range [{lo},{hi}]")
    div = obj.get("division","internal")
    if div not in {"internal","external"}:
        raise ValueError("division must be internal or external")
    tol = float(obj.get("tolerance", 1e-6))
    if tol < 0: raise ValueError("tolerance must be >= 0")
    return rail, Point(float(obj["CO"]["x"]), float(obj["CO"]["y"])), Point(float(obj["OB"]["x"]), float(obj["OB"]["y"])), div, tol

def run_case(case: dict):
    rail, CO, OB, division, tol = validate_input(case)
    c1, d1, d2, F1, F2, t = compute_c1(CO, OB, rail, division)
    # 1) 앵커 경로 일치성: C1이 레일 위에 있는지
    ok_anchor = True
    if rail in {"long_left","long_right"}:
        x_expected = 0.0 if rail == "long_left" else 80.0
        ok_anchor = _within(c1.x, x_expected, tol) and (0 - tol <= c1.y <= 40 + tol)
    else:
        y_expected = 0.0 if rail == "short_bottom" else 40.0
        ok_anchor = _within(c1.y, y_expected, tol) and (0 - tol <= c1.x <= 80 + tol)

    # 2) 내분 일치성: F1→F2 상의 내분 비율 t와 C1 위치가 일치하는지
    if rail in {"long_left","long_right"}:
        total = (F2.y - F1.y)
        part = (c1.y - F1.y)
    else:
        total = (F2.x - F1.x)
        part = (c1.x - F1.x)
    ok_ratio = True
    if abs(total) < 1e-12:
        # F1==F2: 두 공이 같은 y(또는 x). 이 경우 C1=F1=F2 이어야 함.
        if rail in {"long_left","long_right"}:
            ok_ratio = _within(c1.y, F1.y, tol)
        else:
            ok_ratio = _within(c1.x, F1.x, tol)
    else:
        ok_ratio = _within(part/total, t, max(tol, 1e-6))

    # 3) 결과 유효성: 0<=C1.x<=80, 0<=C1.y<=40
    ok_bounds = (0 - tol <= c1.x <= 80 + tol) and (0 - tol <= c1.y <= 40 + tol)

    return {
        "input": case,
        "C1": {"x": round(c1.x, 6), "y": round(c1.y, 6)},
        "d1": round(d1, 6), "d2": round(d2, 6),
        "t": round(t, 9),
        "checks": {"anchor_on_rail": ok_anchor, "ratio_match": ok_ratio, "in_bounds": ok_bounds},
        "pass": bool(ok_anchor and ok_ratio and ok_bounds)
    }

def random_case(rail: Rail) -> dict:
    # 무작위 케이스 생성 (RG 범위 내)
    if rail in {"long_left","long_right"}:
        co = {"x": random.uniform(0, 80), "y": random.uniform(0, 40)}
        ob = {"x": random.uniform(0, 80), "y": random.uniform(0, 40)}
    else:
        co = {"x": random.uniform(0, 80), "y": random.uniform(0, 40)}
        ob = {"x": random.uniform(0, 80), "y": random.uniform(0, 40)}
    return {"rail": rail, "CO": co, "OB": ob, "division": "internal", "tolerance": 1e-6}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", type=str, help="입력 JSON 파일 경로(스키마 호환)")
    ap.add_argument("--rail", type=str, choices=["long_left","long_right","short_bottom","short_top"], help="레일 선택")
    ap.add_argument("--co", type=float, nargs=2, metavar=("X","Y"), help="내 공 좌표(RG)")
    ap.add_argument("--ob", type=float, nargs=2, metavar=("X","Y"), help="뒤 공 좌표(RG)")
    ap.add_argument("--division", type=str, choices=["internal","external"], default="internal")
    ap.add_argument("--tolerance", type=float, default=1e-6)
    ap.add_argument("--random", type=int, default=0, help="무작위 테스트 횟수")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    cases = []

    if args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            obj = json.load(f)
        # 파일이 배열이면 여러 케이스, 객체면 단일 케이스
        if isinstance(obj, list):
            cases.extend(obj)
        else:
            cases.append(obj)
    elif args.random > 0:
        if args.seed is not None:
            random.seed(args.seed)
        rail = args.rail or "long_left"
        for _ in range(args.random):
            cases.append(random_case(rail))
    else:
        # 단일 케이스
        if not (args.rail and args.co and args.ob):
            print("단일 케이스: --rail 과 --co x y --ob x y 가 필요합니다.", file=sys.stderr)
            sys.exit(2)
        cases.append({
            "rail": args.rail,
            "CO": {"x": args.co[0], "y": args.co[1]},
            "OB": {"x": args.ob[0], "y": args.ob[1]},
            "division": args.division,
            "tolerance": args.tolerance
        })

    results = []
    passed = 0
    for c in cases:
        try:
            res = run_case(c)
        except Exception as e:
            res = {"input": c, "error": str(e), "pass": False}
        results.append(res)
        if res.get("pass"):
            passed += 1

    # 요약
    print(f"[Even Ratio Runtime] cases={len(cases)}  pass={passed}  fail={len(cases)-passed}")
    # 자세한 결과 출력
    for i, r in enumerate(results, 1):
        print(f"#{i}: {json.dumps(r, ensure_ascii=False)}")

if __name__ == "__main__":
    main()
