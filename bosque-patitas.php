<?php
/**
 * Plugin Name: BosquePatitas 3D
 * Plugin URI:  https://bosquepatitas.com
 * Description: Cementerio virtual 3D para mascotas conectado vía REST API y Three.js.
 * Version:     1.0.0
 * Author:      BosquePatitas
 * Text Domain: bosque-patitas
 */

if (!defined('ABSPATH')) {
    exit; // Evitar acceso directo
}

define('BP_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('BP_PLUGIN_URL', plugin_dir_url(__FILE__));

// Cargar módulos
require_once BP_PLUGIN_DIR . 'includes/class-cpt.php';
require_once BP_PLUGIN_DIR . 'includes/class-settings.php';
require_once BP_PLUGIN_DIR . 'includes/class-auth.php';
require_once BP_PLUGIN_DIR . 'includes/class-profile.php';

class BosquePatitas {

    public function __construct() {
        // Desactivar admin bar de WordPress para todos los usuarios
        add_filter('show_admin_bar', '__return_false');

        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_shortcode('bosque_patitas_3d', array($this, 'render_shortcode'));
    }

    public function enqueue_assets() {
        // Cargar Three.js desde CDN para rendimiento
        wp_register_script('threejs', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', array(), '128', true);

        // Cargar OrbitControls de Three.js
        wp_register_script('three-orbitcontrols', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js', array('threejs'), '128', true);

        // Cargar nuestro script 3D principal
        wp_register_script(
            'bp-main-3d',
            BP_PLUGIN_URL . 'assets/js/main-3d.js',
            array('threejs', 'three-orbitcontrols'),
            '1.0.0',
            true
        );

        // Cargar CSS principal 3D
        wp_register_style('bp-style', BP_PLUGIN_URL . 'assets/css/style.css', array(), '1.0.0');

        // Styles and scripts for Auth & Profile pages
        wp_register_style('bp-auth-profile-css', BP_PLUGIN_URL . 'assets/css/auth-profile.css', array(), '1.0.0');
        wp_register_script('bp-auth-profile-js', BP_PLUGIN_URL . 'assets/js/auth-profile.js', array(), '1.0.0', true);

        $login_page_id   = (int) get_option('bp_login_page_id', 0);
        $profile_page_id = (int) get_option('bp_profile_page_id', 0);

        if (is_page($login_page_id) || is_page($profile_page_id)) {
            wp_enqueue_style('bp-auth-profile-css');
            wp_enqueue_script('bp-auth-profile-js');

            wp_localize_script('bp-auth-profile-js', 'BP_Auth_Data', array(
                'ajaxurl' => admin_url('admin-ajax.php'),
                'nonce'   => wp_create_nonce('bp_auth_nonce')
            ));
        }
    }

    public function render_shortcode() {
        wp_enqueue_script('bp-main-3d');
        wp_enqueue_style('bp-style');

        // Pasar variables de WP a JavaScript
        wp_localize_script('bp-main-3d', 'BP_Settings', array(
            'apiUrl' => esc_url_raw(rest_url('wp/v2/tumbas')),
            'nonce'  => wp_create_nonce('wp_rest')
        ));

        return '<div id="bp-canvas-container"><div id="bp-loading">Cargando BosquePatitas...</div></div>';
    }
}

new BosquePatitas();
