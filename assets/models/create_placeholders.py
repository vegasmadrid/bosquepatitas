import json, struct

def create_gltf(filename, color_rgb):
    # Minimal GLTF cube with color material
    gltf = {
        "asset": {"version": "2.0", "generator": "BosquePatitas Placeholder Generator"},
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
                "baseColorFactor": [color_rgb[0], color_rgb[1], color_rgb[2], 1.0],
                "roughnessFactor": 0.8
            }
        }],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": 8, "type": "VEC3", "max": [0.4, 0.4, 0.4], "min": [-0.4, 0.0, -0.4]},
            {"bufferView": 1, "componentType": 5123, "count": 36, "type": "SCALAR"}
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": 96, "target": 34962},
            {"buffer": 0, "byteOffset": 96, "byteLength": 72, "target": 34963}
        ],
        "buffers": [{"byteLength": 168}]
    }

    # Cube positions (8 vertices)
    positions = [
        -0.3, 0.0, -0.3,
         0.3, 0.0, -0.3,
         0.3, 0.6, -0.3,
        -0.3, 0.6, -0.3,
        -0.3, 0.0,  0.3,
         0.3, 0.0,  0.3,
         0.3, 0.6,  0.3,
        -0.3, 0.6,  0.3
    ]
    # Cube indices (12 triangles)
    indices = [
        0, 2, 1, 0, 3, 2, # Back
        4, 5, 6, 4, 6, 7, # Front
        0, 1, 5, 0, 5, 4, # Bottom
        2, 3, 7, 2, 7, 6, # Top
        0, 4, 7, 0, 7, 3, # Left
        1, 2, 6, 1, 6, 5  # Right
    ]

    pos_bytes = struct.pack('<24f', *positions)
    idx_bytes = struct.pack('<36H', *indices)
    bin_data = pos_bytes + idx_bytes

    json_str = json.dumps(gltf)
    json_bytes = json_str.encode('utf-8')
    # Pad JSON to 4-byte boundary
    while len(json_bytes) % 4 != 0:
        json_bytes += b' '

    total_length = 12 + 8 + len(json_bytes) + 8 + len(bin_data)

    with open(filename, 'wb') as f:
        # GLB Header
        f.write(struct.pack('<I', 0x46546C67)) # magic "glTF"
        f.write(struct.pack('<I', 2))          # version 2
        f.write(struct.pack('<I', total_length))

        # JSON Chunk
        f.write(struct.pack('<I', len(json_bytes)))
        f.write(struct.pack('<I', 0x4E4F534A)) # "JSON"
        f.write(json_bytes)

        # BIN Chunk
        f.write(struct.pack('<I', len(bin_data)))
        f.write(struct.pack('<I', 0x004E4942)) # "BIN"
        f.write(bin_data)

create_gltf('assets/models/dog.glb', [0.8, 0.5, 0.2])
create_gltf('assets/models/cat.glb', [0.3, 0.6, 0.9])
create_gltf('assets/models/rabbit.glb', [0.9, 0.9, 0.9])
print("Placeholder models generated successfully!")
