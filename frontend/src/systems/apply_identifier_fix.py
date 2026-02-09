"""Apply identifier naming rule: digit+C -> C+digit (1C_f->C1_f, etc.). CO stays unchanged."""
import os
from pathlib import Path

SYSTEMS_DIR = Path(__file__).parent
REPLACEMENTS = [
    ("6C", "C6"),  # Order: longer/match first to avoid partial matches
    ("5C", "C5"),
    ("4C", "C4"),
    ("3C", "C3"),
    ("1C", "C1"),
]

def fix_file(filepath: Path) -> bool:
    """Apply replacements. Returns True if file was modified."""
    try:
        text = filepath.read_text(encoding="utf-8")
    except Exception as e:
        print(f"  SKIP {filepath.name}: {e}")
        return False
    original = text
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    if text != original:
        filepath.write_text(text, encoding="utf-8")
        return True
    return False

def main():
    count = 0
    for subdir in sorted(SYSTEMS_DIR.iterdir()):
        if not subdir.is_dir() or subdir.name.startswith("."):
            continue
        for name in ("anchors.json", "logic.json", "profile.json"):
            fp = subdir / name
            if fp.exists():
                if fix_file(fp):
                    print(f"Updated: {subdir.name}/{name}")
                    count += 1
    print(f"\nDone. Modified {count} files.")

if __name__ == "__main__":
    main()
