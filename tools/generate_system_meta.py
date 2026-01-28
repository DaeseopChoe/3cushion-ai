import json
from pathlib import Path

ROOT = Path("data/systems")
SCHEMA_DIR = ROOT / "schema"

# -------------------------------------------------
# Utils
# -------------------------------------------------

def load_json(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def write_json(path: Path, data: dict):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def infer_rail_from_coord(x: float, y: float) -> str:
    # Fg 기준 상수선 (±0.02 허용)
    if y <= -2.2:
        return "BOTTOM"
    if y >= 42.2:
        return "TOP"
    if x <= -2.2:
        return "LEFT"
    if x >= 82.2:
        return "RIGHT"
    return "ANY"

def infer_required_cushions_from_anchors(anchors: list) -> int:
    """
    anchors: trajectory anchor list
    매우 보수적인 1차 규칙:
    - 레일 접촉 anchor 수 - 1
    - 최소 1
    """
    rail_hits = [
        a for a in anchors
        if a.get("rail") in ("BOTTOM", "TOP", "LEFT", "RIGHT")
    ]
    return max(1, len(rail_hits) - 1)

# -------------------------------------------------
# Main
# -------------------------------------------------

def main():
    print("=== generate_system_meta.py (fallback enabled) ===")

    for system_dir in ROOT.iterdir():
        if not system_dir.is_dir():
            continue
        if system_dir == SCHEMA_DIR:
            continue

        meta_path = system_dir / "system_meta.json"
        if meta_path.exists():
            print(f"[SKIP] {system_dir.name} already has system_meta.json")
            continue

        anchors_path = system_dir / "anchors.json"

        # -------------------------------
        # Case 1: anchors.json 존재 → 최대한 추론
        # -------------------------------
        if anchors_path.exists():
            try:
                anchors_json = load_json(anchors_path)

                trajectories = anchors_json.get("trajectories", {})
                if not trajectories:
                    raise ValueError("anchors.json has no trajectories")

                # canonical_track: 첫 trajectory key
                canonical_track = next(iter(trajectories.keys()))
                anchors = trajectories[canonical_track]

                entry_anchor = anchors[0]
                exit_anchor = anchors[-1]

                entry_rail = infer_rail_from_coord(
                    entry_anchor.get("x", 0),
                    entry_anchor.get("y", 0)
                )
                exit_rail = infer_rail_from_coord(
                    exit_anchor.get("x", 0),
                    exit_anchor.get("y", 0)
                )

                required_cushions = infer_required_cushions_from_anchors(anchors)

                meta = {
                    "system_id": system_dir.name,
                    "family": "other",
                    "required_cushions": required_cushions,
                    "canonical_track": canonical_track,
                    "entry_rail": entry_rail,
                    "exit_rail": exit_rail,
                    "allowed_tracks": [canonical_track],
                    "difficulty": 3,
                    "notes": "AUTO-GENERATED from anchors.json (review required)"
                }

                write_json(meta_path, meta)
                print(f"[OK] Generated system_meta.json for {system_dir.name} (anchors based)")
                continue

            except Exception as e:
                print(f"[WARN] Anchor parsing failed in {system_dir.name}: {e}")

        # -------------------------------
        # Case 2: anchors.json 없음 → Fallback 생성
        # -------------------------------
        meta = {
            "system_id": system_dir.name,
            "family": "other",
            "required_cushions": 3,
            "canonical_track": "B2T_L",
            "entry_rail": "BOTTOM",
            "exit_rail": "TOP",
            "allowed_tracks": ["B2T_L"],
            "difficulty": 3,
            "notes": "FALLBACK META: no anchors.json yet"
        }

        write_json(meta_path, meta)
        print(f"[OK] Generated system_meta.json for {system_dir.name} (fallback)")

    print("=== DONE ===")

if __name__ == "__main__":
    main()
