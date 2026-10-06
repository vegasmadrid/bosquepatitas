document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('bp-canvas-container');
    if (!container) return;

    // Crear elemento UI para Tooltip Flotante / Card de Información
    let tooltip = document.getElementById('bp-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'bp-tooltip';
        tooltip.className = 'bp-tooltip-card hidden';
        container.appendChild(tooltip);
    }

    // 1. Escena, Cámara y Renderer con tono de Atardecer Poético
    const scene = new THREE.Scene();
    const fogColor = new THREE.Color(0xd3dfea);
    scene.background = fogColor;
    scene.fog = new THREE.FogExp2(fogColor, 0.018);

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 14, 28);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('sRGBEncoding' in THREE) {
        renderer.outputEncoding = THREE.sRGBEncoding;
    }
    container.appendChild(renderer.domElement);

    // 2. OrbitControls
    let controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2 - 0.02; // Evitar bajar del suelo
        controls.minDistance = 3;
        controls.maxDistance = 55;
        controls.target.set(0, 1.2, 0);
    }

    // 3. Luces (Atardecer cálido)
    const ambientLight = new THREE.AmbientLight(0xffebcf, 0.55);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffd699, 1.0);
    sunLight.position.set(25, 30, -20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 90;
    const d = 35;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // 4. Generación de Texturas Procedurales
    const grassTexture = createGrassTexture();
    const cobblestoneTexture = createCobblestoneTexture();

    // Terreno Base Verde Césped
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

    // ==========================================
    // GENERADORES DE ELEMENTOS 3D
    // ==========================================

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

    // ==========================================
    // TEXTURAS PROCEDURALES CANVAS
    // ==========================================

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

    // ==========================================
    // CLASE GESTORA DE PARCELAS (PLOT MANAGER)
    // ==========================================

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

    // ==========================================
    // CONSTRUCCIÓN DEL BOSQUE Y CAMINOS
    // ==========================================

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

    // ==========================================
    // CONSUMO REST API DE WORDPRESS
    // ==========================================

    if (typeof BP_Settings !== 'undefined') {
        fetch(BP_Settings.apiUrl)
            .then(res => res.json())
            .then(tumbas => {
                if (Array.isArray(tumbas)) {
                    tumbas.forEach(tumba => {
                        const meta = tumba.meta || {};
                        const x = (typeof meta.posicion_x === 'number') ? meta.posicion_x : parseFloat(meta.posicion_x) || 0;
                        const z = (typeof meta.posicion_z === 'number') ? meta.posicion_z : parseFloat(meta.posicion_z) || 0;

                        // Buscar parcela por coordenadas o tomar la siguiente libre
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

    // ==========================================
    // INTERACTIVIDAD RAYCASTER & TOOLTIP
    // ==========================================

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredObject = null;
    let originalColor = null;

    function getIntersections(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        return intersects;
    }

    function onPointerMove(event) {
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
            const posX = event.clientX - rect.left;
            const posY = event.clientY - rect.top;

            tooltip.style.left = `${posX + 15}px`;
            tooltip.style.top = `${posY + 15}px`;
            tooltip.classList.remove('hidden');

            if (ud.type === 'tombstone' || (ud.type === 'plot' && ud.occupied)) {
                const tumba = ud.tombData || {};
                const title = (tumba.title && typeof tumba.title === 'object') ? tumba.title.rendered : (tumba.title || 'Mascota Recordada');
                const contentRaw = (tumba.content && typeof tumba.content === 'object') ? tumba.content.rendered : (tumba.content || '');
                // Limpiar HTML simple de la dedicatoria
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

    function onClick(event) {
        const intersects = getIntersections(event);
        if (intersects.length > 0) {
            for (let i = 0; i < intersects.length; i++) {
                const obj = intersects[i].object;
                if (obj.userData && (obj.userData.type === 'plot' || obj.userData.type === 'tombstone')) {
                    const plotGroup = obj.userData.plotGroup || obj.parent;
                    if (plotGroup && controls) {
                        const targetPos = new THREE.Vector3();
                        plotGroup.getWorldPosition(targetPos);

                        // Animación suave del punto focal de la cámara
                        controls.target.set(targetPos.x, targetPos.y + 0.8, targetPos.z);
                    }
                    break;
                }
            }
        }
    }

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    // Remover loader visual si aún estuviera
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

    // Loop de renderizado
    function animate() {
        requestAnimationFrame(animate);
        if (controls) controls.update();
        renderer.render(scene, camera);
    }
    animate();
});