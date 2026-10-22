<?php
if (!defined('ABSPATH')) exit;

class BP_Profile {

    public function __construct() {
        add_filter('the_content', array($this, 'inject_profile_page'));

        // AJAX handlers for pet management
        add_action('wp_ajax_bp_ajax_save_mascota', array($this, 'ajax_save_mascota'));
        add_action('wp_ajax_bp_ajax_unlink_mascota', array($this, 'ajax_unlink_mascota'));
        add_action('wp_ajax_bp_ajax_delete_mascota', array($this, 'ajax_delete_mascota'));
        add_action('wp_ajax_bp_get_user_mascotas', array($this, 'ajax_get_user_mascotas'));

        add_action('wp_ajax_nopriv_bp_ajax_save_mascota', array($this, 'ajax_save_mascota'));
        add_action('wp_ajax_nopriv_bp_ajax_unlink_mascota', array($this, 'ajax_unlink_mascota'));
        add_action('wp_ajax_nopriv_bp_ajax_delete_mascota', array($this, 'ajax_delete_mascota'));
        add_action('wp_ajax_nopriv_bp_get_user_mascotas', array($this, 'ajax_get_user_mascotas'));
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

            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * AJAX Fetch Logged In User Pets with Full Metadata
     */
    public function ajax_get_user_mascotas() {
        if (!is_user_logged_in()) {
            wp_send_json_success(array());
        }

        $user_id = get_current_user_id();
        $cpt_obj = new BP_Custom_Post_Type();

        $args = array(
            'post_type'      => 'bp_mascota',
            'post_status'    => array('publish', 'pending', 'draft'),
            'author'         => $user_id,
            'posts_per_page' => -1,
            'orderby'        => 'date',
            'order'          => 'DESC'
        );

        $query = new WP_Query($args);
        $result = array();

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $post = $query->post;
                $details = $cpt_obj->get_formatted_mascota_data($post);

                $result[] = array(
                    'id'              => $post->ID,
                    'title'           => array('rendered' => get_the_title($post->ID)),
                    'author'          => $post->post_author,
                    'mascota_details' => $details
                );
            }
            wp_reset_postdata();
        }

        wp_send_json_success($result);
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

        // Save metadata fields with character limits
        $meta_fields = array(
            'apodos', 'epitafio', 'titulo_honor', 'especie_raza', 'fecha_llegada', 'fecha_despedida',
            'stat_carino', 'stat_travesura', 'stat_bano', 'stat_pena', 'superpoder',
            'archienemigo', 'comida_favorita', 'travesura_epica', 'lugar_favorito',
            'juguete_estrella', 'carta_despedida', 'soundtrack_url'
        );

        foreach ($meta_fields as $field) {
            if (isset($_POST[$field])) {
                if ($field === 'apodos') {
                    $val = mb_substr(sanitize_text_field($_POST[$field]), 0, 30);
                } elseif ($field === 'epitafio') {
                    $val = mb_substr(sanitize_text_field($_POST[$field]), 0, 60);
                } else {
                    $val = is_numeric($_POST[$field]) ? intval($_POST[$field]) : sanitize_text_field($_POST[$field]);
                }
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
