document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('bp-canvas-container');
    if (!container) return;

    // 1. Escena, Cámara y Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0d8ef); // Cielo claro

    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 2. Luz
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7.5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // 3. Terreno (Suelo verde del bosque)
    const groundGeo = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.MeshBasicMaterial({ color: 0x4bc076, side: THREE.DoubleSide });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = Math.PI / 2;
    scene.add(ground);

    // Removemos el texto de carga
    const loader = document.getElementById('bp-loading');
    if (loader) loader.remove();

    // 4. Consumir REST API de WordPress
    if (typeof BP_Settings !== 'undefined') {
        fetch(BP_Settings.apiUrl)
            .then(res => res.json())
            .then(tumbas => {
                tumbas.forEach(tumba => {
                    const x = tumba.meta.posicion_x || 0;
                    const y = tumba.meta.posicion_y || 0.5;
                    const z = tumba.meta.posicion_z || 0;

                    // Crear lápida básica de prueba
                    const lapidaGeo = new THREE.BoxGeometry(0.8, 1, 0.2);
                    const lapidaMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
                    const lapida = new THREE.Mesh(lapidaGeo, lapidaMat);
                    lapida.position.set(x, y, z);
                    scene.add(lapida);
                });
            })
            .catch(err => console.error('Error cargando tumbas:', err));
    }

    // Loop de renderizado
    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();
});