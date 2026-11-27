# DREAM Studio Converter Installation Report (Alienware Node)

**Date:** 2026-11-12  
**Approved By:** Founder Joshua Coleman (2026-11-12 05:46)  
**Study Reference:** `docs/tech/studio-converter-pipeline-study-2026-11-11.md` (Section 5)  
**Install Root (Outside Repo):** `%USERPROFILE%\dream-studio-converter`  
**Install Log:** `%USERPROFILE%\dream-studio-converter\install-log.txt`  
**Repeatable Installer Script:** `ops/studio-converter/install-studio-converter.py`

---

## 1. Installed Components, Versions, Licences, and Verified Sizes

All components were installed outside the repository under `%USERPROFILE%\dream-studio-converter` inside an isolated Python 3.11 virtual environment (`%USERPROFILE%\dream-studio-converter\.venv`) and an isolated npm tools folder (`%USERPROFILE%\dream-studio-converter\npm-tools`). Public Hugging Face and GitHub endpoints were used with zero account sign-in and zero gated agreements accepted.

- **Python Virtual Environment (`%USERPROFILE%\dream-studio-converter\.venv`):**
  - **Runtime:** CPython `3.11.17` (`uv venv --python 3.11`, PSF License)
  - **PyTorch & Torchvision:** `torch==2.6.0+cu124`, `torchvision==0.21.0+cu124` (BSD-3-Clause License, CUDA `12.4` on NVIDIA GeForce RTX 3070 8 GB VRAM)
  - **Core Libraries:** `diffusers==0.43.0` (Apache-2.0), `transformers==5.22.2` (Apache-2.0), `trimesh==5.2.0` (MIT), `scikit-image==0.26.0` (BSD-3-Clause), `pymcubes==0.1.6` (BSD-3-Clause), `pymeshlab==2025.7.post1` (GPLv3 standalone tool wrapper), `xatlas==0.0.11` (MIT), `moderngl==5.13.0` (MIT)
- **`VAST-AI/TripoSG` (High-Detail 3D SDF Sculpt Generator):**
  - **Licence:** **MIT License** (both code and weights)
  - **Code Folder:** `%USERPROFILE%\dream-studio-converter\repos\TripoSG` (`https://github.com/VAST-AI-Research/TripoSG`, commit `fc5c40990181e2a756c4e0b1c2f4d6b5202faf8c`)
  - **Weights Folder:** `%USERPROFILE%\dream-studio-converter\weights\TripoSG` (`https://huggingface.co/VAST-AI/TripoSG`)
  - **Verified Weight Files (`7,946,491,173` bytes / `7.40 GiB` total):**
    - `transformer/diffusion_pytorch_model.safetensors`: `5,758,280,104` bytes (`5,491.52 MiB`)
    - `image_encoder_dinov2/model.safetensors`: `1,217,522,888` bytes (`1,161.12 MiB`)
    - `vae/diffusion_pytorch_model.safetensors`: `970,685,468` bytes (`925.72 MiB`)
    - `model_index.json` (`525` bytes), `feature_extractor_dinov2/preprocessor_config.json` (`436` bytes), `image_encoder_dinov2/config.json` (`1,104` bytes), `scheduler/scheduler_config.json` (`158` bytes), `transformer/config.json` (`191` bytes), `vae/config.json` (`335` bytes)
  - **Non-Commercial Dependency Ruling Enforced:** `briaai/RMBG-1.4` was **never downloaded**. `repos/TripoSG/scripts/briarmbg.py` was replaced with a hard guard that raises a `RuntimeError` if called, and `repos/TripoSG/scripts/image_process.py` + `repos/TripoSG/scripts/inference_triposg.py` were patched to use `danielgatis/rembg` (`u2net.onnx`).
- **`stabilityai/TripoSR` (Fast Single-Image Mesh & Albedo Companion):**
  - **Licence:** **MIT License** (both code and weights)
  - **Code Folder:** `%USERPROFILE%\dream-studio-converter\repos\TripoSR` (`https://github.com/VAST-AI-Research/TripoSR`, commit `107cefdc244c39106fa830359024f6a2f1c78871`)
  - **Weights Folder:** `%USERPROFILE%\dream-studio-converter\weights\TripoSR` (`https://huggingface.co/stabilityai/TripoSR`)
  - **Verified Weight Files (`1,677,247,729` bytes / `1.56 GiB` total):**
    - `model.ckpt`: `1,677,246,742` bytes (`1,599.55 MiB`)
    - `config.yaml`: `987` bytes
- **`danielgatis/rembg` + `u2net.onnx` (Background Segmentation):**
  - **Licence:** **MIT License** (`rembg==2.0.87`, `onnxruntime-gpu==1.31.1`) / **Apache License 2.0** (`U2-Net` weights)
  - **Weights Folder:** `%USERPROFILE%\dream-studio-converter\weights\u2net\u2net.onnx` (mirrored to `%USERPROFILE%\.u2net\u2net.onnx`)
  - **Verified Weight File:** `175,997,641` bytes (`167.84 MiB` / `0.17 GB`)
- **`@gltf-transform/cli` & `meshoptimizer` (GLB Mesh & Texture Optimization):**
  - **Licence:** **MIT License**
  - **Folder:** `%USERPROFILE%\dream-studio-converter\npm-tools`
  - **Versions:** `@gltf-transform/cli`, `@gltf-transform/core`, `@gltf-transform/extensions`, `@gltf-transform/functions`, and `meshoptimizer`
- **Explicitly Not Installed:**
  - `VAST-AI/UniRig` (not approved yet)
  - `briaai/RMBG-1.4` (non-commercial licence — permanently blocked)

---

## 2. Headless Smoke Test Results

*(Smoke test execution in progress — updating with exact TripoSR and TripoSG timings, mesh outputs, and peak GPU VRAM measurements.)*
