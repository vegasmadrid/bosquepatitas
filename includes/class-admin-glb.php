<?php
if (!defined('ABSPATH')) exit;

class BP_Admin_GLB {

    public function __construct() {
        add_filter('upload_mimes', array($this, 'allow_glb_mime_types'));
        add_filter('wp_check_filetype_and_ext', array($this, 'fix_glb_filetype_check'), 10, 4);
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
        add_action('admin_post_bp_save_glb_avatar', array($this, 'handle_save_avatar'));
        add_action('admin_post_bp_delete_glb_avatar', array($this, 'handle_delete_avatar'));
    }

    public function allow_glb_mime_types($mimes) {
        $mimes['glb']  = 'model/gltf-binary';
        $mimes['gltf'] = 'model/gltf+json';
        return $mimes;
    }

    public function fix_glb_filetype_check($data, $file, $filename, $mimes) {
        $ext = pathinfo($filename, PATHINFO_EXTENSION);
        if (strtolower($ext) === 'glb') {
            $data['ext']  = 'glb';
            $data['type'] = 'model/gltf-binary';
        } elseif (strtolower($ext) === 'gltf') {
            $data['ext']  = 'gltf';
            $data['type'] = 'model/gltf+json';
        }
        return $data;
    }

    public function add_admin_menu() {
        add_submenu_page(
            'edit.php?post_type=mascota_tumba',
            'Avatares 3D GLB',
            'Avatares 3D GLB',
            'manage_options',
            'bp-glb-avatars',
            array($this, 'render_admin_page')
        );
    }

    public function enqueue_admin_assets($hook) {
        if (strpos($hook, 'bp-glb-avatars') !== false) {
            wp_enqueue_media();
            wp_enqueue_script('three-js', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', array(), 'r128', true);
            wp_enqueue_script('three-gltfloader', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js', array('three-js'), 'r128', true);
        }
    }

    public function get_avatars() {
        $avatars = get_option('bp_glb_avatars_list', array());
        return is_array($avatars) ? $avatars : array();
    }

    public function handle_save_avatar() {
        if (!current_user_can('manage_options')) {
            wp_die('Acceso no autorizado.');
        }

        check_admin_referer('bp_save_glb_avatar_nonce');

        $avatar_id = isset($_POST['avatar_id']) ? sanitize_text_field($_POST['avatar_id']) : '';
        if (empty($avatar_id)) {
            $avatar_id = 'glb_' . uniqid();
        }

        $title      = isset($_POST['title']) ? sanitize_text_field($_POST['title']) : 'Avatar 3D';
        $category   = isset($_POST['category']) ? sanitize_text_field($_POST['category']) : 'human';
        $file_url   = isset($_POST['file_url']) ? esc_url_raw($_POST['file_url']) : '';
        $icon_url   = isset($_POST['icon_url']) ? esc_url_raw($_POST['icon_url']) : '';
        $scale      = isset($_POST['scale']) ? floatval($_POST['scale']) : 1.0;
        $offset_y   = isset($_POST['offset_y']) ? floatval($_POST['offset_y']) : 0.0;
        $anim_idle  = isset($_POST['anim_idle']) ? sanitize_text_field($_POST['anim_idle']) : '';
        $anim_walk  = isset($_POST['anim_walk']) ? sanitize_text_field($_POST['anim_walk']) : '';
        $active     = isset($_POST['active']) ? 1 : 0;

        // Customization channels mapping (hybrid mode: auto vs explicit material/mesh names)
        $allow_colors   = isset($_POST['allow_colors']) ? 1 : 0;
        $mat_skin       = isset($_POST['mat_skin']) ? sanitize_text_field($_POST['mat_skin']) : '';
        $mat_shirt      = isset($_POST['mat_shirt']) ? sanitize_text_field($_POST['mat_shirt']) : '';
        $mat_pants      = isset($_POST['mat_pants']) ? sanitize_text_field($_POST['mat_pants']) : '';
        $mat_hair       = isset($_POST['mat_hair']) ? sanitize_text_field($_POST['mat_hair']) : '';
        $detected_mats  = isset($_POST['detected_materials']) ? sanitize_text_field(wp_unslash($_POST['detected_materials'])) : '';

        $avatars = $this->get_avatars();

        $avatars[$avatar_id] = array(
            'id'                 => $avatar_id,
            'title'              => $title,
            'category'           => $category,
            'file_url'           => $file_url,
            'icon_url'           => $icon_url,
            'scale'              => $scale > 0 ? $scale : 1.0,
            'offset_y'           => $offset_y,
            'anim_idle'          => $anim_idle,
            'anim_walk'          => $anim_walk,
            'allow_colors'       => $allow_colors,
            'mat_skin'           => $mat_skin,
            'mat_shirt'          => $mat_shirt,
            'mat_pants'          => $mat_pants,
            'mat_hair'           => $mat_hair,
            'detected_materials' => $detected_mats,
            'active'             => $active
        );

        update_option('bp_glb_avatars_list', $avatars);

        wp_redirect(admin_url('edit.php?post_type=mascota_tumba&page=bp-glb-avatars&message=saved'));
        exit;
    }

    public function handle_delete_avatar() {
        if (!current_user_can('manage_options')) {
            wp_die('Acceso no autorizado.');
        }

        $avatar_id = isset($_GET['avatar_id']) ? sanitize_text_field($_GET['avatar_id']) : '';
        check_admin_referer('bp_delete_glb_avatar_' . $avatar_id);

        $avatars = $this->get_avatars();
        if (isset($avatars[$avatar_id])) {
            unset($avatars[$avatar_id]);
            update_option('bp_glb_avatars_list', $avatars);
        }

        wp_redirect(admin_url('edit.php?post_type=mascota_tumba&page=bp-glb-avatars&message=deleted'));
        exit;
    }

    public function render_admin_page() {
        if (!current_user_can('manage_options')) return;

        $avatars = $this->get_avatars();
        $editing_id = isset($_GET['edit']) ? sanitize_text_field($_GET['edit']) : '';
        $editing_avatar = isset($avatars[$editing_id]) ? $avatars[$editing_id] : null;

        $msg = isset($_GET['message']) ? sanitize_text_field($_GET['message']) : '';
        ?>
        <div class="wrap">
            <h1 class="wp-heading-inline">Gestión de Avatares 3D (Archivos GLB)</h1>
            <p>Sube modelos 3D en formato <code>.glb</code> desde sitios como Poli.pizza, Sketchfab u otros, para que los usuarios puedan seleccionarlos en el configurador de avatar.</p>

            <?php if ($msg === 'saved'): ?>
                <div class="notice notice-success is-dismissible"><p>¡Avatar GLB guardado con éxito!</p></div>
            <?php elseif ($msg === 'deleted'): ?>
                <div class="notice notice-warning is-dismissible"><p>Avatar GLB eliminado.</p></div>
            <?php endif; ?>

            <div style="display: flex; gap: 20px; margin-top: 20px; align-items: flex-start; flex-wrap: wrap;">

                <!-- Form Card -->
                <div style="background: #fff; padding: 20px; border: 1px solid #ccc; border-radius: 8px; flex: 1; min-width: 320px; max-width: 500px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <h2><?php echo $editing_avatar ? 'Editar Avatar GLB' : 'Añadir Nuevo Avatar GLB'; ?></h2>
                    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                        <input type="hidden" name="action" value="bp_save_glb_avatar">
                        <input type="hidden" name="avatar_id" value="<?php echo esc_attr($editing_avatar['id'] ?? ''); ?>">
                        <?php wp_nonce_field('bp_save_glb_avatar_nonce'); ?>

                        <p>
                            <label for="title"><strong>Nombre del Avatar:</strong></label><br>
                            <input type="text" id="title" name="title" value="<?php echo esc_attr($editing_avatar['title'] ?? ''); ?>" required class="widefat" placeholder="Ej: Astronauta, Robot, Perro 3D">
                        </p>

                        <p>
                            <label for="category"><strong>Categoría:</strong></label><br>
                            <select id="category" name="category" class="widefat">
                                <option value="human" <?php selected($editing_avatar['category'] ?? '', 'human'); ?>>Tutor Humano</option>
                                <option value="pet" <?php selected($editing_avatar['category'] ?? '', 'pet'); ?>>Mascota / Animal</option>
                                <option value="special" <?php selected($editing_avatar['category'] ?? '', 'special'); ?>>Especial / Fantasía</option>
                            </select>
                        </p>

                        <p>
                            <label for="file_url"><strong>Archivo GLB (.glb):</strong></label><br>
                            <div style="display:flex; gap:8px;">
                                <input type="text" id="file_url" name="file_url" value="<?php echo esc_attr($editing_avatar['file_url'] ?? ''); ?>" required class="widefat" placeholder="https://...">
                                <button type="button" id="btn_upload_glb" class="button button-secondary">Subir/Elegir GLB</button>
                            </div>
                            <small class="description">Selecciona o sube un archivo .glb con la Biblioteca de Medios de WP.</small>
                        </p>

                        <p>
                            <label for="icon_url"><strong>Icono / Miniatura (Opcional):</strong></label><br>
                            <div style="display:flex; gap:8px;">
                                <input type="text" id="icon_url" name="icon_url" value="<?php echo esc_attr($editing_avatar['icon_url'] ?? ''); ?>" class="widefat" placeholder="https://...">
                                <button type="button" id="btn_upload_icon" class="button button-secondary">Subir Icono</button>
                            </div>
                        </p>

                        <div style="display:flex; gap:15px;">
                            <p style="flex:1;">
                                <label for="scale"><strong>Escala (Factor):</strong></label><br>
                                <input type="number" step="0.05" id="scale" name="scale" value="<?php echo esc_attr($editing_avatar['scale'] ?? '1.0'); ?>" class="widefat">
                                <small class="description">Ajusta si el modelo es gigante o minúsculo (Def: 1.0).</small>
                            </p>
                            <p style="flex:1;">
                                <label for="offset_y"><strong>Desplazamiento Y:</strong></label><br>
                                <input type="number" step="0.05" id="offset_y" name="offset_y" value="<?php echo esc_attr($editing_avatar['offset_y'] ?? '0.0'); ?>" class="widefat">
                                <small class="description">Eleva o baja los pies del suelo (Def: 0.0).</small>
                            </p>
                        </div>

                        <!-- ANIMATION SELECTION (IDLE & WALK) -->
                        <div style="background:#f0fdf4; border:1px solid #86efac; padding:12px; border-radius:6px; margin-bottom:15px;">
                            <h3 style="margin-top:0; font-size:13px; color:#166534;">🎬 Configuración de Animaciones GLB</h3>
                            <div id="glb-anim-status" style="margin-bottom:10px; font-size:12px; color:#15803d; font-weight:600; display:none;"></div>

                            <p style="margin-bottom:10px;">
                                <label for="anim_idle"><strong>Animación para Estar Quieto (Idle):</strong></label><br>
                                <select id="anim_idle" name="anim_idle" class="widefat" data-current="<?php echo esc_attr($editing_avatar['anim_idle'] ?? ''); ?>">
                                    <option value="">-- Cargar archivo GLB para leer animaciones --</option>
                                    <?php if (!empty($editing_avatar['anim_idle'])): ?>
                                        <option value="<?php echo esc_attr($editing_avatar['anim_idle']); ?>" selected><?php echo esc_html($editing_avatar['anim_idle']); ?></option>
                                    <?php endif; ?>
                                </select>
                                <small class="description">Se ejecutará cuando el avatar esté detenido o reposando.</small>
                            </p>

                            <p style="margin-bottom:0;">
                                <label for="anim_walk"><strong>Animación para Andar (Walk / Run):</strong></label><br>
                                <select id="anim_walk" name="anim_walk" class="widefat" data-current="<?php echo esc_attr($editing_avatar['anim_walk'] ?? ''); ?>">
                                    <option value="">-- Cargar archivo GLB para leer animaciones --</option>
                                    <?php if (!empty($editing_avatar['anim_walk'])): ?>
                                        <option value="<?php echo esc_attr($editing_avatar['anim_walk']); ?>" selected><?php echo esc_html($editing_avatar['anim_walk']); ?></option>
                                    <?php endif; ?>
                                </select>
                                <small class="description">Se ejecutará cuando el avatar se desplace por el bosque.</small>
                            </p>
                        </div>

                        <!-- COLOR CUSTOMIZATION CONFIGURATION -->
                        <div style="background:#f0f9ff; border:1px solid #7dd3fc; padding:12px; border-radius:6px; margin-bottom:15px;">
                            <h3 style="margin-top:0; font-size:13px; color:#0369a1;">🎨 Personalización de Colores (Piel, Ropa, Pelaje)</h3>
                            <p style="margin-top:0; font-size:12px; color:#475569;">
                                Permite a los usuarios cambiar los colores de este modelo en el configurador de avatar.
                            </p>

                            <input type="hidden" id="detected_materials" name="detected_materials" value="<?php echo esc_attr($editing_avatar['detected_materials'] ?? ''); ?>">

                            <p>
                                <label>
                                    <input type="checkbox" id="allow_colors" name="allow_colors" value="1" <?php checked($editing_avatar['allow_colors'] ?? 1, 1); ?>>
                                    <strong>Permitir personalización de colores para este avatar</strong>
                                </label>
                            </p>

                            <div id="color_mapping_box" style="margin-top:10px;">
                                <div id="glb-mat-status" style="margin-bottom:10px; font-size:12px; color:#0284c7; font-weight:600; display:none;"></div>

                                <p style="margin-bottom:8px;">
                                    <label for="mat_skin"><strong>Piel / Cuerpo / Pelaje:</strong></label><br>
                                    <select id="mat_skin" name="mat_skin" class="widefat glb-mat-select" data-current="<?php echo esc_attr($editing_avatar['mat_skin'] ?? ''); ?>">
                                        <option value="">-- Detección Automática (skin/body/piel/fur) --</option>
                                        <?php if (!empty($editing_avatar['mat_skin'])): ?>
                                            <option value="<?php echo esc_attr($editing_avatar['mat_skin']); ?>" selected><?php echo esc_html($editing_avatar['mat_skin']); ?></option>
                                        <?php endif; ?>
                                    </select>
                                </p>

                                <p style="margin-bottom:8px;">
                                    <label for="mat_shirt"><strong>Camiseta / Torso / Ropa Superior:</strong></label><br>
                                    <select id="mat_shirt" name="mat_shirt" class="widefat glb-mat-select" data-current="<?php echo esc_attr($editing_avatar['mat_shirt'] ?? ''); ?>">
                                        <option value="">-- Detección Automática (shirt/top/torso/cloth) --</option>
                                        <?php if (!empty($editing_avatar['mat_shirt'])): ?>
                                            <option value="<?php echo esc_attr($editing_avatar['mat_shirt']); ?>" selected><?php echo esc_html($editing_avatar['mat_shirt']); ?></option>
                                        <?php endif; ?>
                                    </select>
                                </p>

                                <p style="margin-bottom:8px;">
                                    <label for="mat_pants"><strong>Pantalón / Piernas / Ropa Inferior:</strong></label><br>
                                    <select id="mat_pants" name="mat_pants" class="widefat glb-mat-select" data-current="<?php echo esc_attr($editing_avatar['mat_pants'] ?? ''); ?>">
                                        <option value="">-- Detección Automática (pants/legs/bottom/trouser) --</option>
                                        <?php if (!empty($editing_avatar['mat_pants'])): ?>
                                            <option value="<?php echo esc_attr($editing_avatar['mat_pants']); ?>" selected><?php echo esc_html($editing_avatar['mat_pants']); ?></option>
                                        <?php endif; ?>
                                    </select>
                                </p>

                                <p style="margin-bottom:0;">
                                    <label for="mat_hair"><strong>Pelo / Cabeza / Sombrero (Opcional):</strong></label><br>
                                    <select id="mat_hair" name="mat_hair" class="widefat glb-mat-select" data-current="<?php echo esc_attr($editing_avatar['mat_hair'] ?? ''); ?>">
                                        <option value="">-- Detección Automática (hair/pelo/cabello/hat) --</option>
                                        <?php if (!empty($editing_avatar['mat_hair'])): ?>
                                            <option value="<?php echo esc_attr($editing_avatar['mat_hair']); ?>" selected><?php echo esc_html($editing_avatar['mat_hair']); ?></option>
                                        <?php endif; ?>
                                    </select>
                                </p>
                            </div>
                        </div>

                        <p>
                            <label>
                                <input type="checkbox" name="active" value="1" <?php checked($editing_avatar['active'] ?? 1, 1); ?>>
                                <strong>Activo para los usuarios en el configurador</strong>
                            </label>
                        </p>

                        <p style="margin-top: 20px;">
                            <button type="submit" class="button button-primary widefat" style="height: 40px; font-weight: bold;">
                                💾 <?php echo $editing_avatar ? 'Guardar Cambios' : 'Añadir Avatar GLB'; ?>
                            </button>
                            <?php if ($editing_avatar): ?>
                                <a href="<?php echo esc_url(admin_url('edit.php?post_type=mascota_tumba&page=bp-glb-avatars')); ?>" class="button button-secondary widefat" style="margin-top: 8px; text-align: center;">Cancelar Edición</a>
                            <?php endif; ?>
                        </p>
                    </form>
                </div>

                <!-- Table Card -->
                <div style="background: #fff; padding: 20px; border: 1px solid #ccc; border-radius: 8px; flex: 2; min-width: 400px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <h2>Avatares Registrados (<?php echo count($avatars); ?>)</h2>
                    <?php if (empty($avatars)): ?>
                        <p style="color:#666;">No hay avatares GLB cargados todavía. Utiliza el formulario de la izquierda para agregar el primero.</p>
                    <?php else: ?>
                        <table class="wp-list-table widefat fixed striped">
                            <thead>
                                <tr>
                                    <th style="width: 50px;">Icono</th>
                                    <th>Nombre</th>
                                    <th>Categoría</th>
                                    <th>Escala / Offset</th>
                                    <th>Colores</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($avatars as $av): ?>
                                    <tr>
                                        <td>
                                            <?php if (!empty($av['icon_url'])): ?>
                                                <img src="<?php echo esc_url($av['icon_url']); ?>" style="width: 36px; height: 36px; object-fit: cover; border-radius: 4px;">
                                            <?php else: ?>
                                                <span style="font-size: 24px;">📦</span>
                                            <?php endif; ?>
                                        </td>
                                        <td>
                                            <strong><?php echo esc_html($av['title']); ?></strong>
                                            <br><small style="color:#666; word-break: break-all;"><?php echo esc_html(basename($av['file_url'])); ?></small>
                                        </td>
                                        <td>
                                            <?php
                                            $cat_labels = array('human' => '🧑 Tutor', 'pet' => '🐾 Mascota', 'special' => '✨ Especial');
                                            echo esc_html($cat_labels[$av['category']] ?? $av['category']);
                                            ?>
                                        </td>
                                        <td>
                                            Scale: <code><?php echo esc_html($av['scale']); ?></code><br>
                                            Offset Y: <code><?php echo esc_html($av['offset_y']); ?></code>
                                        </td>
                                        <td>
                                            <?php if (isset($av['allow_colors']) && empty($av['allow_colors'])): ?>
                                                <span style="color:#64748b;">🚫 Fijo</span>
                                            <?php else: ?>
                                                <span style="color:#0284c7; font-weight:bold;">🎨 Personalizable</span>
                                            <?php endif; ?>
                                        </td>
                                        <td>
                                            <?php echo !empty($av['active']) ? '<span style="color:#15803d; font-weight:bold;">🟢 Activo</span>' : '<span style="color:#b91c1c; font-weight:bold;">🔴 Inactivo</span>'; ?>
                                        </td>
                                        <td>
                                            <a href="<?php echo esc_url(admin_url('edit.php?post_type=mascota_tumba&page=bp-glb-avatars&edit=' . $av['id'])); ?>" class="button button-small">Editar</a>
                                            <a href="<?php echo esc_url(wp_nonce_url(admin_url('admin-post.php?action=bp_delete_glb_avatar&avatar_id=' . $av['id']), 'bp_delete_glb_avatar_' . $av['id'])); ?>" class="button button-small button-link-delete" onclick="return confirm('¿Seguro que deseas eliminar este avatar GLB?');">Eliminar</a>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    <?php endif; ?>
                </div>

            </div>
        </div>

        <script>
        document.addEventListener('DOMContentLoaded', function() {
            var fileInput = document.getElementById('file_url');
            var statusEl = document.getElementById('glb-anim-status');
            var idleSelect = document.getElementById('anim_idle');
            var walkSelect = document.getElementById('anim_walk');
            var matStatusEl = document.getElementById('glb-mat-status');
            var detectedMatsInput = document.getElementById('detected_materials');
            var matSelects = document.querySelectorAll('.glb-mat-select');

            function inspectGlb(url) {
                if (!url) return;
                if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined') {
                    if (statusEl) {
                        statusEl.style.display = 'block';
                        statusEl.textContent = '⏳ Cargando Three.js GLTFLoader...';
                    }
                    setTimeout(function() { inspectGlb(url); }, 500);
                    return;
                }

                if (statusEl) {
                    statusEl.style.display = 'block';
                    statusEl.textContent = '⏳ Leyendo animaciones y materiales del archivo GLB...';
                }
                if (matStatusEl) {
                    matStatusEl.style.display = 'block';
                    matStatusEl.textContent = '⏳ Inspeccionando materiales del modelo 3D...';
                }

                var loader = new THREE.GLTFLoader();
                loader.load(url, function(gltf) {
                    // 1. ANIMACIONES
                    var anims = gltf.animations || [];
                    if (statusEl) {
                        statusEl.textContent = '✅ ' + anims.length + ' animación(es) detectada(s): ' + (anims.map(function(a){ return a.name; }).join(', ') || 'Ninguna');
                    }

                    if (idleSelect && walkSelect) {
                        var currentIdle = idleSelect.getAttribute('data-current') || idleSelect.value;
                        var currentWalk = walkSelect.getAttribute('data-current') || walkSelect.value;

                        idleSelect.innerHTML = '<option value="">-- Ninguna / Estático --</option>';
                        walkSelect.innerHTML = '<option value="">-- Ninguna / Estático --</option>';

                        anims.forEach(function(anim) {
                            var optIdle = document.createElement('option');
                            optIdle.value = anim.name;
                            optIdle.textContent = anim.name;
                            if (anim.name === currentIdle || (!currentIdle && anim.name.toLowerCase().includes('idle'))) {
                                optIdle.selected = true;
                            }
                            idleSelect.appendChild(optIdle);

                            var optWalk = document.createElement('option');
                            optWalk.value = anim.name;
                            optWalk.textContent = anim.name;
                            if (anim.name === currentWalk || (!currentWalk && anim.name.toLowerCase().includes('walk'))) {
                                optWalk.selected = true;
                            }
                            walkSelect.appendChild(optWalk);
                        });
                    }

                    // 2. MATERIALES & SUB-MALLAS
                    var materialsSet = new Set();
                    gltf.scene.traverse(function(node) {
                        if (node.isMesh || node.isSkinnedMesh) {
                            if (node.material) {
                                if (Array.isArray(node.material)) {
                                    node.material.forEach(function(m) {
                                        if (m && m.name) materialsSet.add(m.name);
                                    });
                                } else if (node.material.name) {
                                    materialsSet.add(node.material.name);
                                }
                            }
                            if (node.name) {
                                materialsSet.add('mesh:' + node.name);
                            }
                        }
                    });

                    var materialsList = Array.from(materialsSet);
                    if (detectedMatsInput) {
                        detectedMatsInput.value = JSON.stringify(materialsList);
                    }

                    if (matStatusEl) {
                        if (materialsList.length > 0) {
                            matStatusEl.textContent = '✅ ' + materialsList.length + ' material(es)/malla(s) encontrada(s): ' + materialsList.slice(0, 5).join(', ') + (materialsList.length > 5 ? '...' : '');
                        } else {
                            matStatusEl.textContent = 'ℹ️ Sin nombres de material individuales detectados (se usará heurística estándar).';
                        }
                    }

                    matSelects.forEach(function(sel) {
                        var currentVal = sel.getAttribute('data-current') || sel.value;
                        var placeholder = sel.querySelector('option[value=""]');
                        var defaultText = placeholder ? placeholder.textContent : '-- Detección Automática --';
                        sel.innerHTML = '<option value="">' + defaultText + '</option>';

                        materialsList.forEach(function(matName) {
                            var opt = document.createElement('option');
                            opt.value = matName;
                            opt.textContent = matName;
                            if (matName === currentVal) {
                                opt.selected = true;
                            }
                            sel.appendChild(opt);
                        });
                    });

                }, undefined, function(err) {
                    if (statusEl) {
                        statusEl.style.display = 'block';
                        statusEl.textContent = '⚠️ No se pudieron leer las animaciones automáticamente.';
                    }
                    if (matStatusEl) {
                        matStatusEl.style.display = 'block';
                        matStatusEl.textContent = '⚠️ No se pudieron leer los materiales del archivo GLB.';
                    }
                });
            }

            function setupMediaUploader(btnId, inputId) {
                var btn = document.getElementById(btnId);
                var input = document.getElementById(inputId);
                if (!btn || !input) return;

                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    var frame = wp.media({
                        title: 'Seleccionar o Subir Archivo',
                        button: { text: 'Usar este archivo' },
                        multiple: false
                    });

                    frame.on('select', function() {
                        var attachment = frame.state().get('selection').first().toJSON();
                        input.value = attachment.url;
                        if (inputId === 'file_url') {
                            inspectGlb(attachment.url);
                        }
                    });

                    frame.open();
                });
            }

            setupMediaUploader('btn_upload_glb', 'file_url');
            setupMediaUploader('btn_upload_icon', 'icon_url');

            if (fileInput) {
                fileInput.addEventListener('change', function() {
                    inspectGlb(fileInput.value.trim());
                });
                if (fileInput.value.trim()) {
                    inspectGlb(fileInput.value.trim());
                }
            }
        });
        </script>
        <?php
    }
}

new BP_Admin_GLB();
