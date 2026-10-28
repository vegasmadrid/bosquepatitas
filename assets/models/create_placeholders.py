import json, struct, math

def build_box(min_pt, max_pt):
    x0, y0, z0 = min_pt
    x1, y1, z1 = max_pt
    pos = [
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
    return pos, indices

def create_pet_glb(filename, species):
    positions = []
    indices = []

    def add_box(min_pt, max_pt):
        start_idx = len(positions) // 3
        pos, idx = build_box(min_pt, max_pt)
        positions.extend(pos)
        indices.extend([i + start_idx for i in idx])

    if species == 'dog':
        # Main Body
        add_box([-0.2, 0.2, -0.35], [0.2, 0.5, 0.25])
        # Head
        add_box([-0.16, 0.45, 0.2], [0.16, 0.72, 0.45])
        # Snout
        add_box([-0.09, 0.46, 0.45], [0.09, 0.58, 0.6])
        # Nose
        add_box([-0.03, 0.54, 0.59], [0.03, 0.59, 0.62])
        # Ears (Floppy)
        add_box([-0.22, 0.48, 0.22], [-0.16, 0.68, 0.35])
        add_box([0.16, 0.48, 0.22], [0.22, 0.68, 0.35])
        # Legs (4)
        add_box([-0.18, 0.0, 0.12], [-0.08, 0.25, 0.22]) # Front Left
        add_box([0.08, 0.0, 0.12], [0.18, 0.25, 0.22])  # Front Right
        add_box([-0.18, 0.0, -0.32], [-0.08, 0.25, -0.22]) # Back Left
        add_box([0.08, 0.0, -0.32], [0.18, 0.25, -0.22])  # Back Right
        # Tail (Wagging up)
        add_box([-0.04, 0.45, -0.52], [0.04, 0.7, -0.34])
        # Collar
        add_box([-0.17, 0.42, 0.18], [0.17, 0.47, 0.26])

    elif species == 'cat':
        # Body (Sleek)
        add_box([-0.16, 0.2, -0.32], [0.16, 0.45, 0.22])
        # Head
        add_box([-0.14, 0.42, 0.18], [0.14, 0.65, 0.4])
        # Snout (Short)
        add_box([-0.07, 0.43, 0.4], [0.07, 0.52, 0.48])
        # Ears (Pointy Triangular)
        add_box([-0.14, 0.65, 0.22], [-0.04, 0.78, 0.32])
        add_box([0.04, 0.65, 0.22], [0.14, 0.78, 0.32])
        # Legs (4 slim)
        add_box([-0.15, 0.0, 0.1], [-0.07, 0.22, 0.18])
        add_box([0.07, 0.0, 0.1], [0.15, 0.22, 0.18])
        add_box([-0.15, 0.0, -0.28], [-0.07, 0.22, -0.2])
        add_box([0.07, 0.0, -0.28], [0.15, 0.22, -0.2])
        # Long Curved Tail
        add_box([-0.03, 0.4, -0.6], [0.03, 0.75, -0.3])

    elif species == 'rabbit':
        # Compact Round Body
        add_box([-0.18, 0.15, -0.25], [0.18, 0.42, 0.18])
        # Head
        add_box([-0.13, 0.35, 0.12], [0.13, 0.55, 0.32])
        # Snout
        add_box([-0.06, 0.36, 0.32], [0.06, 0.44, 0.38])
        # Long Standing Ears
        add_box([-0.11, 0.55, 0.15], [-0.03, 0.95, 0.22])
        add_box([0.03, 0.55, 0.15], [0.11, 0.95, 0.22])
        # Small Paws
        add_box([-0.16, 0.0, 0.1], [-0.08, 0.16, 0.22])
        add_box([0.08, 0.0, 0.1], [0.16, 0.16, 0.22])
        add_box([-0.17, 0.0, -0.22], [-0.07, 0.18, -0.08])
        add_box([0.07, 0.0, -0.22], [0.17, 0.18, -0.08])
        # Fluffy Cotton Tail
        add_box([-0.06, 0.22, -0.34], [0.06, 0.34, -0.24])

    color_map = {
        'dog': [0.82, 0.52, 0.24],
        'cat': [0.35, 0.65, 0.88],
        'rabbit': [0.92, 0.90, 0.85]
    }
    col = color_map.get(species, [0.8, 0.8, 0.8])

    vertex_count = len(positions) // 3
    index_count = len(indices)

    max_xyz = [max(positions[i::3]) for i in range(3)]
    min_xyz = [min(positions[i::3]) for i in range(3)]

    pos_bytes = struct.pack(f'<{len(positions)}f', *positions)
    idx_bytes = struct.pack(f'<{len(indices)}H', *indices)

    gltf = {
        "asset": {"version": "2.0", "generator": "BosquePatitas Low-Poly Generator"},
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [{
            "primitives": [{
                "attributes": {"POSITION": 0},
                "indices": 1,
                "material": 0
            }]
        }],
        "materials": [{
            "pbrMetallicRoughness": {
                "baseColorFactor": [col[0], col[1], col[2], 1.0],
                "roughnessFactor": 0.7,
                "metallicFactor": 0.1
            }
        }],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": vertex_count, "type": "VEC3", "max": max_xyz, "min": min_xyz},
            {"bufferView": 1, "componentType": 5123, "count": index_count, "type": "SCALAR"}
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": len(pos_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": len(pos_bytes), "byteLength": len(idx_bytes), "target": 34963}
        ],
        "buffers": [{"byteLength": len(pos_bytes) + len(idx_bytes)}]
    }

    bin_data = pos_bytes + idx_bytes
    json_str = json.dumps(gltf)
    json_bytes = json_str.encode('utf-8')
    while len(json_bytes) % 4 != 0:
        json_bytes += b' '

    total_length = 12 + 8 + len(json_bytes) + 8 + len(bin_data)

    with open(filename, 'wb') as f:
        f.write(struct.pack('<I', 0x46546C67)) # glTF magic
        f.write(struct.pack('<I', 2))          # version 2
        f.write(struct.pack('<I', total_length))

        f.write(struct.pack('<I', len(json_bytes)))
        f.write(struct.pack('<I', 0x4E4F534A)) # "JSON"
        f.write(json_bytes)

        f.write(struct.pack('<I', len(bin_data)))
        f.write(struct.pack('<I', 0x004E4942)) # "BIN"
        f.write(bin_data)

create_pet_glb('assets/models/dog.glb', 'dog')
create_pet_glb('assets/models/cat.glb', 'cat')
create_pet_glb('assets/models/rabbit.glb', 'rabbit')
print("Detailed Low-Poly Pet models generated!")
