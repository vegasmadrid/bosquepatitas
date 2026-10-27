<?php
if (!defined('ABSPATH')) exit;

class BP_Admin_Settings {

    public function __construct() {
        add_action('admin_menu', array($this, 'add_settings_page'));
        add_action('admin_init', array($this, 'register_settings'));
    }

    public function add_settings_page() {
        add_submenu_page(
            'edit.php?post_type=mascota_tumba',
            'Configuración BosquePatitas',
            'Ajustes de Login y Perfil',
            'manage_options',
            'bp-settings',
            array($this, 'render_settings_page')
        );
    }

    public function register_settings() {
        register_setting('bp_settings_group', 'bp_login_page_id', array(
            'type' => 'integer',
            'sanitize_callback' => 'absint',
            'default' => 0
        ));

        register_setting('bp_settings_group', 'bp_profile_page_id', array(
            'type' => 'integer',
            'sanitize_callback' => 'absint',
            'default' => 0
        ));

        register_setting('bp_settings_group', 'bp_redirect_url', array(
            'type' => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default' => 'https://bosquepatitas.com/bosque-patitas/'
        ));

        register_setting('bp_settings_group', 'bp_register_redirect_url', array(
            'type' => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default' => 'https://bosquepatitas.com/bosque-patitas/'
        ));

        register_setting('bp_settings_group', 'bp_email_approval_subject', array(
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => '¡Enhorabuena! Tu mascota {nombre_mascota} ha sido validada 🐾'
        ));

        register_setting('bp_settings_group', 'bp_email_approval_body', array(
            'type' => 'string',
            'sanitize_callback' => 'wp_kses_post',
            'default' => "¡Hola {nombre_usuario}!\n\nNos alegra informarte de que la ficha de tu querida mascota \"{nombre_mascota}\" ha sido revisada y aprobada por nuestro equipo.\n\nAhora tu mascota cuenta con el distintivo de verificación verde ✔ y ya puedes asignarle una parcela libre en el cementerio 3D de BosquePatitas.\n\nAccede a tu perfil o al cementerio 3D para colocar su tumba:\n{link_bosque}\n\nUn cálido abrazo,\nEl equipo de BosquePatitas"
        ));

        // Pusher Realtime Credentials
        register_setting('bp_settings_group', 'bp_pusher_app_key', array(
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => ''
        ));

        register_setting('bp_settings_group', 'bp_pusher_cluster', array(
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => 'eu'
        ));

        register_setting('bp_settings_group', 'bp_pusher_app_secret', array(
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => ''
        ));

        register_setting('bp_settings_group', 'bp_pusher_app_id', array(
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => ''
        ));
    }

    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }

        $login_page_id          = get_option('bp_login_page_id', 0);
        $profile_page_id        = get_option('bp_profile_page_id', 0);
        $redirect_url           = get_option('bp_redirect_url', 'https://bosquepatitas.com/bosque-patitas/');
        $register_redirect_url  = get_option('bp_register_redirect_url', 'https://bosquepatitas.com/bosque-patitas/');

        $pages = get_pages();
        ?>
        <div class="wrap">
            <h1>Configuración BosquePatitas</h1>
            <p>Configura las páginas del sitio para el sistema de acceso, registro y perfil de usuario.</p>

            <form method="post" action="options.php">
                <?php
                settings_fields('bp_settings_group');
                do_settings_sections('bp_settings_group');
                ?>
                <table class="form-table">
                    <tr valign="top">
                        <th scope="row">Página de Login / Registro</th>
                        <td>
                            <select name="bp_login_page_id" id="bp_login_page_id">
                                <option value="0">-- Selecciona una página --</option>
                                <?php foreach ($pages as $page) : ?>
                                    <option value="<?php echo esc_attr($page->ID); ?>" <?php selected($login_page_id, $page->ID); ?>>
                                        <?php echo esc_html($page->post_title); ?> (ID: <?php echo $page->ID; ?>)
                                    </option>
                                <?php endforeach; ?>
                            </select>
                            <p class="description">El formulario de inicio de sesión y registro se mostrará automáticamente en esta página.</p>
                        </td>
                    </tr>

                    <tr valign="top">
                        <th scope="row">Página de Perfil de Usuario</th>
                        <td>
                            <select name="bp_profile_page_id" id="bp_profile_page_id">
                                <option value="0">-- Selecciona una página --</option>
                                <?php foreach ($pages as $page) : ?>
                                    <option value="<?php echo esc_attr($page->ID); ?>" <?php selected($profile_page_id, $page->ID); ?>>
                                        <?php echo esc_html($page->post_title); ?> (ID: <?php echo $page->ID; ?>)
                                    </option>
                                <?php endforeach; ?>
                            </select>
                            <p class="description">El panel de usuario (sus tumbas, datos de perfil, etc.) se mostrará automáticamente en esta página.</p>
                        </td>
                    </tr>

                    <tr valign="top">
                        <th scope="row">URL de Redirección tras Login</th>
                        <td>
                            <input type="url" name="bp_redirect_url" value="<?php echo esc_url($redirect_url); ?>" class="regular-text" />
                            <p class="description">Dirección URL a la que serán redirigidos los usuarios existentes tras iniciar sesión con éxito (ej: el bosque 3D).</p>
                        </td>
                    </tr>

                    <tr valign="top">
                        <th scope="row">URL de Redirección tras Registro</th>
                        <td>
                            <input type="url" name="bp_register_redirect_url" value="<?php echo esc_url($register_redirect_url); ?>" class="regular-text" />
                            <p class="description">Dirección URL a la que serán redirigidos los nuevos usuarios inmediatamente tras registrarse.</p>
                        </td>
                    </tr>
                </table>

                <h2>Plantilla de Correo de Aprobación de Mascota</h2>
                <p>Configura el mensaje automático que se enviará al usuario cuando su mascota sea aprobada por el administrador.</p>

                <table class="form-table">
                    <tr valign="top">
                        <th scope="row">Asunto del Correo</th>
                        <td>
                            <input type="text" name="bp_email_approval_subject" value="<?php echo esc_attr(get_option('bp_email_approval_subject', '¡Enhorabuena! Tu mascota {nombre_mascota} ha sido validada 🐾')); ?>" class="large-text" />
                        </td>
                    </tr>
                    <tr valign="top">
                        <th scope="row">Cuerpo del Correo</th>
                        <td>
                            <textarea name="bp_email_approval_body" rows="8" class="large-text"><?php echo esc_textarea(get_option('bp_email_approval_body', "¡Hola {nombre_usuario}!\n\nNos alegra informarte de que la ficha de tu querida mascota \"{nombre_mascota}\" ha sido revisada y aprobada por nuestro equipo.\n\nAhora tu mascota cuenta con el distintivo de verificación verde ✔ y ya puedes asignarle una parcela libre en el cementerio 3D de BosquePatitas.\n\nAccede a tu perfil o al cementerio 3D para colocar su tumba:\n{link_bosque}\n\nUn cálido abrazo,\nEl equipo de BosquePatitas")); ?></textarea>
                            <p class="description">Puedes usar las siguientes etiquetas automáticas: <code>{nombre_mascota}</code>, <code>{nombre_usuario}</code>, <code>{link_perfil}</code>, <code>{link_bosque}</code>.</p>
                        </td>
                    </tr>
                </table>

                <h2>Configuración de Pusher (Multijugador en Tiempo Real)</h2>
                <p>Ingresa las credenciales de tu cuenta gratuita de <a href="https://pusher.com" target="_blank" rel="noopener">Pusher Channels</a> para activar la sincronización multi-usuario instantánea en el cementerio 3D.</p>

                <table class="form-table">
                    <tr valign="top">
                        <th scope="row">Pusher App Key</th>
                        <td>
                            <input type="text" name="bp_pusher_app_key" value="<?php echo esc_attr(get_option('bp_pusher_app_key', '')); ?>" class="regular-text" />
                            <p class="description">Key pública de tu aplicación en Pusher.</p>
                        </td>
                    </tr>
                    <tr valign="top">
                        <th scope="row">Pusher Cluster</th>
                        <td>
                            <input type="text" name="bp_pusher_cluster" value="<?php echo esc_attr(get_option('bp_pusher_cluster', 'eu')); ?>" class="regular-text" placeholder="eu" />
                            <p class="description">Región/Cluster de Pusher (ej: <code>eu</code>, <code>us2</code>, etc.).</p>
                        </td>
                    </tr>
                    <tr valign="top">
                        <th scope="row">Pusher App Secret</th>
                        <td>
                            <input type="password" name="bp_pusher_app_secret" value="<?php echo esc_attr(get_option('bp_pusher_app_secret', '')); ?>" class="regular-text" />
                            <p class="description">Secret key de tu aplicación en Pusher.</p>
                        </td>
                    </tr>
                    <tr valign="top">
                        <th scope="row">Pusher App ID</th>
                        <td>
                            <input type="text" name="bp_pusher_app_id" value="<?php echo esc_attr(get_option('bp_pusher_app_id', '')); ?>" class="regular-text" />
                            <p class="description">ID numérico de tu aplicación en Pusher.</p>
                        </td>
                    </tr>
                </table>

                <?php submit_button('Guardar Cambios'); ?>
            </form>
        </div>
        <?php
    }
}

new BP_Admin_Settings();
