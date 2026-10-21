document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('bp-canvas-container');
    if (!container) return;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

    const settings = (typeof BP_Settings !== 'undefined') ? BP_Settings : {
        apiUrl: '/wp-json/wp/v2/tumbas',
        isLoggedIn: false,
        userName: '',
        loginUrl: '#',
        profileUrl: '#'
    };

    // ----------------------------------------------------
    // ELEMENTOS UI & MENÚ INVENTARIO TIPO VIDEOJUEGO
    // ----------------------------------------------------
    let tooltip = document.getElementById('bp-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'bp-tooltip';
        tooltip.className = 'bp-tooltip-card hidden bp-ui-element';
        container.appendChild(tooltip);
    }

    // Top-Left Floating Controls & Dynamic Modal Header Greeting
    const topBar = document.createElement('div');
    topBar.className = 'bp-top-controls bp-ui-element';

    const greetingText = settings.isLoggedIn
        ? `¡Hola, ${settings.userName}!`
        : `Bienvenido a BosquePatitas`;

    const accountBtnText = settings.isLoggedIn ? 'Ver Perfil' : 'Entrar';
    const accountBtnUrl = settings.isLoggedIn ? settings.profileUrl : settings.loginUrl;

    topBar.innerHTML = `
        <button id="bp-inventory-btn" class="bp-menu-trigger bp-menu-trigger-yellow" title="Menú de Opciones" aria-label="Abrir Menú">
            <svg class="bp-menu-icon-yellow" viewBox="0 0 100 100" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="20" y="24" width="60" height="12" rx="6" fill="#000000"/>
                <rect x="20" y="44" width="60" height="12" rx="6" fill="#000000"/>
                <rect x="20" y="64" width="60" height="12" rx="6" fill="#000000"/>
            </svg>
        </button>
    `;
    container.appendChild(topBar);

    // Modal de Navegación Sleek & Compact Options List
    const inventoryModal = document.createElement('div');
    inventoryModal.id = 'bp-inventory-modal';
    inventoryModal.className = 'bp-modal-overlay hidden bp-ui-element';
    inventoryModal.innerHTML = `
        <div class="bp-modal-panel bp-modal-panel-compact">
            <div class="bp-modal-header-compact">
                <div class="bp-header-top-row">
                    <span class="bp-brand-badge">🌲 BosquePatitas 3D</span>
                    <button id="bp-inventory-close-top" class="bp-btn-close-corner" title="Cerrar">&times;</button>
                </div>
                <div class="bp-user-greeting-box">
                    <span class="bp-greeting-icon">👋</span>
                    <span class="bp-header-greeting-text">${greetingText}</span>
                </div>
            </div>

            <ul class="bp-menu-list">
                <li class="bp-menu-item" id="bp-menu-item-pets" data-url="${settings.profileUrl}">
                    <div class="bp-menu-icon">🐾</div>
                    <div class="bp-menu-text">
                        <span class="bp-menu-title">Mis Mascotas</span>
                        <span class="bp-menu-desc">Registra y gestiona tus mascotas</span>
                    </div>
                    <div class="bp-menu-chevron">➔</div>
                </li>

                <li class="bp-menu-item" id="bp-menu-item-account" data-url="${accountBtnUrl}">
                    <div class="bp-menu-icon">${settings.isLoggedIn ? '👤' : '🔑'}</div>
                    <div class="bp-menu-text">
                        <span class="bp-menu-title">${settings.isLoggedIn ? 'Mi Perfil' : 'Cuenta y Acceso'}</span>
                        <span class="bp-menu-desc">${settings.isLoggedIn ? 'Administra tus recuerdos y parcelas' : 'Inicia sesión o regístrate'}</span>
                    </div>
                    <div class="bp-menu-chevron">➔</div>
                </li>

                <li class="bp-menu-item" id="bp-menu-item-camera">
                    <div class="bp-menu-icon">🛰️</div>
                    <div class="bp-menu-text">
                        <span class="bp-menu-title">Modo de Cámara</span>
                        <span class="bp-menu-desc" id="bp-slot-view-desc">Alternar a Vista Aérea</span>
                    </div>
                    <div class="bp-menu-chevron">➔</div>
                </li>

                <li class="bp-menu-item" id="bp-menu-item-help">
                    <div class="bp-menu-icon">🧭</div>
                    <div class="bp-menu-text">
                        <span class="bp-menu-title">Guía de Controles</span>
                        <span class="bp-menu-desc">Atajos de teclado, ratón y táctil</span>
                    </div>
                    <div class="bp-menu-chevron">➔</div>
                </li>
            </ul>
        </div>
    `;
    container.appendChild(inventoryModal);

    // Contenedor de Modal de Ayuda
    const helpModal = document.createElement('div');
    helpModal.id = 'bp-help-modal';
    helpModal.className = 'bp-modal-overlay hidden bp-ui-element';
    helpModal.innerHTML = `
        <div class="bp-modal-card">
            <div class="bp-modal-header">
                <h3>🌲 Controles de Navegación</h3>
                <button id="bp-modal-close" class="bp-modal-close">&times;</button>
            </div>
            <div class="bp-modal-body">
                <div class="bp-control-section">
                    <h4>💻 Teclado, Ratón y Rueda (PC)</h4>
                    <ul>
                        <li><kbd>▲</kbd> <kbd>▼</kbd> <kbd>◄</kbd> <kbd>►</kbd> o <kbd>W</kbd> <kbd>S</kbd> <kbd>A</kbd> <kbd>D</kbd> : Moverse y girar.</li>
                        <li><strong>Rueda del Ratón:</strong> Scroll arriba para avanzar, scroll abajo para retroceder.</li>
                        <li><strong>Clic y Arrastrar:</strong> Orientar la mirada suavemente.</li>
                        <li><strong>Clic en Tumba / Parcela:</strong> Caminar automáticamente hacia ella.</li>
                    </ul>
                </div>
                <div class="bp-control-section">
                    <h4>📱 Pantalla Táctil (Móvil)</h4>
                    <ul>
                        <li><strong>Cruceta Táctil:</strong> Usar los botones limpios en esquina inferior izquierda.</li>
                        <li><strong>Deslizar Pantalla:</strong> Orientar la vista libremente.</li>
                        <li><strong>Toque en Tumba:</strong> Acercarse automáticamente a la tumba.</li>
                    </ul>
                </div>
            </div>
            <div class="bp-modal-footer">
                <button id="bp-modal-ok" class="bp-btn bp-btn-emerald">¡Entendido!</button>
            </div>
        </div>
    `;
    container.appendChild(helpModal);

    // Modal para Solicitar / Asignar Parcela
    const claimModal = document.createElement('div');
    claimModal.id = 'bp-claim-modal';
    claimModal.className = 'bp-modal-overlay hidden bp-ui-element';
    claimModal.innerHTML = `
        <div class="bp-modal-card">
            <div class="bp-modal-header">
                <h3 id="bp-claim-title">📍 Parcela Disponible</h3>
                <button id="bp-claim-close" class="bp-modal-close">&times;</button>
            </div>
            <div class="bp-modal-body" id="bp-claim-body"></div>
        </div>
    `;
    container.appendChild(claimModal);

    // Modal Ficha Completa de Mascota
    const petSheetModal = document.createElement('div');
    petSheetModal.id = 'bp-pet-sheet-modal';
    petSheetModal.className = 'bp-modal-overlay hidden bp-ui-element';
    petSheetModal.innerHTML = `
        <div class="bp-modal-pet-sheet">
            <button id="bp-sheet-close" class="bp-btn-close-corner" style="position:absolute; top:16px; right:16px;">&times;</button>
            <div id="bp-sheet-content"></div>
        </div>
    `;
    container.appendChild(petSheetModal);

    // Fullscreen 80s Arcade Options Overlay - Mis Mascotas
    const arcadePetsModal = document.createElement('div');
    arcadePetsModal.id = 'bp-mascotas-arcade-modal';
    arcadePetsModal.className = 'bp-arcade-overlay hidden bp-ui-element';
    arcadePetsModal.innerHTML = `
        <div class="bp-arcade-header">
            <div>
                <h2 class="bp-arcade-title">🕹️ MIS MASCOTAS - REGISTRO DE PERSONAJES</h2>
                <div class="bp-arcade-subtitle">Gestión 80s Retro Arcade | BosquePatitas 3D</div>
            </div>
            <button id="bp-arcade-close" class="bp-arcade-close-btn">✖ SALIR AL BOSQUE</button>
        </div>
        <div id="bp-arcade-content"></div>
    `;
    container.appendChild(arcadePetsModal);

    // D-Pad Controles Táctiles en Pantalla
    const dpadContainer = document.createElement('div');
    dpadContainer.id = 'bp-dpad';
    dpadContainer.className = 'bp-dpad-container bp-ui-element';
    dpadContainer.innerHTML = `
        <div class="bp-dpad-cross">
            <button class="bp-dpad-btn bp-dpad-up" data-action="forward" title="Avanzar">▲</button>
            <button class="bp-dpad-btn bp-dpad-left" data-action="turnLeft" title="Girar Izquierda">◄</button>
            <button class="bp-dpad-btn bp-dpad-down" data-action="backward" title="Retroceder">▼</button>
            <button class="bp-dpad-btn bp-dpad-right" data-action="turnRight" title="Girar Derecha">►</button>
        </div>
    `;
    container.appendChild(dpadContainer);

    // ----------------------------------------------------
    // 1. ESCENA, CÁMARA Y RENDERER
    // ----------------------------------------------------
    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x7ec0ee); // Cielo azul claro y radiante
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0x9bd0f9, 0.0045); // Niebla atmosférica suave que se funde con el cielo azul

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);

    const MODE_GROUND = 'ground';
    const MODE_AERIAL = 'aerial';
    let currentMode = MODE_GROUND;

    const PLAYER_HEIGHT = 1.6;
    const MAP_LIMIT = 32.2; // Límite de movimiento interno dentro de la verja victoriana (33.0)

    let cameraYaw = 0;
    let cameraPitch = 0;
    camera.position.set(0, PLAYER_HEIGHT, 15);
    camera.rotation.order = 'YXZ';

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('sRGBEncoding' in THREE) {
        renderer.outputEncoding = THREE.sRGBEncoding;
    }
    container.appendChild(renderer.domElement);

    let controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2 - 0.02;
        controls.minDistance = 4;
        controls.maxDistance = 55;
        controls.target.set(0, 1.2, 0);
        controls.enabled = false;
    }

    // ----------------------------------------------------
    // 2. LUCES CELESTIALES
    // ----------------------------------------------------
    const ambientLight = new THREE.AmbientLight(0xfff5ea, 0.75);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffe8c2, 1.1);
    sunLight.position.set(25, 35, -20);
    sunLight.castShadow = true;
    const shadowMapRes = isMobile ? 1024 : 2048;
    sunLight.shadow.mapSize.width = shadowMapRes;
    sunLight.shadow.mapSize.height = shadowMapRes;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 90;
    const d = 35;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // ----------------------------------------------------
    // 3. TERRENO Y TEXTURAS PROCEDURALES
    // ----------------------------------------------------
    const grassTexture = createGrassTexture();
    const cobblestoneTexture = createCobblestoneTexture();

    const groundGeo = new THREE.PlaneGeometry(70, 70);
    const groundMat = new THREE.MeshStandardMaterial({
        map: grassTexture,
        roughness: 0.9,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ----------------------------------------------------
    // GENERADORES 3D
    // ----------------------------------------------------
    function createTreeModel(type = 'oak') {
        const group = new THREE.Group();
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9, metalness: 0.1 });

        if (type === 'pine') {
            const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.5, 8);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 1.25;
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            group.add(trunk);

            const pineMat = new THREE.MeshStandardMaterial({ color: 0x2e5a3c, roughness: 0.8, flatShading: true });
            const layers = [
                { r: 1.6, h: 2.2, y: 2.8 },
                { r: 1.2, h: 2.0, y: 4.0 },
                { r: 0.8, h: 1.8, y: 5.1 }
            ];
            layers.forEach(l => {
                const coneGeo = new THREE.ConeGeometry(l.r, l.h, 7);
                const cone = new THREE.Mesh(coneGeo, pineMat);
                cone.position.y = l.y;
                cone.castShadow = true;
                cone.receiveShadow = true;
                group.add(cone);
            });
        } else if (type === 'willow') {
            const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 2.8, 8);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 1.4;
            trunk.castShadow = true;
            group.add(trunk);

            const willowMat = new THREE.MeshStandardMaterial({ color: 0x4a7c59, roughness: 0.85, flatShading: true });
            const mainCanopyGeo = new THREE.CylinderGeometry(1.8, 2.2, 2.2, 9);
            const mainCanopy = new THREE.Mesh(mainCanopyGeo, willowMat);
            mainCanopy.position.y = 3.6;
            mainCanopy.castShadow = true;
            group.add(mainCanopy);

            const topGeo = new THREE.SphereGeometry(1.4, 8, 8);
            const top = new THREE.Mesh(topGeo, willowMat);
            top.position.y = 4.5;
            top.castShadow = true;
            group.add(top);
        } else {
            const trunkGeo = new THREE.CylinderGeometry(0.28, 0.45, 3.0, 8);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 1.5;
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            group.add(trunk);

            const oakMat = new THREE.MeshStandardMaterial({ color: 0x3b6e47, roughness: 0.8, flatShading: true });
            const foliageClusters = [
                { r: 1.5, x: 0, y: 3.8, z: 0 },
                { r: 1.1, x: 0.8, y: 3.5, z: 0.6 },
                { r: 1.0, x: -0.8, y: 3.6, z: -0.5 },
                { r: 1.2, x: 0, y: 4.6, z: 0 }
            ];
            foliageClusters.forEach(c => {
                const geo = new THREE.IcosahedronGeometry(c.r, 1);
                const mesh = new THREE.Mesh(geo, oakMat);
                mesh.position.set(c.x, c.y, c.z);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                group.add(mesh);
            });
        }

        return group;
    }

    function createStreetLampModel() {
        const group = new THREE.Group();

        const metalMat = new THREE.MeshStandardMaterial({ color: 0x222629, roughness: 0.4, metalness: 0.8 });
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0xffe6a7,
            emissive: 0xffb84d,
            emissiveIntensity: 0.8,
            roughness: 0.2,
            metalness: 0.1
        });

        const baseGeo = new THREE.CylinderGeometry(0.22, 0.32, 0.4, 8);
        const base = new THREE.Mesh(baseGeo, metalMat);
        base.position.y = 0.2;
        base.castShadow = true;
        group.add(base);

        const postGeo = new THREE.CylinderGeometry(0.08, 0.12, 2.8, 8);
        const post = new THREE.Mesh(postGeo, metalMat);
        post.position.y = 1.8;
        post.castShadow = true;
        group.add(post);

        const ringGeo = new THREE.TorusGeometry(0.14, 0.03, 8, 12);
        const ring = new THREE.Mesh(ringGeo, metalMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 3.1;
        group.add(ring);

        const lanternGeo = new THREE.CylinderGeometry(0.25, 0.15, 0.5, 6);
        const lantern = new THREE.Mesh(lanternGeo, glassMat);
        lantern.position.y = 3.4;
        group.add(lantern);

        const capGeo = new THREE.ConeGeometry(0.3, 0.25, 6);
        const cap = new THREE.Mesh(capGeo, metalMat);
        cap.position.y = 3.75;
        group.add(cap);

        const lampLight = new THREE.PointLight(0xffaa44, 1.1, 11, 1.8);
        lampLight.position.set(0, 3.4, 0);
        group.add(lampLight);

        return group;
    }

    function createBenchModel() {
        const group = new THREE.Group();

        const metalMat = new THREE.MeshStandardMaterial({ color: 0x1a1d20, roughness: 0.5, metalness: 0.7 });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7, metalness: 0.1 });

        const legGeo = new THREE.BoxGeometry(0.1, 0.5, 0.6);
        const leg1 = new THREE.Mesh(legGeo, metalMat);
        leg1.position.set(-0.7, 0.25, 0);
        leg1.castShadow = true;
        group.add(leg1);

        const leg2 = new THREE.Mesh(legGeo, metalMat);
        leg2.position.set(0.7, 0.25, 0);
        leg2.castShadow = true;
        group.add(leg2);

        for (let i = 0; i < 3; i++) {
            const slatGeo = new THREE.BoxGeometry(1.6, 0.04, 0.12);
            const slat = new THREE.Mesh(slatGeo, woodMat);
            slat.position.set(0, 0.5, -0.18 + i * 0.16);
            slat.castShadow = true;
            group.add(slat);
        }

        for (let j = 0; j < 2; j++) {
            const backSlatGeo = new THREE.BoxGeometry(1.6, 0.12, 0.04);
            const backSlat = new THREE.Mesh(backSlatGeo, woodMat);
            backSlat.position.set(0, 0.7 + j * 0.16, -0.28);
            backSlat.castShadow = true;
            group.add(backSlat);
        }

        return group;
    }

    function createMemorialPlazaModel() {
        const group = new THREE.Group();

        const stoneMat = new THREE.MeshStandardMaterial({ map: cobblestoneTexture, roughness: 0.8, metalness: 0.15 });
        const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4f54, roughness: 0.7 });
        const marbleMat = new THREE.MeshStandardMaterial({ color: 0xe0e4e8, roughness: 0.3, metalness: 0.2 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 });

        const platformGeo = new THREE.CylinderGeometry(5.0, 5.2, 0.15, 8);
        const platform = new THREE.Mesh(platformGeo, stoneMat);
        platform.position.y = 0.07;
        platform.receiveShadow = true;
        group.add(platform);

        const stepGeo = new THREE.CylinderGeometry(2.5, 2.7, 0.2, 16);
        const step = new THREE.Mesh(stepGeo, darkStoneMat);
        step.position.y = 0.25;
        step.castShadow = true;
        step.receiveShadow = true;
        group.add(step);

        const pedGeo = new THREE.BoxGeometry(1.4, 0.8, 1.4);
        const pedestal = new THREE.Mesh(pedGeo, darkStoneMat);
        pedestal.position.y = 0.75;
        pedestal.castShadow = true;
        group.add(pedestal);

        const obeliskGeo = new THREE.CylinderGeometry(0.3, 0.5, 2.6, 4);
        const obelisk = new THREE.Mesh(obeliskGeo, marbleMat);
        obelisk.rotation.y = Math.PI / 4;
        obelisk.position.y = 2.45;
        obelisk.castShadow = true;
        group.add(obelisk);

        const pyramidGeo = new THREE.ConeGeometry(0.42, 0.6, 4);
        const pyramid = new THREE.Mesh(pyramidGeo, goldMat);
        pyramid.rotation.y = Math.PI / 4;
        pyramid.position.y = 4.05;
        pyramid.castShadow = true;
        group.add(pyramid);

        const benchPositions = [
            { x: 3.5, z: 0, r: -Math.PI / 2 },
            { x: -3.5, z: 0, r: Math.PI / 2 },
            { x: 0, z: 3.5, r: 0 },
            { x: 0, z: -3.5, r: Math.PI }
        ];

        benchPositions.forEach(p => {
            const bench = createBenchModel();
            bench.position.set(p.x, 0.15, p.z);
            bench.rotation.y = p.r;
            group.add(bench);
        });

        const lampPositions = [
            { x: 3.5, z: 3.5 },
            { x: -3.5, z: 3.5 },
            { x: 3.5, z: -3.5 },
            { x: -3.5, z: -3.5 }
        ];
        lampPositions.forEach(p => {
            const lamp = createStreetLampModel();
            lamp.position.set(p.x, 0.15, p.z);
            group.add(lamp);
        });

        return group;
    }

    function createTombstoneModel() {
        const group = new THREE.Group();

        const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x4d5358, roughness: 0.85, metalness: 0.1 });
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7c848a, roughness: 0.75, metalness: 0.15 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.7 });

        const baseGeo = new THREE.BoxGeometry(1.2, 0.18, 0.7);
        const baseMesh = new THREE.Mesh(baseGeo, darkStoneMat);
        baseMesh.position.y = 0.09;
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        group.add(baseMesh);

        const subBaseGeo = new THREE.BoxGeometry(1.0, 0.18, 0.55);
        const subBaseMesh = new THREE.Mesh(subBaseGeo, stoneMat);
        subBaseMesh.position.y = 0.27;
        subBaseMesh.castShadow = true;
        subBaseMesh.receiveShadow = true;
        group.add(subBaseMesh);

        const bodyGeo = new THREE.BoxGeometry(0.8, 0.8, 0.22);
        const bodyMesh = new THREE.Mesh(bodyGeo, stoneMat);
        bodyMesh.position.y = 0.76;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        group.add(bodyMesh);

        const archGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.22, 24, 1, false, 0, Math.PI);
        const archMesh = new THREE.Mesh(archGeo, stoneMat);
        archMesh.rotation.z = Math.PI / 2;
        archMesh.rotation.y = Math.PI / 2;
        archMesh.position.y = 1.16;
        archMesh.castShadow = true;
        archMesh.receiveShadow = true;
        group.add(archMesh);

        const ornamentGeo = new THREE.OctahedronGeometry(0.09);
        const ornamentMesh = new THREE.Mesh(ornamentGeo, goldMat);
        ornamentMesh.position.set(0, 0.9, 0.12);
        ornamentMesh.castShadow = true;
        group.add(ornamentMesh);

        return group;
    }

    function createGrassTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#448a52';
        ctx.fillRect(0, 0, 256, 256);

        for (let i = 0; i < 4500; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const r = Math.random() * 1.6 + 0.4;
            const rand = Math.random();

            if (rand > 0.6) {
                ctx.fillStyle = '#55a365';
            } else if (rand > 0.3) {
                ctx.fillStyle = '#357041';
            } else {
                ctx.fillStyle = '#61b572';
            }

            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(14, 14);
        return texture;
    }

    function createCobblestoneTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#3a3d40';
        ctx.fillRect(0, 0, 256, 256);

        const rows = 16;
        const cols = 16;
        const w = 256 / cols;
        const h = 256 / rows;

        for (let r = 0; r < rows; r++) {
            const offset = (r % 2 === 0) ? 0 : w / 2;
            for (let c = -1; c < cols + 1; c++) {
                const x = c * w + offset + 1;
                const y = r * h + 1;
                const bw = w - 2;
                const bh = h - 2;

                const shade = Math.floor(100 + Math.random() * 60);
                ctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 8})`;
                ctx.fillRect(x, y, bw, bh);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.fillRect(x, y, bw, 2);
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 20);
        return texture;
    }

    // ----------------------------------------------------
    // CLASE GESTORA DE PARCELAS (PLOT MANAGER)
    // ----------------------------------------------------
    class PlotManager {
        constructor(scene) {
            this.scene = scene;
            this.plots = [];
            this.generatePlotSlots();
        }

        generatePlotSlots() {
            const plotMat = new THREE.MeshStandardMaterial({
                color: 0x3d5242,
                roughness: 0.8,
                metalness: 0.1,
                transparent: true,
                opacity: 0.65
            });
            const borderMat = new THREE.MeshStandardMaterial({
                color: 0x727d74,
                roughness: 0.6
            });

            const addPlot = (id, x, z, rotationY) => {
                const plotGroup = new THREE.Group();
                plotGroup.position.set(x, 0.02, z);
                plotGroup.rotation.y = rotationY;

                const slabGeo = new THREE.PlaneGeometry(1.5, 1.1);
                const slab = new THREE.Mesh(slabGeo, plotMat.clone());
                slab.rotation.x = -Math.PI / 2;
                slab.receiveShadow = true;
                plotGroup.add(slab);

                const borderGeo = new THREE.BoxGeometry(1.6, 0.04, 1.2);
                const border = new THREE.Mesh(borderGeo, borderMat.clone());
                border.position.y = 0.02;
                border.receiveShadow = true;
                plotGroup.add(border);

                const plotData = {
                    type: 'plot',
                    plotId: id,
                    occupied: false,
                    tombData: null,
                    plotGroup: plotGroup,
                    slabMesh: slab,
                    borderMesh: border
                };

                plotGroup.userData = plotData;
                slab.userData = plotData;
                border.userData = plotData;

                this.scene.add(plotGroup);

                this.plots.push({
                    id,
                    position: new THREE.Vector3(x, 0, z),
                    rotationY,
                    group: plotGroup,
                    slab,
                    border,
                    occupied: false,
                    tombData: null,
                    tombMesh: null
                });
            };

            let index = 1;
            const zPositions = [-24, -20, -16, -12, -7, 7, 12, 16, 20, 24];
            zPositions.forEach(z => {
                addPlot(`PAR-NS-E${index}`, 3.2, z, -Math.PI / 2);
                addPlot(`PAR-NS-W${index}`, -3.2, z, Math.PI / 2);
                index++;
            });

            const xPositions = [-24, -20, -16, -12, -7, 7, 12, 16, 20, 24];
            xPositions.forEach(x => {
                addPlot(`PAR-EO-N${index}`, x, -3.2, 0);
                addPlot(`PAR-EO-S${index}`, x, 3.2, Math.PI);
                index++;
            });
        }

        findAvailablePlot() {
            return this.plots.find(p => !p.occupied);
        }

        findPlotByCoords(x, z, tolerance = 2.0) {
            return this.plots.find(p => {
                const dist = Math.hypot(p.position.x - x, p.position.z - z);
                return dist <= tolerance;
            });
        }

        assignTombToPlot(plot, tombstoneGroup, tombData) {
            plot.occupied = true;
            plot.tombData = tombData;
            plot.tombMesh = tombstoneGroup;

            tombstoneGroup.position.set(plot.position.x, plot.position.y, plot.position.z);
            tombstoneGroup.rotation.y = plot.rotationY;

            const userData = {
                type: 'tombstone',
                plotId: plot.id,
                tombData: tombData,
                plotGroup: plot.group,
                borderMesh: plot.border
            };
            tombstoneGroup.userData = userData;
            tombstoneGroup.traverse(child => {
                if (child.isMesh) child.userData = userData;
            });

            plot.group.userData.occupied = true;
            plot.group.userData.tombData = tombData;
            plot.group.userData.tombMesh = tombstoneGroup;

            if (plot.slab) plot.slab.material.opacity = 0.2;
            this.scene.add(tombstoneGroup);
        }
    }

    // ----------------------------------------------------
    // GENERADOR DE VERJA VICTORIANA Y PORTÓN PÈRE LACHAISE
    // ----------------------------------------------------
    function createVictorianFencePerimeter() {
        const fenceGroup = new THREE.Group();

        const ironMat = new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.35, metalness: 0.85 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 });
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4f54, roughness: 0.8, metalness: 0.1 });
        const capMat = new THREE.MeshStandardMaterial({ color: 0x2d3033, roughness: 0.7, metalness: 0.2 });

        function createPillar() {
            const pillar = new THREE.Group();

            const baseGeo = new THREE.BoxGeometry(0.65, 0.3, 0.65);
            const base = new THREE.Mesh(baseGeo, stoneMat);
            base.position.y = 0.15;
            base.castShadow = true;
            base.receiveShadow = true;
            pillar.add(base);

            const bodyGeo = new THREE.BoxGeometry(0.52, 2.3, 0.52);
            const body = new THREE.Mesh(bodyGeo, stoneMat);
            body.position.y = 1.45;
            body.castShadow = true;
            body.receiveShadow = true;
            pillar.add(body);

            const trimGeo = new THREE.BoxGeometry(0.6, 0.1, 0.6);
            const trim = new THREE.Mesh(trimGeo, capMat);
            trim.position.y = 2.65;
            trim.castShadow = true;
            pillar.add(trim);

            const capGeo = new THREE.ConeGeometry(0.42, 0.35, 4);
            const cap = new THREE.Mesh(capGeo, capMat);
            cap.rotation.y = Math.PI / 4;
            cap.position.y = 2.875;
            cap.castShadow = true;
            pillar.add(cap);

            const finialGeo = new THREE.SphereGeometry(0.1, 8, 8);
            const finial = new THREE.Mesh(finialGeo, goldMat);
            finial.position.y = 3.12;
            finial.castShadow = true;
            pillar.add(finial);

            return pillar;
        }

        function createFencePanel(length) {
            const panel = new THREE.Group();
            const barSpacing = 0.22;
            const barCount = Math.floor(length / barSpacing);
            const startX = -length / 2 + (length - (barCount - 1) * barSpacing) / 2;

            const railTopGeo = new THREE.BoxGeometry(length, 0.05, 0.05);
            const railTop = new THREE.Mesh(railTopGeo, ironMat);
            railTop.position.set(0, 2.1, 0);
            railTop.castShadow = true;
            panel.add(railTop);

            const railMidGeo = new THREE.BoxGeometry(length, 0.04, 0.04);
            const railMid = new THREE.Mesh(railMidGeo, ironMat);
            railMid.position.set(0, 1.15, 0);
            railMid.castShadow = true;
            panel.add(railMid);

            const railBotGeo = new THREE.BoxGeometry(length, 0.05, 0.05);
            const railBot = new THREE.Mesh(railBotGeo, ironMat);
            railBot.position.set(0, 0.25, 0);
            railBot.castShadow = true;
            panel.add(railBot);

            const barGeo = new THREE.CylinderGeometry(0.018, 0.018, 2.2, 6);
            const spearGeo = new THREE.ConeGeometry(0.038, 0.2, 6);

            for (let i = 0; i < barCount; i++) {
                const x = startX + i * barSpacing;

                const bar = new THREE.Mesh(barGeo, ironMat);
                bar.position.set(x, 1.15, 0);
                bar.castShadow = true;
                panel.add(bar);

                const spear = new THREE.Mesh(spearGeo, (i % 2 === 0) ? goldMat : ironMat);
                spear.position.set(x, 2.35, 0);
                spear.castShadow = true;
                panel.add(spear);
            }

            return panel;
        }

        function createVictorianGate() {
            const gateGroup = new THREE.Group();

            const leftPillar = createPillar();
            leftPillar.position.set(-2.2, 0, 0);
            leftPillar.scale.set(1.2, 1.25, 1.2);
            gateGroup.add(leftPillar);

            const rightPillar = createPillar();
            rightPillar.position.set(2.2, 0, 0);
            rightPillar.scale.set(1.2, 1.25, 1.2);
            gateGroup.add(rightPillar);

            const archRadius = 2.2;
            const archTube = 0.06;
            const archGeo = new THREE.TorusGeometry(archRadius, archTube, 8, 24, Math.PI);
            const arch = new THREE.Mesh(archGeo, ironMat);
            arch.position.set(0, 3.2, 0);
            arch.castShadow = true;
            gateGroup.add(arch);

            const crestGeo = new THREE.OctahedronGeometry(0.22);
            const crest = new THREE.Mesh(crestGeo, goldMat);
            crest.position.set(0, 5.5, 0);
            crest.castShadow = true;
            gateGroup.add(crest);

            function createGateLeaf(isOpenLeft) {
                const leaf = new THREE.Group();
                const width = 1.95;

                const frameT = new THREE.Mesh(new THREE.BoxGeometry(width, 0.06, 0.06), ironMat);
                frameT.position.set(width / 2, 2.2, 0);
                leaf.add(frameT);

                const frameB = new THREE.Mesh(new THREE.BoxGeometry(width, 0.06, 0.06), ironMat);
                frameB.position.set(width / 2, 0.2, 0);
                leaf.add(frameB);

                const frameSide1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.0, 8), ironMat);
                frameSide1.position.set(0.05, 1.2, 0);
                leaf.add(frameSide1);

                const frameSide2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.0, 8), ironMat);
                frameSide2.position.set(width - 0.05, 1.2, 0);
                leaf.add(frameSide2);

                const barSpacing = 0.22;
                const bars = Math.floor(width / barSpacing);
                const barG = new THREE.CylinderGeometry(0.018, 0.018, 2.0, 6);
                const spearG = new THREE.ConeGeometry(0.04, 0.22, 6);

                for (let i = 1; i < bars; i++) {
                    const bx = i * barSpacing;
                    const bar = new THREE.Mesh(barG, ironMat);
                    bar.position.set(bx, 1.2, 0);
                    leaf.add(bar);

                    const spear = new THREE.Mesh(spearG, goldMat);
                    spear.position.set(bx, 2.31, 0);
                    leaf.add(spear);
                }

                leaf.rotation.y = isOpenLeft ? Math.PI / 3.5 : -Math.PI / 3.5;
                return leaf;
            }

            const leftLeaf = createGateLeaf(true);
            leftLeaf.position.set(-2.0, 0, 0);
            gateGroup.add(leftLeaf);

            const rightLeaf = createGateLeaf(false);
            rightLeaf.position.set(2.0, 0, 0);
            rightLeaf.rotation.y = -Math.PI / 3.5;
            gateGroup.add(rightLeaf);

            return gateGroup;
        }

        const limit = 33.0;
        const gateWidth = 4.4;
        const step = 5.2;

        function buildSide(rotationY, hasMainGate = false) {
            const sideGroup = new THREE.Group();
            sideGroup.rotation.y = rotationY;

            if (hasMainGate) {
                const gate = createVictorianGate();
                gate.position.set(0, 0, limit);
                sideGroup.add(gate);

                const halfGate = gateWidth / 2;
                for (let x = halfGate; x <= limit; x += step) {
                    const nextX = Math.min(x + step, limit);
                    const length = nextX - x;
                    if (length < 0.5) continue;

                    const pillarRight = createPillar();
                    pillarRight.position.set(nextX, 0, limit);
                    sideGroup.add(pillarRight);

                    const panelRight = createFencePanel(length);
                    panelRight.position.set(x + length / 2, 0, limit);
                    sideGroup.add(panelRight);

                    const pillarLeft = createPillar();
                    pillarLeft.position.set(-nextX, 0, limit);
                    sideGroup.add(pillarLeft);

                    const panelLeft = createFencePanel(length);
                    panelLeft.position.set(-(x + length / 2), 0, limit);
                    sideGroup.add(panelLeft);
                }
            } else {
                const centerPillar = createPillar();
                centerPillar.position.set(0, 0, limit);
                sideGroup.add(centerPillar);

                for (let x = 0; x <= limit; x += step) {
                    const nextX = Math.min(x + step, limit);
                    const length = nextX - x;
                    if (length < 0.5) continue;

                    const pillarRight = createPillar();
                    pillarRight.position.set(nextX, 0, limit);
                    sideGroup.add(pillarRight);

                    const panelRight = createFencePanel(length);
                    panelRight.position.set(x + length / 2, 0, limit);
                    sideGroup.add(panelRight);

                    const pillarLeft = createPillar();
                    pillarLeft.position.set(-nextX, 0, limit);
                    sideGroup.add(pillarLeft);

                    const panelLeft = createFencePanel(length);
                    panelLeft.position.set(-(x + length / 2), 0, limit);
                    sideGroup.add(panelLeft);
                }
            }

            return sideGroup;
        }

        fenceGroup.add(buildSide(0, true));          // Sur (Entrada Principal)
        fenceGroup.add(buildSide(Math.PI / 2, true));  // Este (Entrada Secundaria)
        fenceGroup.add(buildSide(Math.PI, true));     // Norte (Entrada Secundaria)
        fenceGroup.add(buildSide(-Math.PI / 2, true));// Oeste (Entrada Secundaria)

        return fenceGroup;
    }

    // ----------------------------------------------------
    // GENERADOR DE MAR DE NUBES ESPONJOSAS 3D (CELESTIAL CLOUD BED)
    // ----------------------------------------------------
    function createCloudBed() {
        const cloudGroup = new THREE.Group();

        const cloudMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.35, // Blanco brillante celestialmente radiante
            roughness: 0.9,
            metalness: 0.0,
            flatShading: false,
            transparent: true,
            opacity: 0.98
        });

        // Geometrías esféricas suaves para nubes redondas y mulliditas
        const cloudPuffGeos = [
            new THREE.SphereGeometry(2.5, 24, 18),
            new THREE.SphereGeometry(3.2, 24, 18),
            new THREE.SphereGeometry(2.8, 24, 18)
        ];

        // Función matemática exacta para verificar que NINGUNA esfera/copo penetre en el área del cementerio
        const CEMETERY_SAFE_BOX = 35.5; // El terreno del cementerio mide 35x35 desde el centro, la verja en 33.0

        function isOverlappingCemetery(x, z, radius) {
            const absX = Math.abs(x);
            const absZ = Math.abs(z);

            let dx = 0;
            if (absX > CEMETERY_SAFE_BOX) {
                dx = absX - CEMETERY_SAFE_BOX;
            }

            let dz = 0;
            if (absZ > CEMETERY_SAFE_BOX) {
                dz = absZ - CEMETERY_SAFE_BOX;
            }

            if (absX <= CEMETERY_SAFE_BOX && absZ <= CEMETERY_SAFE_BOX) return true;
            if (absX <= CEMETERY_SAFE_BOX) return dz < radius;
            if (absZ <= CEMETERY_SAFE_BOX) return dx < radius;
            return (dx * dx + dz * dz) < (radius * radius);
        }

        const totalClouds = isMobile ? 180 : 320;
        const MIN_CLUSTER_DIST = 38.0;

        for (let i = 0; i < totalClouds; i++) {
            const sector = Math.floor(Math.random() * 4);
            let cx, cz;

            const distFromEdge = Math.random() * 110.0;
            const u = MIN_CLUSTER_DIST + distFromEdge;
            const v = (Math.random() - 0.5) * 300.0;

            if (sector === 0) {       // Sur
                cx = v; cz = u;
            } else if (sector === 1) { // Norte
                cx = v; cz = -u;
            } else if (sector === 2) { // Este
                cx = u; cz = v;
            } else {                  // Oeste
                cx = -u; cz = v;
            }

            const dist = Math.hypot(cx, cz);
            const scale = 0.9 + Math.random() * 1.4 + Math.min(2.5, dist / 45.0);

            // Posición Y baja para formar el suelo de nubes bajo el cementerio
            const cy = -6.2 + (Math.random() - 0.5) * 1.0;

            const cluster = new THREE.Group();
            cluster.position.set(cx, cy, cz);

            const puffCount = Math.floor(5 + Math.random() * 5);
            let validCluster = false;

            for (let p = 0; p < puffCount; p++) {
                const baseRadius = 2.8;
                const geoIndex = Math.floor(Math.random() * cloudPuffGeos.length);
                const geo = cloudPuffGeos[geoIndex];
                const puff = new THREE.Mesh(geo, cloudMat);

                const px = (Math.random() - 0.5) * 6.5 * scale;
                const py = (Math.random() - 0.5) * 1.2 * scale;
                const pz = (Math.random() - 0.5) * 6.5 * scale;

                const pScale = (0.85 + Math.random() * 0.75) * scale;
                const puffRadius = baseRadius * pScale * 1.15;

                const worldX = cx + px;
                const worldZ = cz + pz;

                // Verificación matemática estricta contra el cuadro del cementerio
                if (isOverlappingCemetery(worldX, worldZ, puffRadius)) {
                    continue;
                }

                puff.position.set(px, py, pz);
                // Proporciones redondas y mulliditas (curvas esponjosas)
                puff.scale.set(pScale * 1.15, pScale * 0.85, pScale * 1.15);
                puff.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

                cluster.add(puff);
                validCluster = true;
            }

            if (validCluster) {
                cloudGroup.add(cluster);
            }
        }

        return cloudGroup;
    }

    // ----------------------------------------------------
    // CONSTRUCCIÓN DEL BOSQUE
    // ----------------------------------------------------
    const cloudBed = createCloudBed();
    scene.add(cloudBed);
    const victorianFence = createVictorianFencePerimeter();
    scene.add(victorianFence);

    const memorialPlaza = createMemorialPlazaModel();
    memorialPlaza.position.set(0, 0, 0);
    scene.add(memorialPlaza);

    const pathMat = new THREE.MeshStandardMaterial({
        map: cobblestoneTexture,
        roughness: 0.8,
        metalness: 0.2
    });

    const nsPathGeo = new THREE.PlaneGeometry(3.6, 60);
    const nsPath = new THREE.Mesh(nsPathGeo, pathMat);
    nsPath.rotation.x = -Math.PI / 2;
    nsPath.position.set(0, 0.02, 0);
    nsPath.receiveShadow = true;
    scene.add(nsPath);

    const eoPathGeo = new THREE.PlaneGeometry(60, 3.6);
    const eoPath = new THREE.Mesh(eoPathGeo, pathMat);
    eoPath.rotation.x = -Math.PI / 2;
    eoPath.position.set(0, 0.02, 0);
    eoPath.receiveShadow = true;
    scene.add(eoPath);

    const lampPathPositions = [
        { x: 2.3, z: 10 }, { x: -2.3, z: 18 }, { x: 2.3, z: 25 },
        { x: -2.3, z: -10 }, { x: 2.3, z: -18 }, { x: -2.3, z: -25 },
        { x: 10, z: 2.3 }, { x: 18, z: -2.3 }, { x: 25, z: 2.3 },
        { x: -10, z: -2.3 }, { x: -18, z: 2.3 }, { x: -25, z: -2.3 }
    ];
    lampPathPositions.forEach(pos => {
        const lamp = createStreetLampModel();
        lamp.position.set(pos.x, 0, pos.z);
        scene.add(lamp);
    });

    const plotManager = new PlotManager(scene);

    const forestTreePositions = [
        { x: 8, z: 8, type: 'oak' }, { x: 15, z: 12, type: 'pine' }, { x: 22, z: 8, type: 'willow' },
        { x: 10, z: 22, type: 'oak' }, { x: 18, z: 20, type: 'pine' }, { x: 25, z: 25, type: 'oak' },
        { x: -8, z: 8, type: 'willow' }, { x: -16, z: 10, type: 'oak' }, { x: -22, z: 6, type: 'pine' },
        { x: -9, z: 21, type: 'pine' }, { x: -19, z: 19, type: 'oak' }, { x: -24, z: 24, type: 'willow' },
        { x: -8, z: -8, type: 'oak' }, { x: -15, z: -12, type: 'pine' }, { x: -21, z: -9, type: 'willow' },
        { x: -10, z: -22, type: 'willow' }, { x: -18, z: -20, type: 'oak' }, { x: -26, z: -25, type: 'pine' },
        { x: 8, z: -8, type: 'pine' }, { x: 14, z: -11, type: 'oak' }, { x: 22, z: -7, type: 'pine' },
        { x: 11, z: -21, type: 'oak' }, { x: 19, z: -18, type: 'willow' }, { x: 25, z: -24, type: 'oak' }
    ];

    forestTreePositions.forEach(t => {
        const tree = createTreeModel(t.type);
        tree.position.set(t.x, 0, t.z);
        scene.add(tree);
    });

    // ----------------------------------------------------
    // CONSUMO REST API DE WORDPRESS
    // ----------------------------------------------------
    if (settings.apiUrl) {
        fetch(settings.apiUrl)
            .then(res => res.json())
            .then(tumbas => {
                if (Array.isArray(tumbas)) {
                    tumbas.forEach(tumba => {
                        const meta = tumba.meta || {};
                        const x = (typeof meta.posicion_x === 'number') ? meta.posicion_x : parseFloat(meta.posicion_x) || 0;
                        const z = (typeof meta.posicion_z === 'number') ? meta.posicion_z : parseFloat(meta.posicion_z) || 0;

                        let plot = plotManager.findPlotByCoords(x, z);
                        if (!plot || plot.occupied) {
                            plot = plotManager.findAvailablePlot();
                        }

                        if (plot) {
                            const tombstoneMesh = createTombstoneModel();
                            plotManager.assignTombToPlot(plot, tombstoneMesh, tumba);
                        }
                    });
                }
            })
            .catch(err => console.error('Error cargando tumbas:', err));
    }

    // ----------------------------------------------------
    // CONTROLADOR DE MOVIMIENTO (TECLADO, RUEDA RATÓN, MÓVIL, AUTO-WALK)
    // ----------------------------------------------------
    const keyState = {
        forward: false,
        backward: false,
        turnLeft: false,
        turnRight: false,
        strafeLeft: false,
        strafeRight: false
    };

    const touchState = {
        forward: false,
        backward: false,
        turnLeft: false,
        turnRight: false
    };

    let isAutoWalking = false;
    let autoWalkTarget = null;

    function stopAutoWalk() {
        isAutoWalking = false;
        autoWalkTarget = null;
    }

    // Escuchadores Teclado
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        let handled = true;
        switch (e.code) {
            case 'ArrowUp':
            case 'KeyW':
                keyState.forward = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                keyState.backward = true;
                break;
            case 'ArrowLeft':
                keyState.turnLeft = true;
                break;
            case 'ArrowRight':
                keyState.turnRight = true;
                break;
            case 'KeyA':
                keyState.strafeLeft = true;
                break;
            case 'KeyD':
                keyState.strafeRight = true;
                break;
            default:
                handled = false;
        }
        if (handled) stopAutoWalk();
    });

    window.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'ArrowUp':
            case 'KeyW':
                keyState.forward = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                keyState.backward = false;
                break;
            case 'ArrowLeft':
                keyState.turnLeft = false;
                break;
            case 'ArrowRight':
                keyState.turnRight = false;
                break;
            case 'KeyA':
                keyState.strafeLeft = false;
                break;
            case 'KeyD':
                keyState.strafeRight = false;
                break;
        }
    });

    // Avanzar / Retroceder con Rueda del Ratón en Modo Paseo Ground
    container.addEventListener('wheel', (e) => {
        if (currentMode !== MODE_GROUND) return;
        e.preventDefault();
        stopAutoWalk();

        const scrollSpeed = 1.2;
        const moveZ = e.deltaY > 0 ? 1 : -1; // deltaY > 0 es scroll hacia abajo (retroceder), < 0 avance

        const sinY = Math.sin(cameraYaw);
        const cosY = Math.cos(cameraYaw);

        const dx = moveZ * sinY * scrollSpeed;
        const dz = moveZ * cosY * scrollSpeed;

        camera.position.x += dx;
        camera.position.z += dz;

        camera.position.x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, camera.position.x));
        camera.position.z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, camera.position.z));
    }, { passive: false });

    // Escuchadores D-Pad Táctil
    dpadContainer.querySelectorAll('.bp-dpad-btn').forEach(btn => {
        const action = btn.dataset.action;

        const startAction = (e) => {
            e.preventDefault();
            e.stopPropagation();
            touchState[action] = true;
            stopAutoWalk();
            btn.classList.add('active');
        };

        const stopAction = (e) => {
            e.preventDefault();
            e.stopPropagation();
            touchState[action] = false;
            btn.classList.remove('active');
        };

        btn.addEventListener('touchstart', startAction, { passive: false });
        btn.addEventListener('touchend', stopAction, { passive: false });
        btn.addEventListener('mousedown', startAction);
        btn.addEventListener('mouseup', stopAction);
        btn.addEventListener('mouseleave', stopAction);
    });

    // ----------------------------------------------------
    // MANEJO DE MÓDALES E INVENTARIO (LIST-BASED)
    // ----------------------------------------------------
    const inventoryBtn = document.getElementById('bp-inventory-btn');
    const inventoryCloseTopBtn = document.getElementById('bp-inventory-close-top');
    const menuItemPets = document.getElementById('bp-menu-item-pets');
    const menuItemAccount = document.getElementById('bp-menu-item-account');
    const menuItemCamera = document.getElementById('bp-menu-item-camera');
    const menuItemHelp = document.getElementById('bp-menu-item-help');
    const slotViewDesc = document.getElementById('bp-slot-view-desc');

    const helpModalCloseBtn = document.getElementById('bp-modal-close');
    const helpModalOkBtn = document.getElementById('bp-modal-ok');

    function setMode(mode) {
        currentMode = mode;
        if (currentMode === MODE_AERIAL) {
            if (controls) {
                controls.enabled = true;
                controls.target.set(camera.position.x, 0.8, camera.position.z);
            }
            camera.position.set(camera.position.x, 22, camera.position.z + 18);
            camera.lookAt(controls ? controls.target : new THREE.Vector3(0, 0, 0));

            if (slotViewDesc) slotViewDesc.textContent = 'Alternar a Modo Paseo 3D';
            dpadContainer.style.display = 'none';
        } else {
            if (controls) {
                controls.enabled = false;
            }
            const targetX = controls ? controls.target.x : camera.position.x;
            const targetZ = controls ? controls.target.z : camera.position.z;

            camera.position.set(targetX, PLAYER_HEIGHT, targetZ);
            cameraPitch = 0;
            camera.rotation.set(0, cameraYaw, 0, 'YXZ');

            if (slotViewDesc) slotViewDesc.textContent = 'Alternar a Vista Aérea Orbit';
            if (isMobile) {
                dpadContainer.style.display = 'block';
            }
        }
    }

    if (inventoryBtn) {
        inventoryBtn.addEventListener('click', () => {
            inventoryModal.classList.remove('hidden');
        });
    }

    if (inventoryCloseTopBtn) {
        inventoryCloseTopBtn.addEventListener('click', () => {
            inventoryModal.classList.add('hidden');
        });
    }

    if (menuItemPets) {
        menuItemPets.addEventListener('click', () => {
            inventoryModal.classList.add('hidden');
            openArcadePetsModal();
        });
    }

    const arcadeCloseBtn = document.getElementById('bp-arcade-close');
    if (arcadeCloseBtn) {
        arcadeCloseBtn.addEventListener('click', () => {
            arcadePetsModal.classList.add('hidden');
        });
    }

    if (menuItemAccount) {
        menuItemAccount.addEventListener('click', () => {
            const url = menuItemAccount.dataset.url;
            if (url && url !== '#') {
                window.location.href = url;
            }
        });
    }

    if (menuItemCamera) {
        menuItemCamera.addEventListener('click', () => {
            setMode(currentMode === MODE_GROUND ? MODE_AERIAL : MODE_GROUND);
            inventoryModal.classList.add('hidden');
        });
    }

    if (menuItemHelp) {
        menuItemHelp.addEventListener('click', () => {
            inventoryModal.classList.add('hidden');
            helpModal.classList.remove('hidden');
        });
    }

    const closeHelpModal = () => helpModal.classList.add('hidden');
    if (helpModalCloseBtn) helpModalCloseBtn.addEventListener('click', closeHelpModal);
    if (helpModalOkBtn) helpModalOkBtn.addEventListener('click', closeHelpModal);

    const claimModalCloseBtn = document.getElementById('bp-claim-close');
    if (claimModalCloseBtn) claimModalCloseBtn.addEventListener('click', () => claimModal.classList.add('hidden'));

    const sheetModalCloseBtn = document.getElementById('bp-sheet-close');
    if (sheetModalCloseBtn) sheetModalCloseBtn.addEventListener('click', () => petSheetModal.classList.add('hidden'));

    // ----------------------------------------------------
    // FULLSCREEN 80s ARCADE OVERLAY FUNCTIONALITY
    // ----------------------------------------------------
    function openArcadePetsModal(editPet = null) {
        const arcadeContent = document.getElementById('bp-arcade-content');
        if (!arcadeContent) return;

        arcadePetsModal.classList.remove('hidden');

        if (!settings.isLoggedIn) {
            arcadeContent.innerHTML = `
                <div style="text-align:center; padding:60px 20px;">
                    <p style="font-family:'Press Start 2P', monospace; font-size:14px; color:#ffd600; margin-bottom:20px;">
                        🕹️ INSERT COIN / ACCESO REQUERIDO
                    </p>
                    <p style="color:#a7f3d0; font-size:14px; margin-bottom:24px;">
                        Debes iniciar sesión o registrarte para acceder al Registro de Personajes y crear fichas de mascotas.
                    </p>
                    <a href="${settings.loginUrl}" class="bp-arcade-btn bp-arcade-btn-yellow" style="display:inline-block; text-decoration:none; font-size:12px; padding:14px 24px;">
                        🔑 INICIAR SESIÓN / REGISTRARSE
                    </a>
                </div>
            `;
            return;
        }

        arcadeContent.innerHTML = '<div style="text-align:center; padding:40px; font-family:\'Press Start 2P\', monospace; color:#34d399;">⌛ CARGANDO SELECCIÓN DE PERSONAJES...</div>';

        const restRoot = settings.restRoot || '/wp-json/';
        let fetchUrl = restRoot + 'wp/v2/mascotas?per_page=100';
        if (settings.currentUserId) {
            fetchUrl += '&author=' + settings.currentUserId;
        }

        fetch(fetchUrl, {
            headers: { 'X-WP-Nonce': settings.nonce }
        })
        .then(res => res.json())
        .then(pets => {
            const userPets = Array.isArray(pets)
                ? pets.filter(p => !settings.currentUserId || parseInt(p.author, 10) === parseInt(settings.currentUserId, 10))
                : [];
            renderArcadePetsScreen(userPets, editPet);
        })
        .catch(err => {
            renderArcadePetsScreen([], editPet);
        });
    }

    function renderArcadePetsScreen(pets, editPet = null) {
        const arcadeContent = document.getElementById('bp-arcade-content');
        if (!arcadeContent) return;

        let cardsHtml = `
            <div class="bp-arcade-card" style="border-dash:2px dashed #ffd600; background:rgba(255, 214, 0, 0.05); align-items:center; justify-content:center; text-align:center; cursor:pointer;" id="bp-arcade-add-new-card">
                <div style="font-size:36px; margin-bottom:10px;">➕</div>
                <div style="font-family:'Press Start 2P', monospace; font-size:11px; color:#ffd600;">REGISTRAR NUEVA MASCOTA</div>
                <p style="font-size:11px; color:#a7f3d0; margin-top:6px;">Crea una nueva ficha de personaje</p>
            </div>
        `;

        if (Array.isArray(pets) && pets.length > 0) {
            pets.forEach(p => {
                const details = p.mascota_details || {};
                const isApproved = details.is_approved || false;
                const tumbaId = details.tumba_id || 0;
                const imgUrl = details.imagen_url || '';
                const title = details.nombre || (p.title ? (p.title.rendered || p.title) : 'Mascota');
                const honor = details.titulo_honor || '';
                const especie = details.especie_raza || '';

                cardsHtml += `
                    <div class="bp-arcade-card">
                        <div class="bp-arcade-card-head">
                            ${imgUrl ? `<img src="${imgUrl}" class="bp-arcade-avatar" />` : `<div class="bp-arcade-avatar" style="display:flex; align-items:center; justify-content:center; font-size:28px;">🐾</div>`}
                            <div>
                                <h4 class="bp-arcade-card-title">${title}</h4>
                                ${honor ? `<div style="font-size:11px; color:#34d399;">👑 ${honor}</div>` : ''}
                                ${especie ? `<div style="font-size:10px; color:#94a3b8;">🐾 ${especie}</div>` : ''}
                                <div style="margin-top:4px;">
                                    ${isApproved ? `<span class="bp-arcade-badge approved">✔ VALIDADA</span>` : `<span class="bp-arcade-badge pending">⏳ EN REVISIÓN</span>`}
                                </div>
                            </div>
                        </div>

                        <div class="bp-arcade-stats-mini">
                            <div>💖 Cariño: <strong>${details.stat_carino || 10}/10</strong></div>
                            <div>😼 Travesura: <strong>${details.stat_travesura || 5}/10</strong></div>
                            <div>📍 Tumba: <strong>${tumbaId > 0 ? 'Sepultada en 3D' : 'Sin tumba'}</strong></div>
                        </div>

                        <div class="bp-arcade-actions">
                            ${tumbaId > 0 ? `
                                <button class="bp-arcade-btn bp-arcade-btn-green bp-arcade-unlink-btn" data-id="${p.id}">🔓 RETIRAR DE TUMBA</button>
                            ` : `
                                <button class="bp-arcade-btn bp-arcade-btn-yellow bp-arcade-edit-btn" data-id="${p.id}">✏️ EDITAR</button>
                            `}
                            <button class="bp-arcade-btn bp-arcade-btn-danger bp-arcade-delete-btn" data-id="${p.id}">🗑️ ELIMINAR</button>
                        </div>
                    </div>
                `;
            });
        }

        const editData = editPet ? (editPet.mascota_details || editPet) : null;
        const inGrave = editData ? (editData.tumba_id || 0) : 0;

        arcadeContent.innerHTML = `
            <div style="margin-bottom:20px; font-family:'Press Start 2P', monospace; font-size:11px; color:#34d399;">
                GRID DE SELECCIÓN DE PERSONAJES (${Array.isArray(pets) ? pets.length : 0} REGISTRADAS)
            </div>

            <div class="bp-arcade-grid">
                ${cardsHtml}
            </div>

            <!-- FORMULARIO RETRO EDITAR / CREAR MASCOTA -->
            <div id="bp-arcade-form-drawer" class="bp-arcade-form-box ${editPet ? '' : 'hidden'}">
                <h4>${editPet ? '✏️ EDITAR FICHA DE PERSONAJE' : '🐾 REGISTRO DE NUEVA MASCOTA'}</h4>

                ${inGrave > 0 ? `
                    <div style="background:rgba(225, 29, 72, 0.2); border:1px solid #e11d48; color:#fca5a5; padding:12px; border-radius:6px; font-size:12px; margin-bottom:15px;">
                        ⚠️ Esta mascota está actualmente en una tumba 3D. Debes retirarla de la tumba antes de modificar su ficha.
                    </div>
                ` : `
                    <form id="bp-arcade-pet-form" enctype="multipart/form-data">
                        <input type="hidden" name="mascota_id" value="${editPet ? (editPet.id || editPet.ID) : 0}" />
                        <input type="hidden" name="bp_nonce" value="${settings.authNonce || settings.nonce}" />

                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:15px; margin-bottom:15px;">
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">1. NOMBRE REAL *</label>
                                <input type="text" name="nombre" class="bp-arcade-input" required value="${editData ? (editData.nombre || editPet.post_title || '') : ''}" placeholder="Ej: Toby" />
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">2. APODOS</label>
                                <input type="text" name="apodos" class="bp-arcade-input" value="${editData ? (editData.apodos || '') : ''}" placeholder='Ej: "Sr. Salchicha"' />
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">3. TÍTULO DE HONOR</label>
                                <input type="text" name="titulo_honor" class="bp-arcade-input" value="${editData ? (editData.titulo_honor || '') : ''}" placeholder='Ej: "Reina del Sofá"' />
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">4. ESPECIE Y RAZA</label>
                                <input type="text" name="especie_raza" class="bp-arcade-input" value="${editData ? (editData.especie_raza || '') : ''}" placeholder='Ej: "Perro / Mezcla"' />
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:15px; margin-bottom:15px;">
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">FECHA LLEGADA</label>
                                <input type="date" name="fecha_llegada" class="bp-arcade-input" value="${editData ? (editData.fecha_llegada || '') : ''}" />
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">FECHA DESPEDIDA</label>
                                <input type="date" name="fecha_despedida" class="bp-arcade-input" value="${editData ? (editData.fecha_despedida || '') : ''}" />
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">FOTOGRAFÍA</label>
                                <input type="file" name="foto_mascota" class="bp-arcade-input" accept="image/*" />
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap:10px; margin-bottom:15px; background:rgba(0,0,0,0.3); padding:10px; border-radius:6px;">
                            <div>
                                <label style="font-size:10px; color:#34d399;">CARIÑO (1-10)</label>
                                <input type="number" min="1" max="10" name="stat_carino" class="bp-arcade-input" value="${editData ? (editData.stat_carino || 10) : 10}" />
                            </div>
                            <div>
                                <label style="font-size:10px; color:#34d399;">TRAVESURA (1-10)</label>
                                <input type="number" min="1" max="10" name="stat_travesura" class="bp-arcade-input" value="${editData ? (editData.stat_travesura || 5) : 5}" />
                            </div>
                            <div>
                                <label style="font-size:10px; color:#34d399;">AMOR BAÑO (1-10)</label>
                                <input type="number" min="1" max="10" name="stat_bano" class="bp-arcade-input" value="${editData ? (editData.stat_bano || 3) : 3}" />
                            </div>
                            <div>
                                <label style="font-size:10px; color:#34d399;">CARA PENA (1-10)</label>
                                <input type="number" min="1" max="10" name="stat_pena" class="bp-arcade-input" value="${editData ? (editData.stat_pena || 10) : 10}" />
                            </div>
                        </div>

                        <div style="margin-bottom:15px;">
                            <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">LA GRAN ANÉCDOTA / HISTORIA *</label>
                            <textarea name="historia" rows="3" class="bp-arcade-input" required placeholder="Cuéntanos su historia...">${editData ? (editData.historia || editPet.post_content || '') : ''}</textarea>
                        </div>

                        <div id="bp-arcade-feedback" style="display:none; font-size:12px; margin-bottom:12px; color:#2ecc71;"></div>

                        <div style="display:flex; gap:10px;">
                            <button type="submit" class="bp-arcade-btn bp-arcade-btn-green" style="font-size:11px; padding:12px 20px;">
                                🕹️ ENVIAR FICHA PARA VALIDACIÓN
                            </button>
                            <button type="button" id="bp-arcade-cancel-form" class="bp-arcade-btn bp-arcade-btn-yellow" style="font-size:11px; padding:12px 20px;">
                                CANCELAR
                            </button>
                        </div>
                    </form>
                `}
            </div>
        `;

        // Wire Add New Button
        const addNewCard = document.getElementById('bp-arcade-add-new-card');
        const formDrawer = document.getElementById('bp-arcade-form-drawer');

        if (addNewCard && formDrawer) {
            addNewCard.addEventListener('click', () => {
                formDrawer.classList.remove('hidden');
                formDrawer.scrollIntoView({ behavior: 'smooth' });
            });
        }

        const cancelFormBtn = document.getElementById('bp-arcade-cancel-form');
        if (cancelFormBtn && formDrawer) {
            cancelFormBtn.addEventListener('click', () => {
                formDrawer.classList.add('hidden');
            });
        }

        // Wire Form Submission
        const arcadeForm = document.getElementById('bp-arcade-pet-form');
        const feedbackBox = document.getElementById('bp-arcade-feedback');

        if (arcadeForm) {
            arcadeForm.addEventListener('submit', (e) => {
                e.preventDefault();

                const submitBtn = arcadeForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'GUARDANDO FICHA...';
                }

                const formData = new FormData(arcadeForm);
                formData.append('action', 'bp_ajax_save_mascota');

                const ajaxUrl = (typeof BP_Auth_Data !== 'undefined' ? BP_Auth_Data.ajaxurl : '/wp-admin/admin-ajax.php');

                fetch(ajaxUrl, {
                    method: 'POST',
                    body: formData
                })
                .then(res => res.json())
                .then(res => {
                    if (res.success) {
                        if (feedbackBox) {
                            feedbackBox.style.display = 'block';
                            feedbackBox.style.color = '#2ecc71';
                            feedbackBox.textContent = res.data.message || 'Ficha enviada con éxito.';
                        }
                        setTimeout(() => {
                            openArcadePetsModal();
                        }, 1000);
                    } else {
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = '🕹️ ENVIAR FICHA PARA VALIDACIÓN';
                        }
                        if (feedbackBox) {
                            feedbackBox.style.display = 'block';
                            feedbackBox.style.color = '#e11d48';
                            feedbackBox.textContent = res.data.message || 'Error al guardar.';
                        }
                    }
                })
                .catch(err => {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = '🕹️ ENVIAR FICHA PARA VALIDACIÓN';
                    }
                    if (feedbackBox) {
                        feedbackBox.style.display = 'block';
                        feedbackBox.style.color = '#e11d48';
                        feedbackBox.textContent = 'Error de conexión.';
                    }
                });
            });
        }

        // Wire Edit Buttons
        arcadeContent.querySelectorAll('.bp-arcade-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const petId = parseInt(btn.dataset.id, 10);
                const pet = Array.isArray(pets) ? pets.find(p => p.id === petId) : null;
                if (pet) {
                    renderArcadePetsScreen(pets, pet);
                    const drawer = document.getElementById('bp-arcade-form-drawer');
                    if (drawer) drawer.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        // Wire Unlink Buttons
        arcadeContent.querySelectorAll('.bp-arcade-unlink-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const petId = parseInt(btn.dataset.id, 10);
                if (!confirm('¿Deseas retirar esta mascota de la tumba 3D?')) return;

                const formData = new FormData();
                formData.append('action', 'bp_ajax_unlink_mascota');
                formData.append('mascota_id', petId);
                formData.append('bp_nonce', settings.authNonce || settings.nonce);

                const ajaxUrl = (typeof BP_Auth_Data !== 'undefined' ? BP_Auth_Data.ajaxurl : '/wp-admin/admin-ajax.php');

                fetch(ajaxUrl, { method: 'POST', body: formData })
                .then(res => res.json())
                .then(res => {
                    openArcadePetsModal();
                });
            });
        });

        // Wire Delete Buttons
        arcadeContent.querySelectorAll('.bp-arcade-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const petId = parseInt(btn.dataset.id, 10);
                if (!confirm('¿Seguro que deseas eliminar esta ficha de mascota?')) return;

                const formData = new FormData();
                formData.append('action', 'bp_ajax_delete_mascota');
                formData.append('mascota_id', petId);
                formData.append('bp_nonce', settings.authNonce || settings.nonce);

                const ajaxUrl = (typeof BP_Auth_Data !== 'undefined' ? BP_Auth_Data.ajaxurl : '/wp-admin/admin-ajax.php');

                fetch(ajaxUrl, { method: 'POST', body: formData })
                .then(res => res.json())
                .then(res => {
                    openArcadePetsModal();
                });
            });
        });
    }

    // ----------------------------------------------------
    // FUNCIONES MANEJADORAS DE MODALES DE PARCELA Y MASCOTA
    // ----------------------------------------------------
    function openModalForObject(userData, plotGroup) {
        if (userData.type === 'tombstone' || (userData.type === 'plot' && userData.occupied)) {
            showPetSheetModal(userData.tombData);
        } else {
            showClaimModal(userData, plotGroup);
        }
    }

    function showClaimModal(userData, plotGroup) {
        const claimTitle = document.getElementById('bp-claim-title');
        const claimBody = document.getElementById('bp-claim-body');
        if (!claimTitle || !claimBody) return;

        claimTitle.textContent = `📍 Parcela ${userData.plotId || 'Disponible'}`;

        if (!settings.isLoggedIn) {
            claimBody.innerHTML = `
                <p style="color:#cbd5e1; font-size:14px; margin-bottom:16px;">
                    Esta parcela está libre para honrar a una mascota especial. Debes iniciar sesión o registrarte para solicitarla.
                </p>
                <div style="text-align:center;">
                    <a href="${settings.loginUrl}" class="bp-btn bp-btn-primary" style="display:inline-block; background:#2d6a4f; color:#ffffff; padding:12px 20px; border-radius:8px; font-weight:700; text-decoration:none;">
                        🔑 Iniciar Sesión / Registrarse
                    </a>
                </div>
            `;
        } else if (!settings.approvedPets || settings.approvedPets.length === 0) {
            claimBody.innerHTML = `
                <p style="color:#cbd5e1; font-size:14px; margin-bottom:16px;">
                    Para solicitar una parcela necesitas tener al menos una mascota validada con el tik verde ✔ por el equipo de BosquePatitas.
                </p>
                <div style="text-align:center;">
                    <a href="${settings.profileUrl}" class="bp-btn bp-btn-primary" style="display:inline-block; background:#2d6a4f; color:#ffffff; padding:12px 20px; border-radius:8px; font-weight:700; text-decoration:none;">
                        🐾 Registrar y Validar Mascota
                    </a>
                </div>
            `;
        } else {
            let optionsHtml = '';
            settings.approvedPets.forEach(pet => {
                optionsHtml += `<option value="${pet.id}">${pet.nombre} (${pet.especie})</option>`;
            });

            claimBody.innerHTML = `
                <p style="color:#cbd5e1; font-size:14px; margin-bottom:14px;">
                    ¡Tienes mascotas validadas listas para ocupar su lugar en el Bosque 3D! Selecciona la mascota que deseas enterrar en esta parcela:
                </p>
                <div style="margin-bottom:16px;">
                    <label style="display:block; font-size:12px; font-weight:700; color:#a7f3d0; margin-bottom:6px;">Seleccionar Mascota Validada:</label>
                    <select id="bp-select-claim-pet" style="width:100%; padding:10px; border-radius:8px; border:1px solid #10b981; background:#0f172a; color:#ffffff; font-size:14px;">
                        ${optionsHtml}
                    </select>
                </div>
                <div id="bp-claim-feedback" style="display:none; margin-bottom:12px; font-size:13px; color:#f87171;"></div>
                <button id="bp-btn-confirm-claim" class="bp-btn" style="width:100%; background:#27ae60; color:#ffffff; padding:12px; border:none; border-radius:8px; font-weight:700; font-size:14px; cursor:pointer;">
                    ✨ Asignar Parcela y Colocar Lápida
                </button>
            `;

            const confirmBtn = document.getElementById('bp-btn-confirm-claim');
            const selectPet = document.getElementById('bp-select-claim-pet');
            const feedbackBox = document.getElementById('bp-claim-feedback');

            if (confirmBtn && selectPet) {
                confirmBtn.addEventListener('click', () => {
                    const petId = parseInt(selectPet.value, 10);
                    if (!petId) return;

                    confirmBtn.disabled = true;
                    confirmBtn.textContent = 'Colocando Lápida...';

                    const pos = (plotGroup && plotGroup.position) ? plotGroup.position : { x: (userData && userData.x) || 0, y: 0.02, z: (userData && userData.z) || 0 };
                    const restUrl = (settings.restRoot || '/wp-json/') + 'bosquepatitas/v1/asignar-tumba';

                    fetch(restUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-WP-Nonce': settings.nonce
                        },
                        body: JSON.stringify({
                            mascota_id: petId,
                            plot_id: userData.plotId,
                            pos_x: pos.x,
                            pos_y: pos.y,
                            pos_z: pos.z
                        })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            // Find plot object
                            const plot = plotManager.plots.find(p => p.id === userData.plotId);
                            if (plot) {
                                const tombstoneMesh = createTombstoneModel();
                                const tombData = {
                                    id: data.tumba_id,
                                    title: { rendered: 'Tumba de ' + data.mascota_data.nombre },
                                    content: { rendered: data.mascota_data.historia },
                                    meta: { posicion_x: pos.x, posicion_y: pos.y, posicion_z: pos.z },
                                    mascota_data: data.mascota_data
                                };
                                plotManager.assignTombToPlot(plot, tombstoneMesh, tombData);
                            }

                            // Remove pet from approved list in JS
                            settings.approvedPets = settings.approvedPets.filter(p => p.id !== petId);

                            claimModal.classList.add('hidden');
                        } else {
                            confirmBtn.disabled = false;
                            confirmBtn.textContent = '✨ Asignar Parcela y Colocar Lápida';
                            if (feedbackBox) {
                                feedbackBox.style.display = 'block';
                                feedbackBox.textContent = data.message || 'Error al asignar la tumba.';
                            }
                        }
                    })
                    .catch(err => {
                        confirmBtn.disabled = false;
                        confirmBtn.textContent = '✨ Asignar Parcela y Colocar Lápida';
                        if (feedbackBox) {
                            feedbackBox.style.display = 'block';
                            feedbackBox.textContent = 'Error de conexión.';
                        }
                    });
                });
            }
        }

        claimModal.classList.remove('hidden');
    }

    function showPetSheetModal(tombData) {
        const sheetContent = document.getElementById('bp-sheet-content');
        if (!sheetContent) return;

        const mData = tombData ? (tombData.mascota_data || {}) : {};
        const title = mData.nombre || (tombData.title ? (tombData.title.rendered || tombData.title) : 'Mascota Querida');
        const imgUrl = mData.imagen_url || '';
        const honor = mData.titulo_honor || '';
        const apodos = mData.apodos || '';
        const especie = mData.especie_raza || '';
        const fLlegada = mData.fecha_llegada || '';
        const fDespedida = mData.fecha_despedida || '';

        // Shared years calculation
        let yearsText = '';
        if (fLlegada && fDespedida) {
            const d1 = new Date(fLlegada);
            const d2 = new Date(fDespedida);
            if (!isNaN(d1) && !isNaN(d2)) {
                const diffTime = Math.abs(d2 - d1);
                const diffYears = (diffTime / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
                yearsText = ` (${diffYears} años de felicidad compartida)`;
            }
        }

        const carino = mData.stat_carino || 10;
        const travesura = mData.stat_travesura || 5;
        const bano = mData.stat_bano || 5;
        const pena = mData.stat_pena || 10;

        const superpoder = mData.superpoder || '';
        const archienemigo = mData.archienemigo || '';
        const comida = mData.comida_favorita || '';
        const travesuraEpica = mData.travesura_epica || '';
        const lugar = mData.lugar_favorito || '';
        const juguete = mData.juguete_estrella || '';

        const historia = mData.historia || (tombData.content ? (tombData.content.rendered || tombData.content) : 'En memoria eterna de nuestra amada mascota.');
        const carta = mData.carta_despedida || '';
        const soundtrack = mData.soundtrack_url || '';

        let velasCount = mData.count_velas || 0;
        let floresCount = mData.count_flores || 0;
        let premiosCount = mData.count_premios || 0;

        const muro = mData.muro_recuerdos || [];

        let muroCommentsHtml = '';
        if (muro && muro.length > 0) {
            muro.forEach(c => {
                muroCommentsHtml += `
                    <div class="bp-muro-comment">
                        <span class="bp-muro-author">${c.autor}</span>
                        <span class="bp-muro-date">${c.fecha}</span>
                        <div class="bp-muro-text">${c.mensaje}</div>
                    </div>
                `;
            });
        } else {
            muroCommentsHtml = '<p style="font-size:12px; color:#94a3b8; font-style:italic; margin:0;">Sé el primero en dejar palabras de apoyo o recuerdos...</p>';
        }

        sheetContent.innerHTML = `
            <div class="bp-pet-sheet-header">
                ${imgUrl ? `<img src="${imgUrl}" class="bp-pet-sheet-avatar" />` : `<div class="bp-pet-sheet-avatar" style="display:flex; align-items:center; justify-content:center; font-size:36px;">🐾</div>`}
                <div class="bp-pet-sheet-info">
                    <span class="bp-pet-badge-verified">✔ Mascota Validada</span>
                    <h3>${title}</h3>
                    ${honor ? `<div class="bp-pet-sheet-honor">👑 ${honor}</div>` : ''}
                    ${apodos ? `<div class="bp-pet-sheet-meta">a.k.a. "${apodos}"</div>` : ''}
                    ${especie ? `<div class="bp-pet-sheet-meta">🐾 Especie / Raza: ${especie}</div>` : ''}
                    ${(fLlegada || fDespedida) ? `<div class="bp-pet-sheet-meta">📅 ${fLlegada || '?'} ➔ ${fDespedida || 'Eternidad'}${yearsText}</div>` : ''}
                </div>
            </div>

            <!-- FICHA DE PERSONAJE & ESTADÍSTICAS -->
            <div class="bp-sheet-sec-title">📊 Ficha de Personaje</div>
            <div class="bp-stats-grid">
                <div class="bp-stat-item">
                    <div class="bp-stat-label"><span>💖 Cariñoso / Mimos</span><strong>${carino}/10</strong></div>
                    <div class="bp-stat-bar-bg"><div class="bp-stat-bar-fill" style="width:${carino * 10}%;"></div></div>
                </div>
                <div class="bp-stat-item">
                    <div class="bp-stat-label"><span>😼 Travesura</span><strong>${travesura}/10</strong></div>
                    <div class="bp-stat-bar-bg"><div class="bp-stat-bar-fill" style="width:${travesura * 10}%;"></div></div>
                </div>
                <div class="bp-stat-item">
                    <div class="bp-stat-label"><span>🛁 Amor al Baño</span><strong>${bano}/10</strong></div>
                    <div class="bp-stat-bar-bg"><div class="bp-stat-bar-fill" style="width:${bano * 10}%;"></div></div>
                </div>
                <div class="bp-stat-item">
                    <div class="bp-stat-label"><span>🥺 Cara de Pena</span><strong>${pena}/10</strong></div>
                    <div class="bp-stat-bar-bg"><div class="bp-stat-bar-fill" style="width:${pena * 10}%;"></div></div>
                </div>
            </div>

            <!-- GUSTOS Y MANÍAS -->
            ${(superpoder || archienemigo || comida || travesuraEpica || lugar || juguete) ? `
                <div class="bp-sheet-sec-title">🌟 Gustos y Manías</div>
                <div class="bp-tastes-grid">
                    ${superpoder ? `<div class="bp-taste-box"><strong>⚡ Superpoder:</strong> ${superpoder}</div>` : ''}
                    ${archienemigo ? `<div class="bp-taste-box"><strong>🦹 Archienemigo:</strong> ${archienemigo}</div>` : ''}
                    ${comida ? `<div class="bp-taste-box"><strong>🍖 Comida Favorita:</strong> ${comida}</div>` : ''}
                    ${lugar ? `<div class="bp-taste-box"><strong>🛋️ Lugar Favorito:</strong> ${lugar}</div>` : ''}
                    ${juguete ? `<div class="bp-taste-box"><strong>🧸 Juguete Estrella:</strong> ${juguete}</div>` : ''}
                    ${travesuraEpica ? `<div class="bp-taste-box"><strong>💥 Travesura Épica:</strong> ${travesuraEpica}</div>` : ''}
                </div>
            ` : ''}

            <!-- HISTORIA Y CARTA -->
            <div class="bp-sheet-sec-title">📖 La Gran Anécdota</div>
            <div class="bp-story-box">${historia}</div>

            ${carta ? `
                <div class="bp-sheet-sec-title">💌 Carta de Despedida</div>
                <div class="bp-letter-box">${carta}</div>
            ` : ''}

            ${soundtrack ? `
                <div style="margin-bottom:14px; text-align:center;">
                    <a href="${soundtrack}" target="_blank" rel="noopener noreferrer" class="bp-btn" style="display:inline-block; background:rgba(30, 215, 96, 0.2); color:#1ed760; border:1px solid #1ed760; padding:8px 16px; border-radius:20px; text-decoration:none; font-weight:700; font-size:12px;">
                        🎵 Escuchar Banda Sonora de ${title}
                    </a>
                </div>
            ` : ''}

            <!-- HOMENAJES INTERACTIVOS (1-CLICK) -->
            <div class="bp-sheet-sec-title">🕯️ Muestras de Cariño</div>
            <div class="bp-tributes-row">
                <button class="bp-tribute-btn" data-type="vela" data-id="${mData.id}">
                    <span>🕯️ Encender Vela</span>
                    <span class="bp-tribute-count" id="bp-count-vela">${velasCount}</span>
                </button>
                <button class="bp-tribute-btn" data-type="flor" data-id="${mData.id}">
                    <span>🌸 Dejar Flor</span>
                    <span class="bp-tribute-count" id="bp-count-flor">${floresCount}</span>
                </button>
                <button class="bp-tribute-btn" data-type="premio" data-id="${mData.id}">
                    <span>🦴 Dejar Premio</span>
                    <span class="bp-tribute-count" id="bp-count-premio">${premiosCount}</span>
                </button>
            </div>

            <!-- MURO DE RECUERDOS -->
            <div class="bp-sheet-sec-title">💬 Libro de Visitas y Muro de Recuerdos</div>
            <div class="bp-muro-box" id="bp-muro-list">
                ${muroCommentsHtml}
            </div>
            <div class="bp-muro-form">
                <input type="text" id="bp-muro-author-input" class="bp-muro-input" placeholder="Tu nombre" style="max-width:110px;" value="${settings.userName || ''}" />
                <input type="text" id="bp-muro-msg-input" class="bp-muro-input" placeholder="Deja unas palabras de recuerdo..." />
                <button id="bp-muro-submit" class="bp-btn" style="background:#27ae60; color:#fff; border:none; padding:8px 14px; border-radius:8px; font-weight:700; cursor:pointer;">Enviar</button>
            </div>
        `;

        // Attach tribute click listeners
        sheetContent.querySelectorAll('.bp-tribute-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tipo = btn.dataset.type;
                const petId = btn.dataset.id;
                if (!petId || petId === 'undefined') return;

                const restUrl = (settings.restRoot || '/wp-json/') + 'bosquepatitas/v1/tributo';

                fetch(restUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mascota_id: petId, tipo: tipo })
                })
                .then(res => res.json())
                .then(res => {
                    if (res.success) {
                        const countSpan = sheetContent.querySelector(`#bp-count-${tipo}`);
                        if (countSpan) countSpan.textContent = res.count;
                    }
                });
            });
        });

        // Attach muro comment submit listener
        const muroSubmit = sheetContent.querySelector('#bp-muro-submit');
        const muroMsgInput = sheetContent.querySelector('#bp-muro-msg-input');
        const muroAuthorInput = sheetContent.querySelector('#bp-muro-author-input');
        const muroList = sheetContent.querySelector('#bp-muro-list');

        if (muroSubmit && muroMsgInput) {
            muroSubmit.addEventListener('click', () => {
                const mensaje = muroMsgInput.value.trim();
                const autor = (muroAuthorInput ? muroAuthorInput.value.trim() : '') || 'Amigo del Bosque';
                const petId = mData.id;

                if (!mensaje || !petId) return;

                muroSubmit.disabled = true;

                const restUrl = (settings.restRoot || '/wp-json/') + 'bosquepatitas/v1/comentario';

                fetch(restUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mascota_id: petId, autor: autor, mensaje: mensaje })
                })
                .then(res => res.json())
                .then(res => {
                    muroSubmit.disabled = false;
                    if (res.success && res.muro) {
                        muroMsgInput.value = '';
                        let updatedHtml = '';
                        res.muro.forEach(c => {
                            updatedHtml += `
                                <div class="bp-muro-comment">
                                    <span class="bp-muro-author">${c.autor}</span>
                                    <span class="bp-muro-date">${c.fecha}</span>
                                    <div class="bp-muro-text">${c.mensaje}</div>
                                </div>
                            `;
                        });
                        if (muroList) muroList.innerHTML = updatedHtml;
                    }
                })
                .catch(err => {
                    muroSubmit.disabled = false;
                });
            });
        }

        petSheetModal.classList.remove('hidden');
    }

    // Mostrar modal de ayuda automáticamente la primera vez en móviles
    if (isMobile && !localStorage.getItem('bp_help_shown')) {
        helpModal.classList.remove('hidden');
        localStorage.setItem('bp_help_shown', 'true');
    }

    // ----------------------------------------------------
    // RAYCASTER, INTERACCIÓN Y DRAG DE CÁMARA
    // ----------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let isPointerDown = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let totalPointerMove = 0;

    function getIntersections(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        let clientX = event.clientX;
        let clientY = event.clientY;

        if (typeof clientX !== 'number') {
            if (event.touches && event.touches.length > 0) {
                clientX = event.touches[0].clientX;
                clientY = event.touches[0].clientY;
            } else if (event.changedTouches && event.changedTouches.length > 0) {
                clientX = event.changedTouches[0].clientX;
                clientY = event.changedTouches[0].clientY;
            } else {
                clientX = 0;
                clientY = 0;
            }
        }

        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        return raycaster.intersectObjects(scene.children, true);
    }

    function checkHover(event) {
        const intersects = getIntersections(event);
        let foundData = null;

        if (intersects.length > 0) {
            for (let i = 0; i < intersects.length; i++) {
                const obj = intersects[i].object;
                if (obj.userData && (obj.userData.type === 'plot' || obj.userData.type === 'tombstone')) {
                    foundData = { mesh: obj, userData: obj.userData };
                    break;
                }
            }
        }

        if (foundData) {
            const ud = foundData.userData;
            const rect = container.getBoundingClientRect();
            let clientX = event.clientX;
            let clientY = event.clientY;

            if (typeof clientX !== 'number') {
                if (event.touches && event.touches.length > 0) {
                    clientX = event.touches[0].clientX;
                    clientY = event.touches[0].clientY;
                } else if (event.changedTouches && event.changedTouches.length > 0) {
                    clientX = event.changedTouches[0].clientX;
                    clientY = event.changedTouches[0].clientY;
                } else {
                    clientX = 0;
                    clientY = 0;
                }
            }

            const posX = clientX - rect.left;
            const posY = clientY - rect.top;

            tooltip.style.left = `${posX + 15}px`;
            tooltip.style.top = `${posY + 15}px`;
            tooltip.classList.remove('hidden');

            if (ud.type === 'tombstone' || (ud.type === 'plot' && ud.occupied)) {
                const tumba = ud.tombData || {};
                const title = (tumba.title && typeof tumba.title === 'object') ? tumba.title.rendered : (tumba.title || 'Mascota Recordada');
                const contentRaw = (tumba.content && typeof tumba.content === 'object') ? tumba.content.rendered : (tumba.content || '');
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = contentRaw;
                const textExcerpt = tempDiv.textContent || tempDiv.innerText || 'En memoria eterna de nuestra amada mascota.';

                tooltip.innerHTML = `
                    <div class="bp-tooltip-header">
                        <span class="bp-badge occupied">Tumba de Mascota</span>
                        <h4 class="bp-pet-title">${title}</h4>
                    </div>
                    <p class="bp-pet-excerpt">"${textExcerpt.trim()}"</p>
                    <div class="bp-tooltip-footer">
                        <small>Parcela: ${ud.plotId || 'BosquePatitas'}</small>
                    </div>
                `;
            } else {
                tooltip.innerHTML = `
                    <div class="bp-tooltip-header">
                        <span class="bp-badge free">Parcela Disponible</span>
                        <h4 class="bp-pet-title">Espacio para Homenaje</h4>
                    </div>
                    <p class="bp-pet-excerpt">Esta parcela está libre para recordar a una mascota especial.</p>
                    <div class="bp-tooltip-footer">
                        <small>Código: ${ud.plotId}</small>
                    </div>
                `;
            }

            container.style.cursor = 'pointer';
        } else {
            tooltip.classList.add('hidden');
            container.style.cursor = 'default';
        }
    }

    function handlePlotClick(event) {
        const intersects = getIntersections(event);
        if (intersects.length > 0) {
            for (let i = 0; i < intersects.length; i++) {
                const obj = intersects[i].object;
                if (obj.userData && (obj.userData.type === 'plot' || obj.userData.type === 'tombstone')) {
                    const plotGroup = obj.userData.plotGroup || obj.parent;
                    if (plotGroup) {
                        const targetPos = new THREE.Vector3();
                        plotGroup.getWorldPosition(targetPos);

                        if (currentMode === MODE_AERIAL) {
                            if (controls) controls.target.set(targetPos.x, targetPos.y + 0.8, targetPos.z);
                        } else {
                            const dx = camera.position.x - targetPos.x;
                            const dz = camera.position.z - targetPos.z;
                            const len = Math.hypot(dx, dz) || 1;
                            const approachDist = 2.4;

                            const targetX = targetPos.x + (dx / len) * approachDist;
                            const targetZ = targetPos.z + (dz / len) * approachDist;

                            autoWalkTarget = {
                                x: Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, targetX)),
                                z: Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, targetZ)),
                                targetPlotPos: targetPos
                            };
                            isAutoWalking = true;
                        }

                        openModalForObject(obj.userData, plotGroup);
                    }
                    break;
                }
            }
        }
    }

    const onPointerDown = (event) => {
        if (event.target.closest('.bp-ui-element')) return;
        isPointerDown = true;
        totalPointerMove = 0;

        let clientX = event.clientX;
        let clientY = event.clientY;

        if (typeof clientX !== 'number') {
            if (event.touches && event.touches.length > 0) {
                clientX = event.touches[0].clientX;
                clientY = event.touches[0].clientY;
            } else if (event.changedTouches && event.changedTouches.length > 0) {
                clientX = event.changedTouches[0].clientX;
                clientY = event.changedTouches[0].clientY;
            } else {
                clientX = 0;
                clientY = 0;
            }
        }

        lastPointerX = clientX;
        lastPointerY = clientY;
    };

    const onPointerMove = (event) => {
        checkHover(event);

        if (!isPointerDown) return;
        if (currentMode !== MODE_GROUND) return;

        let clientX = event.clientX;
        let clientY = event.clientY;

        if (typeof clientX !== 'number') {
            if (event.touches && event.touches.length > 0) {
                clientX = event.touches[0].clientX;
                clientY = event.touches[0].clientY;
            } else if (event.changedTouches && event.changedTouches.length > 0) {
                clientX = event.changedTouches[0].clientX;
                clientY = event.changedTouches[0].clientY;
            } else {
                clientX = 0;
                clientY = 0;
            }
        }

        const dx = clientX - lastPointerX;
        const dy = clientY - lastPointerY;
        totalPointerMove += Math.hypot(dx, dy);

        lastPointerX = clientX;
        lastPointerY = clientY;

        if (totalPointerMove > 5) {
            stopAutoWalk();
        }

        const sensitivity = 0.0032;
        cameraYaw -= dx * sensitivity;
        cameraPitch -= dy * sensitivity;

        const maxPitch = Math.PI / 3;
        cameraPitch = Math.max(-maxPitch, Math.min(maxPitch, cameraPitch));
    };

    const onPointerUp = (event) => {
        if (!isPointerDown) return;
        isPointerDown = false;

        if (totalPointerMove < 6) {
            handlePlotClick(event);
        }
    };

    renderer.domElement.addEventListener('mousedown', onPointerDown);
    renderer.domElement.addEventListener('mousemove', onPointerMove);
    renderer.domElement.addEventListener('mouseup', onPointerUp);

    renderer.domElement.addEventListener('touchstart', onPointerDown, { passive: true });
    renderer.domElement.addEventListener('touchmove', onPointerMove, { passive: true });
    renderer.domElement.addEventListener('touchend', onPointerUp, { passive: true });

    // Quitar loader
    const loader = document.getElementById('bp-loading');
    if (loader) loader.remove();

    // Redimensionado
    window.addEventListener('resize', () => {
        if (!container) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });

    // ----------------------------------------------------
    // LOOP PRINCIPAL DE ANIMACIÓN
    // ----------------------------------------------------
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();

        if (currentMode === MODE_GROUND) {
            const moveSpeed = 8.5 * delta;
            const turnSpeed = 2.2 * delta;

            if (isAutoWalking && autoWalkTarget) {
                const dx = autoWalkTarget.x - camera.position.x;
                const dz = autoWalkTarget.z - camera.position.z;
                const dist = Math.hypot(dx, dz);

                if (dist > 0.25) {
                    camera.position.x += (dx / dist) * Math.min(dist, moveSpeed * 1.3);
                    camera.position.z += (dz / dist) * Math.min(dist, moveSpeed * 1.3);

                    if (autoWalkTarget.targetPlotPos) {
                        const lookDx = autoWalkTarget.targetPlotPos.x - camera.position.x;
                        const lookDz = autoWalkTarget.targetPlotPos.z - camera.position.z;
                        let targetYaw = Math.atan2(-lookDx, -lookDz);
                        let diffYaw = targetYaw - cameraYaw;
                        diffYaw = Math.atan2(Math.sin(diffYaw), Math.cos(diffYaw));
                        cameraYaw += diffYaw * 0.12;
                    }
                } else {
                    stopAutoWalk();
                }
            } else {
                if (keyState.turnLeft || touchState.turnLeft) cameraYaw += turnSpeed;
                if (keyState.turnRight || touchState.turnRight) cameraYaw -= turnSpeed;

                let moveX = 0;
                let moveZ = 0;

                if (keyState.forward || touchState.forward) moveZ -= 1;
                if (keyState.backward || touchState.backward) moveZ += 1;
                if (keyState.strafeLeft) moveX -= 1;
                if (keyState.strafeRight) moveX += 1;

                if (moveX !== 0 || moveZ !== 0) {
                    const len = Math.hypot(moveX, moveZ);
                    moveX /= len;
                    moveZ /= len;

                    const sinY = Math.sin(cameraYaw);
                    const cosY = Math.cos(cameraYaw);

                    const dx = (moveX * cosY + moveZ * sinY) * moveSpeed;
                    const dz = (-moveX * sinY + moveZ * cosY) * moveSpeed;

                    camera.position.x += dx;
                    camera.position.z += dz;
                }
            }

            camera.position.x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, camera.position.x));
            camera.position.z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, camera.position.z));
            camera.position.y = PLAYER_HEIGHT;

            camera.rotation.order = 'YXZ';
            camera.rotation.y = cameraYaw;
            camera.rotation.x = cameraPitch;
            camera.rotation.z = 0;
        } else if (controls) {
            controls.update();
        }

        renderer.render(scene, camera);
    }

    animate();
});
