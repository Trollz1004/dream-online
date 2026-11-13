"""
Headless Blender 5.2.3 generator for DREAM Engine test asset:
  public/assets/models/test-rigged-humanoid-walk-not-game-art.glb

NOTE: This is an in-house engineering test asset for GLB loading, 4-bone linear
blend skinning, tangent-space normal mapping, and packed ORM PBR shading.
It is NOT final game art.

Usage:
  "%LOCALAPPDATA%\\Microsoft\\WindowsApps\\blender-launcher.exe" --background --python ops/blender/generate-test-rigged-humanoid-not-game-art.py
"""

import math
import os
import struct
import zlib
import bpy
import bmesh
from mathutils import Vector, Euler, Matrix


def write_png_rgba(filepath: str, width: int, height: int, pixels_rgba: bytearray) -> None:
    """Writes an RGBA8 bytearray (top-to-bottom rows) to a valid PNG file using stdlib only."""
    raw_rows = bytearray()
    stride = width * 4
    for y in range(height):
        raw_rows.append(0)  # Filter type 0 (None)
        row_start = y * stride
        raw_rows.extend(pixels_rgba[row_start : row_start + stride])

    def make_chunk(chunk_type: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    compressed = zlib.compress(bytes(raw_rows), 6)
    png_bytes = (
        b"\x89PNG\r\n\x1a\n"
        + make_chunk(b"IHDR", ihdr)
        + make_chunk(b"IDAT", compressed)
        + make_chunk(b"IEND", b"")
    )
    with open(filepath, "wb") as f:
        f.write(png_bytes)


def generate_pbr_texture_files(out_dir: str):
    """
    Generates three 256x256 PNG textures for the test humanoid:
      1. baseColor (forged steel plates, dark leather joints, bronze trim)
      2. normalMap (tangent-space normal map with raised plate bevels, rivets, and fluted ridges)
      3. ormMap (glTF packed R=Occlusion, G=Roughness, B=Metallic)
    """
    w, h = 256, 256
    albedo = bytearray(w * h * 4)
    normal = bytearray(w * h * 4)
    orm = bytearray(w * h * 4)

    # Height field function for tangent-space normal + AO calculation
    def height_at(u: float, v: float) -> float:
        # Plate grid seams every 0.25 UV
        gx = abs((u * 4.0) % 1.0 - 0.5) * 2.0
        gy = abs((v * 4.0) % 1.0 - 0.5) * 2.0
        border = min(1.0 - gx, 1.0 - gy)
        seam = -0.35 if border < 0.08 else (0.15 if border < 0.14 else 0.0)

        # Vertical fluted armor ribs
        flutes = 0.22 * math.sin(u * math.pi * 24.0) * math.cos(v * math.pi * 8.0)

        # Circular rivets near plate corners
        cell_u = (u * 8.0) % 1.0 - 0.5
        cell_v = (v * 8.0) % 1.0 - 0.5
        dist_rivet = math.hypot(cell_u, cell_v)
        rivet = max(0.0, 1.0 - (dist_rivet / 0.18) ** 2) * 0.45 if dist_rivet < 0.18 else 0.0

        # Diagonal hammered micro-relief
        hammer = 0.08 * math.sin((u + v) * math.pi * 32.0) * math.sin((u - v) * math.pi * 32.0)
        return seam + flutes + rivet + hammer

    du = 1.0 / w
    dv = 1.0 / h

    for y in range(h):
        v = y / float(h - 1)
        for x in range(w):
            u = x / float(w - 1)
            idx = (y * w + x) * 4

            h_c = height_at(u, v)
            h_r = height_at(min(1.0, u + du), v)
            h_u = height_at(u, min(1.0, v + dv))

            # Tangent-space normal from finite differences
            strength = 3.2
            dx = (h_c - h_r) * strength
            dy = (h_c - h_u) * strength
            dz = 1.0
            inv_len = 1.0 / math.sqrt(dx * dx + dy * dy + dz * dz)
            nx = dx * inv_len
            ny = dy * inv_len
            nz = dz * inv_len

            normal[idx + 0] = max(0, min(255, int((nx * 0.5 + 0.5) * 255.0)))
            normal[idx + 1] = max(0, min(255, int((ny * 0.5 + 0.5) * 255.0)))
            normal[idx + 2] = max(0, min(255, int((nz * 0.5 + 0.5) * 255.0)))
            normal[idx + 3] = 255

            # Determine material region: upper UV (v < 0.65) = steel armor + gold trim; lower UV = dark leather
            gx = abs((u * 4.0) % 1.0 - 0.5) * 2.0
            gy = abs((v * 4.0) % 1.0 - 0.5) * 2.0
            border = min(1.0 - gx, 1.0 - gy)
            is_seam = border < 0.08
            is_trim = 0.08 <= border < 0.15
            is_armor = v < 0.72

            ao_val = max(0.35, min(1.0, 0.78 + h_c * 0.35))
            if is_seam:
                # Recessed dark leather/grout seam
                r_col, g_col, b_col = 42, 38, 44
                rough_val = 0.78
                metal_val = 0.08
                ao_val = 0.42
            elif is_trim:
                # Warm bronze/gold trim bevel
                r_col, g_col, b_col = 198, 152, 74
                rough_val = 0.26
                metal_val = 0.88
            elif is_armor:
                # Tempered silver-steel plate with subtle variation
                variation = int(14 * math.sin(u * 18.0) * math.cos(v * 18.0))
                r_col = max(0, min(255, 168 + variation))
                g_col = max(0, min(255, 176 + variation))
                b_col = max(0, min(255, 192 + variation))
                rough_val = 0.24
                metal_val = 0.86
            else:
                # Stitched dark brigandine leather
                r_col, g_col, b_col = 68, 54, 46
                rough_val = 0.66
                metal_val = 0.06

            albedo[idx + 0] = r_col
            albedo[idx + 1] = g_col
            albedo[idx + 2] = b_col
            albedo[idx + 3] = 255

            # glTF 2.0 ORM packing: R = Occlusion, G = Roughness, B = Metallic
            orm[idx + 0] = max(0, min(255, int(ao_val * 255.0)))
            orm[idx + 1] = max(0, min(255, int(rough_val * 255.0)))
            orm[idx + 2] = max(0, min(255, int(metal_val * 255.0)))
            orm[idx + 3] = 255

    albedo_path = os.path.join(out_dir, "_tmp_test_albedo.png")
    normal_path = os.path.join(out_dir, "_tmp_test_normal.png")
    orm_path = os.path.join(out_dir, "_tmp_test_orm.png")

    write_png_rgba(albedo_path, w, h, albedo)
    write_png_rgba(normal_path, w, h, normal)
    write_png_rgba(orm_path, w, h, orm)
    return albedo_path, normal_path, orm_path


def add_limb_capsule(bm: bmesh.types.BMesh, p0: Vector, p1: Vector, r0: float, r1: float, rings: int = 8, segs: int = 12, v_base: float = 0.1, v_span: float = 0.5):
    """Adds a segmented tapered limb/torso tube with clean UVs into a BMesh."""
    axis = p1 - p0
    length = axis.length
    if length < 1e-5:
        return
    z_dir = axis.normalized()
    up_ref = Vector((0, 0, 1)) if abs(z_dir.z) < 0.9 else Vector((1, 0, 0))
    x_dir = up_ref.cross(z_dir).normalized()
    y_dir = z_dir.cross(x_dir).normalized()

    uv_layer = bm.loops.layers.uv.verify()
    grid_verts = []

    for r in range(rings + 1):
        t = r / float(rings)
        center = p0.lerp(p1, t)
        # Slight anatomical muscle curve in the middle of each segment
        bulge = 1.0 + 0.12 * math.sin(t * math.pi)
        rad = (r0 * (1.0 - t) + r1 * t) * bulge
        row = []
        for s in range(segs):
            ang = (s / float(segs)) * math.pi * 2.0
            offset = (x_dir * math.cos(ang) + y_dir * math.sin(ang)) * rad
            v = bm.verts.new(center + offset)
            row.append((v, s / float(segs), v_base + t * v_span))
        grid_verts.append(row)

    for r in range(rings):
        for s in range(segs):
            s_next = (s + 1) % segs
            v00, u00, vv00 = grid_verts[r][s]
            v10, u10, vv10 = grid_verts[r][s_next]
            v11, u11, vv11 = grid_verts[r + 1][s_next]
            v01, u01, vv01 = grid_verts[r + 1][s]
            face = bm.faces.new((v00, v10, v11, v01))
            face.smooth = True
            u10_adj = 1.0 if s_next == 0 else u10
            u11_adj = 1.0 if s_next == 0 else u11
            face.loops[0][uv_layer].uv = (u00, vv00)
            face.loops[1][uv_layer].uv = (u10_adj, vv10)
            face.loops[2][uv_layer].uv = (u11_adj, vv11)
            face.loops[3][uv_layer].uv = (u01, vv01)

    # Cap ends
    top_center = bm.verts.new(p1 + z_dir * (r1 * 0.25))
    bot_center = bm.verts.new(p0 - z_dir * (r0 * 0.25))
    for s in range(segs):
        s_next = (s + 1) % segs
        f_top = bm.faces.new((grid_verts[rings][s][0], grid_verts[rings][s_next][0], top_center))
        f_top.smooth = True
        for lp in f_top.loops:
            lp[uv_layer].uv = (0.5, v_base + v_span)
        f_bot = bm.faces.new((grid_verts[0][s_next][0], grid_verts[0][s][0], bot_center))
        f_bot.smooth = True
        for lp in f_bot.loops:
            lp[uv_layer].uv = (0.5, v_base)


def build_test_humanoid():
    bpy.ops.wm.read_factory_settings(use_empty=True)

    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    out_dir = os.path.join(repo_root, "public", "assets", "models")
    os.makedirs(out_dir, exist_ok=True)
    out_glb = os.path.join(out_dir, "test-rigged-humanoid-walk-not-game-art.glb")

    albedo_path, normal_path, orm_path = generate_pbr_texture_files(out_dir)

    # 1. Create Armature (Blender Z-up; glTF exporter converts to Y-up automatically)
    arm_data = bpy.data.armatures.new("TestHumanoidArmature")
    arm_obj = bpy.data.objects.new("TestHumanoidRig", arm_data)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="EDIT")

    eb = arm_data.edit_bones

    def make_bone(name: str, head, tail, parent_name=None):
        b = eb.new(name)
        b.head = Vector(head)
        b.tail = Vector(tail)
        if parent_name and parent_name in eb:
            b.parent = eb[parent_name]
        return b

    make_bone("Hips", (0, 0, 0.92), (0, 0, 1.08), None)
    make_bone("Spine", (0, 0, 1.08), (0, 0, 1.28), "Hips")
    make_bone("Chest", (0, 0, 1.28), (0, 0, 1.52), "Spine")
    make_bone("Head", (0, 0, 1.54), (0, 0, 1.82), "Chest")

    make_bone("Shoulder_L", (0.08, 0, 1.46), (0.22, 0, 1.46), "Chest")
    make_bone("UpperArm_L", (0.22, 0, 1.46), (0.26, 0, 1.18), "Shoulder_L")
    make_bone("LowerArm_L", (0.26, 0, 1.18), (0.28, -0.04, 0.90), "UpperArm_L")

    make_bone("Shoulder_R", (-0.08, 0, 1.46), (-0.22, 0, 1.46), "Chest")
    make_bone("UpperArm_R", (-0.22, 0, 1.46), (-0.26, 0, 1.18), "Shoulder_R")
    make_bone("LowerArm_R", (-0.26, 0, 1.18), (-0.28, -0.04, 0.90), "UpperArm_R")

    make_bone("Thigh_L", (0.12, 0, 0.92), (0.13, 0, 0.50), "Hips")
    make_bone("Shin_L", (0.13, 0, 0.50), (0.13, 0, 0.10), "Thigh_L")
    make_bone("Foot_L", (0.13, 0, 0.10), (0.13, -0.16, 0.02), "Shin_L")

    make_bone("Thigh_R", (-0.12, 0, 0.92), (-0.13, 0, 0.50), "Hips")
    make_bone("Shin_R", (-0.13, 0, 0.50), (-0.13, 0, 0.10), "Thigh_R")
    make_bone("Foot_R", (-0.13, 0, 0.10), (-0.13, -0.16, 0.02), "Shin_R")

    bone_segments = {
        "Hips": (Vector((0, 0, 0.88)), Vector((0, 0, 1.08)), 0.16, 0.15, 0.65, 0.20),
        "Spine": (Vector((0, 0, 1.05)), Vector((0, 0, 1.30)), 0.15, 0.18, 0.10, 0.25),
        "Chest": (Vector((0, 0, 1.26)), Vector((0, 0, 1.54)), 0.18, 0.21, 0.15, 0.35),
        "Head": (Vector((0, 0, 1.54)), Vector((0, 0, 1.82)), 0.11, 0.12, 0.05, 0.25),
        "Shoulder_L": (Vector((0.12, 0, 1.44)), Vector((0.26, 0, 1.48)), 0.09, 0.11, 0.10, 0.20),
        "UpperArm_L": (Vector((0.23, 0, 1.45)), Vector((0.26, 0, 1.18)), 0.075, 0.065, 0.20, 0.30),
        "LowerArm_L": (Vector((0.26, 0, 1.18)), Vector((0.28, -0.04, 0.88)), 0.065, 0.052, 0.20, 0.30),
        "Shoulder_R": (Vector((-0.12, 0, 1.44)), Vector((-0.26, 0, 1.48)), 0.09, 0.11, 0.10, 0.20),
        "UpperArm_R": (Vector((-0.23, 0, 1.45)), Vector((-0.26, 0, 1.18)), 0.075, 0.065, 0.20, 0.30),
        "LowerArm_R": (Vector((-0.26, 0, 1.18)), Vector((-0.28, -0.04, 0.88)), 0.065, 0.052, 0.20, 0.30),
        "Thigh_L": (Vector((0.12, 0, 0.92)), Vector((0.13, 0, 0.50)), 0.095, 0.075, 0.55, 0.30),
        "Shin_L": (Vector((0.13, 0, 0.50)), Vector((0.13, 0, 0.08)), 0.075, 0.060, 0.15, 0.35),
        "Foot_L": (Vector((0.13, 0.03, 0.08)), Vector((0.13, -0.18, 0.03)), 0.062, 0.055, 0.20, 0.20),
        "Thigh_R": (Vector((-0.12, 0, 0.92)), Vector((-0.13, 0, 0.50)), 0.095, 0.075, 0.55, 0.30),
        "Shin_R": (Vector((-0.13, 0, 0.50)), Vector((-0.13, 0, 0.08)), 0.075, 0.060, 0.15, 0.35),
        "Foot_R": (Vector((-0.13, 0.03, 0.08)), Vector((-0.13, -0.18, 0.03)), 0.062, 0.055, 0.20, 0.20),
    }

    bpy.ops.object.mode_set(mode="OBJECT")

    # 2. Build Humanoid Mesh (~2,400 triangles)
    mesh_data = bpy.data.meshes.new("TestHumanoidMeshData")
    mesh_obj = bpy.data.objects.new("TestHumanoid_NotGameArt", mesh_data)
    bpy.context.collection.objects.link(mesh_obj)

    bm = bmesh.new()
    for bname, (p0, p1, r0, r1, vb, vs) in bone_segments.items():
        add_limb_capsule(bm, p0, p1, r0, r1, rings=7, segs=14, v_base=vb, v_span=vs)

    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(mesh_data)
    bm.free()

    # 3. Assign Smooth 4-Bone Linear Blend Skin Weights
    for bname in bone_segments.keys():
        mesh_obj.vertex_groups.new(name=bname)

    def dist_point_to_segment(pt: Vector, a: Vector, b: Vector) -> float:
        ab = b - a
        ab_len_sq = ab.length_squared
        if ab_len_sq < 1e-8:
            return (pt - a).length
        t = max(0.0, min(1.0, (pt - a).dot(ab) / ab_len_sq))
        proj = a + ab * t
        return (pt - proj).length

    for v in mesh_obj.data.vertices:
        co = v.co
        dists = []
        for bname, (p0, p1, *_rest) in bone_segments.items():
            d = dist_point_to_segment(co, p0, p1)
            dists.append((d, bname))
        dists.sort(key=lambda item: item[0])
        top4 = dists[:4]
        raw_weights = [1.0 / ((d + 0.035) ** 3) for d, _ in top4]
        total_w = sum(raw_weights) or 1.0
        for (d, bname), rw in zip(top4, raw_weights):
            w_norm = rw / total_w
            if w_norm > 0.01:
                mesh_obj.vertex_groups[bname].add([v.index], w_norm, "REPLACE")

    mesh_obj.parent = arm_obj
    arm_mod = mesh_obj.modifiers.new(name="Armature", type="ARMATURE")
    arm_mod.object = arm_obj

    # 4. Build Principled BSDF Material with BaseColor, Tangent Normal Map, and Packed ORM
    mat = bpy.data.materials.new(name="TestHumanoidPBR_NotGameArt")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    out_node = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    links.new(bsdf.outputs["BSDF"], out_node.inputs["Surface"])

    # BaseColor Texture
    tex_albedo = nodes.new("ShaderNodeTexImage")
    img_albedo = bpy.data.images.load(albedo_path)
    img_albedo.colorspace_settings.name = "sRGB"
    tex_albedo.image = img_albedo
    links.new(tex_albedo.outputs["Color"], bsdf.inputs["Base Color"])

    # ORM Texture (R=Occlusion, G=Roughness, B=Metallic)
    tex_orm = nodes.new("ShaderNodeTexImage")
    img_orm = bpy.data.images.load(orm_path)
    img_orm.colorspace_settings.name = "Non-Color"
    tex_orm.image = img_orm

    sep_color = nodes.new("ShaderNodeSeparateColor")
    links.new(tex_orm.outputs["Color"], sep_color.inputs["Color"])
    links.new(sep_color.outputs["Green"], bsdf.inputs["Roughness"])
    links.new(sep_color.outputs["Blue"], bsdf.inputs["Metallic"])

    # glTF Occlusion output socket
    gltf_group = bpy.data.node_groups.new("glTF Settings", "ShaderNodeTree")
    gltf_group.interface.new_socket(name="Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
    gltf_node = nodes.new("ShaderNodeGroup")
    gltf_node.node_tree = gltf_group
    links.new(sep_color.outputs["Red"], gltf_node.inputs["Occlusion"])

    # Normal Map Texture
    tex_norm = nodes.new("ShaderNodeTexImage")
    img_norm = bpy.data.images.load(normal_path)
    img_norm.colorspace_settings.name = "Non-Color"
    tex_norm.image = img_norm

    norm_map_node = nodes.new("ShaderNodeNormalMap")
    norm_map_node.inputs["Strength"].default_value = 1.0
    links.new(tex_norm.outputs["Color"], norm_map_node.inputs["Color"])
    links.new(norm_map_node.outputs["Normal"], bsdf.inputs["Normal"])

    mesh_obj.data.materials.append(mat)

    # 5. Author Two Animation Actions ("Walk" and "Idle") on the Armature
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="POSE")
    for pb in arm_obj.pose.bones:
        pb.rotation_mode = "QUATERNION"

    arm_obj.animation_data_create()

    def bake_action(action_name: str, is_walk: bool):
        act = bpy.data.actions.new(name=action_name)
        act.use_fake_user = True
        arm_obj.animation_data.action = act

        frames = [1, 7, 13, 19, 25]
        for f in frames:
            bpy.context.scene.frame_set(f)
            phase = ((f - 1) / 24.0) * math.pi * 2.0
            s = math.sin(phase)
            c = math.cos(phase)

            for pb in arm_obj.pose.bones:
                pb.location = (0, 0, 0)
                pb.rotation_quaternion = (1, 0, 0, 0)

            if is_walk:
                # Hips vertical bob + subtle lateral sway
                arm_obj.pose.bones["Hips"].location = (0.015 * s, 0.0, 0.028 * abs(c))
                arm_obj.pose.bones["Hips"].rotation_quaternion = Euler((0.05, 0.03 * s, 0.06 * s), "XYZ").to_quaternion()

                # Spine & Chest counter-twist
                arm_obj.pose.bones["Spine"].rotation_quaternion = Euler((0.04, 0.0, -0.05 * s), "XYZ").to_quaternion()
                arm_obj.pose.bones["Chest"].rotation_quaternion = Euler((0.04, 0.0, -0.08 * s), "XYZ").to_quaternion()
                arm_obj.pose.bones["Head"].rotation_quaternion = Euler((-0.04, 0.0, 0.06 * s), "XYZ").to_quaternion()

                # Legs swing along local X axis
                thigh_l_pitch = 0.52 * s
                thigh_r_pitch = -0.52 * s
                shin_l_pitch = -max(0.05, 0.62 * max(0.0, -c))
                shin_r_pitch = -max(0.05, 0.62 * max(0.0, c))

                arm_obj.pose.bones["Thigh_L"].rotation_quaternion = Euler((thigh_l_pitch, 0.0, 0.0), "XYZ").to_quaternion()
                arm_obj.pose.bones["Shin_L"].rotation_quaternion = Euler((shin_l_pitch, 0.0, 0.0), "XYZ").to_quaternion()
                arm_obj.pose.bones["Foot_L"].rotation_quaternion = Euler((-0.25 * s, 0.0, 0.0), "XYZ").to_quaternion()

                arm_obj.pose.bones["Thigh_R"].rotation_quaternion = Euler((thigh_r_pitch, 0.0, 0.0), "XYZ").to_quaternion()
                arm_obj.pose.bones["Shin_R"].rotation_quaternion = Euler((shin_r_pitch, 0.0, 0.0), "XYZ").to_quaternion()
                arm_obj.pose.bones["Foot_R"].rotation_quaternion = Euler((0.25 * s, 0.0, 0.0), "XYZ").to_quaternion()

                # Opposite arm swing
                arm_obj.pose.bones["UpperArm_L"].rotation_quaternion = Euler((-0.42 * s, 0.0, 0.0), "XYZ").to_quaternion()
                arm_obj.pose.bones["LowerArm_L"].rotation_quaternion = Euler((0.28 + 0.18 * max(0.0, -s), 0.0, 0.0), "XYZ").to_quaternion()

                arm_obj.pose.bones["UpperArm_R"].rotation_quaternion = Euler((0.42 * s, 0.0, 0.0), "XYZ").to_quaternion()
                arm_obj.pose.bones["LowerArm_R"].rotation_quaternion = Euler((0.28 + 0.18 * max(0.0, s), 0.0, 0.0), "XYZ").to_quaternion()
            else:
                # Idle breathing & subtle ready poise
                arm_obj.pose.bones["Hips"].location = (0.0, 0.0, 0.012 * s)
                arm_obj.pose.bones["Chest"].rotation_quaternion = Euler((0.04 * s, 0.0, 0.03 * c), "XYZ").to_quaternion()
                arm_obj.pose.bones["Head"].rotation_quaternion = Euler((-0.02 * s, 0.0, 0.05 * s), "XYZ").to_quaternion()
                arm_obj.pose.bones["UpperArm_L"].rotation_quaternion = Euler((0.08 * s, 0.0, 0.05), "XYZ").to_quaternion()
                arm_obj.pose.bones["LowerArm_L"].rotation_quaternion = Euler((0.35, 0.0, 0.0), "XYZ").to_quaternion()
                arm_obj.pose.bones["UpperArm_R"].rotation_quaternion = Euler((-0.08 * s, 0.0, -0.05), "XYZ").to_quaternion()
                arm_obj.pose.bones["LowerArm_R"].rotation_quaternion = Euler((0.35, 0.0, 0.0), "XYZ").to_quaternion()

            for pb in arm_obj.pose.bones:
                pb.keyframe_insert(data_path="location", frame=f)
                pb.keyframe_insert(data_path="rotation_quaternion", frame=f)

        # Push action to NLA track so glTF exporter exports both clips
        track = arm_obj.animation_data.nla_tracks.new()
        track.name = action_name
        strip = track.strips.new(action_name, 1, act)
        strip.name = action_name

    bake_action("Walk", is_walk=True)
    bake_action("Idle", is_walk=False)
    arm_obj.animation_data.action = bpy.data.actions["Walk"]

    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 25
    bpy.context.scene.render.fps = 24

    # 6. Export glTF 2.0 Binary (.glb) with Tangents, Skins, NLA Animations & Embedded PNG Textures
    bpy.ops.export_scene.gltf(
        filepath=out_glb,
        export_format="GLB",
        export_tangents=True,
        export_normals=True,
        export_texcoords=True,
        export_materials="EXPORT",
        export_skins=True,
        export_all_influences=False,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_force_sampling=True,
    )

    for tmp_file in (albedo_path, normal_path, orm_path):
        if os.path.exists(tmp_file):
            os.remove(tmp_file)

    size_kb = os.path.getsize(out_glb) / 1024.0
    rel_out = os.path.relpath(out_glb, repo_root).replace("\\", "/")
    print(f"[BLENDER-TEST-HUMANOID] Exported {rel_out} ({size_kb:.1f} KB, verts={len(mesh_obj.data.vertices)}, faces={len(mesh_obj.data.polygons)}, bones={len(arm_data.bones)})")


if __name__ == "__main__":
    build_test_humanoid()
