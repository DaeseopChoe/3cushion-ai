"""CLI: python -m product export|package|deploy|pipeline"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from generator.fixtures import FixtureGeometryPort

from product.deployment import deployment_report_to_json, run_deployment
from product.factory import run_product_export
from product.handoff import serialize_handoff
from product.package_factory import emit_published_package_from_handoff_json
from product.publish_envelope_static import (
    default_repo_dataset_root,
    publish_envelope_static,
)
from product.exceptions import (
    EnvelopeStaticPublishError,
    InvalidEnvelopePublishInput,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="product",
        description="Phase 4 Product Pipeline — Export / Package / Deploy / Publish",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    export_p = sub.add_parser(
        "export",
        help="Mission 01: Export → Product Host → Generator → Export Handoff Artifact",
    )
    export_p.add_argument("--request", required=True, type=Path)
    export_p.add_argument("--out", required=True, type=Path)
    export_p.add_argument("--geometry", choices=("fixture",), default="fixture")

    package_p = sub.add_parser(
        "package",
        help="Mission 02: Export Handoff Artifact → Published Package folder",
    )
    package_p.add_argument("--handoff", required=True, type=Path)
    package_p.add_argument("--out", required=True, type=Path)

    deploy_p = sub.add_parser(
        "deploy",
        help="Mission 03: Published Package → Deployment Workflow (prepare/report)",
    )
    deploy_p.add_argument(
        "--package",
        required=True,
        type=Path,
        help="Path to Published Package directory (…/package)",
    )
    deploy_p.add_argument(
        "--target",
        default="local_staging",
        choices=("local_staging", "git_ready", "vercel_ready"),
    )
    deploy_p.add_argument(
        "--no-staging-mirror",
        action="store_true",
        help="Skip filesystem staging mirror",
    )

    pipe_p = sub.add_parser(
        "pipeline",
        help="Authoring Integration continuity: export → package → deploy",
    )
    pipe_p.add_argument("--request", required=True, type=Path)
    pipe_p.add_argument("--out", required=True, type=Path)
    pipe_p.add_argument("--target", default="local_staging")
    pipe_p.add_argument("--geometry", choices=("fixture",), default="fixture")

    pub_p = sub.add_parser(
        "publish-envelope-static",
        help=(
            "Phase 5: Published Package dataset.json → "
            "dataset/_published/envelope/dataset.json (full replace)"
        ),
    )
    pub_p.add_argument(
        "--package",
        required=True,
        type=Path,
        help="Published Package directory or export root containing package/",
    )
    pub_p.add_argument(
        "--dataset-root",
        type=Path,
        default=None,
        help="Frontend static dataset root (default: <repo>/dataset)",
    )

    args = parser.parse_args(argv)

    if args.command == "export":
        payload = json.loads(args.request.read_text(encoding="utf-8"))
        artifact = run_product_export(payload, geometry=FixtureGeometryPort())
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(
            json.dumps(serialize_handoff(artifact), indent=2, ensure_ascii=False)
            + "\n",
            encoding="utf-8",
        )
        print(f"Export Handoff Artifact written: {args.out}")
        return 0

    if args.command == "package":
        handoff = json.loads(args.handoff.read_text(encoding="utf-8"))
        result = emit_published_package_from_handoff_json(handoff, args.out)
        print(f"Published Package written: {result.package_dir}")
        return 0

    if args.command == "deploy":
        result = run_deployment(
            args.package,
            target_id=args.target,
            mirror_staging=not args.no_staging_mirror,
        )
        print(
            f"Deployment {result.report.status.state}: "
            f"report={result.report_path} target={args.target}"
        )
        return 0

    if args.command == "pipeline":
        # Mission 04 continuity (absorbed): request → handoff → package → deploy
        payload = json.loads(args.request.read_text(encoding="utf-8"))
        out_root = args.out
        out_root.mkdir(parents=True, exist_ok=True)
        handoff_path = out_root / "export_handoff.json"
        artifact = run_product_export(payload, geometry=FixtureGeometryPort())
        handoff_path.write_text(
            json.dumps(serialize_handoff(artifact), indent=2, ensure_ascii=False)
            + "\n",
            encoding="utf-8",
        )
        pkg = emit_published_package_from_handoff_json(
            serialize_handoff(artifact), out_root
        )
        dep = run_deployment(pkg.package_dir, target_id=args.target)
        print(
            f"Pipeline complete: handoff={handoff_path} "
            f"package={pkg.package_dir} deploy={dep.report.status.state}"
        )
        return 0

    if args.command == "publish-envelope-static":
        dataset_root = args.dataset_root or default_repo_dataset_root()
        try:
            result = publish_envelope_static(
                args.package,
                dataset_root=dataset_root,
            )
        except (InvalidEnvelopePublishInput, EnvelopeStaticPublishError) as exc:
            print(f"publish-envelope-static FAILED: {exc}", file=sys.stderr)
            return 1
        print(
            "publish-envelope-static OK\n"
            f"  source={result.source_path}\n"
            f"  target={result.target_path}\n"
            f"  datasetIdentity={result.dataset_identity}\n"
            f"  records={result.record_count}"
        )
        return 0

    parser.error(f"unknown command {args.command}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
