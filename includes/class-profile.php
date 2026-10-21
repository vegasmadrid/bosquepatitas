<?php
if (!defined('ABSPATH')) exit;

class BP_Profile {

    public function __construct() {
        add_filter('the_content', array($this, 'inject_profile_page'));

        // AJAX handlers for pet management
        add_action('wp_ajax_bp_ajax_save_mascota', array($this, 'ajax_save_mascota'));
        add_action('wp_ajax_bp_ajax_unlink_mascota', array($this, 'ajax_unlink_mascota'));
        add_action('wp_ajax_bp_ajax_delete_mascota', array($this, 'ajax_delete_mascota'));

        add_action('wp_ajax_nopriv_bp_ajax_save_mascota', array($this, 'ajax_save_mascota'));
        add_action('wp_ajax_nopriv_bp_ajax_unlink_mascota', array($this, 'ajax_unlink_mascota'));
        add_action('wp_ajax_nopriv_bp_ajax_delete_mascota', array($this, 'ajax_delete_mascota'));
    }

    /**
     * Inject user profile dashboard automatically on designated page
     */
    public function inject_profile_page($content) {
        if (is_admin()) {
            return $content;
        }

        $profile_page_id = (int) get_option('bp_profile_page_id', 0);
        if ($profile_page_id > 0 && is_page($profile_page_id) && in_the_loop() && is_main_query()) {
            if (!is_user_logged_in()) {
                return '<div class="bp-auth-container"><p class="bp-message bp-error">Debes iniciar sesión para ver tu perfil.</p></div>';
            }
            return $content . $this->render_profile_dashboard();
        }

        return $content;
    }

    /**
     * Render the User Profile Dashboard HTML
     */
    public function render_profile_dashboard() {
        $current_user = wp_get_current_user();
        if (!$current_user || !$current_user->exists()) {
            return '';
        }

        $redirect_url = get_option('bp_redirect_url', 'https://bosquepatitas.com/bosque-patitas/');
        $logout_url   = wp_logout_url(get_permalink());

        // Fetch user's pets (bp_mascota)
        $user_pets = get_posts(array(
            'post_type'      => 'bp_mascota',
            'author'         => $current_user->ID,
            'posts_per_page' => -1,
            'post_status'    => array('publish', 'pending', 'draft'),
            'orderby'        => 'date',
            'order'          => 'DESC'
        ));

        $edit_pet_id = isset($_GET['edit_mascota']) ? absint($_GET['edit_mascota']) : 0;
        $pet_to_edit = null;

        if ($edit_pet_id > 0) {
            $candidate = get_post($edit_pet_id);
            if ($candidate && $candidate->post_author == $current_user->ID && $candidate->post_type === 'bp_mascota') {
                $pet_to_edit = $candidate;
            }
        }

        ob_start();
        ?>
        <div class="bp-profile-wrapper">
            <div class="bp-profile-card">

                <!-- Header / User Info -->
                <div class="bp-profile-header">
                    <div class="bp-profile-avatar">
                        <?php echo get_avatar($current_user->ID, 96, '', esc_attr($current_user->display_name)); ?>
                    </div>
                    <div class="bp-profile-info">
                        <h2>¡Hola, <?php echo esc_html($current_user->display_name); ?>! 🐾</h2>
                        <p class="bp-user-email">📧 <?php echo esc_html($current_user->user_email); ?></p>
                        <p class="bp-user-role">Miembro del BosquePatitas</p>
                    </div>
                    <div class="bp-profile-actions">
                        <a href="<?php echo esc_url($redirect_url); ?>" class="bp-btn bp-btn-green">
                            🌳 Entrar al Bosque 3D
                        </a>
                        <a href="<?php echo esc_url($logout_url); ?>" class="bp-btn bp-btn-danger">
                            Cerrar Sesión
                        </a>
                    </div>
                </div>

                <!-- User Content Section: Mascotas -->
                <div class="bp-profile-content">

                    <div class="bp-section-title" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <h3>Mis Mascotas (<?php echo count($user_pets); ?>)</h3>
                        <button type="button" id="bp-btn-open-pet-form" class="bp-btn bp-btn-primary bp-btn-sm" style="width:auto !important;">
                            ➕ Registrar Nueva Mascota
                        </button>
                    </div>

                    <!-- Pet Form Drawer / Card -->
                    <div id="bp-pet-form-container" class="bp-pet-form-box <?php echo $pet_to_edit ? '' : 'bp-hidden'; ?>" style="margin-bottom:30px; background:#f8fafc; border:2px solid #1e293b; border-radius:10px; padding:25px; box-shadow:4px 4px 0px #1e293b;">
                        <h4 style="margin-top:0; font-family:'Press Start 2P', monospace; font-size:13px; color:#2d6a4f;">
                            <?php echo $pet_to_edit ? '✏️ Editar Ficha de ' . esc_html(get_the_title($pet_to_edit->ID)) : '🐾 Ficha de Nueva Mascota'; ?>
                        </h4>

                        <?php
                        $in_grave = $pet_to_edit ? (int) get_post_meta($pet_to_edit->ID, 'tumba_id', true) : 0;
                        if ($in_grave > 0) :
                        ?>
                            <div class="bp-auth-feedback bp-error" style="display:block;">
                                ⚠️ Esta mascota está actualmente sepultada en una tumba 3D. Para modificar sus datos, primero debes desasignarla de la tumba.
                            </div>
                        <?php else : ?>

                            <div class="bp-auth-feedback" id="bp-pet-form-feedback" style="display:none;"></div>

                            <form id="bp-form-mascota" method="post" enctype="multipart/form-data">
                                <?php wp_nonce_field('bp_auth_nonce', 'bp_nonce'); ?>
                                <input type="hidden" name="mascota_id" value="<?php echo $pet_to_edit ? $pet_to_edit->ID : 0; ?>" />

                                <!-- SEC 1: IDENTIDAD -->
                                <h5 class="bp-form-sec-title">1. Identidad y Títulos Honoríficos</h5>
                                <div class="bp-form-row">
                                    <div class="bp-form-group half">
                                        <label for="bp_pet_nombre">Nombre Real de la Mascota *</label>
                                        <input type="text" name="nombre" id="bp_pet_nombre" class="bp-input" required value="<?php echo $pet_to_edit ? esc_attr(get_the_title($pet_to_edit->ID)) : ''; ?>" placeholder="Ej: Toby" />
                                    </div>
                                    <div class="bp-form-group half">
                                        <label for="bp_pet_apodos">Apodos Oficiales / Cariñosos</label>
                                        <input type="text" name="apodos" id="bp_pet_apodos" class="bp-input" value="<?php echo $pet_to_edit ? esc_attr(get_post_meta($pet_to_edit->ID, 'apodos', true)) : ''; ?>" placeholder='Ej: "Tobito", "Sr. Salchicha", "El Comilón"' />
                                    </div>
                                </div>

                                <div class="bp-form-row">
                                    <div class="bp-form-group half">
                                        <label for="bp_pet_titulo">Título de Honor</label>
                                        <input type="text" name="titulo_honor" id="bp_pet_titulo" class="bp-input" value="<?php echo $pet_to_edit ? esc_attr(get_post_meta($pet_to_edit->ID, 'titulo_honor', true)) : ''; ?>" placeholder='Ej: "Reina del Sofá", "Guardián del Pasillo"' />
                                    </div>
                                    <div class="bp-form-group half">
                                        <label for="bp_pet_especie">Especie y Raza / Origen</label>
                                        <input type="text" name="especie_raza" id="bp_pet_especie" class="bp-input" value="<?php echo $pet_to_edit ? esc_attr(get_post_meta($pet_to_edit->ID, 'especie_raza', true)) : ''; ?>" placeholder='Ej: "Perro / Mezcla de amor y dinamita"' />
                                    </div>
                                </div>

                                <div class="bp-form-row">
                                    <div class="bp-form-group half">
                                        <label for="bp_pet_f_llegada">Fecha de Llegada a la Familia</label>
                                        <input type="date" name="fecha_llegada" id="bp_pet_f_llegada" class="bp-input" value="<?php echo $pet_to_edit ? esc_attr(get_post_meta($pet_to_edit->ID, 'fecha_llegada', true)) : ''; ?>" />
                                    </div>
                                    <div class="bp-form-group half">
                                        <label for="bp_pet_f_despedida">Fecha de Despedida</label>
                                        <input type="date" name="fecha_despedida" id="bp_pet_f_despedida" class="bp-input" value="<?php echo $pet_to_edit ? esc_attr(get_post_meta($pet_to_edit->ID, 'fecha_despedida', true)) : ''; ?>" />
                                    </div>
                                </div>

                                <!-- SEC 2: GAMIFICACIÓN Y ESTADÍSTICAS -->
                                <h5 class="bp-form-sec-title">2. Ficha de Personaje (Estadísticas 1-10)</h5>
                                <div class="bp-form-row four-col">
                                    <div class="bp-form-group">
                                        <label for="bp_pet_stat_carino">Nivel Cariñoso (1-10)</label>
                                        <input type="number" min="1" max="10" name="stat_carino" id="bp_pet_stat_carino" class="bp-input" value="<?php echo $pet_to_edit ? (int)get_post_meta($pet_to_edit->ID, 'stat_carino', true) : 10; ?>" />
                                    </div>
                                    <div class="bp-form-group">
                                        <label for="bp_pet_stat_travesura">Travesura (1-10)</label>
                                        <input type="number" min="1" max="10" name="stat_travesura" id="bp_pet_stat_travesura" class="bp-input" value="<?php echo $pet_to_edit ? (int)get_post_meta($pet_to_edit->ID, 'stat_travesura', true) : 5; ?>" />
                                    </div>
                                    <div class="bp-form-group">
                                        <label for="bp_pet_stat_bano">Amor al Baño (1-10)</label>
                                        <input type="number" min="1" max="10" name="stat_bano" id="bp_pet_stat_bano" class="bp-input" value="<?php echo $pet_to_edit ? (int)get_post_meta($pet_to_edit->ID, 'stat_bano', true) : 3; ?>" />
                                    </div>
                                    <div class="bp-form-group">
                                        <label for="bp_pet_stat_pena">Cara de Pena (1-10)</label>
                                        <input type="number" min="1" max="10" name="stat_pena" id="bp_pet_stat_pena" class="bp-input" value="<?php echo $pet_to_edit ? (int)get_post_meta($pet_to_edit->ID, 'stat_pena', true) : 10; ?>" />
                                    </div>
                                </div>

                                <div class="bp-form-row">
                                    <div class="bp-form-group half">
                                        <label for="bp_pet_superpoder">Superpoder Destacado</label>
                                        <input type="text" name="superpoder" id="bp_pet_superpoder" class="bp-input" value="<?php echo $pet_to_edit ? esc_attr(get_post_meta($pet_to_edit->ID, 'superpoder', true)) : ''; ?>" placeholder='Ej: "Detectar bolsas de premios a 3 km"' />
                                    </div>
                                    <div class="bp-form-group half">
                                        <label for="bp_pet_archienemigo">Archienemigo Mortal</label>
                                        <input type="text" name="archienemigo" id="bp_pet_archienemigo" class="bp-input" value="<?php echo $pet_to_edit ? esc_attr(get_post_meta($pet_to_edit->ID, 'archienemigo', true)) : ''; ?>" placeholder='Ej: "La aspiradora", "El cartero"' />
                                    </div>
                                </div>

                                <!-- SEC 3: GUSTOS Y MANÍAS -->
                                <h5 class="bp-form-sec-title">3. Gustos y Manías</h5>
                                <div class="bp-form-row">
                                    <div class="bp-form-group half">
                                        <label for="bp_pet_comida">Comida Favorita</label>
                                        <input type="text" name="comida_favorita" id="bp_pet_comida" class="bp-input" value="<?php echo $pet_to_edit ? esc_attr(get_post_meta($pet_to_edit->ID, 'comida_favorita', true)) : ''; ?>" placeholder='Ej: "Jamón york y su pienso de pollo"' />
                                    </div>
                                    <div class="bp-form-group half">
                                        <label for="bp_pet_lugar">Lugar Favorito del Mundo</label>
                                        <input type="text" name="lugar_favorito" id="bp_pet_lugar" class="bp-input" value="<?php echo $pet_to_edit ? esc_attr(get_post_meta($pet_to_edit->ID, 'lugar_favorito', true)) : ''; ?>" placeholder='Ej: "La esquina derecha del sofá"' />
                                    </div>
                                </div>

                                <div class="bp-form-row">
                                    <div class="bp-form-group half">
                                        <label for="bp_pet_juguete">Juguete Estrella</label>
                                        <input type="text" name="juguete_estrella" id="bp_pet_juguete" class="bp-input" value="<?php echo $pet_to_edit ? esc_attr(get_post_meta($pet_to_edit->ID, 'juguete_estrella', true)) : ''; ?>" placeholder='Ej: "Pelota de tenis verde despeluchada"' />
                                    </div>
                                    <div class="bp-form-group half">
                                        <label for="bp_pet_travesura">La Travesura Épica</label>
                                        <input type="text" name="travesura_epica" id="bp_pet_travesura" class="bp-input" value="<?php echo $pet_to_edit ? esc_attr(get_post_meta($pet_to_edit->ID, 'travesura_epica', true)) : ''; ?>" placeholder='Ej: "Se comió el pastel de cumpleaños entero"' />
                                    </div>
                                </div>

                                <!-- SEC 4: HISTORIA, FOTO Y HOMENAJE -->
                                <h5 class="bp-form-sec-title">4. Historia, Fotos y Homenaje</h5>
                                <div class="bp-form-group">
                                    <label for="bp_pet_historia">La Gran Anécdota / Historia *</label>
                                    <textarea name="historia" id="bp_pet_historia" rows="4" class="bp-input" required placeholder="Cuéntanos cómo llegó a vuestras vidas y sus momentos más especiales..."><?php echo $pet_to_edit ? esc_textarea($pet_to_edit->post_content) : ''; ?></textarea>
                                </div>

                                <div class="bp-form-group">
                                    <label for="bp_pet_carta">Carta de Despedida</label>
                                    <textarea name="carta_despedida" id="bp_pet_carta" rows="3" class="bp-input" placeholder="Tu mensaje personal de amor y agradecimiento..."><?php echo $pet_to_edit ? esc_textarea(get_post_meta($pet_to_edit->ID, 'carta_despedida', true)) : ''; ?></textarea>
                                </div>

                                <div class="bp-form-row">
                                    <div class="bp-form-group half">
                                        <label for="bp_pet_foto">Fotografía Principal de la Mascota</label>
                                        <input type="file" name="foto_mascota" id="bp_pet_foto" class="bp-input" accept="image/*" />
                                        <?php if ($pet_to_edit && get_the_post_thumbnail_url($pet_to_edit->ID)) : ?>
                                            <p style="margin:5px 0 0 0; font-size:12px; color:#2d6a4f;">✓ Ya tiene foto asignada. Sube una nueva para reemplazarla.</p>
                                        <?php endif; ?>
                                    </div>
                                    <div class="bp-form-group half">
                                        <label for="bp_pet_soundtrack">Banda Sonora (Enlace Spotify o YouTube)</label>
                                        <input type="url" name="soundtrack_url" id="bp_pet_soundtrack" class="bp-input" value="<?php echo $pet_to_edit ? esc_url(get_post_meta($pet_to_edit->ID, 'soundtrack_url', true)) : ''; ?>" placeholder="https://www.youtube.com/watch?v=..." />
                                    </div>
                                </div>

                                <div class="bp-form-actions" style="display:flex; gap:10px; margin-top:20px;">
                                    <button type="submit" class="bp-btn bp-btn-primary" style="flex:2;">
                                        🚀 Enviar Ficha para Aprobación
                                    </button>
                                    <button type="button" id="bp-btn-cancel-pet" class="bp-btn bp-btn-outline" style="flex:1;">
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        <?php endif; ?>
                    </div>

                    <!-- PETS LIST GRID -->
                    <?php if (!empty($user_pets)) : ?>
                        <div class="bp-graves-grid">
                            <?php foreach ($user_pets as $pet) : ?>
                                <?php
                                $thumb       = get_the_post_thumbnail_url($pet->ID, 'medium');
                                $is_approved = (bool) get_post_meta($pet->ID, 'is_approved', true);
                                $tumba_id    = (int) get_post_meta($pet->ID, 'tumba_id', true);
                                $apodos      = get_post_meta($pet->ID, 'apodos', true);
                                $titulo      = get_post_meta($pet->ID, 'titulo_honor', true);
                                $f_llegada   = get_post_meta($pet->ID, 'fecha_llegada', true);
                                $f_despedida = get_post_meta($pet->ID, 'fecha_despedida', true);
                                ?>
                                <div class="bp-grave-card">
                                    <div class="bp-grave-image" style="background-image: url('<?php echo $thumb ? esc_url($thumb) : BP_PLUGIN_URL . 'assets/css/placeholder-pet.png'; ?>');">
                                        <?php if ($is_approved) : ?>
                                            <span class="bp-status-badge" style="background:#27ae60; border:1px solid #ffffff;" title="Mascota Validada">
                                                ✔ Validada
                                            </span>
                                        <?php else : ?>
                                            <span class="bp-status-badge" style="background:#f39c12; border:1px solid #ffffff;" title="Pendiente de aprobación">
                                                ⏳ Pendiente
                                            </span>
                                        <?php endif; ?>
                                    </div>
                                    <div class="bp-grave-details">
                                        <h4>
                                            <?php echo esc_html(get_the_title($pet->ID)); ?>
                                            <?php if ($is_approved) : ?><span style="color:#27ae60; font-size:16px;">✔</span><?php endif; ?>
                                        </h4>

                                        <?php if ($titulo) : ?>
                                            <p class="bp-grave-coords" style="color:#2d6a4f; font-weight:bold;">👑 <?php echo esc_html($titulo); ?></p>
                                        <?php endif; ?>

                                        <?php if ($f_llegada || $f_despedida) : ?>
                                            <p class="bp-grave-coords">📅 <?php echo esc_html($f_llegada ?: '?'); ?> ➔ <?php echo esc_html($f_despedida ?: 'Eternidad'); ?></p>
                                        <?php endif; ?>

                                        <p class="bp-grave-coords">
                                            <?php echo $tumba_id > 0 ? '📍 Sepultada en Tumba 3D' : '🏠 Sin tumba asignada'; ?>
                                        </p>

                                        <div class="bp-grave-excerpt">
                                            <?php echo esc_html(wp_trim_words($pet->post_content, 12, '...')); ?>
                                        </div>

                                        <div class="bp-pet-card-actions" style="display:flex; gap:6px; flex-wrap:wrap; margin-top:auto;">
                                            <?php if ($tumba_id > 0) : ?>
                                                <a href="<?php echo esc_url($redirect_url); ?>" class="bp-btn bp-btn-sm bp-btn-green" style="flex:1; text-align:center;">
                                                    Ver en 3D
                                                </a>
                                                <button type="button" class="bp-btn bp-btn-sm bp-btn-outline bp-btn-unlink-pet" data-pet-id="<?php echo $pet->ID; ?>" style="flex:1;">
                                                    Quitar de Tumba
                                                </button>
                                            <?php else : ?>
                                                <a href="<?php echo esc_url(add_query_arg('edit_mascota', $pet->ID, get_permalink())); ?>" class="bp-btn bp-btn-sm bp-btn-outline" style="flex:1; text-align:center;">
                                                    ✏️ Editar
                                                </a>
                                                <?php if ($is_approved) : ?>
                                                    <a href="<?php echo esc_url($redirect_url); ?>" class="bp-btn bp-btn-sm bp-btn-green" style="flex:1; text-align:center;">
                                                        Colocar Tumba
                                                    </a>
                                                <?php endif; ?>
                                            <?php endif; ?>

                                            <button type="button" class="bp-btn bp-btn-sm bp-btn-danger bp-btn-delete-pet" data-pet-id="<?php echo $pet->ID; ?>" title="Eliminar Mascota">
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    <?php else : ?>
                        <div class="bp-empty-state">
                            <p>🐾 Aún no has registrado ninguna mascota en BosquePatitas.</p>
                            <p>Crea la ficha de tu mascota para solicitar su validación y asignarle una lápida en el cementerio 3D.</p>
                        </div>
                    <?php endif; ?>

                </div>

            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * AJAX Save / Edit Pet
     */
    public function ajax_save_mascota() {
        check_ajax_referer('bp_auth_nonce', 'bp_nonce');

        if (!is_user_logged_in()) {
            wp_send_json_error(array('message' => 'Debes iniciar sesión para realizar esta acción.'));
        }

        $user_id    = get_current_user_id();
        $pet_id     = isset($_POST['mascota_id']) ? absint($_POST['mascota_id']) : 0;
        $nombre     = isset($_POST['nombre']) ? sanitize_text_field($_POST['nombre']) : '';
        $historia   = isset($_POST['historia']) ? sanitize_textarea_field($_POST['historia']) : '';

        if (empty($nombre) || empty($historia)) {
            wp_send_json_error(array('message' => 'Por favor, completa los campos obligatorios (Nombre e Historia).'));
        }

        // Check if pet exists and check grave rule
        if ($pet_id > 0) {
            $existing = get_post($pet_id);
            if (!$existing || $existing->post_author != $user_id) {
                wp_send_json_error(array('message' => 'Mascota no encontrada o no te pertenece.'));
            }

            $in_grave = (int) get_post_meta($pet_id, 'tumba_id', true);
            if ($in_grave > 0) {
                wp_send_json_error(array('message' => 'No puedes editar una mascota que está actualmente en una tumba. Quítala de la tumba primero.'));
            }

            $post_data = array(
                'ID'           => $pet_id,
                'post_title'   => $nombre,
                'post_content' => $historia
            );
            wp_update_post($post_data);
        } else {
            $post_data = array(
                'post_title'   => $nombre,
                'post_content' => $historia,
                'post_type'    => 'bp_mascota',
                'post_status'  => 'publish',
                'post_author'  => $user_id
            );
            $pet_id = wp_insert_post($post_data);
            if (is_wp_error($pet_id)) {
                wp_send_json_error(array('message' => 'Error al guardar la mascota.'));
            }
        }

        // Every edit/creation sets is_approved to '0' (pending approval) and removes green checkmark
        update_post_meta($pet_id, 'is_approved', '0');

        // Save metadata fields
        $meta_fields = array(
            'apodos', 'titulo_honor', 'especie_raza', 'fecha_llegada', 'fecha_despedida',
            'stat_carino', 'stat_travesura', 'stat_bano', 'stat_pena', 'superpoder',
            'archienemigo', 'comida_favorita', 'travesura_epica', 'lugar_favorito',
            'juguete_estrella', 'carta_despedida', 'soundtrack_url'
        );

        foreach ($meta_fields as $field) {
            if (isset($_POST[$field])) {
                $val = is_numeric($_POST[$field]) ? intval($_POST[$field]) : sanitize_text_field($_POST[$field]);
                update_post_meta($pet_id, $field, $val);
            }
        }

        // Handle Image Upload if provided
        if (!empty($_FILES['foto_mascota']['name'])) {
            require_once(ABSPATH . 'wp-admin/includes/image.php');
            require_once(ABSPATH . 'wp-admin/includes/file.php');
            require_once(ABSPATH . 'wp-admin/includes/media.php');

            $attachment_id = media_handle_upload('foto_mascota', $pet_id);
            if (!is_wp_error($attachment_id)) {
                set_post_thumbnail($pet_id, $attachment_id);
            }
        }

        // Notify Admin Email about new/edited pet submission
        $admin_email = get_option('admin_email');
        $user        = get_userdata($user_id);
        $subject     = '🐾 Nueva Ficha de Mascota para Aprobación: ' . $nombre;
        $message     = "El usuario " . ($user->display_name ?: $user->user_login) . " (" . $user->user_email . ") ha enviado la ficha de la mascota \"" . $nombre . "\" para aprobación.\n\nPuedes revisarla y aprobarla desde el panel de administración de BosquePatitas:\n" . admin_url('edit.php?post_type=mascota_tumba&page=bp-aprobar-mascotas');

        wp_mail($admin_email, $subject, $message);

        $profile_page_id = (int) get_option('bp_profile_page_id', 0);
        $profile_url     = $profile_page_id ? get_permalink($profile_page_id) : get_permalink();

        wp_send_json_success(array(
            'message'  => '¡Ficha enviada con éxito! Ha quedado pendiente de aprobación por el equipo.',
            'redirect' => $profile_url
        ));
    }

    /**
     * AJAX Unlink Pet from Grave
     */
    public function ajax_unlink_mascota() {
        check_ajax_referer('bp_auth_nonce', 'bp_nonce');

        if (!is_user_logged_in()) {
            wp_send_json_error(array('message' => 'Acceso no autorizado.'));
        }

        $user_id = get_current_user_id();
        $pet_id  = isset($_POST['mascota_id']) ? absint($_POST['mascota_id']) : 0;

        $pet = get_post($pet_id);
        if (!$pet || $pet->post_author != $user_id) {
            wp_send_json_error(array('message' => 'Mascota no válida.'));
        }

        $tumba_id = (int) get_post_meta($pet_id, 'tumba_id', true);
        if ($tumba_id > 0) {
            wp_delete_post($tumba_id, true);
        }

        update_post_meta($pet_id, 'tumba_id', 0);

        wp_send_json_success(array(
            'message'  => 'Mascota retirada de la tumba con éxito. Ahora puedes editarla o reasignarla.',
            'redirect' => get_permalink()
        ));
    }

    /**
     * AJAX Delete Pet
     */
    public function ajax_delete_mascota() {
        check_ajax_referer('bp_auth_nonce', 'bp_nonce');

        if (!is_user_logged_in()) {
            wp_send_json_error(array('message' => 'Acceso no autorizado.'));
        }

        $user_id = get_current_user_id();
        $pet_id  = isset($_POST['mascota_id']) ? absint($_POST['mascota_id']) : 0;

        $pet = get_post($pet_id);
        if (!$pet || $pet->post_author != $user_id) {
            wp_send_json_error(array('message' => 'Mascota no válida.'));
        }

        $tumba_id = (int) get_post_meta($pet_id, 'tumba_id', true);
        if ($tumba_id > 0) {
            wp_delete_post($tumba_id, true);
        }

        wp_delete_post($pet_id, true);

        wp_send_json_success(array(
            'message'  => 'Mascota eliminada con éxito.',
            'redirect' => get_permalink()
        ));
    }
}

new BP_Profile();
