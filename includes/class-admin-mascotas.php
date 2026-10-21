<?php
if (!defined('ABSPATH')) exit;

class BP_Admin_Mascotas {

    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'handle_actions'));
    }

    public function add_admin_menu() {
        add_submenu_page(
            'edit.php?post_type=mascota_tumba',
            'Aprobar Mascotas',
            'Aprobar Mascotas',
            'manage_options',
            'bp-aprobar-mascotas',
            array($this, 'render_admin_page')
        );
    }

    public function handle_actions() {
        if (!current_user_can('manage_options')) return;

        if (isset($_GET['page']) && $_GET['page'] === 'bp-aprobar-mascotas' && isset($_GET['action'], $_GET['mascota_id'], $_GET['_wpnonce'])) {
            $mascota_id = absint($_GET['mascota_id']);
            $action     = sanitize_text_field($_GET['action']);

            if (!wp_verify_nonce($_GET['_wpnonce'], 'bp_action_mascota_' . $mascota_id)) {
                wp_die('Enlace caducado o no válido.');
            }

            if ($action === 'aprobar') {
                update_post_meta($mascota_id, 'is_approved', '1');
                $this->send_user_approval_email($mascota_id);

                wp_redirect(add_query_arg(array('page' => 'bp-aprobar-mascotas', 'msg' => 'approved'), admin_url('edit.php?post_type=mascota_tumba')));
                exit;
            } elseif ($action === 'rechazar') {
                update_post_meta($mascota_id, 'is_approved', '0');

                // If pet was in a grave, remove it from grave
                $tumba_id = (int) get_post_meta($mascota_id, 'tumba_id', true);
                if ($tumba_id > 0) {
                    wp_delete_post($tumba_id, true);
                    update_post_meta($mascota_id, 'tumba_id', 0);
                }

                wp_redirect(add_query_arg(array('page' => 'bp-aprobar-mascotas', 'msg' => 'rejected'), admin_url('edit.php?post_type=mascota_tumba')));
                exit;
            }
        }
    }

    public function send_user_approval_email($mascota_id) {
        $mascota = get_post($mascota_id);
        if (!$mascota) return;

        $user = get_userdata($mascota->post_author);
        if (!$user) return;

        $profile_page_id = (int) get_option('bp_profile_page_id', 0);
        $profile_url     = $profile_page_id ? get_permalink($profile_page_id) : home_url('/');
        $redirect_url    = get_option('bp_redirect_url', home_url('/'));

        $subject_template = get_option('bp_email_approval_subject', '¡Enhorabuena! Tu mascota {nombre_mascota} ha sido validada 🐾');
        $body_template    = get_option('bp_email_approval_body', "¡Hola {nombre_usuario}!\n\nNos alegra informarte de que la ficha de tu querida mascota \"{nombre_mascota}\" ha sido revisada y aprobada por nuestro equipo.\n\nAhora tu mascota cuenta con el distintivo de verificación verde ✔ y ya puedes asignarle una parcela libre en el cementerio 3D de BosquePatitas.\n\nAccede a tu perfil o al cementerio 3D para colocar su tumba:\n{link_bosque}\n\nUn cálido abrazo,\nEl equipo de BosquePatitas");

        $replacements = array(
            '{nombre_mascota}' => get_the_title($mascota_id),
            '{nombre_usuario}' => $user->display_name ?: $user->user_login,
            '{link_perfil}'    => $profile_url,
            '{link_bosque}'    => $redirect_url
        );

        $subject = str_replace(array_keys($replacements), array_values($replacements), $subject_template);
        $body    = str_replace(array_keys($replacements), array_values($replacements), $body_template);

        $headers = array('Content-Type: text/plain; charset=UTF-8');

        wp_mail($user->user_email, $subject, $body, $headers);
    }

    public function render_admin_page() {
        if (!current_user_can('manage_options')) return;

        $msg = isset($_GET['msg']) ? sanitize_text_field($_GET['msg']) : '';

        $pending_mascotas = get_posts(array(
            'post_type'      => 'bp_mascota',
            'posts_per_page' => -1,
            'post_status'    => array('publish', 'pending', 'draft', 'any'),
            'meta_query'     => array(
                'relation' => 'OR',
                array(
                    'key'     => 'is_approved',
                    'value'   => '0',
                    'compare' => '='
                ),
                array(
                    'key'     => 'is_approved',
                    'value'   => '1',
                    'compare' => '!='
                ),
                array(
                    'key'     => 'is_approved',
                    'compare' => 'NOT EXISTS'
                )
            )
        ));

        $approved_mascotas = get_posts(array(
            'post_type'      => 'bp_mascota',
            'posts_per_page' => -1,
            'post_status'    => array('publish', 'pending', 'draft', 'any'),
            'meta_query'     => array(
                array(
                    'key'     => 'is_approved',
                    'value'   => '1',
                    'compare' => '='
                )
            )
        ));

        ?>
        <div class="wrap">
            <h1>🐾 Aprobar Fichas de Mascotas - BosquePatitas</h1>

            <?php if ($msg === 'approved') : ?>
                <div class="notice notice-success is-dismissible"><p>¡Ficha de mascota aprobada con éxito y usuario notificado por correo!</p></div>
            <?php elseif ($msg === 'rejected') : ?>
                <div class="notice notice-warning is-dismissible"><p>Ficha de mascota rechazada.</p></div>
            <?php endif; ?>

            <h2>Fichas Pendientes de Aprobación (<?php echo count($pending_mascotas); ?>)</h2>

            <?php if (!empty($pending_mascotas)) : ?>
                <table class="widefat fixed striped">
                    <thead>
                        <tr>
                            <th style="width: 80px;">Foto</th>
                            <th>Mascota / Dueño</th>
                            <th>Identidad y Título</th>
                            <th>Fechas / Especie</th>
                            <th>Historia / Carta</th>
                            <th style="width: 180px;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($pending_mascotas as $m) : ?>
                            <?php
                            $thumb = get_the_post_thumbnail_url($m->ID, 'thumbnail');
                            $user  = get_userdata($m->post_author);
                            $apodos = get_post_meta($m->ID, 'apodos', true);
                            $titulo = get_post_meta($m->ID, 'titulo_honor', true);
                            $especie = get_post_meta($m->ID, 'especie_raza', true);
                            $f_llegada = get_post_meta($m->ID, 'fecha_llegada', true);
                            $f_despedida = get_post_meta($m->ID, 'fecha_despedida', true);
                            $carta = get_post_meta($m->ID, 'carta_despedida', true);

                            $approve_url = wp_nonce_url(
                                admin_url('edit.php?post_type=mascota_tumba&page=bp-aprobar-mascotas&action=aprobar&mascota_id=' . $m->ID),
                                'bp_action_mascota_' . $m->ID
                            );

                            $reject_url = wp_nonce_url(
                                admin_url('edit.php?post_type=mascota_tumba&page=bp-aprobar-mascotas&action=rechazar&mascota_id=' . $m->ID),
                                'bp_action_mascota_' . $m->ID
                            );
                            ?>
                            <tr>
                                <td>
                                    <?php if ($thumb) : ?>
                                        <img src="<?php echo esc_url($thumb); ?>" style="width:60px; height:60px; object-fit:cover; border-radius:8px;" />
                                    <?php else : ?>
                                        <span style="font-size:32px;">🐾</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <strong><?php echo esc_html(get_the_title($m->ID)); ?></strong><br />
                                    <small>Dueño: <?php echo esc_html($user ? $user->display_name : 'Anónimo'); ?> (<?php echo esc_html($user ? $user->user_email : ''); ?>)</small>
                                </td>
                                <td>
                                    <strong>Título:</strong> <?php echo esc_html($titulo ?: '-'); ?><br />
                                    <small>Apodos: <?php echo esc_html($apodos ?: '-'); ?></small>
                                </td>
                                <td>
                                    <strong>Especie:</strong> <?php echo esc_html($especie ?: '-'); ?><br />
                                    <small>Llegada: <?php echo esc_html($f_llegada ?: '-'); ?> | Despedida: <?php echo esc_html($f_despedida ?: '-'); ?></small>
                                </td>
                                <td>
                                    <strong>Anécdota:</strong> <?php echo esc_html(wp_trim_words($m->post_content, 15)); ?><br />
                                    <?php if ($carta) : ?>
                                        <small><strong>Carta:</strong> <?php echo esc_html(wp_trim_words($carta, 10)); ?></small>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <a href="<?php echo esc_url($approve_url); ?>" class="button button-primary" style="background:#27ae60; border-color:#27ae60;">
                                        ✔ Aprobar
                                    </a>
                                    <a href="<?php echo esc_url($reject_url); ?>" class="button button-secondary" onclick="return confirm('¿Seguro que deseas rechazar esta ficha?');">
                                        ✖ Rechazar
                                    </a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php else : ?>
                <p>No hay fichas de mascotas pendientes de aprobación en este momento. 🎉</p>
            <?php endif; ?>

            <br /><hr /><br />

            <h2>Fichas Aprobadas (<?php echo count($approved_mascotas); ?>)</h2>
            <?php if (!empty($approved_mascotas)) : ?>
                <table class="widefat fixed striped">
                    <thead>
                        <tr>
                            <th style="width: 60px;">Foto</th>
                            <th>Mascota</th>
                            <th>Dueño</th>
                            <th>Especie / Título</th>
                            <th>Tumba Asignada</th>
                            <th style="width: 120px;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($approved_mascotas as $m) : ?>
                            <?php
                            $thumb = get_the_post_thumbnail_url($m->ID, 'thumbnail');
                            $user  = get_userdata($m->post_author);
                            $tumba_id = (int) get_post_meta($m->ID, 'tumba_id', true);

                            $reject_url = wp_nonce_url(
                                admin_url('edit.php?post_type=mascota_tumba&page=bp-aprobar-mascotas&action=rechazar&mascota_id=' . $m->ID),
                                'bp_action_mascota_' . $m->ID
                            );
                            ?>
                            <tr>
                                <td>
                                    <?php if ($thumb) : ?>
                                        <img src="<?php echo esc_url($thumb); ?>" style="width:40px; height:40px; object-fit:cover; border-radius:6px;" />
                                    <?php else : ?>
                                        🐾
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <strong><?php echo esc_html(get_the_title($m->ID)); ?></strong> <span style="color:#27ae60; font-weight:bold;">✔</span>
                                </td>
                                <td><?php echo esc_html($user ? $user->display_name : 'Anónimo'); ?></td>
                                <td><?php echo esc_html(get_post_meta($m->ID, 'especie_raza', true) ?: '-'); ?></td>
                                <td><?php echo $tumba_id > 0 ? '📍 Tumba ID #' . $tumba_id : 'En Espera de Asignación'; ?></td>
                                <td>
                                    <a href="<?php echo esc_url($reject_url); ?>" class="button button-small" onclick="return confirm('¿Revocar aprobación de esta mascota?');">
                                        Revocar
                                    </a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
        <?php
    }
}

new BP_Admin_Mascotas();
