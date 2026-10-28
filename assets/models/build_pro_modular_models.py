import json, struct, math

def create_box_primitive(min_pt, max_pt):
    x0, y0, z0 = min_pt
    x1, y1, z1 = max_pt
    positions = [
        # Front
        x0, y0, z1,  x1, y0, z1,  x1, y1, z1,  x0, y1, z1,
        # Back
        x1, y0, z0,  x0, y0, z0,  x0, y1, z0,  x1, y1, z0,
        # Top
        x0, y1, z1,  x1, y1, z1,  x1, y1, z0,  x0, y1, z0,
        # Bottom
        x0, y0, z0,  x1, y0, z0,  x1, y0, z1,  x0, y0, z1,
        # Right
        x1, y0, z1,  x1, y0, z0,  x1, y1, z0,  x1, y1, z1,
        # Left
        x0, y0, z0,  x0, y0, z1,  x0, y1, z1,  x0, y1, z0
    ]
    indices = []
    for i in range(6):
        b = i * 4
        indices.extend([b, b+1, b+2, b, b+2, b+3])
    return positions, indices

def build_human_pro_glb(filename):
    nodes = []
    meshes = []
    materials = [
        {"name": "mat_skin", "pbrMetallicRoughness": {"baseColorFactor": [1.0, 0.88, 0.74, 1.0], "roughnessFactor": 0.5}},
        {"name": "mat_shirt", "pbrMetallicRoughness": {"baseColorFactor": [0.06, 0.72, 0.5, 1.0], "roughnessFactor": 0.5}},
        {"name": "mat_pants", "pbrMetallicRoughness": {"baseColorFactor": [0.12, 0.23, 0.54, 1.0], "roughnessFactor": 0.5}},
        {"name": "mat_hair", "pbrMetallicRoughness": {"baseColorFactor": [0.23, 0.14, 0.08, 1.0], "roughnessFactor": 0.6}},
        {"name": "mat_acc", "pbrMetallicRoughness": {"baseColorFactor": [0.95, 0.62, 0.04, 1.0], "roughnessFactor": 0.3, "metallicFactor": 0.7}}
    ]

    buffer_views = []
    accessors = []
    bin_bytes = bytearray()

    def add_mesh_primitive(node_name, min_pt, max_pt, mat_index):
        pos, idx = create_box_primitive(min_pt, max_pt)

        pos_offset = len(bin_bytes)
        pos_data = struct.pack(f'<{len(pos)}f', *pos)
        bin_bytes.extend(pos_data)
        pos_bv_idx = len(buffer_views)
        buffer_views.append({"buffer": 0, "byteOffset": pos_offset, "byteLength": len(pos_data), "target": 34962})

        idx_offset = len(bin_bytes)
        idx_data = struct.pack(f'<{len(idx)}H', *idx)
        bin_bytes.extend(idx_data)
        idx_bv_idx = len(buffer_views)
        buffer_views.append({"buffer": 0, "byteOffset": idx_offset, "byteLength": len(idx_data), "target": 34963})

        max_xyz = [max(pos[i::3]) for i in range(3)]
        min_xyz = [min(pos[i::3]) for i in range(3)]

        pos_acc_idx = len(accessors)
        accessors.append({"bufferView": pos_bv_idx, "componentType": 5126, "count": len(pos)//3, "type": "VEC3", "max": max_xyz, "min": min_xyz})

        idx_acc_idx = len(accessors)
        accessors.append({"bufferView": idx_bv_idx, "componentType": 5123, "count": len(idx), "type": "SCALAR"})

        mesh_idx = len(meshes)
        meshes.append({
            "name": node_name,
            "primitives": [{
                "attributes": {"POSITION": pos_acc_idx},
                "indices": idx_acc_idx,
                "material": mat_index
            }]
        })

        node_idx = len(nodes)
        nodes.append({"name": node_name, "mesh": mesh_idx})
        return node_idx

    root_children = []
    # Body parts
    root_children.append(add_mesh_primitive("head", [-0.14, 1.0, -0.14], [0.14, 1.28, 0.14], 0))
    root_children.append(add_mesh_primitive("torso", [-0.18, 0.54, -0.11], [0.18, 1.0, 0.11], 1))
    root_children.append(add_mesh_primitive("left_leg", [-0.16, 0.0, -0.09], [-0.02, 0.54, 0.09], 2))
    root_children.append(add_mesh_primitive("right_leg", [0.02, 0.0, -0.09], [0.16, 0.54, 0.09], 2))
    root_children.append(add_mesh_primitive("left_arm", [-0.28, 0.58, -0.06], [-0.18, 0.94, 0.06], 1))
    root_children.append(add_mesh_primitive("right_arm", [0.18, 0.58, -0.06], [0.28, 0.94, 0.06], 1))

    # Hair nodes
    root_children.append(add_mesh_primitive("hair_classic", [-0.155, 1.15, -0.155], [0.155, 1.32, 0.155], 3))
    root_children.append(add_mesh_primitive("hair_spiky", [-0.12, 1.25, -0.12], [0.12, 1.42, 0.12], 3))
    root_children.append(add_mesh_primitive("cap", [-0.16, 1.22, -0.16], [0.16, 1.34, 0.24], 4))
    root_children.append(add_mesh_primitive("crown", [-0.12, 1.28, -0.12], [0.12, 1.42, 0.12], 4))
    root_children.append(add_mesh_primitive("hat", [-0.22, 1.26, -0.22], [0.22, 1.45, 0.22], 4))

    # Accessories
    root_children.append(add_mesh_primitive("accessory_lantern", [0.22, 0.45, 0.08], [0.32, 0.62, 0.18], 4))
    root_children.append(add_mesh_primitive("accessory_flower", [0.22, 0.52, 0.08], [0.32, 0.68, 0.18], 1))
    root_children.append(add_mesh_primitive("accessory_wand", [0.22, 0.52, 0.08], [0.26, 0.88, 0.12], 4))

    root_node_idx = len(nodes)
    nodes.append({"name": "human_root", "children": root_children})

    gltf = {
        "asset": {"version": "2.0", "generator": "BosquePatitas Pro Modular Generator"},
        "scenes": [{"nodes": [root_node_idx]}],
        "nodes": nodes,
        "meshes": meshes,
        "materials": materials,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(bin_bytes)}]
    }

    write_glb_file(filename, gltf, bin_bytes)

def write_glb_file(filename, gltf, bin_bytes):
    json_str = json.dumps(gltf)
    json_bytes = json_str.encode('utf-8')
    while len(json_bytes) % 4 != 0:
        json_bytes += b' '

    while len(bin_bytes) % 4 != 0:
        bin_bytes.append(0)

    total_length = 12 + 8 + len(json_bytes) + 8 + len(bin_bytes)

    with open(filename, 'wb') as f:
        f.write(struct.pack('<I', 0x46546C67)) # glTF
        f.write(struct.pack('<I', 2))          # v2
        f.write(struct.pack('<I', total_length))

        f.write(struct.pack('<I', len(json_bytes)))
        f.write(struct.pack('<I', 0x4E4F534A)) # JSON
        f.write(json_bytes)

        f.write(struct.pack('<I', len(bin_bytes)))
        f.write(struct.pack('<I', 0x004E4942)) # BIN
        f.write(bin_bytes)

build_human_pro_glb('assets/models/human_base.glb')
print("Human base modular GLB created successfully!")
