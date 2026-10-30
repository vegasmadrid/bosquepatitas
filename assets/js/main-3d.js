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

    // Radar / Minimap Widget
    const radarContainer = document.createElement('div');
    radarContainer.id = 'bp-radar-container';
    radarContainer.className = 'bp-ui-element';
    radarContainer.innerHTML = `<canvas id="bp-radar-canvas" width="110" height="110"></canvas>`;
    container.appendChild(radarContainer);

    // Floating Action Bar (Chat & Emotes)
    const actionBar = document.createElement('div');
    actionBar.className = 'bp-action-bar-bottom bp-ui-element';
    actionBar.innerHTML = `
        <button id="bp-chat-btn" class="bp-float-btn" title="Chat del Cementerio">💬 <span>Chat</span></button>
        <button id="bp-emotes-btn" class="bp-float-btn" title="Expresar Gesto 3D">✨ <span>Gestos</span></button>
    `;
    container.appendChild(actionBar);

    // Chat Drawer Overlay
    const chatOverlay = document.createElement('div');
    chatOverlay.id = 'bp-chat-overlay';
    chatOverlay.className = 'bp-chat-overlay-box hidden bp-ui-element';
    chatOverlay.innerHTML = `
        <div class="bp-chat-header">
            <span class="bp-chat-title">💬 CHAT BOSQUE 3D</span>
            <button id="bp-chat-close-btn" class="bp-btn-close-corner">&times;</button>
        </div>
        <div class="bp-chat-tabs">
            <button id="bp-chat-tab-general" class="bp-chat-tab-btn active">🌐 GENERAL</button>
            <button id="bp-chat-tab-private" class="bp-chat-tab-btn">🔒 PRIVADO</button>
        </div>
        <div class="bp-chat-messages" id="bp-chat-messages-box">
            <div class="bp-chat-msg-row"><span class="bp-chat-msg-user">🤖 BosqueBot:</span><span class="bp-chat-msg-text">¡Bienvenidos al Cementerio 3D! Puedes hablar con otros visitantes en tiempo real o hacer clic en sus muñecos para chat privado.</span></div>
        </div>
        <div class="bp-chat-input-row">
            <input type="text" id="bp-chat-input-text" class="bp-chat-input" placeholder="Escribe un mensaje..." maxlength="120" />
            <button id="bp-chat-send-btn" class="bp-arcade-btn bp-arcade-btn-green" style="font-size:10px; padding:8px 12px;">ENVIAR</button>
        </div>
    `;
    container.appendChild(chatOverlay);

    // Emotes Radial Menu
    const emotesMenu = document.createElement('div');
    emotesMenu.id = 'bp-emotes-menu';
    emotesMenu.className = 'bp-emotes-menu hidden bp-ui-element';
    emotesMenu.innerHTML = `
        <button class="bp-emote-btn" data-emote="wave">👋<span>Saludar</span></button>
        <button class="bp-emote-btn" data-emote="heart">❤️<span>Corazón</span></button>
        <button class="bp-emote-btn" data-emote="flower">🌸<span>Flores</span></button>
        <button class="bp-emote-btn" data-emote="candle">🕯️<span>Vela</span></button>
        <button class="bp-emote-btn" data-emote="dance">🕺<span>Baile</span></button>
    `;
    container.appendChild(emotesMenu);

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

    // Version & Revision Badge Overlay (Bottom-Right)
    if (settings.showVersionBadge !== false) {
        const verBadge = document.createElement('div');
        verBadge.id = 'bp-version-badge';
        verBadge.className = 'bp-ui-element';
        verBadge.style.cssText = `
            position: absolute;
            bottom: 12px;
            right: 12px;
            background: rgba(11, 23, 17, 0.85);
            border: 1px solid #10b981;
            border-radius: 6px;
            padding: 6px 10px;
            font-family: 'Press Start 2P', monospace, sans-serif;
            font-size: 9px;
            color: #34d399;
            z-index: 1000;
            pointer-events: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
            text-align: right;
            line-height: 1.4;
        `;
        const verText = settings.version || '1.0.1';
        const revText = settings.revision || 'Rev 2026.10.29-0850';
        verBadge.innerHTML = `
            <div style="color:#ffd600; font-weight:bold;">v${verText}</div>
            <div style="color:#a7f3d0; font-size:8px;">${revText}</div>
        `;
        container.appendChild(verBadge);
    }

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

                <li class="bp-menu-item" id="bp-menu-item-avatar">
                    <div class="bp-menu-icon">🧸</div>
                    <div class="bp-menu-text">
                        <span class="bp-menu-title">Personalizar Avatar 3D</span>
                        <span class="bp-menu-desc">Diseña tu tutor humano o avatar animal</span>
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
                        <span class="bp-menu-desc" id="bp-slot-view-desc">Vista 1ª Persona / 3ª Persona / Aérea</span>
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

    // Fullscreen Options Overlay - Mis Mascotas
    const arcadePetsModal = document.createElement('div');
    arcadePetsModal.id = 'bp-mascotas-arcade-modal';
    arcadePetsModal.className = 'bp-arcade-overlay hidden bp-ui-element';
    arcadePetsModal.innerHTML = `
        <div class="bp-arcade-header">
            <div>
                <h2 class="bp-arcade-title">🐾 MIS MASCOTAS</h2>
                <div class="bp-arcade-subtitle">Gestión de fichas de personajes de tus mascotas en BosquePatitas.</div>
            </div>
            <button id="bp-arcade-close" class="bp-arcade-close-btn bp-arcade-exit-btn">VOLVER AL BOSQUE</button>
        </div>
        <div id="bp-arcade-content"></div>
    `;
    container.appendChild(arcadePetsModal);

    // Fullscreen Options Overlay - Personalizar Avatar 3D
    const arcadeAvatarModal = document.createElement('div');
    arcadeAvatarModal.id = 'bp-avatar-arcade-modal';
    arcadeAvatarModal.className = 'bp-arcade-overlay hidden bp-ui-element';
    arcadeAvatarModal.innerHTML = `
        <div class="bp-arcade-header">
            <div>
                <h2 class="bp-arcade-title">🧸 PERSONALIZAR AVATAR 3D</h2>
                <div class="bp-arcade-subtitle">Diseña la apariencia de tu tutor humano o avatar animal en tiempo real.</div>
            </div>
            <button id="bp-avatar-arcade-close" class="bp-arcade-close-btn bp-arcade-exit-btn">VOLVER AL BOSQUE</button>
        </div>
        <div id="bp-avatar-arcade-content"></div>
    `;
    container.appendChild(arcadeAvatarModal);

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
    const MODE_AVATAR = 'avatar';
    const MODE_AERIAL = 'aerial';
    let currentMode = MODE_GROUND;

    const PLAYER_HEIGHT = 1.6;
    const MAP_LIMIT = 32.2; // Límite de movimiento interno dentro de la verja victoriana (33.0)

    const playerPosition = new THREE.Vector3(0, 0, 15);

    let cameraYaw = 0;
    let targetCameraYaw = 0;
    let cameraPitch = 0;
    let targetCameraPitch = 0;
    camera.position.set(0, PLAYER_HEIGHT, 15);
    camera.rotation.order = 'YXZ';

    // Local player 3D Avatar mesh
    let localPlayerAvatar = null;

    function rebuildLocalPlayerAvatarMesh() {
        if (localPlayerAvatar) scene.remove(localPlayerAvatar);
        const avConfig = settings.avatar || {};
        if (!avConfig.incognito) {
            localPlayerAvatar = createPlaymobilAvatarModel(avConfig);
            localPlayerAvatar.name = 'localPlayerAvatar';
            localPlayerAvatar.position.set(playerPosition.x, 0, playerPosition.z);
            localPlayerAvatar.visible = (currentMode !== MODE_GROUND);
            scene.add(localPlayerAvatar);
        }
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
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
    // REGISTRO DE ANIMACIONES 3D
    // ----------------------------------------------------
    const animatedCandles = [];

    // ----------------------------------------------------
    // SISTEMA MULTIJUGADOR TIEMPO REAL & VISITANTES
    // ----------------------------------------------------
    const myClientId = 'user_' + Math.floor(Math.random() * 1000000);
    const myName = settings.userName || ('Visitante ' + myClientId.slice(-4));
    let activeChatTab = 'general';
    let privateChatTargetId = null;
    let privateChatTargetName = null;

    const remoteUsers = new Map(); // id -> { id, name, avatarMesh, targetPos, targetYaw, isMoving }

    function createNameTagSprite(nameText) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(6, 15, 11, 0.88)';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 6;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(16, 16, 480, 96, 24);
        else ctx.rect(16, 16, 480, 96);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 38px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👤 ' + nameText, 256, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(1.4, 0.35, 1);
        return sprite;
    }

    function showSpeechBubble3D(avatarGroup, text) {
        if (!avatarGroup) return;

        const oldBubble = avatarGroup.getObjectByName('speechBubble');
        if (oldBubble) avatarGroup.remove(oldBubble);

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 8;

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(16, 16, 480, 180, 24);
        else ctx.rect(16, 16, 480, 180);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(220, 196);
        ctx.lineTo(256, 240);
        ctx.lineTo(292, 196);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';

        const words = text.split(' ');
        let line = '';
        let lineY = 65;

        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            if (ctx.measureText(testLine).width > 440 && i > 0) {
                ctx.fillText(line.trim(), 256, lineY);
                line = words[i] + ' ';
                lineY += 38;
            } else {
                line = testLine;
            }
        }
        if (line) ctx.fillText(line.trim(), 256, lineY);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.name = 'speechBubble';
        sprite.scale.set(2.0, 1.0, 1);
        sprite.position.set(0, 1.85, 0);

        avatarGroup.add(sprite);

        setTimeout(() => {
            if (avatarGroup.getObjectByName('speechBubble') === sprite) {
                avatarGroup.remove(sprite);
            }
        }, 5000);
    }

    function triggerEmote3D(avatarGroup, emoteType) {
        if (!avatarGroup) return;

        const emoteIcons = { wave: '👋', heart: '❤️', flower: '🌸', candle: '🕯️', dance: '🕺' };
        const icon = emoteIcons[emoteType] || '✨';

        for (let i = 0; i < 6; i++) {
            const pCanvas = document.createElement('canvas');
            pCanvas.width = 128;
            pCanvas.height = 128;
            const pCtx = pCanvas.getContext('2d');
            pCtx.font = '72px sans-serif';
            pCtx.textAlign = 'center';
            pCtx.textBaseline = 'middle';
            pCtx.fillText(icon, 64, 64);

            const pTex = new THREE.CanvasTexture(pCanvas);
            const pSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: pTex, transparent: true }));
            pSprite.scale.set(0.4, 0.4, 1);

            const startPos = avatarGroup.position.clone().add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.8,
                1.2 + Math.random() * 0.4,
                (Math.random() - 0.5) * 0.8
            ));
            pSprite.position.copy(startPos);
            scene.add(pSprite);

            let startTime = performance.now();
            function animateParticle(now) {
                const elapsed = (now - startTime) / 1000;
                if (elapsed < 1.5) {
                    pSprite.position.y += 0.015;
                    pSprite.material.opacity = 1 - (elapsed / 1.5);
                    requestAnimationFrame(animateParticle);
                } else {
                    scene.remove(pSprite);
                }
            }
            requestAnimationFrame(animateParticle);
        }
    }

    function addChatMessageToBox(senderName, text, isPrivate = false) {
        const msgBox = document.getElementById('bp-chat-messages-box');
        if (!msgBox) return;

        const row = document.createElement('div');
        row.className = 'bp-chat-msg-row';
        const tag = isPrivate ? '🔒 [Privado] ' : '';
        row.innerHTML = `<span class="bp-chat-msg-user">${tag}${senderName}:</span> <span class="bp-chat-msg-text">${text}</span>`;
        msgBox.appendChild(row);
        msgBox.scrollTop = msgBox.scrollHeight;
    }

    function initSimulatedVisitors() {
        if (settings.pusherKey) return;

        const simulatedData = [
            { id: 'sim_elena', name: 'Elena', skin: '#f5c29b', shirt: '#ec4899', pants: '#1e293b', hair_style: 'classic', hair_color: '#f59e0b', accessory: 'flower', x: -6, z: 8 },
            { id: 'sim_marcos', name: 'Marcos', skin: '#ffe0bd', shirt: '#3b82f6', pants: '#3b2314', hair_style: 'cap', hair_color: '#1e293b', accessory: 'lantern', x: 8, z: -10 }
        ];

        simulatedData.forEach(sim => {
            const avatarMesh = createPlaymobilAvatarModel(sim);
            avatarMesh.position.set(sim.x, 0, sim.z);

            const nameTag = createNameTagSprite(sim.name);
            nameTag.position.set(0, 1.50, 0);
            avatarMesh.add(nameTag);

            avatarMesh.userData = { type: 'remoteAvatar', userId: sim.id, userName: sim.name };
            avatarMesh.traverse(child => { if (child.isMesh) child.userData = avatarMesh.userData; });

            scene.add(avatarMesh);

            remoteUsers.set(sim.id, {
                id: sim.id,
                name: sim.name,
                avatarMesh: avatarMesh,
                targetPos: new THREE.Vector3(sim.x, 0, sim.z),
                targetYaw: 0,
                isMoving: false
            });
        });

        // AI Wandering loop for simulated visitors
        setInterval(() => {
            remoteUsers.forEach(u => {
                if (u.id.startsWith('sim_')) {
                    if (Math.random() > 0.4) {
                        const targetPlot = plotManager.plots[Math.floor(Math.random() * plotManager.plots.length)];
                        if (targetPlot) {
                            u.targetPos.set(
                                Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, targetPlot.position.x + (Math.random() - 0.5) * 2)),
                                0,
                                Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, targetPlot.position.z + (Math.random() - 0.5) * 2))
                            );
                            u.targetYaw = Math.atan2(-(u.targetPos.x - u.avatarMesh.position.x), -(u.targetPos.z - u.avatarMesh.position.z));
                            u.isMoving = true;
                        }
                    }
                }
            });
        }, 6000);
    }

    function updateRadarCanvas() {
        const rCanvas = document.getElementById('bp-radar-canvas');
        if (!rCanvas) return;
        const ctx = rCanvas.getContext('2d');
        const cx = 55;
        const cy = 55;
        const scale = 55 / 38;

        ctx.clearRect(0, 0, 110, 110);

        ctx.fillStyle = 'rgba(6, 18, 13, 0.9)';
        ctx.beginPath();
        ctx.arc(cx, cy, 54, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 35, 0, Math.PI * 2);
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.stroke();

        // Tombs
        ctx.fillStyle = '#64748b';
        plotManager.plots.forEach(p => {
            const px = cx + p.position.x * scale;
            const py = cy + p.position.z * scale;
            ctx.fillRect(px - 1, py - 1, 2, 2);
        });

        // Remote Visitors
        remoteUsers.forEach(u => {
            if (u.avatarMesh) {
                const rx = cx + u.avatarMesh.position.x * scale;
                const ry = cy + u.avatarMesh.position.z * scale;
                ctx.fillStyle = '#ffd600';
                ctx.beginPath();
                ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Local Player Arrow
        const lx = cx + playerPosition.x * scale;
        const ly = cy + playerPosition.z * scale;

        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(-cameraYaw);

        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4, 5);
        ctx.lineTo(0, 3);
        ctx.lineTo(-4, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // PUSHER REALTIME CONNECTION HANDLER
    let pusherChannel = null;
    let isPusherSubscribed = false;

    function initPusherMultiplayer() {
        if (!settings.pusherKey || typeof Pusher === 'undefined') {
            initSimulatedVisitors();
            return;
        }

        try {
            const authEndpoint = (settings.restRoot || '/wp-json/') + 'bosquepatitas/v1/pusher-auth';
            const pusher = new Pusher(settings.pusherKey, {
                cluster: settings.pusherCluster || 'eu',
                authEndpoint: authEndpoint,
                forceTLS: true
            });

            pusherChannel = pusher.subscribe('presence-bosque-patitas-cemetery');

            pusherChannel.bind('pusher:subscription_succeeded', (members) => {
                isPusherSubscribed = true;
                if (members && members.each) {
                    members.each((member) => {
                        if (member.id !== myClientId && member.info) {
                            const info = member.info || {};
                            if (!info.incognito) {
                                // Request updates or initialize basic remote entry if info provided
                            }
                        }
                    });
                }
                // Broadcast immediately upon joining
                if (!settings.avatar.incognito) {
                    pusherChannel.trigger('client-user-move', {
                        id: myClientId,
                        name: myName,
                        x: playerPosition.x,
                        z: playerPosition.z,
                        yaw: cameraYaw,
                        avatar: settings.avatar
                    });
                }
            });

            pusherChannel.bind('pusher:member_added', (member) => {
                // When a new member connects, send them our location so they see us immediately
                if (!settings.avatar.incognito) {
                    pusherChannel.trigger('client-user-move', {
                        id: myClientId,
                        name: myName,
                        x: playerPosition.x,
                        z: playerPosition.z,
                        yaw: cameraYaw,
                        avatar: settings.avatar
                    });
                }
            });

            pusherChannel.bind('pusher:member_removed', (member) => {
                const remoteId = member.id;
                remoteUsers.forEach((u, key) => {
                    if (u.id === remoteId || key === remoteId) {
                        if (u.avatarMesh) scene.remove(u.avatarMesh);
                        remoteUsers.delete(key);
                    }
                });
            });

            pusherChannel.bind('client-user-move', (data) => {
                if (data.id === myClientId) return;

                let userObj = remoteUsers.get(data.id);
                if (!userObj) {
                    const avatarMesh = createPlaymobilAvatarModel(data.avatar || {});
                    avatarMesh.position.set(data.x, 0, data.z);

                    const nameTag = createNameTagSprite(data.name || 'Visitante');
                    nameTag.position.set(0, 1.50, 0);
                    avatarMesh.add(nameTag);

                    avatarMesh.userData = { type: 'remoteAvatar', userId: data.id, userName: data.name };
                    avatarMesh.traverse(child => { if (child.isMesh) child.userData = avatarMesh.userData; });

                    scene.add(avatarMesh);

                    userObj = {
                        id: data.id,
                        name: data.name,
                        avatarMesh: avatarMesh,
                        targetPos: new THREE.Vector3(data.x, 0, data.z),
                        targetYaw: data.yaw || 0,
                        isMoving: false
                    };
                    remoteUsers.set(data.id, userObj);
                } else {
                    userObj.targetPos.set(data.x, 0, data.z);
                    userObj.targetYaw = data.yaw || 0;
                    userObj.isMoving = data.isMoving || false;
                }
            });

            pusherChannel.bind('client-user-chat', (data) => {
                if (data.id === myClientId) return;

                addChatMessageToBox(data.name, data.text, data.isPrivate);

                const userObj = remoteUsers.get(data.id);
                if (userObj && userObj.avatarMesh) {
                    showSpeechBubble3D(userObj.avatarMesh, data.text);
                }
            });

            pusherChannel.bind('client-user-emote', (data) => {
                if (data.id === myClientId) return;

                const userObj = remoteUsers.get(data.id);
                if (userObj && userObj.avatarMesh) {
                    triggerEmote3D(userObj.avatarMesh, data.emote);
                }
            });

            // Periodically broadcast local player position
            setInterval(() => {
                if (pusherChannel && isPusherSubscribed && !settings.avatar.incognito) {
                    pusherChannel.trigger('client-user-move', {
                        id: myClientId,
                        name: myName,
                        x: playerPosition.x,
                        z: playerPosition.z,
                        yaw: cameraYaw,
                        avatar: settings.avatar
                    });
                }
            }, 120);

        } catch (err) {
            initSimulatedVisitors();
        }
    }

    // ----------------------------------------------------
    // GENERADOR Y ANIMADOR DE AVATARES 3D (TUTOR HUMANO Y MASCOTAS)
    // ----------------------------------------------------
    function createCapsuleGeometry(radius, length, capSegments = 8, radialSegments = 12) {
        if (typeof THREE.CapsuleGeometry !== 'undefined') {
            return new THREE.CapsuleGeometry(radius, length, capSegments, radialSegments);
        }
        const points = [];
        const halfL = length / 2;
        // Hemisferio inferior
        for (let i = 0; i <= capSegments; i++) {
            const theta = (i / capSegments) * (Math.PI / 2);
            points.push(new THREE.Vector2(radius * Math.sin(theta), -halfL - radius * Math.cos(theta)));
        }
        // Hemisferio superior
        for (let i = 0; i <= capSegments; i++) {
            const theta = (Math.PI / 2) + (i / capSegments) * (Math.PI / 2);
            points.push(new THREE.Vector2(radius * Math.sin(theta), halfL - radius * Math.cos(theta)));
        }
        return new THREE.LatheGeometry(points, radialSegments);
    }

    function create3DAvatarModel(config = {}) {
        const avatarType = config.avatar_type || 'human';

        if (avatarType === 'pet') {
            const species = config.pet_species || 'dog';
            if (species === 'cat') {
                return createCatAvatarModel(config);
            } else if (species === 'rabbit') {
                return createRabbitAvatarModel(config);
            } else {
                return createDogAvatarModel(config);
            }
        } else {
            return createHumanAvatarModel(config);
        }
    }

    function createPlaymobilAvatarModel(config = {}) {
        return create3DAvatarModel(config);
    }

    // 1. TUTOR HUMANO (MODELO PROCEDURAL ORGANICO 100% SUAVIZADO Y ESTILIZADO)
    function createHumanAvatarModel(config = {}) {
        const skinColor = config.skin || '#ffe0bd';
        const shirtColor = config.shirt || '#10b981';
        const pantsColor = config.pants || '#1e3a8a';
        const hairStyle = config.hair_style || 'classic';
        const hairColor = config.hair_color || '#3b2314';
        const accessory = config.accessory || 'none';

        const avatarGroup = new THREE.Group();
        avatarGroup.name = 'playmobilAvatar';
        avatarGroup.userData = { isQuadruped: false };

        // Materiales MeshStandardMaterial suaves con roughness: 0.4 y metalness: 0.1
        const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.40, metalness: 0.08 });
        const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.40, metalness: 0.10 });
        const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.40, metalness: 0.10 });
        const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.45, metalness: 0.05 });
        const shoeSoleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.05 });
        const shoeBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.40, metalness: 0.10 });

        // Helper para propagar sombras en todo el avatar
        function applyShadows(obj) {
            obj.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
        }

        // 1. PIERNAS Y ZAPATILLAS DEPORTIVAS ORGANICAS
        const legGroup = new THREE.Group();
        legGroup.position.set(0, 0, 0);

        // Articulación de la cadera suave
        const hipJoint = new THREE.Mesh(new THREE.SphereGeometry(0.118, 16, 16), pantsMat);
        hipJoint.position.set(0, 0.51, 0);
        legGroup.add(hipJoint);

        // Geometría de cápsula para piernas completamente redondeadas
        const legCapsuleGeo = createCapsuleGeometry(0.058, 0.38, 10, 16);

        function createOrganicSneaker() {
            const sneakerGroup = new THREE.Group();

            // Suela ovalada suave
            const soleMesh = new THREE.Mesh(createCapsuleGeometry(0.055, 0.13, 8, 14), shoeSoleMat);
            soleMesh.rotation.x = Math.PI / 2;
            soleMesh.scale.set(1.1, 1.0, 0.45);
            soleMesh.position.set(0, -0.015, 0.025);
            sneakerGroup.add(soleMesh);

            // Empeine redondeado de zapatilla
            const upperMesh = new THREE.Mesh(createCapsuleGeometry(0.052, 0.12, 8, 14), shoeBodyMat);
            upperMesh.rotation.x = Math.PI / 2;
            upperMesh.scale.set(1.05, 1.0, 0.65);
            upperMesh.position.set(0, 0.018, 0.025);
            sneakerGroup.add(upperMesh);

            // Puntera frontal suave
            const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 12), shoeSoleMat);
            toeCap.scale.set(1.05, 0.65, 0.9);
            toeCap.position.set(0, 0.008, 0.085);
            sneakerGroup.add(toeCap);

            return sneakerGroup;
        }

        // Pierna Izquierda
        const leftLegGroup = new THREE.Group();
        leftLegGroup.name = 'leftLeg';
        leftLegGroup.position.set(-0.088, 0.48, 0);

        const leftLegMesh = new THREE.Mesh(legCapsuleGeo, pantsMat);
        leftLegMesh.position.set(0, -0.21, 0);
        leftLegGroup.add(leftLegMesh);

        const leftSneaker = createOrganicSneaker();
        leftSneaker.position.set(0, -0.45, 0);
        leftLegGroup.add(leftSneaker);

        legGroup.add(leftLegGroup);

        // Pierna Derecha
        const rightLegGroup = new THREE.Group();
        rightLegGroup.name = 'rightLeg';
        rightLegGroup.position.set(0.088, 0.48, 0);

        const rightLegMesh = new THREE.Mesh(legCapsuleGeo, pantsMat);
        rightLegMesh.position.set(0, -0.21, 0);
        rightLegGroup.add(rightLegMesh);

        const rightSneaker = createOrganicSneaker();
        rightSneaker.position.set(0, -0.45, 0);
        rightLegGroup.add(rightSneaker);

        legGroup.add(rightLegGroup);
        avatarGroup.add(legGroup);

        // 2. TORSO Y BRAZOS ORGANICOS (Pivote torso en Y = 0.54)
        const torsoGroup = new THREE.Group();
        torsoGroup.name = 'torsoGroup';
        torsoGroup.position.set(0, 0.54, 0);

        // Torso de Cápsula suave y estilizado
        const torsoCapsuleGeo = createCapsuleGeometry(0.145, 0.28, 12, 20);
        const torsoMesh = new THREE.Mesh(torsoCapsuleGeo, shirtMat);
        torsoMesh.scale.set(1.12, 1.0, 0.85);
        torsoMesh.position.set(0, 0.20, 0);
        torsoGroup.add(torsoMesh);

        // Detalle de cuello redondeado
        const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.014, 12, 24), shirtMat);
        collarRing.rotation.x = Math.PI / 2;
        collarRing.position.set(0, 0.38, 0);
        torsoGroup.add(collarRing);

        // Cilindro definido para el cuello entre el torso y la cabeza
        const neckCylinderGeo = new THREE.CylinderGeometry(0.052, 0.058, 0.10, 18);
        const neckMesh = new THREE.Mesh(neckCylinderGeo, skinMat);
        neckMesh.position.set(0, 0.44, 0);
        torsoGroup.add(neckMesh);

        // 3. BRAZOS CON MANGAS INTEGRADAS Y POSTURA REPOSADA NATURAL (-7° A -10° EN Z)
        const sleeveCapsuleGeo = createCapsuleGeometry(0.052, 0.15, 10, 16);
        const forearmCapsuleGeo = createCapsuleGeometry(0.040, 0.18, 10, 16);

        // Arm Izquierdo (Inclinado suavemente hacia afuera +7.5°)
        const leftArmGroup = new THREE.Group();
        leftArmGroup.name = 'leftArm';
        leftArmGroup.position.set(-0.18, 0.36, 0);
        leftArmGroup.rotation.z = 0.13; // ~7.5 grados hacia fuera

        const leftSleeve = new THREE.Mesh(sleeveCapsuleGeo, shirtMat);
        leftSleeve.position.set(0, -0.07, 0);
        leftArmGroup.add(leftSleeve);

        const leftSleeveCuff = new THREE.Mesh(new THREE.TorusGeometry(0.051, 0.008, 10, 20), shirtMat);
        leftSleeveCuff.rotation.x = Math.PI / 2;
        leftSleeveCuff.position.set(0, -0.145, 0);
        leftArmGroup.add(leftSleeveCuff);

        const leftForearm = new THREE.Mesh(forearmCapsuleGeo, skinMat);
        leftForearm.position.set(0, -0.23, 0);
        leftArmGroup.add(leftForearm);

        const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 14), skinMat);
        leftHand.position.set(0, -0.34, 0);
        leftArmGroup.add(leftHand);

        torsoGroup.add(leftArmGroup);

        // Arm Derecho (Inclinado suavemente hacia afuera -7.5°)
        const rightArmGroup = new THREE.Group();
        rightArmGroup.name = 'rightArm';
        rightArmGroup.position.set(0.18, 0.36, 0);
        rightArmGroup.rotation.z = -0.13; // ~-7.5 grados hacia fuera

        const rightSleeve = new THREE.Mesh(sleeveCapsuleGeo, shirtMat);
        rightSleeve.position.set(0, -0.07, 0);
        rightArmGroup.add(rightSleeve);

        const rightSleeveCuff = new THREE.Mesh(new THREE.TorusGeometry(0.051, 0.008, 10, 20), shirtMat);
        rightSleeveCuff.rotation.x = Math.PI / 2;
        rightSleeveCuff.position.set(0, -0.145, 0);
        rightArmGroup.add(rightSleeveCuff);

        const rightForearm = new THREE.Mesh(forearmCapsuleGeo, skinMat);
        rightForearm.position.set(0, -0.23, 0);
        rightArmGroup.add(rightForearm);

        const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 14), skinMat);
        rightHand.position.set(0, -0.34, 0);
        rightArmGroup.add(rightHand);

        // Accesorios
        if (accessory === 'lantern') {
            const lanternMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });
            const glowMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
            const lanternBody = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.12, 12), lanternMat);
            lanternBody.position.set(0, -0.38, 0.06);

            const glowCore = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), glowMat);
            glowCore.position.set(0, -0.38, 0.06);

            const lanternLight = new THREE.PointLight(0xffbb33, 0.9, 3.5);
            lanternLight.position.set(0, -0.38, 0.06);

            rightArmGroup.add(lanternBody);
            rightArmGroup.add(glowCore);
            rightArmGroup.add(lanternLight);
        } else if (accessory === 'flower') {
            const flowerProp = createFlower3D(false);
            flowerProp.scale.set(0.65, 0.65, 0.65);
            flowerProp.position.set(0, -0.38, 0.05);
            rightArmGroup.add(flowerProp);
        } else if (accessory === 'wand') {
            const wandMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.85 });
            const wandMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.35, 10), wandMat);
            wandMesh.position.set(0, -0.36, 0.08);
            wandMesh.rotation.x = Math.PI / 4;

            const starMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
            const starMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.042), starMat);
            starMesh.position.set(0, -0.24, 0.20);

            const starLight = new THREE.PointLight(0x67e8f9, 0.7, 2.5);
            starLight.position.set(0, -0.24, 0.20);

            rightArmGroup.add(wandMesh);
            rightArmGroup.add(starMesh);
            rightArmGroup.add(starLight);
        }

        torsoGroup.add(rightArmGroup);

        // 4. CABEZA, ROSTRO Y NUCA
        const headGroup = new THREE.Group();
        headGroup.name = 'headGroup';
        headGroup.position.set(0, 0.56, 0);

        const headGeo = new THREE.SphereGeometry(0.138, 28, 28);
        headGeo.scale(1.0, 1.08, 1.02);
        const headMesh = new THREE.Mesh(headGeo, skinMat);
        headGroup.add(headMesh);

        // Orejas
        const earGeo = new THREE.SphereGeometry(0.028, 12, 12);
        const leftEar = new THREE.Mesh(earGeo, skinMat);
        leftEar.position.set(-0.136, 0, -0.01);
        const rightEar = new THREE.Mesh(earGeo, skinMat);
        rightEar.position.set(0.136, 0, -0.01);
        headGroup.add(leftEar);
        headGroup.add(rightEar);

        // Nariz de cápsula suave
        const noseMesh = new THREE.Mesh(createCapsuleGeometry(0.012, 0.02, 6, 10), skinMat);
        noseMesh.rotation.x = 0.3;
        noseMesh.position.set(0, -0.01, 0.142);
        headGroup.add(noseMesh);

        // Textura facial HD expresiva
        const faceCanvas = document.createElement('canvas');
        faceCanvas.width = 512;
        faceCanvas.height = 512;
        const faceCtx = faceCanvas.getContext('2d');

        function drawEye(cx, cy) {
            faceCtx.fillStyle = '#1e293b';
            faceCtx.beginPath();
            faceCtx.ellipse(cx, cy, 22, 28, 0, 0, Math.PI * 2);
            faceCtx.fill();

            faceCtx.fillStyle = '#0f172a';
            faceCtx.beginPath();
            faceCtx.ellipse(cx, cy + 2, 16, 20, 0, 0, Math.PI * 2);
            faceCtx.fill();

            faceCtx.fillStyle = '#ffffff';
            faceCtx.beginPath();
            faceCtx.arc(cx - 7, cy - 8, 7, 0, Math.PI * 2);
            faceCtx.fill();

            faceCtx.beginPath();
            faceCtx.arc(cx + 6, cy + 8, 3.5, 0, Math.PI * 2);
            faceCtx.fill();
        }

        drawEye(180, 220);
        drawEye(332, 220);

        faceCtx.strokeStyle = hairColor;
        faceCtx.lineWidth = 12;
        faceCtx.lineCap = 'round';

        faceCtx.beginPath();
        faceCtx.moveTo(150, 175);
        faceCtx.quadraticCurveTo(180, 160, 210, 172);
        faceCtx.stroke();

        faceCtx.beginPath();
        faceCtx.moveTo(302, 172);
        faceCtx.quadraticCurveTo(332, 160, 362, 175);
        faceCtx.stroke();

        faceCtx.strokeStyle = '#334155';
        faceCtx.lineWidth = 10;
        faceCtx.beginPath();
        faceCtx.arc(256, 285, 55, 0.22 * Math.PI, 0.78 * Math.PI, false);
        faceCtx.stroke();

        const faceTexture = new THREE.CanvasTexture(faceCanvas);
        faceTexture.needsUpdate = true;
        const faceMat = new THREE.MeshBasicMaterial({ map: faceTexture, transparent: true });
        const facePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), faceMat);
        facePlane.position.set(0, 0.005, 0.141);
        headGroup.add(facePlane);

        // Cobertura de la nuca y cráneo posterior (Exclusivamente en la mitad trasera Z <= 0)
        const backNapeGeo = new THREE.SphereGeometry(0.144, 24, 20, Math.PI * 0.5, Math.PI, 0, Math.PI * 0.65);
        backNapeGeo.scale(1.01, 1.15, 1.05);
        const backNapeHair = new THREE.Mesh(backNapeGeo, hairMat);
        backNapeHair.position.set(0, -0.01, -0.005);
        headGroup.add(backNapeHair);

        // 5. PEINADOS MULTICAPA SIN INTERFERIR CON LA CARA
        if (hairStyle === 'classic') {
            const hairCapGeo = new THREE.SphereGeometry(0.144, 24, 20, 0, Math.PI * 2, 0, Math.PI * 0.46);
            hairCapGeo.scale(1.01, 1.05, 1.02);
            const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
            hairCap.position.set(0, 0.035, -0.025);
            headGroup.add(hairCap);

            const bangLeft = new THREE.Mesh(createCapsuleGeometry(0.028, 0.07, 8, 12), hairMat);
            bangLeft.rotation.z = -0.4;
            bangLeft.position.set(-0.065, 0.11, 0.11);

            const bangRight = new THREE.Mesh(createCapsuleGeometry(0.028, 0.07, 8, 12), hairMat);
            bangRight.rotation.z = 0.4;
            bangRight.position.set(0.065, 0.11, 0.11);

            const bangCenter = new THREE.Mesh(createCapsuleGeometry(0.025, 0.06, 8, 12), hairMat);
            bangCenter.rotation.x = -0.15;
            bangCenter.position.set(0, 0.13, 0.12);

            headGroup.add(bangLeft);
            headGroup.add(bangRight);
            headGroup.add(bangCenter);
        } else if (hairStyle === 'spiky') {
            const baseHair = new THREE.Mesh(new THREE.SphereGeometry(0.145, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
            baseHair.position.set(0, 0.02, -0.01);
            headGroup.add(baseHair);

            for (let i = -4; i <= 4; i++) {
                const spike = new THREE.Mesh(createCapsuleGeometry(0.024, 0.10, 6, 10), hairMat);
                spike.position.set(i * 0.032, 0.15 + (4 - Math.abs(i)) * 0.008, (3 - Math.abs(i)) * 0.012);
                spike.rotation.z = -i * 0.12;
                spike.rotation.x = -0.15;
                headGroup.add(spike);
            }
        } else if (hairStyle === 'cap') {
            const capMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.38, metalness: 0.1 });
            const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.146, 24, 20, 0, Math.PI * 2, 0, Math.PI * 0.56), capMat);
            capDome.position.set(0, 0.02, 0);

            const visor = new THREE.Mesh(createCapsuleGeometry(0.06, 0.14, 8, 12), capMat);
            visor.scale.set(1.4, 0.2, 1.0);
            visor.position.set(0, 0.03, 0.18);
            visor.rotation.x = 0.18;

            const capButton = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 10), capMat);
            capButton.position.set(0, 0.165, 0);

            headGroup.add(capDome);
            headGroup.add(visor);
            headGroup.add(capButton);
        } else if (hairStyle === 'crown') {
            const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.20, metalness: 0.85 });
            const crownCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.10, 0.10, 16, 1, true), goldMat);
            crownCyl.position.set(0, 0.15, 0);

            for (let a = 0; a < 8; a++) {
                const ang = (a * Math.PI * 2) / 8;
                const pt = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.06, 6), goldMat);
                pt.position.set(Math.sin(ang) * 0.11, 0.21, Math.cos(ang) * 0.11);
                headGroup.add(pt);
            }
            headGroup.add(crownCyl);
        } else if (hairStyle === 'hat') {
            const hatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.1 });
            const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.2 });

            const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 24), hatMat);
            brim.position.set(0, 0.11, 0);

            const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.138, 0.138, 0.03, 24), ribbonMat);
            ribbon.position.set(0, 0.135, 0);

            const topHat = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.15, 24), hatMat);
            topHat.position.set(0, 0.21, 0);

            headGroup.add(brim);
            headGroup.add(ribbon);
            headGroup.add(topHat);
        }

        torsoGroup.add(headGroup);
        avatarGroup.add(torsoGroup);

        applyShadows(avatarGroup);
        return avatarGroup;
    }

    // 2. MASCOTA PERRO
    function createDogAvatarModel(config = {}) {
        const furColor = config.skin || '#d97706';
        const collarColor = config.shirt || '#ef4444';
        const accentColor = config.pants || '#92400e';

        const avatarGroup = new THREE.Group();
        avatarGroup.name = 'playmobilAvatar';
        avatarGroup.userData = { isQuadruped: true };

        const furMat = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.6 });
        const collarMat = new THREE.MeshStandardMaterial({ color: collarColor, roughness: 0.4 });
        const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.6 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.8 });

        // Torso / Body
        const torsoGroup = new THREE.Group();
        torsoGroup.name = 'torsoGroup';
        torsoGroup.position.set(0, 0.28, 0);

        const bodyGeo = createCapsuleGeometry(0.16, 0.38, 8, 16);
        const bodyMesh = new THREE.Mesh(bodyGeo, furMat);
        bodyMesh.rotation.x = Math.PI / 2;
        bodyMesh.castShadow = true;
        torsoGroup.add(bodyMesh);

        // Chest puff
        const chestGeo = new THREE.SphereGeometry(0.17, 12, 12);
        const chestMesh = new THREE.Mesh(chestGeo, furMat);
        chestMesh.position.set(0, 0.02, 0.15);
        torsoGroup.add(chestMesh);

        // Collar & Tag
        const collarGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16);
        const collarMesh = new THREE.Mesh(collarGeo, collarMat);
        collarMesh.position.set(0, 0.12, 0.22);
        collarMesh.rotation.x = 0.2;
        torsoGroup.add(collarMesh);

        const tagMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.032), goldMat);
        tagMesh.position.set(0, 0.08, 0.36);
        torsoGroup.add(tagMesh);

        avatarGroup.add(torsoGroup);

        // Head & Snout
        const headGroup = new THREE.Group();
        headGroup.name = 'headGroup';
        headGroup.position.set(0, 0.52, 0.26);

        const headGeo = new THREE.SphereGeometry(0.16, 16, 16);
        const headMesh = new THREE.Mesh(headGeo, furMat);
        headMesh.castShadow = true;
        headGroup.add(headMesh);

        // Snout
        const snoutGeo = new THREE.CylinderGeometry(0.07, 0.10, 0.16, 12);
        const snoutMesh = new THREE.Mesh(snoutGeo, accentMat);
        snoutMesh.rotation.x = Math.PI / 2;
        snoutMesh.position.set(0, -0.04, 0.14);
        headGroup.add(snoutMesh);

        // Nose
        const noseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), darkMat);
        noseMesh.position.set(0, -0.02, 0.22);
        headGroup.add(noseMesh);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.028, 10, 10);
        const eyeL = new THREE.Mesh(eyeGeo, darkMat);
        eyeL.position.set(-0.08, 0.05, 0.13);
        const eyeR = new THREE.Mesh(eyeGeo, darkMat);
        eyeR.position.set(0.08, 0.05, 0.13);
        headGroup.add(eyeL);
        headGroup.add(eyeR);

        // Eye Shines
        const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const shineGeo = new THREE.SphereGeometry(0.009, 8, 8);
        const shineL = new THREE.Mesh(shineGeo, shineMat);
        shineL.position.set(-0.072, 0.062, 0.152);
        const shineR = new THREE.Mesh(shineGeo, shineMat);
        shineR.position.set(0.088, 0.062, 0.152);
        headGroup.add(shineL);
        headGroup.add(shineR);

        // Floppy Ears
        const earGeo = createCapsuleGeometry(0.045, 0.18, 6, 12);
        const earL = new THREE.Mesh(earGeo, accentMat);
        earL.position.set(-0.16, 0.02, 0);
        earL.rotation.z = 0.35;
        earL.rotation.x = 0.2;

        const earR = new THREE.Mesh(earGeo, accentMat);
        earR.position.set(0.16, 0.02, 0);
        earR.rotation.z = -0.35;
        earR.rotation.x = 0.2;

        headGroup.add(earL);
        headGroup.add(earR);

        avatarGroup.add(headGroup);

        // 4 Articulated Quadruped Legs
        const legPositions = [
            { name: 'legFrontLeft', x: -0.12, y: 0.26, z: 0.18 },
            { name: 'legFrontRight', x: 0.12, y: 0.26, z: 0.18 },
            { name: 'legBackLeft', x: -0.12, y: 0.26, z: -0.18 },
            { name: 'legBackRight', x: 0.12, y: 0.26, z: -0.18 }
        ];

        const legGeo = createCapsuleGeometry(0.048, 0.20, 6, 12);
        const pawGeo = new THREE.SphereGeometry(0.055, 10, 10);

        legPositions.forEach(p => {
            const lg = new THREE.Group();
            lg.name = p.name;
            lg.position.set(p.x, p.y, p.z);

            const lm = new THREE.Mesh(legGeo, furMat);
            lm.position.set(0, -0.10, 0);
            lm.castShadow = true;
            lg.add(lm);

            const paw = new THREE.Mesh(pawGeo, accentMat);
            paw.position.set(0, -0.21, 0.02);
            lg.add(paw);

            avatarGroup.add(lg);
        });

        // Tail
        const tailGroup = new THREE.Group();
        tailGroup.name = 'tailGroup';
        tailGroup.position.set(0, 0.32, -0.22);

        const tailGeo = createCapsuleGeometry(0.038, 0.22, 6, 12);
        const tailMesh = new THREE.Mesh(tailGeo, accentMat);
        tailMesh.position.set(0, 0.08, -0.08);
        tailMesh.rotation.x = -0.6;
        tailGroup.add(tailMesh);

        avatarGroup.add(tailGroup);

        return avatarGroup;
    }

    // 3. MASCOTA GATO
    function createCatAvatarModel(config = {}) {
        const furColor = config.skin || '#334155';
        const collarColor = config.shirt || '#f59e0b';
        const accentColor = config.pants || '#1e293b';

        const avatarGroup = new THREE.Group();
        avatarGroup.name = 'playmobilAvatar';
        avatarGroup.userData = { isQuadruped: true };

        const furMat = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.5 });
        const collarMat = new THREE.MeshStandardMaterial({ color: collarColor, roughness: 0.4 });
        const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5 });
        const pinkMat = new THREE.MeshStandardMaterial({ color: '#f472b6', roughness: 0.5 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.2 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });

        // Torso / Body
        const torsoGroup = new THREE.Group();
        torsoGroup.name = 'torsoGroup';
        torsoGroup.position.set(0, 0.25, 0);

        const bodyGeo = createCapsuleGeometry(0.13, 0.36, 8, 16);
        const bodyMesh = new THREE.Mesh(bodyGeo, furMat);
        bodyMesh.rotation.x = Math.PI / 2;
        bodyMesh.castShadow = true;
        torsoGroup.add(bodyMesh);

        // Collar with golden bell
        const collarGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16);
        const collarMesh = new THREE.Mesh(collarGeo, collarMat);
        collarMesh.position.set(0, 0.10, 0.20);
        collarMesh.rotation.x = 0.2;
        torsoGroup.add(collarMesh);

        const bellMesh = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), collarMat);
        bellMesh.position.set(0, 0.06, 0.32);
        torsoGroup.add(bellMesh);

        avatarGroup.add(torsoGroup);

        // Head & Face
        const headGroup = new THREE.Group();
        headGroup.name = 'headGroup';
        headGroup.position.set(0, 0.48, 0.24);

        const headGeo = new THREE.SphereGeometry(0.14, 16, 16);
        const headMesh = new THREE.Mesh(headGeo, furMat);
        headMesh.castShadow = true;
        headGroup.add(headMesh);

        // Snout & Pink Nose
        const snoutMesh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), accentMat);
        snoutMesh.position.set(0, -0.04, 0.11);
        headGroup.add(snoutMesh);

        const noseMesh = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.02, 4), pinkMat);
        noseMesh.rotation.x = Math.PI;
        noseMesh.position.set(0, -0.02, 0.16);
        headGroup.add(noseMesh);

        // Cat Eyes
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), eyeMat);
        eyeL.position.set(-0.065, 0.04, 0.12);
        const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), eyeMat);
        eyeR.position.set(0.065, 0.04, 0.12);
        headGroup.add(eyeL);
        headGroup.add(eyeR);

        // Slit Pupils
        const pupilGeo = new THREE.BoxGeometry(0.008, 0.03, 0.008);
        const pupilL = new THREE.Mesh(pupilGeo, darkMat);
        pupilL.position.set(-0.065, 0.04, 0.142);
        const pupilR = new THREE.Mesh(pupilGeo, darkMat);
        pupilR.position.set(0.065, 0.04, 0.142);
        headGroup.add(pupilL);
        headGroup.add(pupilR);

        // Pointy Triangular Ears
        const earGeo = new THREE.ConeGeometry(0.055, 0.14, 4);
        const earL = new THREE.Mesh(earGeo, furMat);
        earL.position.set(-0.09, 0.14, 0.02);
        earL.rotation.z = -0.25;

        const earInnerL = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.10, 4), pinkMat);
        earInnerL.position.set(-0.09, 0.14, 0.028);
        earInnerL.rotation.z = -0.25;

        const earR = new THREE.Mesh(earGeo, furMat);
        earR.position.set(0.09, 0.14, 0.02);
        earR.rotation.z = 0.25;

        const earInnerR = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.10, 4), pinkMat);
        earInnerR.position.set(0.09, 0.14, 0.028);
        earInnerR.rotation.z = 0.25;

        headGroup.add(earL);
        headGroup.add(earInnerL);
        headGroup.add(earR);
        headGroup.add(earInnerR);

        avatarGroup.add(headGroup);

        // 4 Slender Legs
        const legPositions = [
            { name: 'legFrontLeft', x: -0.10, y: 0.24, z: 0.16 },
            { name: 'legFrontRight', x: 0.10, y: 0.24, z: 0.16 },
            { name: 'legBackLeft', x: -0.10, y: 0.24, z: -0.16 },
            { name: 'legBackRight', x: 0.10, y: 0.24, z: -0.16 }
        ];

        const legGeo = createCapsuleGeometry(0.038, 0.18, 6, 12);
        const pawGeo = new THREE.SphereGeometry(0.045, 10, 10);

        legPositions.forEach(p => {
            const lg = new THREE.Group();
            lg.name = p.name;
            lg.position.set(p.x, p.y, p.z);

            const lm = new THREE.Mesh(legGeo, furMat);
            lm.position.set(0, -0.09, 0);
            lm.castShadow = true;
            lg.add(lm);

            const paw = new THREE.Mesh(pawGeo, accentMat);
            paw.position.set(0, -0.19, 0.015);
            lg.add(paw);

            avatarGroup.add(lg);
        });

        // Long Curved Tail
        const tailGroup = new THREE.Group();
        tailGroup.name = 'tailGroup';
        tailGroup.position.set(0, 0.28, -0.20);

        const tailCurveGeo = new THREE.TorusGeometry(0.16, 0.03, 8, 16, Math.PI * 0.7);
        const tailMesh = new THREE.Mesh(tailCurveGeo, furMat);
        tailMesh.position.set(0, 0.12, -0.06);
        tailMesh.rotation.y = Math.PI / 2;
        tailGroup.add(tailMesh);

        avatarGroup.add(tailGroup);

        return avatarGroup;
    }

    // 4. MASCOTA CONEJO
    function createRabbitAvatarModel(config = {}) {
        const furColor = config.skin || '#f8fafc';
        const detailColor = config.shirt || '#ec4899';

        const avatarGroup = new THREE.Group();
        avatarGroup.name = 'playmobilAvatar';
        avatarGroup.userData = { isQuadruped: true };

        const furMat = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.7 });
        const detailMat = new THREE.MeshStandardMaterial({ color: detailColor, roughness: 0.5 });
        const pinkMat = new THREE.MeshStandardMaterial({ color: '#f472b6', roughness: 0.5 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });

        // Torso / Body
        const torsoGroup = new THREE.Group();
        torsoGroup.name = 'torsoGroup';
        torsoGroup.position.set(0, 0.22, 0);

        const bodyGeo = new THREE.SphereGeometry(0.18, 16, 16);
        const bodyMesh = new THREE.Mesh(bodyGeo, furMat);
        bodyMesh.scale.set(0.85, 0.9, 1.15);
        bodyMesh.castShadow = true;
        torsoGroup.add(bodyMesh);

        // Ribbon
        const ribbonMesh = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 16), detailMat);
        ribbonMesh.rotation.x = Math.PI / 2;
        ribbonMesh.position.set(0, 0.08, 0.12);
        torsoGroup.add(ribbonMesh);

        avatarGroup.add(torsoGroup);

        // Head & Ears
        const headGroup = new THREE.Group();
        headGroup.name = 'headGroup';
        headGroup.position.set(0, 0.42, 0.18);

        const headGeo = new THREE.SphereGeometry(0.13, 16, 16);
        const headMesh = new THREE.Mesh(headGeo, furMat);
        headMesh.castShadow = true;
        headGroup.add(headMesh);

        // Twitchy Nose & Cheek Puffs
        const noseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), pinkMat);
        noseMesh.position.set(0, -0.02, 0.14);
        headGroup.add(noseMesh);

        const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), furMat);
        cheekL.position.set(-0.04, -0.04, 0.11);
        const cheekR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), furMat);
        cheekR.position.set(0.04, -0.04, 0.11);
        headGroup.add(cheekL);
        headGroup.add(cheekR);

        // Eyes
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), darkMat);
        eyeL.position.set(-0.06, 0.03, 0.11);
        const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), darkMat);
        eyeR.position.set(0.06, 0.03, 0.11);
        headGroup.add(eyeL);
        headGroup.add(eyeR);

        // Tall Bunny Ears
        const earGeo = createCapsuleGeometry(0.035, 0.24, 6, 12);
        const earL = new THREE.Mesh(earGeo, furMat);
        earL.position.set(-0.06, 0.20, -0.02);
        earL.rotation.z = -0.15;
        earL.rotation.x = -0.10;

        const earInnerL = new THREE.Mesh(createCapsuleGeometry(0.022, 0.18, 6, 12), pinkMat);
        earInnerL.position.set(-0.06, 0.20, 0.005);
        earInnerL.rotation.z = -0.15;
        earInnerL.rotation.x = -0.10;

        const earR = new THREE.Mesh(earGeo, furMat);
        earR.position.set(0.06, 0.20, -0.02);
        earR.rotation.z = 0.15;
        earR.rotation.x = -0.10;

        const earInnerR = new THREE.Mesh(createCapsuleGeometry(0.022, 0.18, 6, 12), pinkMat);
        earInnerR.position.set(0.06, 0.20, 0.005);
        earInnerR.rotation.z = 0.15;
        earInnerR.rotation.x = -0.10;

        headGroup.add(earL);
        headGroup.add(earInnerL);
        headGroup.add(earR);
        headGroup.add(earInnerR);

        avatarGroup.add(headGroup);

        // 4 Legs
        const legPositions = [
            { name: 'legFrontLeft', x: -0.09, y: 0.20, z: 0.12, r: 0.035, h: 0.14 },
            { name: 'legFrontRight', x: 0.09, y: 0.20, z: 0.12, r: 0.035, h: 0.14 },
            { name: 'legBackLeft', x: -0.11, y: 0.20, z: -0.12, r: 0.048, h: 0.16 },
            { name: 'legBackRight', x: 0.11, y: 0.20, z: -0.12, r: 0.048, h: 0.16 }
        ];

        legPositions.forEach(p => {
            const lg = new THREE.Group();
            lg.name = p.name;
            lg.position.set(p.x, p.y, p.z);

            const lm = new THREE.Mesh(createCapsuleGeometry(p.r, p.h, 6, 12), furMat);
            lm.position.set(0, -0.07, 0);
            lm.castShadow = true;
            lg.add(lm);

            avatarGroup.add(lg);
        });

        // Fluffy Cotton Tail
        const tailGroup = new THREE.Group();
        tailGroup.name = 'tailGroup';
        tailGroup.position.set(0, 0.22, -0.18);

        const tailMesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), furMat);
        tailGroup.add(tailMesh);

        avatarGroup.add(tailGroup);

        return avatarGroup;
    }

    function updateAvatarAnimation(avatarGroup, isWalking, delta) {
        if (!avatarGroup) return;

        if (typeof avatarGroup.userData.walkTime !== 'number') avatarGroup.userData.walkTime = 0;

        const isQuadruped = avatarGroup.userData.isQuadruped || false;

        if (isQuadruped) {
            const legFL = avatarGroup.getObjectByName('legFrontLeft');
            const legFR = avatarGroup.getObjectByName('legFrontRight');
            const legBL = avatarGroup.getObjectByName('legBackLeft');
            const legBR = avatarGroup.getObjectByName('legBackRight');
            const tail = avatarGroup.getObjectByName('tailGroup');
            const torso = avatarGroup.getObjectByName('torsoGroup');

            if (isWalking) {
                avatarGroup.userData.walkTime += delta * 12;
                const wt = avatarGroup.userData.walkTime;

                const swingAmount = 0.42;
                if (legFL) legFL.rotation.x = Math.sin(wt) * swingAmount;
                if (legBR) legBR.rotation.x = Math.sin(wt) * swingAmount;

                if (legFR) legFR.rotation.x = -Math.sin(wt) * swingAmount;
                if (legBL) legBL.rotation.x = -Math.sin(wt) * swingAmount;

                if (tail) tail.rotation.y = Math.sin(wt * 1.5) * 0.35;
                if (torso) torso.position.y = 0.26 + Math.abs(Math.sin(wt)) * 0.02;
            } else {
                avatarGroup.userData.walkTime += delta * 2.5;
                const wt = avatarGroup.userData.walkTime;

                if (legFL) legFL.rotation.x += (0 - legFL.rotation.x) * 0.15;
                if (legFR) legFR.rotation.x += (0 - legFR.rotation.x) * 0.15;
                if (legBL) legBL.rotation.x += (0 - legBL.rotation.x) * 0.15;
                if (legBR) legBR.rotation.x += (0 - legBR.rotation.x) * 0.15;

                // Tail sway & gentle breathing
                if (tail) tail.rotation.y = Math.sin(wt * 1.2) * 0.18;
                if (torso) torso.position.y += ((0.26 + Math.sin(wt * 1.5) * 0.006) - torso.position.y) * 0.15;

                // Subtle head tilt idle quirk
                const headGroup = avatarGroup.getObjectByName('headGroup');
                if (headGroup) {
                    headGroup.rotation.z = Math.sin(wt * 0.8) * 0.04;
                }
            }
        } else {
            const leftLeg = avatarGroup.getObjectByName('leftLeg');
            const rightLeg = avatarGroup.getObjectByName('rightLeg');
            const leftArm = avatarGroup.getObjectByName('leftArm');
            const rightArm = avatarGroup.getObjectByName('rightArm');
            const torsoGroup = avatarGroup.getObjectByName('torsoGroup');
            const headGroup = avatarGroup.getObjectByName('headGroup');

            if (isWalking) {
                avatarGroup.userData.walkTime += delta * 10;
                const wt = avatarGroup.userData.walkTime;

                if (leftLeg) leftLeg.rotation.x = Math.sin(wt) * 0.45;
                if (rightLeg) rightLeg.rotation.x = -Math.sin(wt) * 0.45;

                if (leftArm) leftArm.rotation.x = -Math.sin(wt) * 0.38;
                if (rightArm) rightArm.rotation.x = Math.sin(wt) * 0.38;

                if (torsoGroup) {
                    torsoGroup.position.y = 0.54 + Math.abs(Math.sin(wt)) * 0.03;
                    torsoGroup.rotation.z = Math.sin(wt) * 0.025; // Inclinación natural de hombros
                }
                if (headGroup) {
                    headGroup.rotation.z = -Math.sin(wt) * 0.02; // Contrabalanceo sutil de la cabeza
                }
            } else {
                avatarGroup.userData.walkTime += delta * 2;
                const wt = avatarGroup.userData.walkTime;

                if (leftLeg) leftLeg.rotation.x += (0 - leftLeg.rotation.x) * 0.15;
                if (rightLeg) rightLeg.rotation.x += (0 - rightLeg.rotation.x) * 0.15;

                if (leftArm) {
                    leftArm.rotation.x += (0 - leftArm.rotation.x) * 0.15;
                    leftArm.rotation.z += (0.13 - leftArm.rotation.z) * 0.15;
                }
                if (rightArm) {
                    rightArm.rotation.x += (0 - rightArm.rotation.x) * 0.15;
                    rightArm.rotation.z += (-0.13 - rightArm.rotation.z) * 0.15;
                }

                if (torsoGroup) {
                    torsoGroup.position.y += ((0.54 + Math.sin(wt * 1.5) * 0.005) - torsoGroup.position.y) * 0.15; // Respiración sutil
                    torsoGroup.rotation.z += (0 - torsoGroup.rotation.z) * 0.15;
                }
                if (headGroup) {
                    headGroup.rotation.z = Math.sin(wt * 0.8) * 0.02; // Pequeño gesto ocioso
                }
            }
        }
    }

    // ----------------------------------------------------
    // GENERADORES DE HOMENAJES Y MODELOS 3D
    // ----------------------------------------------------
    function createCandle3D() {
        const candleGroup = new THREE.Group();

        const waxMat = new THREE.MeshStandardMaterial({
            color: 0xfffae6,
            roughness: 0.3,
            metalness: 0.1
        });
        const waxGeo = new THREE.CylinderGeometry(0.032, 0.035, 0.18, 12);
        const waxMesh = new THREE.Mesh(waxGeo, waxMat);
        waxMesh.position.y = 0.09;
        waxMesh.castShadow = true;
        waxMesh.receiveShadow = true;
        candleGroup.add(waxMesh);

        const wickMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
        const wickGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.03, 6);
        const wickMesh = new THREE.Mesh(wickGeo, wickMat);
        wickMesh.position.y = 0.195;
        candleGroup.add(wickMesh);

        const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const flameGeo = new THREE.ConeGeometry(0.016, 0.045, 8);
        const flameMesh = new THREE.Mesh(flameGeo, flameMat);
        flameMesh.position.y = 0.22;
        candleGroup.add(flameMesh);

        const flameLight = new THREE.PointLight(0xffa022, 0.6, 1.8, 2);
        flameLight.position.y = 0.22;
        candleGroup.add(flameLight);

        animatedCandles.push({
            light: flameLight,
            flameMesh: flameMesh,
            baseIntensity: 0.6,
            timeOffset: Math.random() * 100
        });

        return candleGroup;
    }

    function createFlower3D(isWilted = false) {
        const flowerGroup = new THREE.Group();

        if (isWilted) {
            const potMat = new THREE.MeshStandardMaterial({ color: 0x4a3b32, roughness: 0.9 });
            const potGeo = new THREE.CylinderGeometry(0.07, 0.05, 0.10, 8);
            const pot = new THREE.Mesh(potGeo, potMat);
            pot.position.y = 0.05;
            pot.castShadow = true;
            flowerGroup.add(pot);

            const wiltedStemMat = new THREE.MeshStandardMaterial({ color: 0x5c4a30, roughness: 0.9 });
            const wiltedPetalMat = new THREE.MeshStandardMaterial({ color: 0x705139, roughness: 0.9 });

            for (let i = 0; i < 3; i++) {
                const angle = (i * Math.PI * 2) / 3;
                const stem = new THREE.Group();
                stem.rotation.y = angle;

                const stemGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6);
                const stemMesh = new THREE.Mesh(stemGeo, wiltedStemMat);
                stemMesh.position.set(0.03, 0.12, 0);
                stemMesh.rotation.z = -Math.PI / 3;
                stem.add(stemMesh);

                const budGeo = new THREE.SphereGeometry(0.022, 6, 6);
                budGeo.scale(0.8, 1.2, 0.8);
                const budMesh = new THREE.Mesh(budGeo, wiltedPetalMat);
                budMesh.position.set(0.07, 0.08, 0);
                stem.add(budMesh);

                flowerGroup.add(stem);
            }
        } else {
            const potMat = new THREE.MeshStandardMaterial({ color: 0x8d5b4c, roughness: 0.6 });
            const potGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.12, 10);
            const pot = new THREE.Mesh(potGeo, potMat);
            pot.position.y = 0.06;
            pot.castShadow = true;
            pot.receiveShadow = true;
            flowerGroup.add(pot);

            const stemMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6 });
            const petalColors = [0xe91e63, 0xffeb3b, 0x9c27b0, 0x2196f3, 0xff5722];

            for (let i = 0; i < 5; i++) {
                const angle = (i * Math.PI * 2) / 5;
                const stem = new THREE.Group();
                stem.rotation.y = angle + Math.random() * 0.2;

                const stemGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.20, 6);
                const stemMesh = new THREE.Mesh(stemGeo, stemMat);
                stemMesh.position.set(0.02, 0.15, 0);
                stemMesh.rotation.z = -0.2;
                stem.add(stemMesh);

                const pColor = petalColors[i % petalColors.length];
                const petalMat = new THREE.MeshStandardMaterial({ color: pColor, roughness: 0.5 });
                const bloomGeo = new THREE.SphereGeometry(0.035, 8, 8);
                const bloomMesh = new THREE.Mesh(bloomGeo, petalMat);
                bloomMesh.position.set(0.035, 0.24, 0);
                bloomMesh.castShadow = true;
                stem.add(bloomMesh);

                flowerGroup.add(stem);
            }
        }

        return flowerGroup;
    }

    function createTreat3D() {
        const treatGroup = new THREE.Group();

        const dishMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.3 });
        const dishGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.04, 12);
        const dish = new THREE.Mesh(dishGeo, dishMat);
        dish.position.y = 0.02;
        dish.castShadow = true;
        dish.receiveShadow = true;
        treatGroup.add(dish);

        const boneMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e1, roughness: 0.6 });
        const boneCenterGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8);
        const boneCenter = new THREE.Mesh(boneCenterGeo, boneMat);
        boneCenter.rotation.z = Math.PI / 2;
        boneCenter.position.y = 0.042;
        boneCenter.castShadow = true;
        treatGroup.add(boneCenter);

        const knobGeo = new THREE.SphereGeometry(0.015, 8, 8);
        const k1 = new THREE.Mesh(knobGeo, boneMat);
        k1.position.set(-0.04, 0.042, -0.01);
        treatGroup.add(k1);
        const k2 = new THREE.Mesh(knobGeo, boneMat);
        k2.position.set(-0.04, 0.042, 0.01);
        treatGroup.add(k2);
        const k3 = new THREE.Mesh(knobGeo, boneMat);
        k3.position.set(0.04, 0.042, -0.01);
        treatGroup.add(k3);
        const k4 = new THREE.Mesh(knobGeo, boneMat);
        k4.position.set(0.04, 0.042, 0.01);
        treatGroup.add(k4);

        return treatGroup;
    }

    function attachTributesToTombstoneGroup(group, mData) {
        if (!group || !mData) return;

        const existingTributes = group.getObjectByName('tributesContainer');
        if (existingTributes) {
            group.remove(existingTributes);
        }

        const tributesContainer = new THREE.Group();
        tributesContainer.name = 'tributesContainer';

        const candleSlots = [
            { x: -0.42, y: 0.36, z: 0.20 },
            { x:  0.42, y: 0.36, z: 0.20 },
            { x: -0.28, y: 0.36, z: 0.24 },
            { x:  0.28, y: 0.36, z: 0.24 }
        ];

        const flowerSlots = [
            { x: -0.36, y: 0.18, z: 0.36 },
            { x:  0.36, y: 0.18, z: 0.36 },
            { x: -0.18, y: 0.18, z: 0.42 },
            { x:  0.18, y: 0.18, z: 0.42 }
        ];

        const treatSlots = [
            { x: -0.35, y: 0.04, z: 0.58 },
            { x:  0.35, y: 0.04, z: 0.58 },
            { x: -0.12, y: 0.04, z: 0.68 },
            { x:  0.12, y: 0.04, z: 0.68 }
        ];

        const velas = mData.velas || [];
        velas.forEach((v, idx) => {
            const slotIdx = (typeof v.slot === 'number' && v.slot >= 0 && v.slot < 4) ? v.slot : (idx % 4);
            const pos = candleSlots[slotIdx];
            const candleMesh = createCandle3D();
            candleMesh.position.set(pos.x, pos.y, pos.z);
            tributesContainer.add(candleMesh);
        });

        const flores = mData.flores || [];
        flores.forEach((f, idx) => {
            const slotIdx = (typeof f.slot === 'number' && f.slot >= 0 && f.slot < 4) ? f.slot : (idx % 4);
            const pos = flowerSlots[slotIdx];
            const flowerMesh = createFlower3D(f.is_wilted);
            flowerMesh.position.set(pos.x, pos.y, pos.z);
            tributesContainer.add(flowerMesh);
        });

        const premios = mData.premios || [];
        premios.forEach((p, idx) => {
            const slotIdx = (typeof p.slot === 'number' && p.slot >= 0 && p.slot < 4) ? p.slot : (idx % 4);
            const pos = treatSlots[slotIdx];
            const treatMesh = createTreat3D();
            treatMesh.position.set(pos.x, pos.y, pos.z);
            tributesContainer.add(treatMesh);
        });

        group.add(tributesContainer);
    }
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

    function createEngravedStoneTexture(mData) {
        const canvas = document.createElement('canvas');
        canvas.width = 1418;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d');

        // Dark grey granite stone background
        ctx.fillStyle = '#4c525a';
        ctx.fillRect(0, 0, 1418, 2048);

        // Stone texture grain & noise
        for (let i = 0; i < 40000; i++) {
            const x = Math.random() * 1418;
            const y = Math.random() * 2048;
            const shade = Math.floor(60 + Math.random() * 85);
            ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, 0.18)`;
            ctx.fillRect(x, y, 4, 4);
        }

        // Helper path for arched contour
        function traceArchedPath(padding) {
            const cx = 709;
            const cy = 709;
            const r = 709 - padding;
            const bottomY = 2048 - padding;

            ctx.beginPath();
            ctx.moveTo(cx - r, bottomY);
            ctx.lineTo(cx - r, cy);
            ctx.arc(cx, cy, r, Math.PI, 0, false);
            ctx.lineTo(cx + r, bottomY);
            ctx.closePath();
        }

        // Outer Gold Frame (thick)
        traceArchedPath(50);
        ctx.strokeStyle = '#ffd600';
        ctx.lineWidth = 20;
        ctx.stroke();

        // Inner Gold Frame (fine)
        traceArchedPath(82);
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 7;
        ctx.stroke();

        // Subtle Frame Shadow
        traceArchedPath(88);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 4;
        ctx.stroke();

        function formatDate(dateStr) {
            if (!dateStr) return '';
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return dateStr;
        }

        const nombre = (mData.nombre || 'Mascota').toUpperCase();
        const apodo = mData.apodos ? `"${mData.apodos}"` : '';
        const fLlegada = formatDate(mData.fecha_llegada || '');
        const fDespedida = formatDate(mData.fecha_despedida || '');
        const fechas = (fLlegada || fDespedida) ? `${fLlegada}  -  ${fDespedida}` : '';
        const epitafio = mData.epitafio ? `"${mData.epitafio}"` : '';
        const honor = mData.titulo_honor ? mData.titulo_honor.toUpperCase() : '';

        ctx.textAlign = 'center';

        // Engraved text styling with dark outer outline, deep shadow & high contrast fill
        function drawEngravedText(text, x, y, font, highlight = '#ffffff', shadowOffset = 8) {
            ctx.font = font;

            // Outer black stroke for crisp definition against granite background
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = Math.max(6, shadowOffset);
            ctx.strokeText(text, x, y);

            // Heavy Deep Shadow for 3D Engraved Effect
            ctx.fillStyle = '#000000';
            ctx.fillText(text, x + shadowOffset, y + shadowOffset);
            ctx.fillText(text, x + shadowOffset / 2, y + shadowOffset / 2);

            // Crisp Highlight
            ctx.fillStyle = highlight;
            ctx.fillText(text, x, y);
        }

        // 1. Top Arch Emblem & Stars (Crown & Paw)
        drawEngravedText('👑', 709, 230, '115px sans-serif', '#ffd600', 8);
        drawEngravedText('🐾', 709, 360, '85px sans-serif', '#ffd600', 6);
        drawEngravedText('✦   ✦   ✦', 709, 430, '36px serif', '#eab308', 4);

        // 2. Title of Honor (if present)
        let currentY = 510;
        if (honor) {
            drawEngravedText(`👑 ${honor}`, 709, currentY, 'bold 48px serif', '#fef08a', 6);
            currentY += 80;
        }

        // 3. Main Pet Name with auto-scaling to prevent overflowing canvas width
        let nameFontSize = 125;
        ctx.font = `bold ${nameFontSize}px serif`;
        while (ctx.measureText(nombre).width > 1100 && nameFontSize > 50) {
            nameFontSize -= 5;
            ctx.font = `bold ${nameFontSize}px serif`;
        }
        drawEngravedText(nombre, 709, currentY + 70, `bold ${nameFontSize}px serif`, '#ffffff', 10);
        currentY += 190;

        // 4. Nickname
        if (apodo) {
            drawEngravedText(apodo, 709, currentY, 'bold italic 72px serif', '#ffd600', 8);
            currentY += 110;
        }

        // 5. Dates (Large, ultra-crisp 80px bold sans-serif with high contrast)
        if (fechas) {
            let dateFontSize = 80;
            ctx.font = `bold ${dateFontSize}px sans-serif`;
            while (ctx.measureText(fechas).width > 1150 && dateFontSize > 40) {
                dateFontSize -= 4;
                ctx.font = `bold ${dateFontSize}px sans-serif`;
            }
            drawEngravedText(fechas, 709, currentY + 30, `bold ${dateFontSize}px sans-serif`, '#ffeb3b', 8);
            currentY += 150;
        }

        // 6. Epitaph (Ultra-large, highly legible 80px multiline italic text)
        if (epitafio) {
            const epitaphFont = 'bold italic 80px serif';
            ctx.font = epitaphFont;
            const words = epitafio.split(' ');
            let line = '';
            let lineY = currentY + 20;

            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                if (ctx.measureText(testLine).width > 1150 && i > 0) {
                    drawEngravedText(line.trim(), 709, lineY, epitaphFont, '#ffffff', 8);
                    line = words[i] + ' ';
                    lineY += 110;
                } else {
                    line = testLine;
                }
            }
            if (line) {
                drawEngravedText(line.trim(), 709, lineY, epitaphFont, '#ffffff', 8);
            }
        }

        // 9. Bottom Corner Filigree
        drawEngravedText('✦', 160, 1950, 'bold 44px serif', '#ffd600', 4);
        drawEngravedText('✦', 1258, 1950, 'bold 44px serif', '#ffd600', 4);
        drawEngravedText('❖ BOSQUEPATITAS ❖', 709, 1950, 'bold 30px sans-serif', 'rgba(255,214,0,0.65)', 2);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    function createTombstoneModel(tombData = null) {
        const group = new THREE.Group();

        const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x3d4248, roughness: 0.85, metalness: 0.1 });
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6b727a, roughness: 0.75, metalness: 0.15 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.7 });

        // Base pedestal (Layer 1)
        const baseGeo = new THREE.BoxGeometry(1.3, 0.18, 0.75);
        const baseMesh = new THREE.Mesh(baseGeo, darkStoneMat);
        baseMesh.position.y = 0.09;
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        group.add(baseMesh);

        // Sub-base step (Layer 2)
        const subBaseGeo = new THREE.BoxGeometry(1.1, 0.18, 0.6);
        const subBaseMesh = new THREE.Mesh(subBaseGeo, stoneMat);
        subBaseMesh.position.y = 0.27;
        subBaseMesh.castShadow = true;
        subBaseMesh.receiveShadow = true;
        group.add(subBaseMesh);

        // Monolithic Arched Headstone Body
        const width = 0.90;
        const straightH = 0.85;
        const radius = width / 2; // 0.45
        const totalH = straightH + radius; // 1.30
        const depth = 0.22;

        const shape = new THREE.Shape();
        shape.moveTo(-radius, 0);
        shape.lineTo(radius, 0);
        shape.lineTo(radius, straightH);
        shape.absarc(0, straightH, radius, 0, Math.PI, false);
        shape.lineTo(-radius, 0);

        const extrudeSettings = {
            depth: depth,
            bevelEnabled: true,
            bevelSegments: 3,
            steps: 1,
            bevelSize: 0.02,
            bevelThickness: 0.02
        };

        const bodyGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        bodyGeo.center();

        const bodyMesh = new THREE.Mesh(bodyGeo, stoneMat);
        bodyMesh.position.set(0, 0.36 + totalH / 2, 0);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        group.add(bodyMesh);

        const mData = tombData ? (tombData.mascota_data || {}) : null;

        if (mData && (mData.nombre || mData.apodos || mData.epitafio || (tombData && tombData.title))) {
            const texture = createEngravedStoneTexture(mData);
            const frontMat = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.5,
                metalness: 0.1,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1
            });

            const frontGeo = new THREE.ShapeGeometry(shape);

            // Normalize UV coordinates so canvas texture spans [0, 1] horizontally and vertically
            const posAttr = frontGeo.attributes.position;
            const uvAttr = frontGeo.attributes.uv;
            const minX = -radius;
            const maxX = radius;
            const minY = 0;
            const maxY = totalH;

            for (let i = 0; i < posAttr.count; i++) {
                const x = posAttr.getX(i);
                const y = posAttr.getY(i);
                const u = (x - minX) / (maxX - minX);
                const v = (y - minY) / (maxY - minY);
                uvAttr.setXY(i, u, v);
            }
            uvAttr.needsUpdate = true;

            const frontMesh = new THREE.Mesh(frontGeo, frontMat);
            frontMesh.position.set(0, 0.36, depth / 2 + 0.021);
            frontMesh.receiveShadow = true;
            group.add(frontMesh);
        }

        // Top Crown Ornament
        const ornamentGeo = new THREE.OctahedronGeometry(0.08);
        const ornamentMesh = new THREE.Mesh(ornamentGeo, goldMat);
        ornamentMesh.position.set(0, 0.36 + totalH + 0.06, 0);
        ornamentMesh.castShadow = true;
        group.add(ornamentMesh);

        // Attach 3D Tributes (candles, flowers, treats)
        if (mData) {
            attachTributesToTombstoneGroup(group, mData);
        }

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

    rebuildLocalPlayerAvatarMesh();
    initPusherMultiplayer();

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
                            const tombstoneMesh = createTombstoneModel(tumba);
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
    let focusedPlotId = null;
    let walkTimer = 0;

    function stopAutoWalk() {
        isAutoWalking = false;
        autoWalkTarget = null;
        focusedPlotId = null;
        walkTimer = 0;
    }

    function resetCameraPitch() {
        targetCameraPitch = 0;
    }

    // Escuchadores Teclado
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        let handled = true;
        switch (e.code) {
            case 'ArrowUp':
            case 'KeyW':
                keyState.forward = true;
                resetCameraPitch();
                break;
            case 'ArrowDown':
            case 'KeyS':
                keyState.backward = true;
                resetCameraPitch();
                break;
            case 'ArrowLeft':
                keyState.turnLeft = true;
                resetCameraPitch();
                break;
            case 'ArrowRight':
                keyState.turnRight = true;
                resetCameraPitch();
                break;
            case 'KeyA':
                keyState.strafeLeft = true;
                resetCameraPitch();
                break;
            case 'KeyD':
                keyState.strafeRight = true;
                resetCameraPitch();
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
        if (e.target.closest('.bp-arcade-overlay, .bp-modal-overlay, .bp-modal-pet-sheet, .bp-modal-card, .bp-modal-panel')) {
            return;
        }
        if (currentMode !== MODE_GROUND) return;
        e.preventDefault();
        stopAutoWalk();
        resetCameraPitch();

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
            resetCameraPitch();
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
                controls.target.set(playerPosition.x, 0.8, playerPosition.z);
            }
            camera.position.set(playerPosition.x, 22, playerPosition.z + 18);
            camera.lookAt(controls ? controls.target : new THREE.Vector3(playerPosition.x, 0.8, playerPosition.z));

            if (slotViewDesc) slotViewDesc.textContent = 'Vista Aérea (Clic para 1ª Persona)';
            dpadContainer.style.display = 'none';
            if (localPlayerAvatar) localPlayerAvatar.visible = true;
        } else if (currentMode === MODE_AVATAR) {
            if (controls) controls.enabled = false;

            if (slotViewDesc) slotViewDesc.textContent = 'Vista 3ª Persona Avatar (Clic para Aérea)';
            if (isMobile) dpadContainer.style.display = 'block';
            if (localPlayerAvatar) localPlayerAvatar.visible = true;
        } else { // MODE_GROUND
            if (controls) controls.enabled = false;

            camera.position.set(playerPosition.x, PLAYER_HEIGHT, playerPosition.z);
            cameraPitch = 0;
            targetCameraPitch = 0;
            targetCameraYaw = cameraYaw;
            camera.rotation.set(0, cameraYaw, 0, 'YXZ');

            if (slotViewDesc) slotViewDesc.textContent = 'Vista 1ª Persona Ojos (Clic para 3ª Persona)';
            if (isMobile) dpadContainer.style.display = 'block';
            if (localPlayerAvatar) localPlayerAvatar.visible = false;
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

    const menuItemAvatar = document.getElementById('bp-menu-item-avatar');

    if (menuItemPets) {
        menuItemPets.addEventListener('click', () => {
            inventoryModal.classList.add('hidden');
            openArcadePetsModal();
        });
    }

    if (menuItemAvatar) {
        menuItemAvatar.addEventListener('click', () => {
            inventoryModal.classList.add('hidden');
            openArcadeAvatarModal();
        });
    }

    const handleArcadeClose = () => {
        arcadePetsModal.classList.add('hidden');
        arcadeAvatarModal.classList.add('hidden');
    };
    const arcadeCloseBtn = document.getElementById('bp-arcade-close');
    if (arcadeCloseBtn) {
        arcadeCloseBtn.addEventListener('click', handleArcadeClose);
    }
    document.addEventListener('click', (e) => {
        if (e.target && (e.target.id === 'bp-arcade-close' || e.target.classList.contains('bp-arcade-close-btn') || e.target.classList.contains('bp-arcade-exit-btn'))) {
            handleArcadeClose();
        }
    });

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
            if (currentMode === MODE_GROUND) setMode(MODE_AVATAR);
            else if (currentMode === MODE_AVATAR) setMode(MODE_AERIAL);
            else setMode(MODE_GROUND);
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

    // Wire Floating Chat & Emotes Buttons
    const btnChat = document.getElementById('bp-chat-btn');
    const btnChatClose = document.getElementById('bp-chat-close-btn');
    const btnChatSend = document.getElementById('bp-chat-send-btn');
    const inputChatText = document.getElementById('bp-chat-input-text');
    const btnEmotes = document.getElementById('bp-emotes-btn');

    if (btnChat) {
        btnChat.addEventListener('click', () => {
            chatOverlay.classList.toggle('hidden');
            if (!chatOverlay.classList.contains('hidden') && inputChatText) {
                inputChatText.focus();
            }
        });
    }

    if (btnChatClose) {
        btnChatClose.addEventListener('click', () => {
            chatOverlay.classList.add('hidden');
        });
    }

    const triggerSendChat = () => {
        if (!inputChatText) return;
        const txt = inputChatText.value.trim();
        if (!txt) return;

        addChatMessageToBox(myName, txt, activeChatTab === 'private');

        if (pusherChannel && isPusherSubscribed) {
            pusherChannel.trigger('client-user-chat', {
                id: myClientId,
                name: myName,
                text: txt,
                isPrivate: activeChatTab === 'private',
                targetId: activeChatTab === 'private' ? privateChatTargetId : null
            });
        }

        if (localPlayerAvatar) {
            showSpeechBubble3D(localPlayerAvatar, txt);
        }

        inputChatText.value = '';
    };

    if (btnChatSend) {
        btnChatSend.addEventListener('click', triggerSendChat);
    }

    if (inputChatText) {
        inputChatText.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                triggerSendChat();
            }
        });
    }

    if (btnEmotes) {
        btnEmotes.addEventListener('click', () => {
            emotesMenu.classList.toggle('hidden');
        });
    }

    document.querySelectorAll('.bp-emote-btn').forEach(b => {
        b.addEventListener('click', () => {
            const emote = b.dataset.emote;
            emotesMenu.classList.add('hidden');

            if (localPlayerAvatar) {
                triggerEmote3D(localPlayerAvatar, emote);
            }

            if (pusherChannel && isPusherSubscribed) {
                pusherChannel.trigger('client-user-emote', {
                    id: myClientId,
                    emote: emote
                });
            }
        });
    });

    const tabGen = document.getElementById('bp-chat-tab-general');
    const tabPriv = document.getElementById('bp-chat-tab-private');

    if (tabGen) {
        tabGen.addEventListener('click', () => {
            activeChatTab = 'general';
            tabGen.classList.add('active');
            if (tabPriv) tabPriv.classList.remove('active');
        });
    }

    if (tabPriv) {
        tabPriv.addEventListener('click', () => {
            activeChatTab = 'private';
            tabPriv.classList.add('active');
            if (tabGen) tabGen.classList.remove('active');
        });
    }

    // Close overlays when clicking outside content card on backdrop
    [petSheetModal, claimModal, helpModal, inventoryModal].forEach(modalEl => {
        if (modalEl) {
            modalEl.addEventListener('click', (e) => {
                if (e.target === modalEl) {
                    modalEl.classList.add('hidden');
                }
            });
        }
    });

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

        const ajaxUrl = (typeof BP_Auth_Data !== 'undefined' ? BP_Auth_Data.ajaxurl : '/wp-admin/admin-ajax.php');
        const formData = new FormData();
        formData.append('action', 'bp_get_user_mascotas');

        fetch(ajaxUrl, {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(res => {
            if (res.success && Array.isArray(res.data)) {
                renderArcadePetsScreen(res.data, editPet);
            } else {
                // Fallback to REST API fetch
                const restRoot = settings.restRoot || '/wp-json/';
                let fetchUrl = restRoot + 'wp/v2/mascotas?per_page=100';
                if (settings.currentUserId) {
                    fetchUrl += '&author=' + settings.currentUserId;
                }
                fetch(fetchUrl, { headers: { 'X-WP-Nonce': settings.nonce } })
                    .then(r => r.json())
                    .then(pets => {
                        const userPets = Array.isArray(pets)
                            ? pets.filter(p => !settings.currentUserId || parseInt(p.author, 10) === parseInt(settings.currentUserId, 10))
                            : [];
                        renderArcadePetsScreen(userPets, editPet);
                    })
                    .catch(() => renderArcadePetsScreen([], editPet));
            }
        })
        .catch(err => {
            renderArcadePetsScreen([], editPet);
        });
    }

    function renderArcadeTabsHeader(activeTab = 'pets') {
        return `
            <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
                <button id="bp-arcade-tab-pets" class="bp-arcade-btn ${activeTab === 'pets' ? 'bp-arcade-btn-yellow' : 'bp-arcade-btn-green'}" style="font-size:11px; padding:12px 18px;">
                    🐾 MIS MASCOTAS
                </button>
                <button id="bp-arcade-tab-avatar" class="bp-arcade-btn ${activeTab === 'avatar' ? 'bp-arcade-btn-yellow' : 'bp-arcade-btn-green'}" style="font-size:11px; padding:12px 18px;">
                    🧸 MI AVATAR 3D (PLAYMOBIL CLICK)
                </button>
            </div>
        `;
    }

    let previewScene, previewCamera, previewRenderer, previewAvatarMesh, previewAnimFrame;

    function initAvatarPreviewCanvas(avatarConfig) {
        const previewContainer = document.getElementById('bp-avatar-preview-container');
        if (!previewContainer) return;

        if (previewAnimFrame) cancelAnimationFrame(previewAnimFrame);

        previewContainer.innerHTML = '';

        previewScene = new THREE.Scene();
        previewScene.background = new THREE.Color(0x0b1711);

        let width = previewContainer.clientWidth || 320;
        let height = previewContainer.clientHeight || 320;
        let aspect = width / height;

        previewCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10);
        previewCamera.position.set(0, 0.65, 2.2);
        previewCamera.lookAt(0, 0.45, 0);

        previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        previewRenderer.setSize(width, height);
        previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        previewRenderer.shadowMap.enabled = true;
        if (typeof THREE.PCFSoftShadowMap !== 'undefined') {
            previewRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        previewContainer.appendChild(previewRenderer.domElement);

        // ResizeObserver to update canvas on layout resize
        if (typeof ResizeObserver !== 'undefined') {
            const resizeObs = new ResizeObserver(entries => {
                for (let entry of entries) {
                    const w = entry.contentRect.width || 320;
                    const h = entry.contentRect.height || 320;
                    if (w > 0 && h > 0) {
                        previewCamera.aspect = w / h;
                        previewCamera.updateProjectionMatrix();
                        previewRenderer.setSize(w, h);
                    }
                }
            });
            resizeObs.observe(previewContainer);
        }

        // Sistema de Iluminación Suave de 3 Puntos
        const ambientL = new THREE.AmbientLight(0xffffff, 0.6);
        previewScene.add(ambientL);

        const hemiL = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.5);
        hemiL.position.set(0, 5, 0);
        previewScene.add(hemiL);

        const dirL = new THREE.DirectionalLight(0xffffff, 0.95);
        dirL.position.set(2.5, 4.5, 3.2);
        dirL.castShadow = true;
        dirL.shadow.mapSize.width = 1024;
        dirL.shadow.mapSize.height = 1024;
        dirL.shadow.bias = -0.001;
        dirL.shadow.camera.near = 0.5;
        dirL.shadow.camera.far = 10;
        dirL.shadow.camera.left = -1.2;
        dirL.shadow.camera.right = 1.2;
        dirL.shadow.camera.top = 1.8;
        dirL.shadow.camera.bottom = -0.5;
        previewScene.add(dirL);

        // Peana circular que recibe sombras proyectadas
        const pedMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.55, 0.08, 32),
            new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4, metalness: 0.1 })
        );
        pedMesh.position.y = -0.04;
        pedMesh.receiveShadow = true;
        previewScene.add(pedMesh);

        function rebuildPreviewMesh(cfg) {
            if (previewAvatarMesh) previewScene.remove(previewAvatarMesh);
            previewAvatarMesh = create3DAvatarModel(cfg);
            previewAvatarMesh.position.set(0, 0, 0);
            previewScene.add(previewAvatarMesh);
        }

        rebuildPreviewMesh(avatarConfig);

        // Preview Mouse Drag Rotation
        let isDragging = false;
        let prevMouseX = 0;

        const onPreviewDown = (e) => {
            isDragging = true;
            prevMouseX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        };

        const onPreviewMove = (e) => {
            if (!isDragging || !previewAvatarMesh) return;
            const curX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const dx = curX - prevMouseX;
            previewAvatarMesh.rotation.y += dx * 0.015;
            prevMouseX = curX;
        };

        const onPreviewUp = () => { isDragging = false; };

        previewRenderer.domElement.addEventListener('mousedown', onPreviewDown);
        window.addEventListener('mousemove', onPreviewMove);
        window.addEventListener('mouseup', onPreviewUp);

        previewRenderer.domElement.addEventListener('touchstart', onPreviewDown, { passive: true });
        window.addEventListener('touchmove', onPreviewMove, { passive: true });
        window.addEventListener('touchend', onPreviewUp, { passive: true });

        // Animation Loop
        let previewClock = new THREE.Clock();
        function animatePreview() {
            previewAnimFrame = requestAnimationFrame(animatePreview);

            const delta = previewClock.getDelta();
            if (!isDragging && previewAvatarMesh) {
                previewAvatarMesh.rotation.y += 0.008;
            }
            updateAvatarAnimation(previewAvatarMesh, false, delta);

            previewRenderer.render(previewScene, previewCamera);
        }

        animatePreview();

        // Attach Swatch & Form Listeners
        const currentConfig = Object.assign({
            avatar_type: 'human',
            pet_species: 'dog',
            skin: '#ffe0bd',
            shirt: '#10b981',
            pants: '#1e3a8a',
            hair_style: 'classic',
            hair_color: '#3b2314',
            accessory: 'none',
            incognito: 0
        }, avatarConfig);

        function updateSwatchActive(containerId, activeVal) {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.querySelectorAll('.bp-color-swatch').forEach(sw => {
                const col = sw.dataset.color;
                if (col === activeVal) {
                    sw.style.borderColor = '#ffd600';
                    sw.style.transform = 'scale(1.15)';
                } else {
                    sw.style.borderColor = '#000000';
                    sw.style.transform = 'scale(1.0)';
                }
            });
        }

        // Toggle Category Switcher
        const typeHumanBtn = document.getElementById('bp-type-btn-human');
        const typePetBtn = document.getElementById('bp-type-btn-pet');
        const humanControls = document.getElementById('bp-controls-human');
        const petControls = document.getElementById('bp-controls-pet');

        function toggleCategoryUI(type) {
            currentConfig.avatar_type = type;
            if (type === 'pet') {
                if (typeHumanBtn) { typeHumanBtn.classList.remove('bp-arcade-btn-yellow'); typeHumanBtn.classList.add('bp-arcade-btn-green'); }
                if (typePetBtn) { typePetBtn.classList.remove('bp-arcade-btn-green'); typePetBtn.classList.add('bp-arcade-btn-yellow'); }
                if (humanControls) humanControls.style.display = 'none';
                if (petControls) petControls.style.display = 'block';
            } else {
                if (typeHumanBtn) { typeHumanBtn.classList.remove('bp-arcade-btn-green'); typeHumanBtn.classList.add('bp-arcade-btn-yellow'); }
                if (typePetBtn) { typePetBtn.classList.remove('bp-arcade-btn-yellow'); typePetBtn.classList.add('bp-arcade-btn-green'); }
                if (humanControls) humanControls.style.display = 'block';
                if (petControls) petControls.style.display = 'none';
            }
            rebuildPreviewMesh(currentConfig);
        }

        if (typeHumanBtn) typeHumanBtn.addEventListener('click', () => toggleCategoryUI('human'));
        if (typePetBtn) typePetBtn.addEventListener('click', () => toggleCategoryUI('pet'));

        // Species Selector
        const speciesSelect = document.getElementById('bp-select-pet-species');
        if (speciesSelect) {
            speciesSelect.addEventListener('change', () => {
                currentConfig.pet_species = speciesSelect.value;
                rebuildPreviewMesh(currentConfig);
            });
        }

        // Swatches
        ['skin', 'shirt', 'pants', 'hair', 'fur', 'collar'].forEach(type => {
            const containerId = `bp-swatches-${type}`;
            const el = document.getElementById(containerId);
            if (el) {
                el.querySelectorAll('.bp-color-swatch').forEach(sw => {
                    sw.addEventListener('click', () => {
                        const col = sw.dataset.color;
                        if (type === 'hair') currentConfig.hair_color = col;
                        else if (type === 'fur') currentConfig.skin = col;
                        else if (type === 'collar') currentConfig.shirt = col;
                        else currentConfig[type] = col;

                        updateSwatchActive(containerId, col);
                        rebuildPreviewMesh(currentConfig);
                    });
                });
            }
        });

        const selectHair = document.getElementById('bp-select-hair-style');
        if (selectHair) {
            selectHair.addEventListener('change', () => {
                currentConfig.hair_style = selectHair.value;
                rebuildPreviewMesh(currentConfig);
            });
        }

        const selectAcc = document.getElementById('bp-select-accessory');
        if (selectAcc) {
            selectAcc.addEventListener('change', () => {
                currentConfig.accessory = selectAcc.value;
                rebuildPreviewMesh(currentConfig);
            });
        }

        const chkIncognito = document.getElementById('bp-chk-incognito');
        if (chkIncognito) {
            chkIncognito.addEventListener('change', () => {
                currentConfig.incognito = chkIncognito.checked ? 1 : 0;
            });
        }

        const saveBtn = document.getElementById('bp-btn-save-avatar');
        const feedbackBox = document.getElementById('bp-avatar-feedback');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                saveBtn.disabled = true;
                saveBtn.textContent = '💾 GUARDANDO AVATAR...';

                const formData = new FormData();
                formData.append('action', 'bp_ajax_save_avatar');
                formData.append('avatar_type', currentConfig.avatar_type || 'human');
                formData.append('pet_species', currentConfig.pet_species || 'dog');
                formData.append('skin', currentConfig.skin);
                formData.append('shirt', currentConfig.shirt);
                formData.append('pants', currentConfig.pants);
                formData.append('hair_style', currentConfig.hair_style);
                formData.append('hair_color', currentConfig.hair_color);
                formData.append('accessory', currentConfig.accessory);
                formData.append('incognito', currentConfig.incognito ? 1 : 0);
                formData.append('bp_nonce', settings.authNonce || settings.nonce);

                const ajaxUrl = (typeof BP_Auth_Data !== 'undefined' ? BP_Auth_Data.ajaxurl : '/wp-admin/admin-ajax.php');

                fetch(ajaxUrl, { method: 'POST', body: formData })
                .then(res => res.json())
                .then(res => {
                    saveBtn.disabled = false;
                    saveBtn.textContent = '💾 GUARDAR Y APLICAR AVATAR 3D';

                    if (res.success) {
                        settings.avatar = currentConfig;
                        if (feedbackBox) {
                            feedbackBox.style.display = 'block';
                            feedbackBox.style.color = '#34d399';
                            feedbackBox.textContent = '✨ ¡Avatar actualizado y guardado!';
                        }

                        if (typeof rebuildLocalPlayerAvatarMesh === 'function') {
                            rebuildLocalPlayerAvatarMesh();
                        }
                    } else {
                        if (feedbackBox) {
                            feedbackBox.style.display = 'block';
                            feedbackBox.style.color = '#f87171';
                            feedbackBox.textContent = res.data ? res.data.message : 'Error al guardar.';
                        }
                    }
                })
                .catch(() => {
                    saveBtn.disabled = false;
                    saveBtn.textContent = '💾 GUARDAR Y APLICAR AVATAR 3D';
                    if (feedbackBox) {
                        feedbackBox.style.display = 'block';
                        feedbackBox.style.color = '#f87171';
                        feedbackBox.textContent = 'Error de conexión.';
                    }
                });
            });
        }
    }

    function openArcadeAvatarModal() {
        const arcadeContent = document.getElementById('bp-avatar-arcade-content');
        if (!arcadeContent) return;

        arcadePetsModal.classList.add('hidden');
        arcadeAvatarModal.classList.remove('hidden');

        if (!settings.isLoggedIn) {
            arcadeContent.innerHTML = `
                <div style="text-align:center; padding:60px 20px;">
                    <p style="font-family:'Press Start 2P', monospace; font-size:14px; color:#ffd600; margin-bottom:20px;">
                        🕹️ INSERT COIN / ACCESO REQUERIDO
                    </p>
                    <p style="color:#a7f3d0; font-size:14px; margin-bottom:24px;">
                        Debes iniciar sesión o registrarte para personalizar tu avatar 3D.
                    </p>
                    <a href="${settings.loginUrl}" class="bp-arcade-btn bp-arcade-btn-yellow" style="display:inline-block; text-decoration:none; font-size:12px; padding:14px 24px;">
                        🔑 INICIAR SESIÓN / REGISTRARSE
                    </a>
                </div>
            `;
            return;
        }

        const avatar = Object.assign({
            avatar_type: 'human',
            pet_species: 'dog',
            skin: '#ffe0bd',
            shirt: '#10b981',
            pants: '#1e3a8a',
            hair_style: 'classic',
            hair_color: '#3b2314',
            accessory: 'none',
            incognito: 0
        }, settings.avatar || {});

        const isPet = (avatar.avatar_type === 'pet');

        arcadeContent.innerHTML = `

            <div class="bp-arcade-form-box" style="border-color:#34d399;">
                <h4 style="color:#34d399;">🧸 PERSONALIZADOR DE AVATAR 3D DEL BOSQUE</h4>

                <!-- CATEGORY SELECTION: TUTOR VS MASCOTA -->
                <div style="display:flex; gap:12px; margin-bottom:20px; background:rgba(0,0,0,0.3); padding:10px; border-radius:8px;">
                    <button id="bp-type-btn-human" class="bp-arcade-btn ${!isPet ? 'bp-arcade-btn-yellow' : 'bp-arcade-btn-green'}" style="flex:1; font-size:11px; padding:12px;">
                        👤 TUTOR (HUMANO)
                    </button>
                    <button id="bp-type-btn-pet" class="bp-arcade-btn ${isPet ? 'bp-arcade-btn-yellow' : 'bp-arcade-btn-green'}" style="flex:1; font-size:11px; padding:12px;">
                        🐾 MASCOTA (ANIMAL)
                    </button>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:24px; align-items:start;">

                    <!-- CONTROLES RETRO DE TUNEO -->
                    <div>
                        <!-- HUMAN CUSTOMIZATION CONTROLS -->
                        <div id="bp-controls-human" style="display:${!isPet ? 'block' : 'none'};">
                            <!-- SKIN COLOR -->
                            <div style="margin-bottom:16px;">
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:6px;">1. TONO DE PIEL</label>
                                <div style="display:flex; gap:8px; flex-wrap:wrap;" id="bp-swatches-skin">
                                    ${['#ffe0bd', '#f5c29b', '#d08b5b', '#8d5524', '#613318'].map(c => `
                                        <div class="bp-color-swatch ${avatar.skin === c ? 'active' : ''}" data-color="${c}" style="background:${c}; width:32px; height:32px; border-radius:6px; cursor:pointer; border:2px solid ${avatar.skin === c ? '#ffd600' : '#000000'};"></div>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- SHIRT COLOR -->
                            <div style="margin-bottom:16px;">
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:6px;">2. COLOR DE CAMISETA / TORSO</label>
                                <div style="display:flex; gap:8px; flex-wrap:wrap;" id="bp-swatches-shirt">
                                    ${['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#1e293b', '#ffffff'].map(c => `
                                        <div class="bp-color-swatch ${avatar.shirt === c ? 'active' : ''}" data-color="${c}" style="background:${c}; width:32px; height:32px; border-radius:6px; cursor:pointer; border:2px solid ${avatar.shirt === c ? '#ffd600' : '#000000'};"></div>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- PANTS COLOR -->
                            <div style="margin-bottom:16px;">
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:6px;">3. COLOR DE PANTALÓN</label>
                                <div style="display:flex; gap:8px; flex-wrap:wrap;" id="bp-swatches-pants">
                                    ${['#1e3a8a', '#1e293b', '#3b2314', '#10b981', '#d97706', '#dc2626', '#ffffff'].map(c => `
                                        <div class="bp-color-swatch ${avatar.pants === c ? 'active' : ''}" data-color="${c}" style="background:${c}; width:32px; height:32px; border-radius:6px; cursor:pointer; border:2px solid ${avatar.pants === c ? '#ffd600' : '#000000'};"></div>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- HAIR STYLE -->
                            <div style="margin-bottom:16px;">
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:6px;">4. ESTILO DE PEINADO / SOMBRERO</label>
                                <select id="bp-select-hair-style" class="bp-arcade-input">
                                    <option value="classic" ${avatar.hair_style === 'classic' ? 'selected' : ''}>💇 Clásico del Bosque</option>
                                    <option value="spiky" ${avatar.hair_style === 'spiky' ? 'selected' : ''}>⚡ Pelo Spiky 90s</option>
                                    <option value="cap" ${avatar.hair_style === 'cap' ? 'selected' : ''}>🧢 Gorra Rápida</option>
                                    <option value="crown" ${avatar.hair_style === 'crown' ? 'selected' : ''}>👑 Corona Real</option>
                                    <option value="hat" ${avatar.hair_style === 'hat' ? 'selected' : ''}>🎩 Sombrero Elegante</option>
                                </select>
                            </div>

                            <!-- HAIR COLOR -->
                            <div style="margin-bottom:16px;">
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:6px;">5. COLOR DE PELO</label>
                                <div style="display:flex; gap:8px; flex-wrap:wrap;" id="bp-swatches-hair">
                                    ${['#3b2314', '#1e293b', '#f59e0b', '#e11d48', '#94a3b8', '#fef08a'].map(c => `
                                        <div class="bp-color-swatch ${avatar.hair_color === c ? 'active' : ''}" data-color="${c}" style="background:${c}; width:32px; height:32px; border-radius:6px; cursor:pointer; border:2px solid ${avatar.hair_color === c ? '#ffd600' : '#000000'};"></div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- PET CUSTOMIZATION CONTROLS -->
                        <div id="bp-controls-pet" style="display:${isPet ? 'block' : 'none'};">
                            <!-- ANIMAL SPECIES -->
                            <div style="margin-bottom:16px;">
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:6px;">1. ESPECIE DE ANIMAL</label>
                                <select id="bp-select-pet-species" class="bp-arcade-input">
                                    <option value="dog" ${avatar.pet_species === 'dog' ? 'selected' : ''}>🐶 Perro Fiel</option>
                                    <option value="cat" ${avatar.pet_species === 'cat' ? 'selected' : ''}>🐱 Gato Místico</option>
                                    <option value="rabbit" ${avatar.pet_species === 'rabbit' ? 'selected' : ''}>🐰 Conejo del Bosque</option>
                                </select>
                            </div>

                            <!-- FUR COLOR -->
                            <div style="margin-bottom:16px;">
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:6px;">2. COLOR DE PELAJE</label>
                                <div style="display:flex; gap:8px; flex-wrap:wrap;" id="bp-swatches-fur">
                                    ${['#d97706', '#334155', '#f8fafc', '#b45309', '#1e293b', '#eab308', '#ec4899'].map(c => `
                                        <div class="bp-color-swatch ${avatar.skin === c ? 'active' : ''}" data-color="${c}" style="background:${c}; width:32px; height:32px; border-radius:6px; cursor:pointer; border:2px solid ${avatar.skin === c ? '#ffd600' : '#000000'};"></div>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- COLLAR / ACCENT COLOR -->
                            <div style="margin-bottom:16px;">
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:6px;">3. COLOR DE COLLAR / DETALLE</label>
                                <div style="display:flex; gap:8px; flex-wrap:wrap;" id="bp-swatches-collar">
                                    ${['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff'].map(c => `
                                        <div class="bp-color-swatch ${avatar.shirt === c ? 'active' : ''}" data-color="${c}" style="background:${c}; width:32px; height:32px; border-radius:6px; cursor:pointer; border:2px solid ${avatar.shirt === c ? '#ffd600' : '#000000'};"></div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- ACCESSORY -->
                        <div style="margin-bottom:16px;">
                            <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:6px;">ACCESORIO</label>
                            <select id="bp-select-accessory" class="bp-arcade-input">
                                <option value="none" ${avatar.accessory === 'none' ? 'selected' : ''}>🚫 Ninguno</option>
                                <option value="lantern" ${avatar.accessory === 'lantern' ? 'selected' : ''}>🏮 Linterna Brillante</option>
                                <option value="flower" ${avatar.accessory === 'flower' ? 'selected' : ''}>🌸 Flor del Bosque</option>
                                <option value="wand" ${avatar.accessory === 'wand' ? 'selected' : ''}>🪄 Varita Mágica de Estrellas</option>
                            </select>
                        </div>

                        <!-- INCOGNITO CHECKBOX -->
                        <div style="margin-bottom:20px; background:rgba(0,0,0,0.3); padding:12px; border-radius:6px; border:1px solid rgba(16,185,129,0.3);">
                            <label style="font-size:12px; color:#a7f3d0; cursor:pointer; display:flex; align-items:center; gap:8px;">
                                <input type="checkbox" id="bp-chk-incognito" ${avatar.incognito ? 'checked' : ''} style="width:18px; height:18px; accent-color:#10b981;" />
                                <span>👻 Visitar en solitario / Modo Incógnito (ocultar mi avatar a los demás)</span>
                            </label>
                        </div>

                        <div id="bp-avatar-feedback" style="display:none; font-size:12px; margin-bottom:12px; color:#2ecc71;"></div>

                        <button id="bp-btn-save-avatar" class="bp-arcade-btn bp-arcade-btn-yellow" style="font-size:11px; padding:14px 22px; width:100%;">
                            💾 GUARDAR Y APLICAR AVATAR 3D
                        </button>
                    </div>

                    <!-- LIVE 3D PREVIEW BOX -->
                    <div style="text-align:center;">
                        <div style="font-family:'Press Start 2P', monospace; font-size:11px; color:#ffd600; margin-bottom:10px;">
                            🕹️ VISTA PREVIA EN VIVO 3D
                        </div>
                        <div id="bp-avatar-preview-container" style="width:100%; height:320px; background:#0b1711; border:3px solid #10b981; border-radius:10px; box-shadow:inset 0 0 20px rgba(0,0,0,0.8); position:relative; overflow:hidden;"></div>
                        <div style="font-size:11px; color:#a7f3d0; margin-top:8px;">Arrastra para rotar la vista previa</div>
                    </div>

                </div>
            </div>
        `;

        // Wire Tab buttons
        const tabPetsBtn = document.getElementById('bp-arcade-tab-pets');
        if (tabPetsBtn) {
            tabPetsBtn.addEventListener('click', () => openArcadePetsModal());
        }

        // Setup Live Preview Scene
        initAvatarPreviewCanvas(avatar);
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
                const tombState = details.tomb_state || 'cuidada';

                let tombStatusBadge = '';
                if (tumbaId > 0) {
                    if (tombState === 'cuidada') {
                        tombStatusBadge = `<div style="font-size:10px; color:#34d399 !important; font-weight:700; margin-top:3px;">🌟 CUIDADA Y LUMINOSA</div>`;
                    } else {
                        tombStatusBadge = `<div style="font-size:10px; color:#fbbf24 !important; font-weight:700; margin-top:3px;">🍂 NECESITA ATENCIÓN (Velas/Flores)</div>`;
                    }
                }

                cardsHtml += `
                    <div class="bp-arcade-card">
                        <div class="bp-arcade-card-head">
                            ${imgUrl ? `<img src="${imgUrl}" class="bp-arcade-avatar" />` : `<div class="bp-arcade-avatar bp-arcade-avatar-placeholder"><span class="bp-paw-icon-bright">🐾</span></div>`}
                            <div>
                                <h4 class="bp-arcade-card-title">${title}</h4>
                                ${honor ? `<div style="font-size:11px; color:#34d399 !important; font-weight:700;">👑 ${honor}</div>` : ''}
                                ${especie ? `<div style="font-size:11px; color:#ffd600 !important; font-weight:700; display:flex; align-items:center; gap:4px;"><span class="bp-paw-icon-bright">🐾</span> ${especie}</div>` : ''}
                                <div style="margin-top:6px;">
                                    ${isApproved ? `<span class="bp-arcade-badge approved">✔ VALIDADA</span>` : `<span class="bp-arcade-badge pending">⏳ EN REVISIÓN</span>`}
                                </div>
                            </div>
                        </div>

                        <div class="bp-arcade-stats-mini">
                            <div>💖 Cariño: <strong>${details.stat_carino || 10}/10</strong></div>
                            <div>😼 Travesura: <strong>${details.stat_travesura || 5}/10</strong></div>
                            <div>📍 Tumba: <strong>${tumbaId > 0 ? 'Sepultada en 3D' : 'Sin tumba'}</strong> ${tombStatusBadge}</div>
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
            ${renderArcadeTabsHeader('pets')}

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
                                <input type="text" name="nombre" class="bp-arcade-input" maxlength="50" required value="${editData ? (editData.nombre || editPet.post_title || '') : ''}" placeholder="Ej: Toby" />
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">2. APODOS (MÁX. 30 CAT.)</label>
                                <input type="text" name="apodos" class="bp-arcade-input" maxlength="30" value="${editData ? (editData.apodos || '') : ''}" placeholder='Ej: "Sr. Salchicha"' />
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">3. EPITAFIO (FRASE PARA LA LÁPIDA, MÁX. 60 CAT.)</label>
                                <input type="text" name="epitafio" class="bp-arcade-input" maxlength="60" value="${editData ? (editData.epitafio || '') : ''}" placeholder='Ej: "Siempre estarás corriendo feliz en nuestros corazones"' />
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">4. TÍTULO DE HONOR (MÁX. 30 CAT.)</label>
                                <input type="text" name="titulo_honor" class="bp-arcade-input" maxlength="30" value="${editData ? (editData.titulo_honor || '') : ''}" placeholder='Ej: "Reina del Sofá"' />
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">5. ESPECIE Y RAZA</label>
                                <input type="text" name="especie_raza" class="bp-arcade-input" maxlength="50" value="${editData ? (editData.especie_raza || '') : ''}" placeholder='Ej: "Perro / Mezcla"' />
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

                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:15px; margin-bottom:15px;">
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">SUPERPODER DESTACADO</label>
                                <input type="text" name="superpoder" class="bp-arcade-input" maxlength="60" value="${editData ? (editData.superpoder || '') : ''}" placeholder='Ej: "Detectar premios a 3 km"' />
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">ARCHIENEMIGO MORTAL</label>
                                <input type="text" name="archienemigo" class="bp-arcade-input" maxlength="60" value="${editData ? (editData.archienemigo || '') : ''}" placeholder='Ej: "La aspiradora"' />
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">COMIDA FAVORITA</label>
                                <input type="text" name="comida_favorita" class="bp-arcade-input" maxlength="60" value="${editData ? (editData.comida_favorita || '') : ''}" placeholder='Ej: "Jamón york"' />
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">JUGUETE ESTRELLA</label>
                                <input type="text" name="juguete_estrella" class="bp-arcade-input" maxlength="60" value="${editData ? (editData.juguete_estrella || '') : ''}" placeholder='Ej: "Pelota de tenis"' />
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:15px; margin-bottom:15px;">
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">LUGAR FAVORITO</label>
                                <input type="text" name="lugar_favorito" class="bp-arcade-input" maxlength="60" value="${editData ? (editData.lugar_favorito || '') : ''}" placeholder='Ej: "Rincón del sofá"' />
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">TRAVESURA ÉPICA</label>
                                <input type="text" name="travesura_epica" class="bp-arcade-input" maxlength="100" value="${editData ? (editData.travesura_epica || '') : ''}" placeholder='Ej: "Se comió la tarta de cumpleaños"' />
                            </div>
                            <div style="grid-column: span 2;">
                                <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">BANDA SONORA (ENLACE YOUTUBE O SPOTIFY)</label>
                                <input type="url" name="soundtrack_url" class="bp-arcade-input" maxlength="200" value="${editData ? (editData.soundtrack_url || '') : ''}" placeholder="https://www.youtube.com/watch?v=..." />
                            </div>
                        </div>

                        <div style="margin-bottom:15px;">
                            <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">LA GRAN ANÉCDOTA / HISTORIA *</label>
                            <textarea name="historia" rows="3" class="bp-arcade-input" maxlength="2000" required placeholder="Cuéntanos su historia...">${editData ? (editData.historia || editPet.post_content || '') : ''}</textarea>
                        </div>

                        <div style="margin-bottom:15px;">
                            <label style="font-size:11px; font-weight:700; color:#ffd600; display:block; margin-bottom:4px;">CARTA DE DESPEDIDA</label>
                            <textarea name="carta_despedida" rows="3" class="bp-arcade-input" maxlength="2000" placeholder="Tu mensaje personal de amor y despedida...">${editData ? (editData.carta_despedida || '') : ''}</textarea>
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

        // Wire Tab Switchers
        const tabAvatarBtn = document.getElementById('bp-arcade-tab-avatar');
        if (tabAvatarBtn) {
            tabAvatarBtn.addEventListener('click', () => openArcadeAvatarModal());
        }


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
                    <button id="bp-btn-go-to-mascotas" class="bp-btn bp-btn-primary" style="display:inline-block; background:#2d6a4f; color:#ffffff; padding:12px 20px; border-radius:8px; font-weight:700; border:none; cursor:pointer;">
                        🐾 Registrar y Validar Mascota
                    </button>
                </div>
            `;
            const goToMascotasBtn = document.getElementById('bp-btn-go-to-mascotas');
            if (goToMascotasBtn) {
                goToMascotasBtn.addEventListener('click', () => {
                    claimModal.classList.add('hidden');
                    openArcadePetsModal();
                });
            }
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
                                const tombData = {
                                    id: data.tumba_id,
                                    title: { rendered: 'Tumba de ' + data.mascota_data.nombre },
                                    content: { rendered: data.mascota_data.historia },
                                    meta: { posicion_x: pos.x, posicion_y: pos.y, posicion_z: pos.z },
                                    mascota_data: data.mascota_data
                                };
                                const tombstoneMesh = createTombstoneModel(tombData);
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
        let wiltedFlores = mData.wilted_flores_count || 0;
        let tombState = mData.tomb_state || 'cuidada';

        const statusBadgeHtml = tombState === 'cuidada'
            ? `<span id="bp-badge-status-el" class="bp-pet-badge-verified" style="background:#15803d; color:#ffffff; font-weight:700;">🌟 Cuidada y Luminosa</span>`
            : `<span id="bp-badge-status-el" class="bp-pet-badge-verified" style="background:#b45309; color:#ffffff; font-weight:700;">🍂 Necesita Cariño</span>`;

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
                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
                        <span class="bp-pet-badge-verified">✔ Mascota Validada</span>
                        ${statusBadgeHtml}
                    </div>
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

            <!-- HOMENAJES INTERACTIVOS -->
            <div class="bp-sheet-sec-title">🕯️ Muestras de Cariño y Cuidado</div>
            <div style="font-size:12px; color:#cbd5e1; margin-bottom:12px; line-height:1.4;">
                Coloca homenajes en la tumba 3D. Las 🕯️ <strong>velas duran 24 horas</strong>, las 🌸 <strong>flores duran 3 días</strong> (puedes regarlas con 🚿 o 🦴 para revivirlas) y los 🦴 <strong>premios duran 24 horas</strong>. Cada visitante puede poner 1 tributo de cada tipo.
            </div>

            <div class="bp-tributes-row" style="display:flex; flex-wrap:wrap; gap:10px;">
                <button class="bp-tribute-btn" data-type="vela" data-id="${mData.id}" style="flex:1; min-width:140px;">
                    <span>🕯️ Encender Vela</span>
                    <span class="bp-tribute-count" id="bp-count-vela">${velasCount}/4</span>
                </button>
                <button class="bp-tribute-btn" data-type="flor" data-id="${mData.id}" style="flex:1; min-width:140px;">
                    <span>🌸 Poner Flores</span>
                    <span class="bp-tribute-count" id="bp-count-flor">${floresCount}/4</span>
                </button>
                <button class="bp-tribute-btn" data-type="regar" data-id="${mData.id}" style="flex:1; min-width:140px; background:rgba(14, 165, 233, 0.2); border:1px solid #0ea5e9;">
                    <span>🚿 Regar Flores</span>
                    <span class="bp-tribute-count">Revive 🌸</span>
                </button>
                <button class="bp-tribute-btn" data-type="premio" data-id="${mData.id}" style="flex:1; min-width:140px;">
                    <span>🦴 Dejar Premio</span>
                    <span class="bp-tribute-count" id="bp-count-premio">${premiosCount}/4</span>
                </button>
                ${wiltedFlores > 0 ? `
                    <button class="bp-tribute-btn" data-type="limpiar_flores" data-id="${mData.id}" style="flex:1; min-width:140px; background:rgba(239, 68, 68, 0.2); border:1px solid #ef4444;">
                        <span>🧹 Limpiar Marchitas</span>
                        <span class="bp-tribute-count" id="bp-count-marchitas">${wiltedFlores}</span>
                    </button>
                ` : ''}
            </div>

            <div style="margin-top:12px; text-align:center;">
                <button id="bp-btn-share-tomb" class="bp-btn" style="background:rgba(234, 179, 8, 0.18); border:1px solid #eab308; color:#fef08a; padding:10px 18px; border-radius:20px; font-weight:700; font-size:12px; cursor:pointer; width:100%;">
                    🔗 Compartir Tumba para recibir Flores y Velas
                </button>
            </div>
            <div id="bp-tribute-feedback" style="display:none; font-size:12px; margin-top:8px; font-weight:600; text-align:center;"></div>

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

        const feedbackBox = sheetContent.querySelector('#bp-tribute-feedback');

        // Attach Share Tomb button listener
        const shareBtn = sheetContent.querySelector('#bp-btn-share-tomb');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                const currentUrl = window.location.href.split('#')[0];
                const shareText = `¡Ven a recordar a ${title} en el Cementerio 3D de BosquePatitas! Enciende una vela o ponle flores aquí: ${currentUrl}`;

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(shareText).then(() => {
                        if (feedbackBox) {
                            feedbackBox.style.display = 'block';
                            feedbackBox.style.color = '#fef08a';
                            feedbackBox.textContent = '📋 ¡Mensaje copiado al portapapeles! Envíalo a tus amigos para que pongan flores y velas.';
                        }
                    });
                } else {
                    prompt('Copia este mensaje y envíalo a tus amigos:', shareText);
                }
            });
        }

        // Attach tribute click listeners with instantaneous 90s retro loading state
        sheetContent.querySelectorAll('.bp-tribute-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tipo = btn.dataset.type;
                const petId = btn.dataset.id;
                if (!petId || petId === 'undefined') return;

                btn.disabled = true;
                const origContent = btn.innerHTML;

                // 90s retro arcade video game loading indicator
                btn.innerHTML = `<span style="font-family:'Press Start 2P', monospace; font-size:10px; color:#ffd600;">⌛ PROCESANDO...</span>`;

                if (feedbackBox) {
                    feedbackBox.style.display = 'block';
                    feedbackBox.style.color = '#ffd600';
                    feedbackBox.innerHTML = `<span style="font-family:'Press Start 2P', monospace; font-size:11px;">⌛ PROCESANDO HOMENAJE EN 3D...</span>`;
                }

                const restUrl = (settings.restRoot || '/wp-json/') + 'bosquepatitas/v1/tributo';

                fetch(restUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mascota_id: petId, tipo: tipo })
                })
                .then(res => res.json())
                .then(res => {
                    btn.disabled = false;
                    btn.innerHTML = origContent;

                    if (res.success && res.mascota_data) {
                        tombData.mascota_data = res.mascota_data;
                        const d = res.mascota_data;

                        // Fast in-place DOM updates for smooth UI experience
                        const countVela = sheetContent.querySelector('#bp-count-vela');
                        if (countVela) countVela.textContent = `${d.count_velas || 0}/4`;

                        const countFlor = sheetContent.querySelector('#bp-count-flor');
                        if (countFlor) countFlor.textContent = `${d.count_flores || 0}/4`;

                        const countPremio = sheetContent.querySelector('#bp-count-premio');
                        if (countPremio) countPremio.textContent = `${d.count_premios || 0}/4`;

                        const badgeEl = sheetContent.querySelector('#bp-badge-status-el');
                        if (badgeEl) {
                            if (d.tomb_state === 'cuidada') {
                                badgeEl.style.background = '#15803d';
                                badgeEl.textContent = '🌟 Cuidada y Luminosa';
                            } else {
                                badgeEl.style.background = '#b45309';
                                badgeEl.textContent = '🍂 Necesita Cariño';
                            }
                        }

                        // Update 3D model in scene
                        const plot = plotManager.plots.find(p => p.tombData && p.tombData.mascota_data && p.tombData.mascota_data.id == petId);
                        if (plot && plot.tombMesh) {
                            plot.tombData.mascota_data = d;
                            attachTributesToTombstoneGroup(plot.tombMesh, d);
                        }

                        if (feedbackBox) {
                            feedbackBox.style.display = 'block';
                            feedbackBox.style.color = '#34d399';
                            feedbackBox.textContent = '✨ ¡Homenaje colocado al instante en la tumba 3D!';
                        }
                    } else {
                        if (feedbackBox) {
                            feedbackBox.style.display = 'block';
                            feedbackBox.style.color = '#f87171';
                            feedbackBox.textContent = res.message || 'No se pudo colocar el homenaje.';
                        }
                    }
                })
                .catch(err => {
                    btn.disabled = false;
                    btn.innerHTML = origContent;
                    if (feedbackBox) {
                        feedbackBox.style.display = 'block';
                        feedbackBox.style.color = '#f87171';
                        feedbackBox.textContent = 'Error de conexión.';
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

            if (ud.type === 'remoteAvatar') {
                tooltip.classList.remove('hidden');
                tooltip.innerHTML = `
                    <div class="bp-tooltip-header" style="text-align:center;">
                        <span class="bp-badge free" style="background:#10b981; color:#ffffff;">👤 Visitante en Línea</span>
                        <h4 class="bp-pet-title" style="font-size:16px; color:#ffffff !important; margin-top:4px;">${ud.userName || 'Visitante'}</h4>
                    </div>
                    <p class="bp-pet-excerpt" style="color:#a7f3d0 !important; font-size:12px; margin:6px 0;">Haz clic para entablar conversación privada.</p>
                `;
                container.style.cursor = 'pointer';
                return;
            }

            tooltip.classList.remove('hidden');

            if (ud.type === 'tombstone' || (ud.type === 'plot' && ud.occupied)) {
                const mData = (ud.tombData ? ud.tombData.mascota_data : null) || {};
                const name = mData.nombre || (ud.tombData ? (ud.tombData.title ? ud.tombData.title.rendered : 'Tumba') : 'Tumba');
                const honor = mData.titulo_honor ? `👑 ${mData.titulo_honor}` : '';
                const tombState = mData.tomb_state || 'cuidada';
                const statusBadge = tombState === 'cuidada'
                    ? '<span class="bp-badge cuidada" style="background:#15803d; color:#ffffff; font-size:11px; padding:3px 10px; border-radius:12px; font-weight:700; display:inline-block;">🌟 Cuidada y Luminosa</span>'
                    : '<span class="bp-badge necesita" style="background:#b45309; color:#ffffff; font-size:11px; padding:3px 10px; border-radius:12px; font-weight:700; display:inline-block;">🍂 Necesita Cariño</span>';

                tooltip.innerHTML = `
                    <div class="bp-tooltip-header" style="text-align:center;">
                        <div style="margin-bottom:6px; display:flex; justify-content:center;">
                            ${statusBadge}
                        </div>
                        <h4 class="bp-pet-title" style="font-size:18px; color:#ffffff !important; font-weight:800; margin:0; text-align:center;">${name}</h4>
                        ${honor ? `<div style="font-size:12px; color:#fef08a; margin-top:2px; text-align:center;">${honor}</div>` : ''}
                    </div>
                    <div style="font-size:12px; color:#cbd5e1; margin-top:8px; text-align:center;">
                        🕯️ Velas: <strong>${mData.count_velas || 0}/4</strong> | 🌸 Flores: <strong>${mData.count_flores || 0}/4</strong> | 🦴 Premios: <strong>${mData.count_premios || 0}/4</strong>
                    </div>
                `;
            } else {
                tooltip.innerHTML = `
                    <div class="bp-tooltip-header">
                        <span class="bp-badge free">Parcela Disponible</span>
                        <h4 class="bp-pet-title" style="font-size:18px; margin-top:4px; color:#ffffff !important; font-weight:800;">Espacio para Homenaje</h4>
                    </div>
                    <p class="bp-pet-excerpt" style="color:#e2e8f0 !important; font-size:13px; margin:8px 0;">Esta parcela está libre para recordar a una mascota especial.</p>
                    <div class="bp-tooltip-footer">
                        <small style="color:#94a3b8 !important;">Código: ${ud.plotId}</small>
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

                if (obj.userData && obj.userData.type === 'remoteAvatar') {
                    const userId = obj.userData.userId;
                    const userName = obj.userData.userName;

                    privateChatTargetId = userId;
                    privateChatTargetName = userName;
                    activeChatTab = 'private';

                    if (chatTabPrivate && chatTabGeneral) {
                        chatTabPrivate.classList.add('active');
                        chatTabGeneral.classList.remove('active');
                        chatTabPrivate.textContent = `🔒 ${userName}`;
                    }

                    if (chatOverlay) chatOverlay.classList.remove('hidden');

                    addChatMessageToBox('🤖 BosqueBot', `Has iniciado conversación privada con ${userName}. ¡Saluda! 👋`, true);
                    return;
                }

                if (obj.userData && (obj.userData.type === 'plot' || obj.userData.type === 'tombstone')) {
                    const plotGroup = obj.userData.plotGroup || obj.parent;
                    if (plotGroup) {
                        const plotId = obj.userData.plotId;
                        const targetPos = new THREE.Vector3();
                        plotGroup.getWorldPosition(targetPos);

                        if (currentMode === MODE_AERIAL) {
                            if (controls) controls.target.set(targetPos.x, targetPos.y + 0.8, targetPos.z);
                            openModalForObject(obj.userData, plotGroup);
                            return;
                        }

                        // If already focused on this plot, second click triggers the modal overlay
                        if (focusedPlotId === plotId && !isAutoWalking) {
                            openModalForObject(obj.userData, plotGroup);
                            return;
                        }

                        const rotY = plotGroup.rotation.y || 0;
                        const approachDist = 2.1;
                        const KNEELING_HEIGHT = 0.75;

                        const targetX = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, targetPos.x + Math.sin(rotY) * approachDist));
                        const targetZ = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, targetPos.z + Math.cos(rotY) * approachDist));

                        let finalYaw = Math.atan2(-(targetPos.x - targetX), -(targetPos.z - targetZ));
                        finalYaw = Math.atan2(Math.sin(finalYaw), Math.cos(finalYaw));

                        // Kneeling position angle: Eye height lowered to 0.75m looking slightly down towards tombstone base / slab (Y = 0.65m)
                        const tombstoneCenterY = 0.65;
                        const finalPitch = Math.atan2(tombstoneCenterY - KNEELING_HEIGHT, approachDist);

                        const startX = camera.position.x;
                        const startZ = camera.position.z;
                        const totalDist = Math.hypot(targetX - startX, targetZ - startZ);

                        autoWalkTarget = {
                            startX: startX,
                            startZ: startZ,
                            x: targetX,
                            z: targetZ,
                            totalDist: totalDist,
                            targetPlotPos: targetPos,
                            finalYaw: finalYaw,
                            finalPitch: finalPitch,
                            userData: obj.userData,
                            plotGroup: plotGroup,
                            plotId: plotId,
                            phase: 'walk'
                        };
                        isAutoWalking = true;
                        focusedPlotId = null;
                        targetCameraPitch = 0; // Level horizontal pitch while walking
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
            resetCameraPitch();
        }

        const sensitivity = 0.0032;
        targetCameraYaw -= dx * sensitivity;
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
        const elapsedTime = clock.getElapsedTime();

        // Animate flickering candle lights and flames
        animatedCandles.forEach(c => {
            if (c.light) {
                c.light.intensity = c.baseIntensity + Math.sin(elapsedTime * 12 + c.timeOffset) * 0.12 + Math.cos(elapsedTime * 23 + c.timeOffset) * 0.08;
            }
            if (c.flameMesh) {
                c.flameMesh.scale.x = 1.0 + Math.sin(elapsedTime * 15 + c.timeOffset) * 0.15;
                c.flameMesh.scale.z = 1.0 + Math.cos(elapsedTime * 15 + c.timeOffset) * 0.15;
            }
        });

        const moveSpeed = 8.5 * delta;
        const turnSpeed = 2.2 * delta;
        let isMoving = false;

        if (currentMode === MODE_GROUND || currentMode === MODE_AVATAR) {
            if (isAutoWalking && autoWalkTarget) {
                const dx = autoWalkTarget.x - playerPosition.x;
                const dz = autoWalkTarget.z - playerPosition.z;
                const dist = Math.hypot(dx, dz);

                if (autoWalkTarget.phase === 'walk') {
                    if (dist > 0.12) {
                        isMoving = true;
                        const moveYaw = Math.atan2(-dx, -dz);
                        targetCameraYaw = moveYaw;
                        targetCameraPitch = 0;

                        const traveled = autoWalkTarget.totalDist - dist;
                        let speedFactor = 1.0;
                        if (autoWalkTarget.totalDist > 0.5) {
                            const easeIn = Math.min(1.0, traveled / 1.0);
                            const easeOut = Math.min(1.0, dist / 1.5);
                            speedFactor = Math.max(0.25, Math.min(easeIn, easeOut));
                        }

                        const stepSpeed = moveSpeed * 1.5 * speedFactor;
                        const step = Math.min(dist, stepSpeed);
                        playerPosition.x += (dx / dist) * step;
                        playerPosition.z += (dz / dist) * step;

                        walkTimer += delta * 11 * speedFactor;
                    } else {
                        playerPosition.x = autoWalkTarget.x;
                        playerPosition.z = autoWalkTarget.z;
                        autoWalkTarget.phase = 'arrive';
                        walkTimer = 0;
                    }
                } else if (autoWalkTarget.phase === 'arrive') {
                    targetCameraYaw = autoWalkTarget.finalYaw;
                    targetCameraPitch = autoWalkTarget.finalPitch;

                    let yawDiff = autoWalkTarget.finalYaw - cameraYaw;
                    yawDiff = Math.atan2(Math.sin(yawDiff), Math.cos(yawDiff));
                    const pitchDiff = Math.abs(autoWalkTarget.finalPitch - cameraPitch);

                    if (Math.abs(yawDiff) < 0.03 && pitchDiff < 0.03) {
                        focusedPlotId = autoWalkTarget.plotId;
                        isAutoWalking = false;
                        autoWalkTarget = null;
                    }
                }
            } else {
                if (keyState.turnLeft || touchState.turnLeft) targetCameraYaw += turnSpeed;
                if (keyState.turnRight || touchState.turnRight) targetCameraYaw -= turnSpeed;

                let moveX = 0;
                let moveZ = 0;

                if (keyState.forward || touchState.forward) moveZ -= 1;
                if (keyState.backward || touchState.backward) moveZ += 1;
                if (keyState.strafeLeft) moveX -= 1;
                if (keyState.strafeRight) moveX += 1;

                if (moveX !== 0 || moveZ !== 0) {
                    isMoving = true;
                    const len = Math.hypot(moveX, moveZ);
                    moveX /= len;
                    moveZ /= len;

                    const sinY = Math.sin(cameraYaw);
                    const cosY = Math.cos(cameraYaw);

                    const dx = (moveX * cosY + moveZ * sinY) * moveSpeed;
                    const dz = (-moveX * sinY + moveZ * cosY) * moveSpeed;

                    playerPosition.x += dx;
                    playerPosition.z += dz;

                    walkTimer += delta * 11;
                } else {
                    walkTimer = 0;
                }
            }

            let diffYaw = targetCameraYaw - cameraYaw;
            diffYaw = Math.atan2(Math.sin(diffYaw), Math.cos(diffYaw));
            cameraYaw += diffYaw * 0.15;
            cameraPitch += (targetCameraPitch - cameraPitch) * 0.12;

            playerPosition.x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, playerPosition.x));
            playerPosition.z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, playerPosition.z));

            if (localPlayerAvatar) {
                localPlayerAvatar.position.set(playerPosition.x, 0, playerPosition.z);
                localPlayerAvatar.rotation.y = cameraYaw + Math.PI;
                updateAvatarAnimation(localPlayerAvatar, isMoving, delta);
            }

            if (currentMode === MODE_GROUND) {
                if (localPlayerAvatar) localPlayerAvatar.visible = false;
                const KNEELING_HEIGHT = 0.75;
                const targetY = focusedPlotId ? KNEELING_HEIGHT : PLAYER_HEIGHT + (isMoving ? Math.sin(walkTimer) * 0.035 : 0);

                camera.position.set(playerPosition.x, targetY, playerPosition.z);
                camera.rotation.order = 'YXZ';
                camera.rotation.y = cameraYaw;
                camera.rotation.x = cameraPitch;
                camera.rotation.z = 0;
            } else if (currentMode === MODE_AVATAR) {
                if (localPlayerAvatar) localPlayerAvatar.visible = true;
                const followDist = 2.8;
                const camX = playerPosition.x + Math.sin(cameraYaw) * followDist;
                const camZ = playerPosition.z + Math.cos(cameraYaw) * followDist;
                const camY = 1.8 + Math.sin(cameraPitch);

                camera.position.set(camX, camY, camZ);
                camera.lookAt(playerPosition.x, 1.1, playerPosition.z);
            }
        } else if (currentMode === MODE_AERIAL) {
            if (localPlayerAvatar) {
                localPlayerAvatar.position.set(playerPosition.x, 0, playerPosition.z);
                localPlayerAvatar.visible = true;
            }
            if (controls) controls.update();
        }

        // Remote users interpolation & walking animation
        remoteUsers.forEach(u => {
            if (u.avatarMesh) {
                const rdx = u.targetPos.x - u.avatarMesh.position.x;
                const rdz = u.targetPos.z - u.avatarMesh.position.z;
                const rdist = Math.hypot(rdx, rdz);

                if (rdist > 0.08) {
                    u.avatarMesh.position.x += rdx * 0.1;
                    u.avatarMesh.position.z += rdz * 0.1;

                    let diffY = u.targetYaw - u.avatarMesh.rotation.y;
                    diffY = Math.atan2(Math.sin(diffY), Math.cos(diffY));
                    u.avatarMesh.rotation.y += diffY * 0.15;

                    updateAvatarAnimation(u.avatarMesh, true, delta);
                } else {
                    updateAvatarAnimation(u.avatarMesh, false, delta);
                }
            }
        });

        updateRadarCanvas();

        renderer.render(scene, camera);
    }

    animate();
});
