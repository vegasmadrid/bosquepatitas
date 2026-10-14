<?php
if (!defined('ABSPATH')) exit;

class BP_Profile {

    public function __construct() {
        add_filter('the_content', array($this, 'inject_profile_page'));
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

        // Fetch user's graves/pets
        $user_graves = get_posts(array(
            'post_type'      => 'mascota_tumba',
            'author'         => $current_user->ID,
            'posts_per_page' => -1,
            'post_status'    => array('publish', 'pending', 'draft')
        ));

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

                <!-- User Content Section: Tumbas / Mascotas -->
                <div class="bp-profile-content">
                    <div class="bp-section-title">
                        <h3>Mis Mascotas y Tumbas (<?php echo count($user_graves); ?>)</h3>
                    </div>

                    <?php if (!empty($user_graves)) : ?>
                        <div class="bp-graves-grid">
                            <?php foreach ($user_graves as $grave) : ?>
                                <?php
                                $thumb = get_the_post_thumbnail_url($grave->ID, 'medium');
                                $x = get_post_meta($grave->ID, 'posicion_x', true);
                                $y = get_post_meta($grave->ID, 'posicion_y', true);
                                $z = get_post_meta($grave->ID, 'posicion_z', true);
                                ?>
                                <div class="bp-grave-card">
                                    <div class="bp-grave-image" style="background-image: url('<?php echo $thumb ? esc_url($thumb) : BP_PLUGIN_URL . 'assets/css/placeholder-pet.png'; ?>');">
                                        <span class="bp-status-badge bp-status-<?php echo esc_attr($grave->post_status); ?>">
                                            <?php echo esc_html(ucfirst($grave->post_status)); ?>
                                        </span>
                                    </div>
                                    <div class="bp-grave-details">
                                        <h4><?php echo esc_html($grave->post_title); ?></h4>
                                        <p class="bp-grave-coords">📍 Coordenadas: X: <?php echo esc_html($x ? $x : '0'); ?>, Y: <?php echo esc_html($y ? $y : '0.5'); ?>, Z: <?php echo esc_html($z ? $z : '0'); ?></p>
                                        <div class="bp-grave-excerpt">
                                            <?php echo esc_html(wp_trim_words($grave->post_content, 12, '...')); ?>
                                        </div>
                                        <a href="<?php echo esc_url($redirect_url); ?>" class="bp-btn bp-btn-sm bp-btn-outline">
                                            Ver en 3D
                                        </a>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    <?php else : ?>
                        <div class="bp-empty-state">
                            <p>🐾 Aún no has registrado ninguna tumba en el bosque.</p>
                            <a href="<?php echo esc_url($redirect_url); ?>" class="bp-btn bp-btn-primary">Visitar el Bosque 3D</a>
                        </div>
                    <?php endif; ?>

                </div>

            </div>
        </div>
        <?php
        return ob_get_clean();
    }
}

new BP_Profile();
