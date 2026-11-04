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
        $anim_idle       = isset($_POST['anim_idle']) ? sanitize_text_field($_POST['anim_idle']) : '';
        $anim_walk       = isset($_POST['anim_walk']) ? sanitize_text_field($_POST['anim_walk']) : '';
        $anim_kneel_down = isset($_POST['anim_kneel_down']) ? sanitize_text_field($_POST['anim_kneel_down']) : '';
        $anim_kneel_idle = isset($_POST['anim_kneel_idle']) ? sanitize_text_field($_POST['anim_kneel_idle']) : '';
        $active          = isset($_POST['active']) ? 1 : 0;

        // Archivos FBX de animaciones (Mixamo)
        $fbx_animations = '[]';
        if (isset($_POST['fbx_animations'])) {
            $raw_fbx = wp_unslash($_POST['fbx_animations']);
            $decoded_fbx = json_decode($raw_fbx, true);
            if (is_array($decoded_fbx)) {
                $sanitized_fbx = array();
                foreach ($decoded_fbx as $item) {
                    if (is_array($item) && !empty($item['url'])) {
                        $sanitized_fbx[] = array(
                            'url'  => esc_url_raw($item['url']),
                            'name' => isset($item['name']) ? sanitize_text_field($item['name']) : '',
                            'role' => isset($item['role']) ? sanitize_key($item['role']) : 'other'
                        );
                    }
                }
                $fbx_animations = wp_json_encode($sanitized_fbx);
            }
        }

        // Color Customization & Hybrid Material Mapping
        $allow_colors = isset($_POST['allow_colors']) ? 1 : 0;
        $mat_skin     = isset($_POST['mat_skin']) ? sanitize_text_field($_POST['mat_skin']) : '';
        $mat_shirt    = isset($_POST['mat_shirt']) ? sanitize_text_field($_POST['mat_shirt']) : '';
        $mat_pants    = isset($_POST['mat_pants']) ? sanitize_text_field($_POST['mat_pants']) : '';
        $mat_hair     = isset($_POST['mat_hair']) ? sanitize_text_field($_POST['mat_hair']) : '';

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
            'anim_idle'          => $anim_idle,
            'anim_walk'          => $anim_walk,
            'anim_kneel_down'    => $anim_kneel_down,
            'anim_kneel_idle'    => $anim_kneel_idle,
            'fbx_animations'     => $fbx_animations,
            'active'             => $active,
            'allow_colors'       => $allow_colors,
            'mat_skin'           => $mat_skin,
            'mat_shirt'          => $mat_shirt,
            'mat_pants'          => $mat_pants,
            'mat_hair'           => $mat_hair,
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
        $saved_fbx = isset($editing_avatar['fbx_animations']) ? $editing_avatar['fbx_animations'] : '[]';
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

                        <!-- ARCHIVOS FBX DE ANIMACIONES (MIXAMO) -->
                        <div style="background:#fefce8; border:1px solid #fef08a; padding:12px; border-radius:6px; margin-bottom:15px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                <h3 style="margin:0; font-size:13px; color:#854d0e;">📦 Archivos FBX de Animaciones (Mixamo)</h3>
                                <button type="button" id="btn_upload_fbx_anims" class="button button-secondary button-small" style="font-weight:bold;">➕ Subir / Añadir FBX</button>
                            </div>
                            <small class="description" style="display:block; margin-bottom:10px;">
                                Puedes subir varios archivos <code>.fbx</code> para este personaje (descargados de Mixamo "without skin"). Asigna cada uno a su rol: Idle, Caminar, Arrodillarse o Estar de rodillas.
                            </small>

                            <input type="hidden" id="fbx_animations" name="fbx_animations" value="<?php echo esc_attr($saved_fbx); ?>">
                            <div id="fbx_anim_status" style="font-size:12px; color:#854d0e; font-weight:600; margin-bottom:8px; display:none;"></div>

                            <div id="fbx_anims_list_container" style="display:flex; flex-direction:column; gap:8px;">
                                <!-- Rendered dynamically by JS -->
                            </div>
                        </div>

                        <!-- ANIMATION SELECTION (IDLE, WALK, KNEEL DOWN, KNEEL IDLE) -->
                        <div style="background:#f0fdf4; border:1px solid #86efac; padding:12px; border-radius:6px; margin-bottom:15px;">
                            <h3 style="margin-top:0; font-size:13px; color:#166534;">🎬 Asignación de Animaciones</h3>
                            <div id="glb-anim-status" style="margin-bottom:10px; font-size:12px; color:#15803d; font-weight:600; display:none;"></div>

                            <p style="margin-bottom:10px;">
                                <label for="anim_idle"><strong>1. Animación para Estar Quieto (Idle):</strong></label><br>
                                <select id="anim_idle" name="anim_idle" class="widefat" data-current="<?php echo esc_attr($editing_avatar['anim_idle'] ?? ''); ?>">
                                    <option value="">-- Cargar modelo o archivos FBX --</option>
                                    <?php if (!empty($editing_avatar['anim_idle'])): ?>
                                        <option value="<?php echo esc_attr($editing_avatar['anim_idle']); ?>" selected><?php echo esc_html($editing_avatar['anim_idle']); ?></option>
                                    <?php endif; ?>
                                </select>
                                <small class="description">Se ejecutará cuando el avatar esté detenido o reposando.</small>
                            </p>

                            <p style="margin-bottom:10px;">
                                <label for="anim_walk"><strong>2. Animación para Andar (Walk / Run):</strong></label><br>
                                <select id="anim_walk" name="anim_walk" class="widefat" data-current="<?php echo esc_attr($editing_avatar['anim_walk'] ?? ''); ?>">
                                    <option value="">-- Cargar modelo o archivos FBX --</option>
                                    <?php if (!empty($editing_avatar['anim_walk'])): ?>
                                        <option value="<?php echo esc_attr($editing_avatar['anim_walk']); ?>" selected><?php echo esc_html($editing_avatar['anim_walk']); ?></option>
                                    <?php endif; ?>
                                </select>
                                <small class="description">Se ejecutará cuando el avatar camine por el bosque.</small>
                            </p>

                            <p style="margin-bottom:10px;">
                                <label for="anim_kneel_down"><strong>3. Animación para Arrodillarse (Kneel Down):</strong></label><br>
                                <select id="anim_kneel_down" name="anim_kneel_down" class="widefat" data-current="<?php echo esc_attr($editing_avatar['anim_kneel_down'] ?? ''); ?>">
                                    <option value="">-- Cargar modelo o archivos FBX --</option>
                                    <?php if (!empty($editing_avatar['anim_kneel_down'])): ?>
                                        <option value="<?php echo esc_attr($editing_avatar['anim_kneel_down']); ?>" selected><?php echo esc_html($editing_avatar['anim_kneel_down']); ?></option>
                                    <?php endif; ?>
                                </select>
                                <small class="description">Transición hacia abajo cuando el personaje se acerca a mirar una tumba.</small>
                            </p>

                            <p style="margin-bottom:0;">
                                <label for="anim_kneel_idle"><strong>4. Animación para Estar de Rodillas (Kneel Idle / Velando):</strong></label><br>
                                <select id="anim_kneel_idle" name="anim_kneel_idle" class="widefat" data-current="<?php echo esc_attr($editing_avatar['anim_kneel_idle'] ?? ''); ?>">
                                    <option value="">-- Cargar modelo o archivos FBX --</option>
                                    <?php if (!empty($editing_avatar['anim_kneel_idle'])): ?>
                                        <option value="<?php echo esc_attr($editing_avatar['anim_kneel_idle']); ?>" selected><?php echo esc_html($editing_avatar['anim_kneel_idle']); ?></option>
                                    <?php endif; ?>
                                </select>
                                <small class="description">Se ejecutará en bucle mientras el avatar permanece mirando y velando la tumba.</small>
                            </p>
                        </div>

                        <!-- COLOR CUSTOMIZATION & HYBRID MATERIAL MAPPING -->
                        <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:12px; border-radius:6px; margin-bottom:15px;">
                            <h3 style="margin-top:0; font-size:13px; color:#1e40af;">🎨 Mapeo y Personalización de Colores 3D</h3>
                            
                            <p style="margin-bottom:10px;">
                                <label>
                                    <input type="checkbox" id="allow_colors" name="allow_colors" value="1" <?php checked($allow_colors_val, 1); ?>>
                                    <strong>Permitir personalización de colores para este avatar</strong>
                                </label>
                                <br><small class="description">Desmarca si el modelo tiene textura fija horneada sin admitir colores separados.</small>
                            </p>

                            <div id="glb-colors-wrapper" style="<?php echo $allow_colors_val ? '' : 'display:none;'; ?>">
                                <div id="glb-mat-status" style="margin-bottom:10px; font-size:12px; color:#2563eb; font-weight:600; display:none;"></div>
                                <input type="hidden" id="detected_materials" name="detected_materials" value="<?php echo esc_attr($saved_detected); ?>">

                                <p style="margin-bottom:10px;">
                                    <label for="mat_skin"><strong>Piel / Cuerpo / Pelaje:</strong></label><br>
                                    <select id="mat_skin" name="mat_skin" class="widefat bp-mat-select" data-current="<?php echo esc_attr($editing_avatar['mat_skin'] ?? ''); ?>">
                                        <option value="">-- Detección Automática (Heurística Inteligente) --</option>
                                        <?php if (!empty($editing_avatar['mat_skin'])): ?>
                                            <option value="<?php echo esc_attr($editing_avatar['mat_skin']); ?>" selected><?php echo esc_html($editing_avatar['mat_skin']); ?></option>
                                        <?php endif; ?>
                                    </select>
                                    <small class="description">Mapeo para piel de humanos o pelaje principal de mascotas.</small>
                                </p>

                                <p style="margin-bottom:10px;">
                                    <label for="mat_shirt"><strong>Camiseta / Torso / Ropa Superior / Collar:</strong></label><br>
                                    <select id="mat_shirt" name="mat_shirt" class="widefat bp-mat-select" data-current="<?php echo esc_attr($editing_avatar['mat_shirt'] ?? ''); ?>">
                                        <option value="">-- Detección Automática (Heurística Inteligente) --</option>
                                        <?php if (!empty($editing_avatar['mat_shirt'])): ?>
                                            <option value="<?php echo esc_attr($editing_avatar['mat_shirt']); ?>" selected><?php echo esc_html($editing_avatar['mat_shirt']); ?></option>
                                        <?php endif; ?>
                                    </select>
                                    <small class="description">Mapeo para torso/ropa de humanos o collar de animales.</small>
                                </p>

                                <p style="margin-bottom:10px;">
                                    <label for="mat_pants"><strong>Pantalón / Piernas / Ropa Inferior:</strong></label><br>
                                    <select id="mat_pants" name="mat_pants" class="widefat bp-mat-select" data-current="<?php echo esc_attr($editing_avatar['mat_pants'] ?? ''); ?>">
                                        <option value="">-- Detección Automática (Heurística Inteligente) --</option>
                                        <?php if (!empty($editing_avatar['mat_pants'])): ?>
                                            <option value="<?php echo esc_attr($editing_avatar['mat_pants']); ?>" selected><?php echo esc_html($editing_avatar['mat_pants']); ?></option>
                                        <?php endif; ?>
                                    </select>
                                    <small class="description">Mapeo para pantalones/piernas de tutores humanos.</small>
                                </p>

                                <p style="margin-bottom:0;">
                                    <label for="mat_hair"><strong>Pelo / Cabeza / Sombrero:</strong></label><br>
                                    <select id="mat_hair" name="mat_hair" class="widefat bp-mat-select" data-current="<?php echo esc_attr($editing_avatar['mat_hair'] ?? ''); ?>">
                                        <option value="">-- Detección Automática (Heurística Inteligente) --</option>
                                        <?php if (!empty($editing_avatar['mat_hair'])): ?>
                                            <option value="<?php echo esc_attr($editing_avatar['mat_hair']); ?>" selected><?php echo esc_html($editing_avatar['mat_hair']); ?></option>
                                        <?php endif; ?>
                                    </select>
                                    <small class="description">Mapeo para cabello o sombrero de tutores humanos.</small>
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
                                    <th>Animaciones FBX/Mixamo</th>
                                    <th>Escala / Offset</th>
                                    <th>Colores</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($avatars as $av): ?>
                                    <?php
                                    $fbx_count = 0;
                                    if (!empty($av['fbx_animations'])) {
                                        $decoded_fbx = is_string($av['fbx_animations']) ? json_decode($av['fbx_animations'], true) : $av['fbx_animations'];
                                        if (is_array($decoded_fbx)) $fbx_count = count($decoded_fbx);
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
                                            <?php if ($fbx_count > 0): ?>
                                                <span style="background:#fef08a; color:#854d0e; padding:2px 6px; border-radius:4px; font-weight:600; font-size:11px;">📦 <?php echo $fbx_count; ?> FBX</span><br>
                                            <?php endif; ?>
                                            <small style="font-size:11px; color:#475569;">
                                                Idle: <code><?php echo esc_html($av['anim_idle'] ?: 'Def'); ?></code><br>
                                                Walk: <code><?php echo esc_html($av['anim_walk'] ?: 'Def'); ?></code><br>
                                                <?php if (!empty($av['anim_kneel_down']) || !empty($av['anim_kneel_idle'])): ?>
                                                    🧎 Kneel: <code><?php echo esc_html($av['anim_kneel_down'] ?: ($av['anim_kneel_idle'] ?: 'Def')); ?></code>
                                                <?php endif; ?>
                                            </small>
                                        </td>
                                        <td>
                                            Scale: <code><?php echo esc_html($av['scale']); ?></code><br>
                                            Offset Y: <code><?php echo esc_html($av['offset_y']); ?></code>
                                        </td>
                                        <td>
                                            <?php if (!isset($av['allow_colors']) || !empty($av['allow_colors'])): ?>
                                                <span style="color:#2563eb; font-weight:600; font-size:12px;">🎨 Personalizable</span>
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
            var animStatusEl = document.getElementById('glb-anim-status');
            var matStatusEl = document.getElementById('glb-mat-status');
            var fbxStatusEl = document.getElementById('fbx_anim_status');

            var idleSelect = document.getElementById('anim_idle');
            var walkSelect = document.getElementById('anim_walk');
            var kneelDownSelect = document.getElementById('anim_kneel_down');
            var kneelIdleSelect = document.getElementById('anim_kneel_idle');

            var allowColorsChk = document.getElementById('allow_colors');
            var colorsWrapper = document.getElementById('glb-colors-wrapper');
            var detectedMaterialsInput = document.getElementById('detected_materials');
            var fbxAnimsInput = document.getElementById('fbx_animations');
            var fbxContainer = document.getElementById('fbx_anims_list_container');

            var skinSelect = document.getElementById('mat_skin');
            var shirtSelect = document.getElementById('mat_shirt');
            var pantsSelect = document.getElementById('mat_pants');
            var hairSelect = document.getElementById('mat_hair');

            var baseModelAnims = [];
            var fbxAnimFiles = [];

            if (allowColorsChk && colorsWrapper) {
                allowColorsChk.addEventListener('change', function() {
                    colorsWrapper.style.display = allowColorsChk.checked ? 'block' : 'none';
                });
            }

            // Parse existing FBX files
            if (fbxAnimsInput && fbxAnimsInput.value) {
                try {
                    var parsedFbx = JSON.parse(fbxAnimsInput.value);
                    if (Array.isArray(parsedFbx)) {
                        fbxAnimFiles = parsedFbx;
                    }
                } catch(e) {}
            }

            function renderFbxList() {
                if (!fbxContainer) return;
                fbxContainer.innerHTML = '';

                if (fbxAnimFiles.length === 0) {
                    fbxContainer.innerHTML = '<div style="color:#a16207; font-size:12px; font-style:italic;">No hay archivos FBX de animación asociados aún. Haz clic en "Subir / Añadir FBX" arriba para cargar animaciones de Mixamo.</div>';
                    if (fbxAnimsInput) fbxAnimsInput.value = '[]';
                    syncAnimationDropdowns();
                    return;
                }

                fbxAnimFiles.forEach(function(item, idx) {
                    var row = document.createElement('div');
                    row.style.cssText = 'background:#fff; border:1px solid #fde047; padding:8px 10px; border-radius:4px; display:flex; align-items:center; gap:8px; justify-content:space-between; flex-wrap:wrap;';

                    var infoDiv = document.createElement('div');
                    infoDiv.style.cssText = 'display:flex; flex-direction:column; flex:1; min-width:180px;';
                    var filename = item.name || item.url.split('/').pop().split('?')[0];
                    infoDiv.innerHTML = '<strong style="font-size:12px; color:#1e293b;">📄 ' + filename + '</strong><small style="color:#64748b; font-size:10px; word-break:break-all;">' + item.url + '</small>';

                    var roleSelect = document.createElement('select');
                    roleSelect.style.cssText = 'font-size:12px; padding:3px 6px; height:auto;';
                    roleSelect.innerHTML = `
                        <option value="other">-- Rol Extra / Libre --</option>
                        <option value="anim_idle" ${item.role === 'anim_idle' ? 'selected' : ''}>🧍 Estar Quieto (Idle)</option>
                        <option value="anim_walk" ${item.role === 'anim_walk' ? 'selected' : ''}>🚶 Caminar / Andar (Walk)</option>
                        <option value="anim_kneel_down" ${item.role === 'anim_kneel_down' ? 'selected' : ''}>🧎 Arrodillarse (Kneel Down)</option>
                        <option value="anim_kneel_idle" ${item.role === 'anim_kneel_idle' ? 'selected' : ''}>🧎‍♂️ Estar de Rodillas (Kneel Idle)</option>
                    `;

                    roleSelect.addEventListener('change', function() {
                        item.role = roleSelect.value;
                        if (fbxAnimsInput) fbxAnimsInput.value = JSON.stringify(fbxAnimFiles);

                        // Auto-assign to primary dropdown
                        if (item.role === 'anim_idle' && idleSelect) idleSelect.value = item.url;
                        if (item.role === 'anim_walk' && walkSelect) walkSelect.value = item.url;
                        if (item.role === 'anim_kneel_down' && kneelDownSelect) kneelDownSelect.value = item.url;
                        if (item.role === 'anim_kneel_idle' && kneelIdleSelect) kneelIdleSelect.value = item.url;

                        syncAnimationDropdowns();
                    });

                    var delBtn = document.createElement('button');
                    delBtn.type = 'button';
                    delBtn.className = 'button button-small button-link-delete';
                    delBtn.style.color = '#ef4444';
                    delBtn.textContent = '❌';
                    delBtn.title = 'Quitar archivo';
                    delBtn.addEventListener('click', function() {
                        fbxAnimFiles.splice(idx, 1);
                        if (fbxAnimsInput) fbxAnimsInput.value = JSON.stringify(fbxAnimFiles);
                        renderFbxList();
                    });

                    row.appendChild(infoDiv);
                    row.appendChild(roleSelect);
                    row.appendChild(delBtn);
                    fbxContainer.appendChild(row);
                });

                if (fbxAnimsInput) fbxAnimsInput.value = JSON.stringify(fbxAnimFiles);
                syncAnimationDropdowns();
            }

            function guessRoleFromName(name) {
                var s = (name || '').toLowerCase();
                if (s.includes('kneel_down') || s.includes('kneeldown') || s.includes('kneeling_down') || s.includes('arrodillar') || (s.includes('kneel') && s.includes('down'))) {
                    return 'anim_kneel_down';
                }
                if (s.includes('kneel') || s.includes('rodilla') || s.includes('pray')) {
                    return 'anim_kneel_idle';
                }
                if (s.includes('walk') || s.includes('run') || s.includes('caminar') || s.includes('andar')) {
                    return 'anim_walk';
                }
                if (s.includes('idle') || s.includes('quieto') || s.includes('reposo') || s.includes('stand')) {
                    return 'anim_idle';
                }
                return 'other';
            }

            function syncAnimationDropdowns() {
                var selects = [
                    { sel: idleSelect, defaultRole: 'anim_idle', defaultName: 'idle' },
                    { sel: walkSelect, defaultRole: 'anim_walk', defaultName: 'walk' },
                    { sel: kneelDownSelect, defaultRole: 'anim_kneel_down', defaultName: 'kneel_down' },
                    { sel: kneelIdleSelect, defaultRole: 'anim_kneel_idle', defaultName: 'kneel' }
                ];

                selects.forEach(function(item) {
                    if (!item.sel) return;
                    var curVal = item.sel.getAttribute('data-current') || item.sel.value;
                    item.sel.innerHTML = '<option value="">-- Ninguna / Por Defecto --</option>';

                    // 1. Opciones desde FBX subidos
                    if (fbxAnimFiles.length > 0) {
                        var optGroupFbx = document.createElement('optgroup');
                        optGroupFbx.label = '📦 Archivos FBX (Mixamo)';
                        fbxAnimFiles.forEach(function(fbx) {
                            var opt = document.createElement('option');
                            opt.value = fbx.url;
                            opt.textContent = '📄 ' + (fbx.name || fbx.url.split('/').pop().split('?')[0]) + (fbx.role && fbx.role !== 'other' ? ' [' + fbx.role + ']' : '');
                            if (curVal === fbx.url || (!curVal && fbx.role === item.defaultRole)) {
                                opt.selected = true;
                            }
                            optGroupFbx.appendChild(opt);
                        });
                        item.sel.appendChild(optGroupFbx);
                    }

                    // 2. Opciones desde Modelo Base (GLB / FBX interno)
                    if (baseModelAnims.length > 0) {
                        var optGroupBase = document.createElement('optgroup');
                        optGroupBase.label = '🎬 Animaciones del Modelo Base';
                        baseModelAnims.forEach(function(animName) {
                            var opt = document.createElement('option');
                            opt.value = animName;
                            opt.textContent = '🎞️ ' + animName;
                            if (curVal === animName || (!curVal && animName.toLowerCase().includes(item.defaultName))) {
                                opt.selected = true;
                            }
                            optGroupBase.appendChild(opt);
                        });
                        item.sel.appendChild(optGroupBase);
                    }

                    // Preservar valor personalizado si no coincidió
                    if (curVal && item.sel.value !== curVal) {
                        var customOpt = document.createElement('option');
                        customOpt.value = curVal;
                        customOpt.textContent = '📌 ' + (curVal.split('/').pop().split('?')[0] || curVal);
                        customOpt.selected = true;
                        item.sel.appendChild(customOpt);
                    }
                });
            }

            renderFbxList();

            // Uploader múltiple para archivos FBX de animaciones
            var btnUploadFbx = document.getElementById('btn_upload_fbx_anims');
            if (btnUploadFbx) {
                btnUploadFbx.addEventListener('click', function(e) {
                    e.preventDefault();
                    var frame = wp.media({
                        title: 'Seleccionar Archivos FBX de Animación (Mixamo)',
                        button: { text: 'Añadir Animaciones Seleccionadas' },
                        multiple: true
                    });

                    frame.on('select', function() {
                        var selection = frame.state().get('selection').toJSON();
                        selection.forEach(function(attachment) {
                            var url = attachment.url;
                            var name = attachment.filename || attachment.title || url.split('/').pop().split('?')[0];

                            // Evitar duplicados exactos
                            var exists = fbxAnimFiles.some(function(f){ return f.url === url; });
                            if (!exists) {
                                var role = guessRoleFromName(name);
                                fbxAnimFiles.push({
                                    url: url,
                                    name: name,
                                    role: role
                                });
                            }
                        });
                        renderFbxList();
                    });

                    frame.open();
                });
            }

            function populateMaterialSelects(items) {
                var selects = [skinSelect, shirtSelect, pantsSelect, hairSelect];
                selects.forEach(function(sel) {
                    if (!sel) return;
                    var currentVal = sel.getAttribute('data-current') || sel.value;
                    sel.innerHTML = '<option value="">-- Detección Automática (Heurística Inteligente) --</option>';

                    var matGroup = document.createElement('optgroup');
                    matGroup.label = '🎨 Materiales Detectados';
                    var meshGroup = document.createElement('optgroup');
                    meshGroup.label = '🔷 Sub-mallas Detectadas';

                    items.forEach(function(item) {
                        var opt = document.createElement('option');
                        opt.value = item.name;
                        opt.textContent = (item.type === 'mesh' ? '🔷 ' : '🎨 ') + item.name;
                        if (item.name === currentVal) {
                            opt.selected = true;
                        }
                        if (item.type === 'mesh') {
                            meshGroup.appendChild(opt);
                        } else {
                            matGroup.appendChild(opt);
                        }
                    });

                    if (matGroup.children.length > 0) sel.appendChild(matGroup);
                    if (meshGroup.children.length > 0) sel.appendChild(meshGroup);

                    if (currentVal && sel.value !== currentVal) {
                        var customOpt = document.createElement('option');
                        customOpt.value = currentVal;
                        customOpt.textContent = '📌 ' + currentVal;
                        customOpt.selected = true;
                        sel.appendChild(customOpt);
                    }
                });
            }

            // Pre-populate with existing detected materials
            if (detectedMaterialsInput && detectedMaterialsInput.value) {
                try {
                    var parsed = JSON.parse(detectedMaterialsInput.value);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        populateMaterialSelects(parsed);
                    }
                } catch (e) {}
            }

            function inspectModelFile(url) {
                if (!url) return;
                var isFbx = url.toLowerCase().split('?')[0].endsWith('.fbx');

                if (isFbx && (typeof THREE === 'undefined' || typeof THREE.FBXLoader === 'undefined')) {
                    if (animStatusEl) {
                        animStatusEl.style.display = 'block';
                        animStatusEl.textContent = '⏳ Cargando Three.js FBXLoader...';
                    }
                    setTimeout(function() { inspectModelFile(url); }, 500);
                    return;
                }
                if (!isFbx && (typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined')) {
                    if (animStatusEl) {
                        animStatusEl.style.display = 'block';
                        animStatusEl.textContent = '⏳ Cargando Three.js GLTFLoader...';
                    }
                    setTimeout(function() { inspectModelFile(url); }, 500);
                    return;
                }

                if (animStatusEl) {
                    animStatusEl.style.display = 'block';
                    animStatusEl.textContent = '⏳ Leyendo animaciones del modelo ' + (isFbx ? 'FBX' : 'GLB') + '...';
                }
                if (matStatusEl) {
                    matStatusEl.style.display = 'block';
                    matStatusEl.textContent = '⏳ Inspeccionando materiales 3D...';
                }

                function processParsedScene(rootScene, animations) {
                    var anims = animations || [];
                    baseModelAnims = anims.map(function(a){ return a.name; });

                    if (animStatusEl) {
                        animStatusEl.textContent = '✅ ' + anims.length + ' animación(es) base detectada(s) en modelo principal: ' + (baseModelAnims.join(', ') || 'Ninguna (puedes añadir FBX de Mixamo)');
                    }

                    syncAnimationDropdowns();

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

                    populateMaterialSelects(detectedItems);
                }

                if (isFbx) {
                    var fbxLoader = new THREE.FBXLoader();
                    fbxLoader.load(url, function(fbx) {
                        processParsedScene(fbx, fbx.animations);
                    }, undefined, function(err) {
                        if (animStatusEl) {
                            animStatusEl.style.display = 'block';
                            animStatusEl.textContent = '⚠️ Nota: El archivo FBX principal se cargará directamente en el bosque.';
                        }
                    });
                } else {
                    var gltfLoader = new THREE.GLTFLoader();
                    gltfLoader.load(url, function(gltf) {
                        processParsedScene(gltf.scene, gltf.animations);
                    }, undefined, function(err) {
                        if (animStatusEl) {
                            animStatusEl.style.display = 'block';
                            animStatusEl.textContent = '⚠️ Nota: El archivo GLB principal se cargará directamente en el bosque.';
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

            // Uploaders para animaciones de la biblioteca global
            document.querySelectorAll('.bp-btn-upload-anim').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    var targetId = btn.getAttribute('data-target');
                    var targetInput = document.getElementById(targetId);
                    if (!targetInput) return;

                    var frame = wp.media({
                        title: 'Seleccionar Archivo FBX de Animación',
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
