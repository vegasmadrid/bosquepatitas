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
        add_action('admin_post_bp_save_global_animations', array($this, 'handle_save_global_animations'));
    }

    public function allow_glb_mime_types($mimes) {
        $mimes['glb']  = 'model/gltf-binary';
        $mimes['gltf'] = 'model/gltf+json';
        $mimes['fbx']  = 'application/octet-stream';
        return $mimes;
    }

    public function fix_glb_filetype_check($data, $file, $filename, $mimes) {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        if ($ext === 'glb') {
            $data['ext']  = 'glb';
            $data['type'] = 'model/gltf-binary';
        } elseif ($ext === 'gltf') {
            $data['ext']  = 'gltf';
            $data['type'] = 'model/gltf+json';
        } elseif ($ext === 'fbx') {
            $data['ext']  = 'fbx';
            $data['type'] = 'application/octet-stream';
        }
        return $data;
    }

    public function add_admin_menu() {
        add_submenu_page(
            'edit.php?post_type=mascota_tumba',
            'Avatares 3D (GLB / FBX)',
            'Avatares 3D (GLB/FBX)',
            'manage_options',
            'bp-glb-avatars',
            array($this, 'render_admin_page')
        );
    }

    public function enqueue_admin_assets($hook) {
        if (strpos($hook, 'bp-glb-avatars') !== false) {
            wp_enqueue_media();
            wp_enqueue_script('three-js', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', array(), 'r128', true);
            wp_enqueue_script('fflate', 'https://cdn.jsdelivr.net/npm/fflate@0.7.4/umd/index.js', array(), '0.7.4', true);
            wp_enqueue_script('three-gltfloader', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js', array('three-js'), 'r128', true);
            wp_enqueue_script('three-fbxloader', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/FBXLoader.js', array('three-js', 'fflate'), 'r128', true);
        }
    }

    public function get_avatars() {
        $avatars = get_option('bp_glb_avatars_list', array());
        return is_array($avatars) ? $avatars : array();
    }

    public static function get_global_animations() {
        $defaults = array(
            'anim_idle'        => '',
            'walk_styles'      => array(
                array('id' => 'walk_1', 'name' => 'Paso Normal', 'url' => ''),
                array('id' => 'walk_2', 'name' => 'Paso Alegre', 'url' => ''),
                array('id' => 'walk_3', 'name' => 'Paseo Relajado', 'url' => '')
            ),
            'anim_kneel_down'  => '',
            'anim_kneel_idle'  => '',
            'anim_dance'       => ''
        );
        $saved = get_option('bp_global_animations', array());
        if (!is_array($saved)) {
            $saved = array();
        }

        $merged = array_merge($defaults, $saved);
        if (!isset($merged['walk_styles']) || !is_array($merged['walk_styles']) || count($merged['walk_styles']) < 3) {
            $merged['walk_styles'] = $defaults['walk_styles'];
        }
        return $merged;
    }

    public function handle_save_global_animations() {
        if (!current_user_can('manage_options')) {
            wp_die('Acceso no autorizado.');
        }

        check_admin_referer('bp_save_global_animations_nonce');

        $anim_idle       = isset($_POST['global_anim_idle']) ? esc_url_raw($_POST['global_anim_idle']) : '';
        $anim_kneel_down = isset($_POST['global_anim_kneel_down']) ? esc_url_raw($_POST['global_anim_kneel_down']) : '';
        $anim_kneel_idle = isset($_POST['global_anim_kneel_idle']) ? esc_url_raw($_POST['global_anim_kneel_idle']) : '';
        $anim_dance      = isset($_POST['global_anim_dance']) ? esc_url_raw($_POST['global_anim_dance']) : '';

        $walk_styles = array();
        for ($i = 1; $i <= 3; $i++) {
            $w_name = isset($_POST["global_walk_{$i}_name"]) ? sanitize_text_field($_POST["global_walk_{$i}_name"]) : "Estilo {$i}";
            $w_url  = isset($_POST["global_walk_{$i}_url"]) ? esc_url_raw($_POST["global_walk_{$i}_url"]) : '';
            $walk_styles[] = array(
                'id'   => "walk_{$i}",
                'name' => $w_name ?: "Estilo {$i}",
                'url'  => $w_url
            );
        }

        $data = array(
            'anim_idle'       => $anim_idle,
            'walk_styles'     => $walk_styles,
            'anim_kneel_down' => $anim_kneel_down,
            'anim_kneel_idle' => $anim_kneel_idle,
            'anim_dance'      => $anim_dance
        );

        update_option('bp_global_animations', $data);

        wp_redirect(admin_url('edit.php?post_type=mascota_tumba&page=bp-glb-avatars&message=global_saved'));
        exit;
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

        $title           = isset($_POST['title']) ? sanitize_text_field($_POST['title']) : 'Avatar 3D';
        $category        = isset($_POST['category']) ? sanitize_text_field($_POST['category']) : 'human';
        $file_url        = isset($_POST['file_url']) ? esc_url_raw($_POST['file_url']) : '';
        $icon_url        = isset($_POST['icon_url']) ? esc_url_raw($_POST['icon_url']) : '';
        $scale           = isset($_POST['scale']) ? floatval($_POST['scale']) : 1.0;
        $offset_y        = isset($_POST['offset_y']) ? floatval($_POST['offset_y']) : 0.0;
        $active          = isset($_POST['active']) ? 1 : 0;

        // Color Customization & Hybrid Material Mapping
        $allow_colors = isset($_POST['allow_colors']) ? 1 : 0;

        // Capas / Materiales Personalizables seleccionadas por el administrador
        $custom_layers = '[]';
        if (isset($_POST['custom_layers'])) {
            $raw_layers = wp_unslash($_POST['custom_layers']);
            $decoded_layers = json_decode($raw_layers, true);
            if (is_array($decoded_layers)) {
                $sanitized_layers = array();
                foreach ($decoded_layers as $l) {
                    if (is_array($l) && !empty($l['name'])) {
                        $sanitized_layers[] = array(
                            'id'          => sanitize_key($l['id'] ?? uniqid('layer_')),
                            'name'        => sanitize_text_field($l['name']),
                            'label'       => sanitize_text_field($l['label'] ?? $l['name']),
                            'type'        => sanitize_text_field($l['type'] ?? 'material'),
                            'enabled'     => !empty($l['enabled']) ? 1 : 0,
                            'hasDefColor' => !empty($l['hasDefColor']) ? 1 : 0,
                            'defColor'    => sanitize_hex_color($l['defColor'] ?? '#10b981') ?: '#10b981',
                            'forceSolid'  => !empty($l['forceSolid']) ? 1 : 0
                        );
                    }
                }
                $custom_layers = wp_json_encode($sanitized_layers);
            }
        }

        $detected_materials = '[]';
        if (isset($_POST['detected_materials'])) {
            $raw_json = wp_unslash($_POST['detected_materials']);
            $decoded  = json_decode($raw_json, true);
            if (is_array($decoded)) {
                $sanitized = array();
                foreach ($decoded as $item) {
                    if (is_array($item)) {
                        $sanitized[] = array(
                            'name' => isset($item['name']) ? sanitize_text_field($item['name']) : '',
                            'type' => isset($item['type']) ? sanitize_text_field($item['type']) : 'material'
                        );
                    } elseif (is_string($item)) {
                        $sanitized[] = array(
                            'name' => sanitize_text_field($item),
                            'type' => 'material'
                        );
                    }
                }
                $detected_materials = wp_json_encode($sanitized);
            }
        }

        $avatars = $this->get_avatars();

        $avatars[$avatar_id] = array(
            'id'                 => $avatar_id,
            'title'              => $title,
            'category'           => $category,
            'file_url'           => $file_url,
            'icon_url'           => $icon_url,
            'scale'              => $scale > 0 ? $scale : 1.0,
            'offset_y'           => $offset_y,
            'custom_layers'      => $custom_layers,
            'active'             => $active,
            'allow_colors'       => $allow_colors,
            'detected_materials' => $detected_materials
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

        $allow_colors_val = isset($editing_avatar['allow_colors']) ? (int)$editing_avatar['allow_colors'] : 1;
        $saved_detected = isset($editing_avatar['detected_materials']) ? $editing_avatar['detected_materials'] : '[]';
        $saved_layers = isset($editing_avatar['custom_layers']) ? $editing_avatar['custom_layers'] : '[]';
        $global_anims = self::get_global_animations();

        $msg = isset($_GET['message']) ? sanitize_text_field($_GET['message']) : '';
        ?>
        <div class="wrap">
            <h1 class="wp-heading-inline">Gestión de Avatares 3D (Modelos GLB / FBX y Biblioteca de Animaciones)</h1>
            <p>Configura las animaciones globales una sola vez para que sirvan a todas las skins o sube archivos independientes para skins específicas.</p>

            <?php if ($msg === 'saved'): ?>
                <div class="notice notice-success is-dismissible"><p>¡Avatar 3D guardado con éxito!</p></div>
            <?php elseif ($msg === 'deleted'): ?>
                <div class="notice notice-warning is-dismissible"><p>Avatar 3D eliminado.</p></div>
            <?php elseif ($msg === 'global_saved'): ?>
                <div class="notice notice-success is-dismissible"><p>¡Biblioteca de animaciones globales actualizada con éxito!</p></div>
            <?php endif; ?>

            <!-- BIBLIOTECA GLOBAL DE ANIMACIONES COMPARTIDAS -->
            <div style="background: #f8fafc; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin-top: 20px; margin-bottom: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:12px;">
                    <div>
                        <h2 style="margin:0; font-size:18px; color:#065f46; display:flex; align-items:center; gap:8px;">
                            <span>🎬</span> Biblioteca de Animaciones Globales (Compartidas para todas las skins)
                        </h2>
                        <p style="margin:4px 0 0 0; color:#475569; font-size:13px;">
                            Sube aquí los archivos <code>.fbx</code> de Mixamo una sola vez. Se aplicarán automáticamente a todos los avatares y el usuario podrá elegir entre los 3 estilos de caminata en su personalizador.
                        </p>
                    </div>
                </div>

                <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                    <input type="hidden" name="action" value="bp_save_global_animations">
                    <?php wp_nonce_field('bp_save_global_animations_nonce'); ?>

                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:16px; margin-top:14px;">

                        <!-- Quieto / Idle -->
                        <div style="background:#fff; border:1px solid #cbd5e1; border-radius:6px; padding:12px;">
                            <label for="global_anim_idle"><strong>🧍 1. Estar Quieto (Idle Base):</strong></label>
                            <div style="display:flex; gap:6px; margin-top:6px;">
                                <input type="text" id="global_anim_idle" name="global_anim_idle" value="<?php echo esc_attr($global_anims['anim_idle'] ?? ''); ?>" class="widefat" placeholder="https://... idle.fbx">
                                <button type="button" class="button button-secondary bp-btn-upload-anim" data-target="global_anim_idle">Subir</button>
                            </div>
                            <small class="description">Animación por defecto en reposo para todos los personajes.</small>
                        </div>

                        <!-- Baile / Dance -->
                        <div style="background:#fff; border:1px solid #cbd5e1; border-radius:6px; padding:12px; border-left:4px solid #f59e0b;">
                            <label for="global_anim_dance"><strong>🕺 2. Baile (Reacción / Gestos):</strong></label>
                            <div style="display:flex; gap:6px; margin-top:6px;">
                                <input type="text" id="global_anim_dance" name="global_anim_dance" value="<?php echo esc_attr($global_anims['anim_dance'] ?? ''); ?>" class="widefat" placeholder="https://... dance.fbx">
                                <button type="button" class="button button-secondary bp-btn-upload-anim" data-target="global_anim_dance">Subir</button>
                            </div>
                            <small class="description">Animación ejecutada al pulsar el botón de baile en los gestos. Baila en bucle hasta que el usuario se mueve.</small>
                        </div>

                        <!-- Tumbas: Arrodillarse -->
                        <div style="background:#fff; border:1px solid #cbd5e1; border-radius:6px; padding:12px;">
                            <label for="global_anim_kneel_down"><strong>🧎 3. Arrodillarse (Kneel Down al mirar tumba):</strong></label>
                            <div style="display:flex; gap:6px; margin-top:6px;">
                                <input type="text" id="global_anim_kneel_down" name="global_anim_kneel_down" value="<?php echo esc_attr($global_anims['anim_kneel_down'] ?? ''); ?>" class="widefat" placeholder="https://... kneel_down.fbx">
                                <button type="button" class="button button-secondary bp-btn-upload-anim" data-target="global_anim_kneel_down">Subir</button>
                            </div>
                            <small class="description">Transición al agacharse frente a la lápida de una mascota.</small>
                        </div>

                        <!-- Tumbas: Estar de Rodillas -->
                        <div style="background:#fff; border:1px solid #cbd5e1; border-radius:6px; padding:12px;">
                            <label for="global_anim_kneel_idle"><strong>🧎‍♂️ 4. Estar de Rodillas (Kneel Idle velando tumba):</strong></label>
                            <div style="display:flex; gap:6px; margin-top:6px;">
                                <input type="text" id="global_anim_kneel_idle" name="global_anim_kneel_idle" value="<?php echo esc_attr($global_anims['anim_kneel_idle'] ?? ''); ?>" class="widefat" placeholder="https://... kneel_idle.fbx">
                                <button type="button" class="button button-secondary bp-btn-upload-anim" data-target="global_anim_kneel_idle">Subir</button>
                            </div>
                            <small class="description">Bucle mientras el avatar vela frente a la tumba.</small>
                        </div>

                    </div>

                    <!-- 3 ESTILOS DE CAMINATA -->
                    <div style="background:#fff; border:1px solid #cbd5e1; border-radius:6px; padding:14px; margin-top:16px;">
                        <h3 style="margin:0 0 10px 0; font-size:14px; color:#1e293b;">
                            🚶‍♂️ Los 3 Estilos de Caminata (Disponibles para elegir en el personalizador del avatar)
                        </h3>
                        <p style="margin:0 0 12px 0; font-size:12px; color:#64748b;">
                            Define el nombre y sube el archivo FBX de cada uno de los 3 estilos para que el usuario pueda alternar entre ellos en vivo.
                        </p>

                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:12px;">
                            <?php for ($w = 1; $w <= 3; $w++):
                                $style_data = $global_anims['walk_styles'][$w - 1] ?? array('name' => "Estilo {$w}", 'url' => '');
                            ?>
                                <div style="background:#f1f5f9; padding:10px; border-radius:6px; border:1px solid #e2e8f0;">
                                    <label><strong>Estilo <?php echo $w; ?> - Nombre Visible:</strong></label>
                                    <input type="text" name="global_walk_<?php echo $w; ?>_name" value="<?php echo esc_attr($style_data['name'] ?? "Estilo {$w}"); ?>" class="widefat" style="margin-top:4px; margin-bottom:8px;" placeholder="Ej: Paso Alegre, Paseo Relajado...">

                                    <label><strong>Archivo Animación FBX:</strong></label>
                                    <div style="display:flex; gap:6px; margin-top:4px;">
                                        <input type="text" id="global_walk_<?php echo $w; ?>_url" name="global_walk_<?php echo $w; ?>_url" value="<?php echo esc_attr($style_data['url'] ?? ''); ?>" class="widefat" placeholder="https://... walk_<?php echo $w; ?>.fbx">
                                        <button type="button" class="button button-secondary bp-btn-upload-anim" data-target="global_walk_<?php echo $w; ?>_url">Subir</button>
                                    </div>
                                </div>
                            <?php endfor; ?>
                        </div>
                    </div>

                    <div style="margin-top:16px; text-align:right;">
                        <button type="submit" class="button button-primary" style="background:#10b981; border-color:#059669; font-weight:bold; padding:4px 20px;">
                            💾 Guardar Biblioteca de Animaciones Globales
                        </button>
                    </div>
                </form>
            </div>

            <div style="display: flex; gap: 20px; margin-top: 20px; align-items: flex-start; flex-wrap: wrap;">

                <!-- Form Card -->
                <div style="background: #fff; padding: 20px; border: 1px solid #ccc; border-radius: 8px; flex: 1; min-width: 340px; max-width: 540px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <h2><?php echo $editing_avatar ? 'Editar Avatar 3D' : 'Añadir Nuevo Avatar 3D'; ?></h2>
                    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                        <input type="hidden" name="action" value="bp_save_glb_avatar">
                        <input type="hidden" name="avatar_id" value="<?php echo esc_attr($editing_avatar['id'] ?? ''); ?>">
                        <?php wp_nonce_field('bp_save_glb_avatar_nonce'); ?>

                        <p>
                            <label for="title"><strong>Nombre del Avatar:</strong></label><br>
                            <input type="text" id="title" name="title" value="<?php echo esc_attr($editing_avatar['title'] ?? ''); ?>" required class="widefat" placeholder="Ej: Tutor Mixamo, Astronauta, Perro 3D">
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
                            <label for="file_url"><strong>Archivo del Personaje Principal (.glb o .fbx):</strong></label><br>
                            <div style="display:flex; gap:8px;">
                                <input type="text" id="file_url" name="file_url" value="<?php echo esc_attr($editing_avatar['file_url'] ?? ''); ?>" required class="widefat" placeholder="https://... modelo.glb o personaje.fbx">
                                <button type="button" id="btn_upload_glb" class="button button-secondary">Subir/Elegir 3D</button>
                            </div>
                            <small class="description">Selecciona o sube el modelo base en formato <code>.glb</code> o <code>.fbx</code> (con skin de Mixamo).</small>
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
                                <small class="description">Ajuste de escala (Def: 1.0).</small>
                            </p>
                            <p style="flex:1;">
                                <label for="offset_y"><strong>Desplazamiento Y:</strong></label><br>
                                <input type="number" step="0.05" id="offset_y" name="offset_y" value="<?php echo esc_attr($editing_avatar['offset_y'] ?? '0.0'); ?>" class="widefat">
                                <small class="description">Eleva o baja los pies del suelo (Def: 0.0).</small>
                            </p>
                        </div>

                        <!-- CAPAS / MATERIALES PERSONALIZABLES DETECTADOS AUTOMÁTICAMENTE -->
                        <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:12px; border-radius:6px; margin-bottom:15px;">
                            <h3 style="margin-top:0; font-size:13px; color:#1e40af;">🎨 Configuración de Capas de Color Personalizables</h3>
                            <p style="font-size:12px; color:#475569; margin-top:2px; margin-bottom:10px;">
                                Las capas del archivo 3D se detectan automáticamente. Marca las que deseas que el usuario pueda personalizar y asígnales el nombre que prefieras mostrarle (ej: Piel, Camisa, Gorra, Zapatillas...).
                            </p>

                            <p style="margin-bottom:10px;">
                                <label>
                                    <input type="checkbox" id="allow_colors" name="allow_colors" value="1" <?php checked($allow_colors_val, 1); ?>>
                                    <strong>Habilitar personalización de colores para este avatar</strong>
                                </label>
                            </p>

                            <div id="glb-colors-wrapper" style="<?php echo $allow_colors_val ? '' : 'display:none;'; ?>">
                                <div id="glb-mat-status" style="margin-bottom:10px; font-size:12px; color:#2563eb; font-weight:600; display:none;"></div>
                                <input type="hidden" id="detected_materials" name="detected_materials" value="<?php echo esc_attr($saved_detected); ?>">
                                <input type="hidden" id="custom_layers" name="custom_layers" value="<?php echo esc_attr($saved_layers); ?>">

                                <div id="custom-layers-container" style="display:flex; flex-direction:column; gap:8px;">
                                    <div style="color:#64748b; font-size:12px; font-style:italic;">
                                        Sube o selecciona un archivo 3D arriba para inspeccionar y detectar sus capas automáticamente.
                                    </div>
                                </div>
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
                                💾 <?php echo $editing_avatar ? 'Guardar Cambios' : 'Añadir Avatar 3D'; ?>
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
                        <p style="color:#666;">No hay avatares 3D cargados todavía. Utiliza el formulario de la izquierda para agregar el primero.</p>
                    <?php else: ?>
                        <table class="wp-list-table widefat fixed striped">
                            <thead>
                                <tr>
                                    <th style="width: 50px;">Icono</th>
                                    <th>Nombre</th>
                                    <th>Categoría</th>
                                    <th>Escala / Offset</th>
                                    <th>Capas Personalizables</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($avatars as $av): ?>
                                    <?php
                                    $layers_count = 0;
                                    if (!empty($av['custom_layers'])) {
                                        $decoded_l = is_string($av['custom_layers']) ? json_decode($av['custom_layers'], true) : $av['custom_layers'];
                                        if (is_array($decoded_l)) {
                                            foreach ($decoded_l as $dl) {
                                                if (!empty($dl['enabled'])) $layers_count++;
                                            }
                                        }
                                    }
                                    ?>
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
                                            <?php if (!isset($av['allow_colors']) || !empty($av['allow_colors'])): ?>
                                                <span style="color:#2563eb; font-weight:600; font-size:12px;">🎨 <?php echo $layers_count > 0 ? "{$layers_count} capas activas" : 'Personalizable'; ?></span>
                                            <?php else: ?>
                                                <span style="color:#64748b; font-size:12px;">🔒 Fijo / Monolítico</span>
                                            <?php endif; ?>
                                        </td>
                                        <td>
                                            <?php echo !empty($av['active']) ? '<span style="color:#15803d; font-weight:bold;">🟢 Activo</span>' : '<span style="color:#b91c1c; font-weight:bold;">🔴 Inactivo</span>'; ?>
                                        </td>
                                        <td>
                                            <a href="<?php echo esc_url(admin_url('edit.php?post_type=mascota_tumba&page=bp-glb-avatars&edit=' . $av['id'])); ?>" class="button button-small">Editar</a>
                                            <a href="<?php echo esc_url(wp_nonce_url(admin_url('admin-post.php?action=bp_delete_glb_avatar&avatar_id=' . $av['id']), 'bp_delete_glb_avatar_' . $av['id'])); ?>" class="button button-small button-link-delete" onclick="return confirm('¿Seguro que deseas eliminar este avatar 3D?');">Eliminar</a>
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
            var matStatusEl = document.getElementById('glb-mat-status');
            var allowColorsChk = document.getElementById('allow_colors');
            var colorsWrapper = document.getElementById('glb-colors-wrapper');
            var detectedMaterialsInput = document.getElementById('detected_materials');
            var customLayersInput = document.getElementById('custom_layers');
            var customLayersContainer = document.getElementById('custom-layers-container');

            var currentLayers = [];

            if (allowColorsChk && colorsWrapper) {
                allowColorsChk.addEventListener('change', function() {
                    colorsWrapper.style.display = allowColorsChk.checked ? 'block' : 'none';
                });
            }

            // Parse existing saved custom layers
            if (customLayersInput && customLayersInput.value) {
                try {
                    var parsedLayers = JSON.parse(customLayersInput.value);
                    if (Array.isArray(parsedLayers)) {
                        currentLayers = parsedLayers;
                    }
                } catch(e) {}
            }

            function defaultLabelForName(name) {
                var s = (name || '').toLowerCase();
                if (s.includes('skin') || s.includes('piel') || s.includes('body') || s.includes('cuerpo') || s.includes('face') || s.includes('cara')) return 'Piel / Cara';
                if (s.includes('hair') || s.includes('pelo') || s.includes('cabello')) return 'Pelo / Cabello';
                if (s.includes('shirt') || s.includes('camisa') || s.includes('torso') || s.includes('top') || s.includes('chest') || s.includes('jacket')) return 'Camisa / Torso';
                if (s.includes('pant') || s.includes('trouser') || s.includes('pierna') || s.includes('leg') || s.includes('bottom') || s.includes('jean')) return 'Pantalón';
                if (s.includes('shoe') || s.includes('zapato') || s.includes('boot') || s.includes('bota') || s.includes('foot') || s.includes('pie')) return 'Calzado / Zapatillas';
                if (s.includes('cap') || s.includes('hat') || s.includes('gorra') || s.includes('sombrero') || s.includes('helmet')) return 'Gorra / Sombrero';
                if (s.includes('eye') || s.includes('ojo')) return 'Ojos';
                if (s.includes('collar') || s.includes('belt') || s.includes('cinturon')) return 'Collar / Cinturón';
                // Limpiar guiones y capitalizar
                var clean = name.replace(/[_\-]+/g, ' ').trim();
                return clean.charAt(0).toUpperCase() + clean.slice(1);
            }

            function renderCustomLayersList(detectedItems) {
                if (!customLayersContainer) return;
                customLayersContainer.innerHTML = '';

                if (!detectedItems || detectedItems.length === 0) {
                    customLayersContainer.innerHTML = '<div style="color:#64748b; font-size:12px; font-style:italic;">No se han detectado capas o materiales en el archivo 3D.</div>';
                    return;
                }

                // Header
                var headerDiv = document.createElement('div');
                headerDiv.style.cssText = 'display:grid; grid-template-columns: 36px 1fr 1fr 140px 90px; gap:10px; font-weight:700; font-size:11px; color:#1e293b; border-bottom:1px solid #cbd5e1; padding-bottom:6px; margin-bottom:6px; align-items:center;';
                headerDiv.innerHTML = '<span title="Activar personalización de esta capa">Activa</span><span>Capa Detectada</span><span>Nombre Visible</span><span title="Color por defecto que verá el usuario">Color por Defecto</span><span title="Forzar color sólido si tiene texturas oscuras o fijas">Color Sólido</span>';
                customLayersContainer.appendChild(headerDiv);

                detectedItems.forEach(function(item, idx) {
                    var existing = currentLayers.find(function(l) { return l.name === item.name; });
                    var isEnabled = existing ? Boolean(existing.enabled) : true;
                    var labelVal = existing && existing.label ? existing.label : defaultLabelForName(item.name);
                    var hasDefCol = existing && typeof existing.hasDefColor !== 'undefined' ? Boolean(existing.hasDefColor) : false;
                    var defColVal = existing && existing.defColor ? existing.defColor : '#10b981';
                    var forceSolidVal = existing && typeof existing.forceSolid !== 'undefined' ? Boolean(existing.forceSolid) : false;

                    var row = document.createElement('div');
                    row.style.cssText = 'display:grid; grid-template-columns: 36px 1fr 1fr 140px 90px; gap:10px; align-items:center; background:#ffffff; border:1px solid #e2e8f0; padding:6px 10px; border-radius:4px; margin-bottom:4px;';

                    var chk = document.createElement('input');
                    chk.type = 'checkbox';
                    chk.checked = isEnabled;
                    chk.className = 'bp-layer-chk-enabled';
                    chk.style.cssText = 'width:18px; height:18px; cursor:pointer; accent-color:#10b981; margin:0 auto;';

                    var info = document.createElement('div');
                    info.innerHTML = '<strong style="font-size:12px; color:#1e293b;">' + (item.type === 'mesh' ? '🔷 ' : '🎨 ') + item.name + '</strong><br><small style="color:#64748b; font-size:10px;">' + (item.type === 'mesh' ? 'Sub-malla' : 'Material') + '</small>';

                    var labelInput = document.createElement('input');
                    labelInput.type = 'text';
                    labelInput.value = labelVal;
                    labelInput.className = 'widefat bp-layer-input-label';
                    labelInput.style.cssText = 'font-size:12px; padding:4px 8px;';
                    labelInput.placeholder = 'Nombre visible para el usuario';

                    // Columna: Color por defecto
                    var colorCol = document.createElement('div');
                    colorCol.style.cssText = 'display:flex; align-items:center; gap:6px;';

                    var hasColorChk = document.createElement('input');
                    hasColorChk.type = 'checkbox';
                    hasColorChk.checked = hasDefCol;
                    hasColorChk.className = 'bp-layer-chk-hasdefcolor';
                    hasColorChk.title = 'Marcar para asignar un color por defecto';
                    hasColorChk.style.cssText = 'width:16px; height:16px; cursor:pointer; accent-color:#0284c7;';

                    var colorPicker = document.createElement('input');
                    colorPicker.type = 'color';
                    colorPicker.value = defColVal;
                    colorPicker.className = 'bp-layer-color-def';
                    colorPicker.style.cssText = 'width:28px; height:26px; padding:0; border:1px solid #cbd5e1; border-radius:4px; cursor:pointer; opacity:' + (hasDefCol ? '1' : '0.4') + ';';
                    colorPicker.disabled = !hasDefCol;

                    hasColorChk.addEventListener('change', function() {
                        colorPicker.disabled = !hasColorChk.checked;
                        colorPicker.style.opacity = hasColorChk.checked ? '1' : '0.4';
                        updateLayersState();
                    });

                    colorCol.appendChild(hasColorChk);
                    colorCol.appendChild(colorPicker);

                    // Columna: Forzar color sólido (desacoplar texturas oscuras/fijas)
                    var solidCol = document.createElement('div');
                    solidCol.style.cssText = 'display:flex; align-items:center; justify-content:center;';

                    var forceSolidChk = document.createElement('input');
                    forceSolidChk.type = 'checkbox';
                    forceSolidChk.checked = forceSolidVal;
                    forceSolidChk.className = 'bp-layer-chk-forcesolid';
                    forceSolidChk.title = 'Forzar color sólido (remueve texturas fijas para color 100% puro)';
                    forceSolidChk.style.cssText = 'width:16px; height:16px; cursor:pointer; accent-color:#f59e0b;';

                    solidCol.appendChild(forceSolidChk);

                    function updateLayersState() {
                        var updatedList = [];
                        var rows = customLayersContainer.querySelectorAll('.bp-layer-row');
                        rows.forEach(function(r) {
                            var rChk = r.querySelector('.bp-layer-chk-enabled');
                            var rName = r.getAttribute('data-name');
                            var rType = r.getAttribute('data-type');
                            var rLabelInput = r.querySelector('.bp-layer-input-label');
                            var rHasColorChk = r.querySelector('.bp-layer-chk-hasdefcolor');
                            var rColorPicker = r.querySelector('.bp-layer-color-def');
                            var rSolidChk = r.querySelector('.bp-layer-chk-forcesolid');

                            updatedList.push({
                                name: rName,
                                type: rType,
                                label: rLabelInput ? (rLabelInput.value.trim() || rName) : rName,
                                enabled: (rChk && rChk.checked) ? 1 : 0,
                                hasDefColor: (rHasColorChk && rHasColorChk.checked) ? 1 : 0,
                                defColor: rColorPicker ? rColorPicker.value : '#10b981',
                                forceSolid: (rSolidChk && rSolidChk.checked) ? 1 : 0
                            });
                        });
                        currentLayers = updatedList;
                        if (customLayersInput) {
                            customLayersInput.value = JSON.stringify(currentLayers);
                        }
                    }

                    chk.addEventListener('change', updateLayersState);
                    labelInput.addEventListener('input', updateLayersState);
                    colorPicker.addEventListener('input', updateLayersState);
                    forceSolidChk.addEventListener('change', updateLayersState);

                    row.className = 'bp-layer-row';
                    row.setAttribute('data-name', item.name);
                    row.setAttribute('data-type', item.type);

                    row.appendChild(chk);
                    row.appendChild(info);
                    row.appendChild(labelInput);
                    row.appendChild(colorCol);
                    row.appendChild(solidCol);
                    customLayersContainer.appendChild(row);
                });

                // Sync initial value
                var initialList = [];
                var rows = customLayersContainer.querySelectorAll('.bp-layer-row');
                rows.forEach(function(r) {
                    var rChk = r.querySelector('.bp-layer-chk-enabled');
                    var rName = r.getAttribute('data-name');
                    var rType = r.getAttribute('data-type');
                    var rLabelInput = r.querySelector('.bp-layer-input-label');
                    var rHasColorChk = r.querySelector('.bp-layer-chk-hasdefcolor');
                    var rColorPicker = r.querySelector('.bp-layer-color-def');
                    var rSolidChk = r.querySelector('.bp-layer-chk-forcesolid');

                    initialList.push({
                        name: rName,
                        type: rType,
                        label: rLabelInput ? (rLabelInput.value.trim() || rName) : rName,
                        enabled: (rChk && rChk.checked) ? 1 : 0,
                        hasDefColor: (rHasColorChk && rHasColorChk.checked) ? 1 : 0,
                        defColor: rColorPicker ? rColorPicker.value : '#10b981',
                        forceSolid: (rSolidChk && rSolidChk.checked) ? 1 : 0
                    });
                });
                currentLayers = initialList;
                if (customLayersInput) {
                    customLayersInput.value = JSON.stringify(currentLayers);
                }
            }

            // Pre-populate with existing detected materials
            if (detectedMaterialsInput && detectedMaterialsInput.value) {
                try {
                    var parsed = JSON.parse(detectedMaterialsInput.value);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        renderCustomLayersList(parsed);
                    }
                } catch (e) {}
            }

            function inspectModelFile(url) {
                if (!url) return;
                var isFbx = url.toLowerCase().split('?')[0].endsWith('.fbx');

                if (isFbx && (typeof THREE === 'undefined' || typeof THREE.FBXLoader === 'undefined')) {
                    setTimeout(function() { inspectModelFile(url); }, 500);
                    return;
                }
                if (!isFbx && (typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined')) {
                    setTimeout(function() { inspectModelFile(url); }, 500);
                    return;
                }

                if (matStatusEl) {
                    matStatusEl.style.display = 'block';
                    matStatusEl.textContent = '⏳ Inspeccionando capas y materiales 3D...';
                }

                function processParsedScene(rootScene) {
                    var materialsMap = new Map();
                    var meshesMap = new Map();

                    if (rootScene) {
                        rootScene.traverse(function(child) {
                            if (child.isMesh || child.isSkinnedMesh) {
                                if (child.name && child.name.trim() !== '') {
                                    meshesMap.set(child.name, { name: child.name, type: 'mesh' });
                                }
                                if (child.material) {
                                    var mats = Array.isArray(child.material) ? child.material : [child.material];
                                    mats.forEach(function(m) {
                                        if (m && m.name && m.name.trim() !== '') {
                                            materialsMap.set(m.name, { name: m.name, type: 'material' });
                                        }
                                    });
                                }
                            }
                        });
                    }

                    var detectedItems = [];
                    materialsMap.forEach(function(item) { detectedItems.push(item); });
                    meshesMap.forEach(function(item) { detectedItems.push(item); });

                    if (detectedMaterialsInput) {
                        detectedMaterialsInput.value = JSON.stringify(detectedItems);
                    }

                    if (matStatusEl) {
                        matStatusEl.textContent = '✅ ' + materialsMap.size + ' material(es) y ' + meshesMap.size + ' sub-malla(s) detectadas en la escena 3D.';
                    }

                    renderCustomLayersList(detectedItems);
                }

                if (isFbx) {
                    var fbxLoader = new THREE.FBXLoader();
                    fbxLoader.load(url, function(fbx) {
                        processParsedScene(fbx);
                    }, undefined, function(err) {
                        if (matStatusEl) {
                            matStatusEl.style.display = 'block';
                            matStatusEl.textContent = '⚠️ Nota: El archivo FBX principal se cargará directamente en el bosque.';
                        }
                    });
                } else {
                    var gltfLoader = new THREE.GLTFLoader();
                    gltfLoader.load(url, function(gltf) {
                        processParsedScene(gltf.scene);
                    }, undefined, function(err) {
                        if (matStatusEl) {
                            matStatusEl.style.display = 'block';
                            matStatusEl.textContent = '⚠️ Nota: El archivo GLB principal se cargará directamente en el bosque.';
                        }
                    });
                }
            }

            function setupMediaUploader(btnId, inputId) {
                var btn = document.getElementById(btnId);
                var input = document.getElementById(inputId);
                if (!btn || !input) return;

                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    var frame = wp.media({
                        title: 'Seleccionar o Subir Modelo 3D (.glb o .fbx)',
                        button: { text: 'Usar este modelo' },
                        multiple: false
                    });

                    frame.on('select', function() {
                        var attachment = frame.state().get('selection').first().toJSON();
                        input.value = attachment.url;
                        if (inputId === 'file_url') {
                            inspectModelFile(attachment.url);
                        }
                    });

                    frame.open();
                });
            }

            setupMediaUploader('btn_upload_glb', 'file_url');
            setupMediaUploader('btn_upload_icon', 'icon_url');

            // Manejador para botones de subida de la biblioteca de animaciones globales
            var animUploadBtns = document.querySelectorAll('.bp-btn-upload-anim');
            animUploadBtns.forEach(function(animBtn) {
                animBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    var targetInputId = animBtn.getAttribute('data-target');
                    var targetInput = document.getElementById(targetInputId);
                    if (!targetInput) return;

                    var frame = wp.media({
                        title: 'Seleccionar Archivo de Animación FBX / GLB',
                        button: { text: 'Usar esta animación' },
                        multiple: false
                    });

                    frame.on('select', function() {
                        var attachment = frame.state().get('selection').first().toJSON();
                        targetInput.value = attachment.url;
                    });

                    frame.open();
                });
            });

            if (fileInput) {
                fileInput.addEventListener('change', function() {
                    inspectModelFile(fileInput.value.trim());
                });
                if (fileInput.value.trim()) {
                    inspectModelFile(fileInput.value.trim());
                }
            }
        });
        </script>
        <?php
    }
}

new BP_Admin_GLB();
