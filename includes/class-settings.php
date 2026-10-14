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

                <?php submit_button('Guardar Cambios'); ?>
            </form>
        </div>
        <?php
    }
}

new BP_Admin_Settings();
