#!/usr/bin/env python3
"""
Repeatable, idempotent headless installer and smoke-tester for the DREAM Studio
Picture-to-3D Converter on the Alienware node (%USERPROFILE%\\dream-studio-converter).

Approved components (2026-11-12):
  - VAST-AI/TripoSG code + weights (MIT License, ~7.40 GiB / 7,946,491,173 bytes)
  - stabilityai/TripoSR code + weights (MIT License, ~1.56 GiB / 1,677,247,729 bytes)
  - danielgatis/rembg + u2net.onnx (MIT / Apache-2.0 License, ~0.17 GiB / 175,997,641 bytes)
  - @gltf-transform/cli + meshoptimizer npm packages (MIT License, ~25 MB)

Explicitly excluded / blocked:
  - VAST-AI/UniRig (not approved yet)
  - briaai/RMBG-1.4 (non-commercial licence — hard blocked; replaced with rembg u2net)
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, List, Tuple

USERPROFILE = os.environ.get("USERPROFILE") or os.path.expanduser("~")
LOCALAPPDATA = os.environ.get("LOCALAPPDATA") or os.path.join(USERPROFILE, "AppData", "Local")
BASE_DIR = Path(USERPROFILE) / "dream-studio-converter"
LOG_PATH = BASE_DIR / "install-log.txt"
CREATE_NO_WINDOW = 0x08000000 if os.name == "nt" else 0

BANNED_SUBSTRINGS = (
    "briaai",
    "rmbg-1.4",
    "unirig",
    "stable-fast-3d",
    "stable-point-aware-3d",
    "hunyuan3d",
)

# Exact byte sizes verified against Hugging Face and GitHub releases and
# docs/tech/studio-converter-pipeline-study-2026-11-11.md (section 5B).
WEIGHT_FILES: List[Tuple[str, str, int]] = [
    # stabilityai/TripoSR (MIT License, 1.56 GiB)
    (
        "https://huggingface.co/stabilityai/TripoSR/resolve/main/config.yaml",
        "weights/TripoSR/config.yaml",
        987,
    ),
    (
        "https://huggingface.co/stabilityai/TripoSR/resolve/main/model.ckpt",
        "weights/TripoSR/model.ckpt",
        1677246742,
    ),
    # danielgatis/rembg u2net.onnx (MIT / Apache-2.0 License, 0.17 GiB)
    (
        "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx",
        "weights/u2net/u2net.onnx",
        175997641,
    ),
    # VAST-AI/TripoSG (MIT License, 7.40 GiB — without briaai/RMBG-1.4)
    (
        "https://huggingface.co/VAST-AI/TripoSG/resolve/main/model_index.json",
        "weights/TripoSG/model_index.json",
        525,
    ),
    (
        "https://huggingface.co/VAST-AI/TripoSG/resolve/main/feature_extractor_dinov2/preprocessor_config.json",
        "weights/TripoSG/feature_extractor_dinov2/preprocessor_config.json",
        436,
    ),
    (
        "https://huggingface.co/VAST-AI/TripoSG/resolve/main/image_encoder_dinov2/config.json",
        "weights/TripoSG/image_encoder_dinov2/config.json",
        1104,
    ),
    (
        "https://huggingface.co/VAST-AI/TripoSG/resolve/main/image_encoder_dinov2/model.safetensors",
        "weights/TripoSG/image_encoder_dinov2/model.safetensors",
        1217522888,
    ),
    (
        "https://huggingface.co/VAST-AI/TripoSG/resolve/main/scheduler/scheduler_config.json",
        "weights/TripoSG/scheduler/scheduler_config.json",
        158,
    ),
    (
        "https://huggingface.co/VAST-AI/TripoSG/resolve/main/transformer/config.json",
        "weights/TripoSG/transformer/config.json",
        191,
    ),
    (
        "https://huggingface.co/VAST-AI/TripoSG/resolve/main/transformer/diffusion_pytorch_model.safetensors",
        "weights/TripoSG/transformer/diffusion_pytorch_model.safetensors",
        5758280104,
    ),
    (
        "https://huggingface.co/VAST-AI/TripoSG/resolve/main/vae/config.json",
        "weights/TripoSG/vae/config.json",
        335,
    ),
    (
        "https://huggingface.co/VAST-AI/TripoSG/resolve/main/vae/diffusion_pytorch_model.safetensors",
        "weights/TripoSG/vae/diffusion_pytorch_model.safetensors",
        970685468,
    ),
]

REPOS: List[Tuple[str, str]] = [
    ("https://github.com/VAST-AI-Research/TripoSR.git", "repos/TripoSR"),
    ("https://github.com/VAST-AI-Research/TripoSG.git", "repos/TripoSG"),
]


def sanitize(text: str) -> str:
    if not text:
        return ""
    out = text.replace(LOCALAPPDATA, "%LOCALAPPDATA%")
    out = out.replace(LOCALAPPDATA.replace("\\", "/"), "%LOCALAPPDATA%")
    out = out.replace(USERPROFILE, "%USERPROFILE%")
    out = out.replace(USERPROFILE.replace("\\", "/"), "%USERPROFILE%")
    return out


def log(msg: str) -> None:
    BASE_DIR.mkdir(parents=True, exist_ok=True)
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    line = sanitize(f"[{ts}] {msg}")
    print(line, flush=True)
    with open(LOG_PATH, "a", encoding="utf-8") as fh:
        fh.write(line + "\n")


def run_headless(cmd: List[str], cwd: Path | None = None, env: Dict[str, str] | None = None) -> str:
    merged_env = os.environ.copy()
    merged_env["PYTHONIOENCODING"] = "utf-8"
    merged_env["U2NET_HOME"] = str(BASE_DIR / "weights" / "u2net")
    if env:
        merged_env.update(env)
    proc = subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        env=merged_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        creationflags=CREATE_NO_WINDOW,
    )
    output = sanitize(proc.stdout or "")
    if proc.returncode != 0:
        log(f"COMMAND FAILED (exit {proc.returncode}): {' '.join(sanitize(c) for c in cmd)}\n{output}")
        raise RuntimeError(f"Command failed with exit code {proc.returncode}")
    return output


def assert_url_allowed(url: str) -> None:
    low = url.lower()
    for banned in BANNED_SUBSTRINGS:
        if banned in low:
            raise RuntimeError(f"Blocked prohibited or unapproved download URL: {url}")
    if not (low.startswith("https://huggingface.co/") or low.startswith("https://github.com/")):
        raise RuntimeError(f"Only public Hugging Face and GitHub URLs are allowed: {url}")


def download_file_atomic(url: str, rel_dest: str, expected_bytes: int) -> None:
    assert_url_allowed(url)
    dest = BASE_DIR / Path(rel_dest)
    part = dest.with_suffix(dest.suffix + ".part")
    dest.parent.mkdir(parents=True, exist_ok=True)

    if dest.exists():
        actual = dest.stat().st_size
        if actual == expected_bytes:
            log(f"SKIP verified {rel_dest} ({actual} bytes)")
            return
        log(f"SIZE MISMATCH on {rel_dest} ({actual} != {expected_bytes}); removing corrupt file")
        dest.unlink()

    existing = part.stat().st_size if part.exists() else 0
    if existing > expected_bytes:
        part.unlink()
        existing = 0

    headers = {"User-Agent": "dream-studio-converter-installer/1.0"}
    mode = "ab" if existing > 0 else "wb"
    if existing > 0:
        headers["Range"] = f"bytes={existing}-"
        log(f"RESUME {rel_dest} at byte {existing}/{expected_bytes}")
    else:
        log(f"START download {rel_dest} ({expected_bytes / 1048576:.2f} MiB) from {url}")

    req = urllib.request.Request(url, headers=headers)
    t0 = time.time()
    last_log = t0
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            code = resp.getcode()
            if code in (401, 403):
                raise RuntimeError(f"Gated/auth required (HTTP {code}) on {url}; stopping immediately.")
            if existing > 0 and code == 200:
                existing = 0
                mode = "wb"
            with open(part, mode) as out:
                downloaded = existing
                while True:
                    chunk = resp.read(4 * 1024 * 1024)
                    if not chunk:
                        break
                    out.write(chunk)
                    downloaded += len(chunk)
                    now = time.time()
                    if now - last_log >= 10.0:
                        pct = (downloaded / expected_bytes) * 100.0
                        rate = (downloaded - existing) / max(0.001, now - t0) / 1048576.0
                        log(f"PROGRESS {rel_dest}: {downloaded}/{expected_bytes} bytes ({pct:.1f}%, {rate:.1f} MiB/s)")
                        last_log = now
    except urllib.error.HTTPError as exc:
        if exc.code in (401, 403):
            log(f"FATAL: Sign-in or gated terms required (HTTP {exc.code}) for {url}. Stopping.")
        raise

    actual = part.stat().st_size
    if actual != expected_bytes:
        raise RuntimeError(f"Size check failed for {rel_dest}: got {actual}, expected {expected_bytes}")
    os.replace(part, dest)
    log(f"VERIFIED {rel_dest}: {actual} bytes ({actual / 1048576:.2f} MiB) in {time.time() - t0:.1f}s")


def ensure_repos_cloned_and_patched() -> None:
    for url, rel_dir in REPOS:
        assert_url_allowed(url)
        dest = BASE_DIR / Path(rel_dir)
        tmp = BASE_DIR / Path(rel_dir + ".tmp")
        if (dest / ".git").exists():
            commit = run_headless(["git", "-C", str(dest), "rev-parse", "HEAD"]).strip()
            log(f"SKIP clone {rel_dir} (present at commit {commit})")
        else:
            if tmp.exists():
                shutil.rmtree(tmp)
            dest.parent.mkdir(parents=True, exist_ok=True)
            log(f"CLONE {url} -> %USERPROFILE%\\dream-studio-converter\\{rel_dir}")
            run_headless(["git", "clone", "--depth", "1", url, str(tmp)])
            os.replace(tmp, dest)
            commit = run_headless(["git", "-C", str(dest), "rev-parse", "HEAD"]).strip()
            log(f"CLONED {rel_dir} at commit {commit}")

    patch_triposg_clean_room()
    patch_triposr_isosurface()


def patch_triposg_clean_room() -> None:
    """
    Replaces briaai/RMBG-1.4 (non-commercial) inside TripoSG's helper scripts with
    danielgatis/rembg (u2net.onnx, MIT/Apache-2.0) and adds a pure-Python marching-cubes
    fallback when the optional diso CUDA extension is not compiled on Windows.
    """
    triposg_dir = BASE_DIR / "repos" / "TripoSG"
    briarmbg_path = triposg_dir / "scripts" / "briarmbg.py"
    briarmbg_guard = '''"""
Clean-room guard module replacing briaai/RMBG-1.4.
briaai/RMBG-1.4 is governed by a non-commercial license and is strictly prohibited.
Background removal in DREAM Studio uses danielgatis/rembg (u2net.onnx, MIT License).
"""

class BriaRMBG:
    @classmethod
    def from_pretrained(cls, *args, **kwargs):
        raise RuntimeError(
            "BLOCKED: briaai/RMBG-1.4 is non-commercial and prohibited. "
            "Use danielgatis/rembg (u2net.onnx) instead."
        )
'''
    briarmbg_path.write_text(briarmbg_guard, encoding="utf-8")
    log("PATCHED repos/TripoSG/scripts/briarmbg.py -> blocked briaai/RMBG-1.4 non-commercial model")

    image_process_path = triposg_dir / "scripts" / "image_process.py"
    image_process_code = '''# -*- coding: utf-8 -*-
"""
Clean-room image preprocessing for TripoSG using danielgatis/rembg (u2net.onnx, MIT License)
instead of the prohibited non-commercial briaai/RMBG-1.4 checkpoint.
"""
import os
import numpy as np
from PIL import Image
import rembg


def prepare_image(image_path, bg_color=np.array([1.0, 1.0, 1.0]), rmbg_net=None, padding_ratio=0.1):
    if isinstance(image_path, Image.Image):
        src_img = image_path.convert("RGBA")
    else:
        src_img = Image.open(image_path).convert("RGBA")

    arr = np.array(src_img)
    alpha = arr[:, :, 3]
    has_existing_alpha = (alpha.min() < 10) and (alpha.max() > 245)

    if not has_existing_alpha:
        session = rmbg_net if rmbg_net is not None else rembg.new_session("u2net")
        rgba_img = rembg.remove(src_img.convert("RGB"), session=session)
        arr = np.array(rgba_img)
        alpha = arr[:, :, 3]

    rows, cols = np.where(alpha > 16)
    if rows.size == 0 or cols.size == 0:
        raise ValueError("Input image foreground is empty after background segmentation")

    y_min, y_max = int(rows.min()), int(rows.max())
    x_min, x_max = int(cols.min()), int(cols.max())
    crop_rgba = arr[y_min : y_max + 1, x_min : x_max + 1].astype(np.float32) / 255.0

    h, w = crop_rgba.shape[:2]
    side = max(h, w)
    pad_side = int(round(side * (1.0 + 2.0 * padding_ratio)))
    bg = np.ones((pad_side, pad_side, 3), dtype=np.float32) * np.asarray(bg_color, dtype=np.float32).reshape(1, 1, 3)

    y0 = (pad_side - h) // 2
    x0 = (pad_side - w) // 2
    fg_rgb = crop_rgba[:, :, :3]
    fg_a = crop_rgba[:, :, 3:4]
    bg[y0 : y0 + h, x0 : x0 + w] = fg_rgb * fg_a + bg[y0 : y0 + h, x0 : x0 + w] * (1.0 - fg_a)

    out_uint8 = np.clip(bg * 255.0, 0, 255).astype(np.uint8)
    return Image.fromarray(out_uint8, mode="RGB")
'''
    image_process_path.write_text(image_process_code, encoding="utf-8")
    log("PATCHED repos/TripoSG/scripts/image_process.py -> wired to rembg (u2net.onnx)")

    inf_utils_path = triposg_dir / "triposg" / "inference_utils.py"
    inf_utils_text = inf_utils_path.read_text(encoding="utf-8")
    if "from diso import DiffDMC" in inf_utils_text and "DiffDMC = None" not in inf_utils_text:
        inf_utils_text = inf_utils_text.replace(
            "from diso import DiffDMC",
            "try:\n    from diso import DiffDMC\nexcept ImportError:\n    DiffDMC = None",
        )
        old_dmc_block = """        dmc = DiffDMC(dtype=torch.float32).to(grid_logits.device)
        sdf = -grid_logits / octree_resolution
        sdf = sdf.to(torch.float32).contiguous()
        vertices, faces = dmc(sdf, deform=None, return_quads=False, normalize=False)
        vertices = vertices.detach().cpu().numpy()
        faces = faces.detach().cpu().numpy()[:, ::-1]"""
        new_dmc_block = """        if DiffDMC is not None:
            dmc = DiffDMC(dtype=torch.float32).to(grid_logits.device)
            sdf = -grid_logits / octree_resolution
            sdf = sdf.to(torch.float32).contiguous()
            vertices, faces = dmc(sdf, deform=None, return_quads=False, normalize=False)
            vertices = vertices.detach().cpu().numpy()
            faces = faces.detach().cpu().numpy()[:, ::-1]
        else:
            vol = grid_logits.float().cpu().numpy()
            vol = np.nan_to_num(vol, nan=10.0)
            vertices, faces, _, _ = measure.marching_cubes(vol, 0.0, method="lewiner")"""
        inf_utils_text = inf_utils_text.replace(old_dmc_block, new_dmc_block)
        inf_utils_path.write_text(inf_utils_text, encoding="utf-8")
        log("PATCHED repos/TripoSG/triposg/inference_utils.py -> added marching_cubes fallback when diso is absent")

    inf_script_path = triposg_dir / "scripts" / "inference_triposg.py"
    inf_script_code = '''import argparse
import os
import sys
from typing import Any, Union

import numpy as np
import rembg
import torch
import trimesh
from PIL import Image

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from triposg.pipelines.pipeline_triposg import TripoSGPipeline
from image_process import prepare_image

try:
    import pymeshlab
except ImportError:
    pymeshlab = None


@torch.no_grad()
def run_triposg(
    pipe: Any,
    image_input: Union[str, Image.Image],
    rmbg_net: Any,
    seed: int,
    num_inference_steps: int = 50,
    guidance_scale: float = 7.0,
    faces: int = -1,
    octree_depth: int = 8,
) -> trimesh.Trimesh:
    img_pil = prepare_image(image_input, bg_color=np.array([1.0, 1.0, 1.0]), rmbg_net=rmbg_net)
    outputs = pipe(
        image=img_pil,
        generator=torch.Generator(device=pipe.device).manual_seed(seed),
        num_inference_steps=num_inference_steps,
        guidance_scale=guidance_scale,
        flash_octree_depth=octree_depth,
    ).samples[0]
    mesh = trimesh.Trimesh(outputs[0].astype(np.float32), np.ascontiguousarray(outputs[1]))
    if faces > 0 and pymeshlab is not None and mesh.faces.shape[0] > faces:
        ms = pymeshlab.MeshSet()
        ms.add_mesh(pymeshlab.Mesh(vertex_matrix=mesh.vertices, face_matrix=mesh.faces))
        ms.meshing_merge_close_vertices()
        ms.meshing_decimation_quadric_edge_collapse(targetfacenum=faces)
        cm = ms.current_mesh()
        mesh = trimesh.Trimesh(vertices=cm.vertex_matrix(), faces=cm.face_matrix())
    return mesh


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image-input", type=str, required=True)
    parser.add_argument("--output-path", type=str, default="./output.glb")
    parser.add_argument("--weights-dir", type=str, default="")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--num-inference-steps", type=int, default=25)
    parser.add_argument("--guidance-scale", type=float, default=7.0)
    parser.add_argument("--faces", type=int, default=-1)
    parser.add_argument("--octree-depth", type=int, default=8)
    args = parser.parse_args()

    base_dir = os.path.join(os.environ.get("USERPROFILE", os.path.expanduser("~")), "dream-studio-converter")
    os.environ.setdefault("U2NET_HOME", os.path.join(base_dir, "weights", "u2net"))
    triposg_weights_dir = args.weights_dir or os.path.join(base_dir, "weights", "TripoSG")

    rmbg_session = rembg.new_session("u2net")
    pipe = TripoSGPipeline.from_pretrained(triposg_weights_dir).to("cuda", torch.float16)
    mesh = run_triposg(
        pipe,
        image_input=args.image_input,
        rmbg_net=rmbg_session,
        seed=args.seed,
        num_inference_steps=args.num_inference_steps,
        guidance_scale=args.guidance_scale,
        faces=args.faces,
        octree_depth=args.octree_depth,
    )
    os.makedirs(os.path.dirname(os.path.abspath(args.output_path)), exist_ok=True)
    mesh.export(args.output_path)
    print(f"Mesh saved to {args.output_path}")
'''
    inf_script_path.write_text(inf_script_code, encoding="utf-8")
    log("PATCHED repos/TripoSG/scripts/inference_triposg.py -> local weights + rembg u2net only")


def patch_triposr_isosurface() -> None:
    """
    Ensures TripoSR's MarchingCubeHelper uses PyMCubes (mcubes) or scikit-image
    marching_cubes when torchmcubes is not compiled with a C++/CUDA toolchain.
    """
    iso_path = BASE_DIR / "repos" / "TripoSR" / "tsr" / "models" / "isosurface.py"
    iso_text = iso_path.read_text(encoding="utf-8")
    if "from torchmcubes import marching_cubes" in iso_text and "import mcubes" not in iso_text:
        fallback_import = """try:
    from torchmcubes import marching_cubes
except ImportError:
    import mcubes

    def marching_cubes(vol: torch.Tensor, thresh: float):
        v, f = mcubes.marching_cubes(vol.detach().cpu().numpy(), float(thresh))
        # Match torchmcubes axis order (z, y, x) before MarchingCubeHelper flips [2, 1, 0]
        v_zyx = np.ascontiguousarray(v[:, [2, 1, 0]], dtype=np.float32)
        return torch.from_numpy(v_zyx), torch.from_numpy(np.ascontiguousarray(f, dtype=np.int64))
"""
        iso_text = iso_text.replace("from torchmcubes import marching_cubes", fallback_import)
        iso_path.write_text(iso_text, encoding="utf-8")
        log("PATCHED repos/TripoSR/tsr/models/isosurface.py -> added PyMCubes fallback for Windows")


def ensure_venv_and_packages() -> Path:
    venv_dir = BASE_DIR / ".venv"
    venv_py = venv_dir / "Scripts" / "python.exe"
    if not venv_py.exists():
        log("Creating Python 3.11 virtual environment at %USERPROFILE%\\dream-studio-converter\\.venv")
        run_headless(["uv", "venv", "--python", "3.11", str(venv_dir)])

    check_cmd = [
        str(venv_py),
        "-c",
        (
            "import torch, torchvision, rembg, onnxruntime, omegaconf, einops, "
            "transformers, diffusers, trimesh, xatlas, moderngl, cv2, skimage, "
            "scipy, peft, jaxtyping, typeguard, mcubes, pymeshlab; "
            "assert torch.cuda.is_available(), 'CUDA not available in torch'; "
            "print('VENV_OK', torch.__version__, torch.version.cuda)"
        ),
    ]
    try:
        out = run_headless(check_cmd).strip()
        if "VENV_OK" in out:
            log(f"SKIP Python package install (already verified: {out})")
            return venv_py
    except Exception:
        pass

    log("Installing PyTorch CUDA wheels into %USERPROFILE%\\dream-studio-converter\\.venv")
    run_headless(
        [
            "uv",
            "pip",
            "install",
            "--python",
            str(venv_py),
            "torch",
            "torchvision",
            "--index-url",
            "https://download.pytorch.org/whl/cu124",
        ]
    )
    log("Installing converter Python packages into %USERPROFILE%\\dream-studio-converter\\.venv")
    run_headless(
        [
            "uv",
            "pip",
            "install",
            "--python",
            str(venv_py),
            "rembg",
            "onnxruntime-gpu",
            "onnxruntime",
            "omegaconf",
            "einops",
            "transformers",
            "diffusers",
            "accelerate",
            "safetensors",
            "trimesh",
            "huggingface-hub",
            "imageio",
            "xatlas",
            "moderngl",
            "opencv-python-headless",
            "scikit-image",
            "scipy",
            "peft",
            "jaxtyping",
            "typeguard",
            "PyMCubes",
            "pymeshlab",
        ]
    )
    out = run_headless(check_cmd).strip()
    log(f"VERIFIED Python virtual environment: {out}")
    return venv_py


def ensure_npm_packages() -> None:
    npm_dir = BASE_DIR / "npm-tools"
    npm_dir.mkdir(parents=True, exist_ok=True)
    pkg_json = npm_dir / "package.json"
    if not pkg_json.exists():
        pkg_json.write_text(
            json.dumps(
                {
                    "name": "dream-studio-converter-npm-tools",
                    "private": True,
                    "license": "MIT",
                },
                indent=2,
            ),
            encoding="utf-8",
        )
    cli_bin = npm_dir / "node_modules" / "@gltf-transform" / "cli" / "package.json"
    meshopt_pkg = npm_dir / "node_modules" / "meshoptimizer" / "package.json"
    if cli_bin.exists() and meshopt_pkg.exists():
        cli_ver = json.loads(cli_bin.read_text(encoding="utf-8")).get("version")
        mo_ver = json.loads(meshopt_pkg.read_text(encoding="utf-8")).get("version")
        log(f"SKIP npm install (@gltf-transform/cli {cli_ver}, meshoptimizer {mo_ver} already present)")
        return

    log("Installing @gltf-transform/cli and meshoptimizer in %USERPROFILE%\\dream-studio-converter\\npm-tools")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    run_headless(
        [
            npm_cmd,
            "install",
            "--prefix",
            str(npm_dir),
            "@gltf-transform/cli",
            "@gltf-transform/core",
            "@gltf-transform/extensions",
            "@gltf-transform/functions",
            "meshoptimizer",
            "--no-audit",
            "--no-fund",
        ]
    )
    cli_ver = json.loads(cli_bin.read_text(encoding="utf-8")).get("version")
    mo_ver = json.loads(meshopt_pkg.read_text(encoding="utf-8")).get("version")
    log(f"VERIFIED npm packages: @gltf-transform/cli {cli_ver}, meshoptimizer {mo_ver}")


def ensure_weights_downloaded() -> None:
    log("Checking and downloading approved model weights (TripoSG, TripoSR, rembg u2net)...")
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {
            pool.submit(download_file_atomic, url, rel, sz): rel
            for (url, rel, sz) in WEIGHT_FILES
        }
        for fut in as_completed(futures):
            fut.result()

    # Also ensure default ~/.u2net/u2net.onnx is populated so rembg never attempts a network fetch
    u2net_src = BASE_DIR / "weights" / "u2net" / "u2net.onnx"
    u2net_default = Path(USERPROFILE) / ".u2net" / "u2net.onnx"
    u2net_default.parent.mkdir(parents=True, exist_ok=True)
    if not u2net_default.exists() or u2net_default.stat().st_size != 175997641:
        shutil.copy2(u2net_src, u2net_default)
        log("Synced u2net.onnx to %USERPROFILE%\\.u2net\\u2net.onnx (175997641 bytes)")


def run_smoke_tests(venv_py: Path) -> Dict[str, Dict[str, object]]:
    """
    Draws a clean procedural test object image on a solid background, then runs
    TripoSR and TripoSG sequentially in isolated headless subprocesses so each model
    releases 100% of its GPU VRAM on exit.
    """
    smoke_dir = BASE_DIR / "smoke-test"
    smoke_dir.mkdir(parents=True, exist_ok=True)
    test_img = smoke_dir / "test-shield-object.png"
    triposr_glb = smoke_dir / "triposr-smoke.glb"
    triposg_glb = smoke_dir / "triposg-smoke.glb"

    draw_code = r'''
import sys
from PIL import Image, ImageDraw

out_path = sys.argv[1]
img = Image.new("RGB", (512, 512), (245, 245, 248))
draw = ImageDraw.Draw(img)

# Draw a clean shaded dark-fantasy kite shield with gold trim and cyan core
# Outer shield silhouette
shield_pts = [(256, 72), (388, 124), (368, 308), (256, 440), (144, 308), (124, 124)]
draw.polygon(shield_pts, fill=(46, 54, 72), outline=(188, 152, 78), width=10)

# Inner bevel plate
inner_pts = [(256, 100), (360, 142), (344, 294), (256, 404), (168, 294), (152, 142)]
draw.polygon(inner_pts, fill=(68, 78, 102), outline=(140, 150, 175), width=4)

# Center vertical ridge for 3D depth cues
draw.polygon([(256, 96), (274, 250), (256, 408), (238, 250)], fill=(96, 110, 140))

# Raised boss emblem in center
draw.ellipse((206, 196, 306, 296), fill=(196, 160, 84), outline=(110, 84, 36), width=5)
draw.ellipse((224, 214, 288, 278), fill=(52, 190, 220), outline=(210, 245, 255), width=3)

img.save(out_path)
print("DREW_TEST_IMAGE", out_path)
'''
    run_headless([str(venv_py), "-c", draw_code, str(test_img)])
    log(f"Generated procedural test image: %USERPROFILE%\\dream-studio-converter\\smoke-test\\test-shield-object.png ({test_img.stat().st_size} bytes)")

    # 1. Smoke test TripoSR in an isolated subprocess
    triposr_runner = r'''
import gc, json, os, sys, time
import numpy as np
import rembg
import torch
from PIL import Image

base_dir = sys.argv[1]
img_path = sys.argv[2]
out_mesh = sys.argv[3]

os.environ["U2NET_HOME"] = os.path.join(base_dir, "weights", "u2net")
sys.path.insert(0, os.path.join(base_dir, "repos", "TripoSR"))

from tsr.system import TSR
from tsr.utils import remove_background, resize_foreground

torch.cuda.empty_cache()
torch.cuda.reset_peak_memory_stats()
t0 = time.perf_counter()

rembg_session = rembg.new_session("u2net")
raw_img = Image.open(img_path)
fg_img = remove_background(raw_img, rembg_session)
fg_img = resize_foreground(fg_img, 0.85)
arr = np.array(fg_img).astype(np.float32) / 255.0
arr = arr[:, :, :3] * arr[:, :, 3:4] + (1.0 - arr[:, :, 3:4]) * 0.5
proc_img = Image.fromarray((arr * 255.0).astype(np.uint8))

weights_dir = os.path.join(base_dir, "weights", "TripoSR")
model = TSR.from_pretrained(weights_dir, config_name="config.yaml", weight_name="model.ckpt")
model.renderer.set_chunk_size(8192)
model.to("cuda:0")

with torch.no_grad():
    scene_codes = model([proc_img], device="cuda:0")
    meshes = model.extract_mesh(scene_codes, True, resolution=160)

meshes[0].export(out_mesh)
torch.cuda.synchronize()
elapsed = time.perf_counter() - t0
peak_alloc_mib = torch.cuda.max_memory_allocated() / (1024 * 1024)
peak_reserved_mib = torch.cuda.max_memory_reserved() / (1024 * 1024)
verts = int(len(meshes[0].vertices))
faces = int(len(meshes[0].faces))

del meshes, scene_codes, model, rembg_session
gc.collect()
torch.cuda.empty_cache()

print("TRIPOSR_RESULT_JSON:" + json.dumps({
    "elapsed_sec": round(elapsed, 2),
    "peak_allocated_mib": round(peak_alloc_mib, 1),
    "peak_reserved_mib": round(peak_reserved_mib, 1),
    "vertices": verts,
    "faces": faces,
    "size_bytes": os.path.getsize(out_mesh),
}))
'''
    log("Running TripoSR headless smoke test on CUDA...")
    sr_out = run_headless([str(venv_py), "-c", triposr_runner, str(BASE_DIR), str(test_img), str(triposr_glb)])
    sr_info = {}
    for line in sr_out.splitlines():
        if line.startswith("TRIPOSR_RESULT_JSON:"):
            sr_info = json.loads(line.split("TRIPOSR_RESULT_JSON:", 1)[1])
    log(f"TripoSR smoke test complete: {json.dumps(sr_info)}")

    # 2. Smoke test TripoSG in an isolated subprocess
    triposg_runner = r'''
import gc, json, os, sys, time
import numpy as np
import rembg
import torch

base_dir = sys.argv[1]
img_path = sys.argv[2]
out_mesh = sys.argv[3]

os.environ["U2NET_HOME"] = os.path.join(base_dir, "weights", "u2net")
triposg_repo = os.path.join(base_dir, "repos", "TripoSG")
sys.path.insert(0, os.path.join(triposg_repo, "scripts"))
sys.path.insert(0, triposg_repo)

from triposg.pipelines.pipeline_triposg import TripoSGPipeline
from image_process import prepare_image

torch.cuda.empty_cache()
torch.cuda.reset_peak_memory_stats()
t0 = time.perf_counter()

rmbg_session = rembg.new_session("u2net")
img_pil = prepare_image(img_path, bg_color=np.array([1.0, 1.0, 1.0]), rmbg_net=rmbg_session)
del rmbg_session
gc.collect()

weights_dir = os.path.join(base_dir, "weights", "TripoSG")
pipe = TripoSGPipeline.from_pretrained(weights_dir, torch_dtype=torch.float16)
pipe.to("cuda")

with torch.no_grad():
    res = pipe(
        image=img_pil,
        generator=torch.Generator(device="cuda").manual_seed(42),
        num_inference_steps=12,
        guidance_scale=7.0,
        use_flash_decoder=False,
        dense_octree_depth=7,
        hierarchical_octree_depth=8,
    )
mesh = res.meshes[0]
mesh.export(out_mesh)
torch.cuda.synchronize()
elapsed = time.perf_counter() - t0
peak_alloc_mib = torch.cuda.max_memory_allocated() / (1024 * 1024)
peak_reserved_mib = torch.cuda.max_memory_reserved() / (1024 * 1024)
verts = int(len(mesh.vertices))
faces = int(len(mesh.faces))

del mesh, res, pipe
gc.collect()
torch.cuda.empty_cache()

print("TRIPOSG_RESULT_JSON:" + json.dumps({
    "elapsed_sec": round(elapsed, 2),
    "peak_allocated_mib": round(peak_alloc_mib, 1),
    "peak_reserved_mib": round(peak_reserved_mib, 1),
    "vertices": verts,
    "faces": faces,
    "size_bytes": os.path.getsize(out_mesh),
}))
'''
    log("Running TripoSG headless smoke test on CUDA...")
    sg_out = run_headless([str(venv_py), "-c", triposg_runner, str(BASE_DIR), str(test_img), str(triposg_glb)])
    sg_info = {}
    for line in sg_out.splitlines():
        if line.startswith("TRIPOSG_RESULT_JSON:"):
            sg_info = json.loads(line.split("TRIPOSG_RESULT_JSON:", 1)[1])
    log(f"TripoSG smoke test complete: {json.dumps(sg_info)}")

    return {"TripoSR": sr_info, "TripoSG": sg_info}


def main() -> None:
    parser = argparse.ArgumentParser(description="Install and verify DREAM Studio converter outside the repo.")
    parser.add_argument("--smoke-test", action="store_true", help="Run headless smoke tests for TripoSR and TripoSG.")
    args = parser.parse_args()

    log("=== DREAM Studio Converter Installer Started ===")
    ensure_weights_downloaded()
    ensure_repos_cloned_and_patched()
    venv_py = ensure_venv_and_packages()
    ensure_npm_packages()

    if args.smoke_test:
        results = run_smoke_tests(venv_py)
        summary_path = BASE_DIR / "smoke-test" / "smoke-test-summary.json"
        summary_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
        log(f"Smoke test summary written to %USERPROFILE%\\dream-studio-converter\\smoke-test\\smoke-test-summary.json")

    log("=== DREAM Studio Converter Installer Finished Cleanly ===")


if __name__ == "__main__":
    main()
