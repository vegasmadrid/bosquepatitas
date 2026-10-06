document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('bp-canvas-container');
    if (!container) return;

    // 1. Escena, Cámara y Renderer
    const scene = new THREE.Scene();
    const fogColor = new THREE.Color(0xdbe9f4);
    scene.background = fogColor;
    // Niebla poética de fondo
    scene.fog = new THREE.FogExp2(fogColor, 0.02);

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 6, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. OrbitControls
    let controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2 - 0.01; // No bajar de la superficie del terreno
        controls.minDistance = 3;
        controls.maxDistance = 45;
        controls.target.set(0, 1, 0);
    }

    // 3. Luces cálidas
    const ambientLight = new THREE.AmbientLight(0xfff4e0, 0.6); // Luz ambiental cálida
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffeedd, 1.0); // Luz solar suave
    sunLight.position.set(15, 25, 15);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 60;
    const d = 25;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // 4. Terreno con textura de césped suave y cuadrícula sutil
    const grassTexture = createGrassTexture();
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({
        map: grassTexture,
        roughness: 0.9,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Cuadrícula sutil integrada sobre el césped
    const gridHelper = new THREE.GridHelper(60, 30, 0x558b6e, 0x3d6b52);
    gridHelper.position.y = 0.01; // Ligeramente elevado para evitar z-fighting
    if (gridHelper.material) {
        gridHelper.material.opacity = 0.35;
        gridHelper.material.transparent = true;
    }
    scene.add(gridHelper);

    // Remover el mensaje de carga
    const loader = document.getElementById('bp-loading');
    if (loader) loader.remove();

    // 5. Función para crear lápida 3D detallada
    function createTombstoneModel() {
        const group = new THREE.Group();

        // Materiales
        const darkStoneMat = new THREE.MeshStandardMaterial({
            color: 0x5a6065,
            roughness: 0.85,
            metalness: 0.1
        });
        const stoneMat = new THREE.MeshStandardMaterial({
            color: 0x828a90,
            roughness: 0.75,
            metalness: 0.15
        });
        const goldMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            roughness: 0.3,
            metalness: 0.7
        });

        // Pedestal base inferior
        const baseGeo = new THREE.BoxGeometry(1.2, 0.2, 0.7);
        const baseMesh = new THREE.Mesh(baseGeo, darkStoneMat);
        baseMesh.position.y = 0.1;
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        group.add(baseMesh);

        // Pedestal base superior
        const subBaseGeo = new THREE.BoxGeometry(1.0, 0.2, 0.55);
        const subBaseMesh = new THREE.Mesh(subBaseGeo, stoneMat);
        subBaseMesh.position.y = 0.3;
        subBaseMesh.castShadow = true;
        subBaseMesh.receiveShadow = true;
        group.add(subBaseMesh);

        // Cuerpo principal de la lápida
        const bodyGeo = new THREE.BoxGeometry(0.8, 0.8, 0.25);
        const bodyMesh = new THREE.Mesh(bodyGeo, stoneMat);
        bodyMesh.position.y = 0.8;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        group.add(bodyMesh);

        // Borde superior redondeado (Arco clásico)
        const archGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.25, 32, 1, false, 0, Math.PI);
        const archMesh = new THREE.Mesh(archGeo, stoneMat);
        archMesh.rotation.z = Math.PI / 2;
        archMesh.rotation.y = Math.PI / 2;
        archMesh.position.y = 1.2;
        archMesh.castShadow = true;
        archMesh.receiveShadow = true;
        group.add(archMesh);

        // Ornamento superior geométrico dorado
        const ornamentGeo = new THREE.OctahedronGeometry(0.1);
        const ornamentMesh = new THREE.Mesh(ornamentGeo, goldMat);
        ornamentMesh.position.set(0, 0.95, 0.13);
        ornamentMesh.castShadow = true;
        group.add(ornamentMesh);

        return group;
    }

    // Generador dinámico de textura de césped verde suave mediante Canvas
    function createGrassTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Color base verde césped
        ctx.fillStyle = '#4da661';
        ctx.fillRect(0, 0, 256, 256);

        // Patrón suave de tono verde
        for (let i = 0; i < 4000; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const r = Math.random() * 1.5 + 0.5;
            const rand = Math.random();

            if (rand > 0.6) {
                ctx.fillStyle = '#5ec273';
            } else if (rand > 0.3) {
                ctx.fillStyle = '#3c8c4e';
            } else {
                ctx.fillStyle = '#6bc77e';
            }

            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(12, 12);
        return texture;
    }

    // 6. Consumir REST API de WordPress
    if (typeof BP_Settings !== 'undefined') {
        fetch(BP_Settings.apiUrl)
            .then(res => res.json())
            .then(tumbas => {
                if (Array.isArray(tumbas)) {
                    tumbas.forEach(tumba => {
                        const meta = tumba.meta || {};
                        const x = (typeof meta.posicion_x === 'number') ? meta.posicion_x : parseFloat(meta.posicion_x) || 0;
                        const y = (typeof meta.posicion_y === 'number') ? meta.posicion_y : parseFloat(meta.posicion_y) || 0;
                        const z = (typeof meta.posicion_z === 'number') ? meta.posicion_z : parseFloat(meta.posicion_z) || 0;

                        const tombstone = createTombstoneModel();
                        tombstone.position.set(x, y, z);
                        scene.add(tombstone);
                    });
                }
            })
            .catch(err => console.error('Error cargando tumbas:', err));
    }

    // Redimensionado dinámico del canvas al cambiar el tamaño de ventana
    window.addEventListener('resize', () => {
        if (!container) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });

    // Loop de renderizado
    function animate() {
        requestAnimationFrame(animate);
        if (controls) controls.update();
        renderer.render(scene, camera);
    }
    animate();
});