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
require_once BP_PLUGIN_DIR . 'includes/class-admin-mascotas.php';
require_once BP_PLUGIN_DIR . 'includes/class-admin-glb.php';
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

        // Cargar GLTFLoader de Three.js
        wp_register_script('three-gltfloader', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js', array('threejs'), '128', true);

        // Cargar fflate y FBXLoader para compatibilidad con Mixamo FBX
        wp_register_script('fflate', 'https://cdn.jsdelivr.net/npm/fflate@0.7.4/umd/index.js', array(), '0.7.4', true);
        wp_register_script('three-fbxloader', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/FBXLoader.js', array('threejs', 'fflate'), '128', true);
        wp_register_script('three-skeletonutils', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js', array('threejs'), '128', true);

        // Cargar Pusher JS SDK desde CDN
        wp_register_script('pusher-js', 'https://js.pusher.com/8.2.0/pusher.min.js', array(), '8.2.0', true);

        // Cargar nuestro script 3D principal
        wp_register_script(
            'bp-main-3d',
            BP_PLUGIN_URL . 'assets/js/main-3d.js',
            array('threejs', 'three-orbitcontrols', 'three-gltfloader', 'fflate', 'three-fbxloader', 'three-skeletonutils', 'pusher-js'),
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

        // Always enqueue auth & profile assets on frontend so forms and AJAX work reliably
        wp_enqueue_style('bp-auth-profile-css');
        wp_enqueue_script('bp-auth-profile-js');

        wp_localize_script('bp-auth-profile-js', 'BP_Auth_Data', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce'   => wp_create_nonce('bp_auth_nonce')
        ));
    }

    public function render_shortcode() {
        wp_enqueue_script('bp-main-3d');
        wp_enqueue_style('bp-style');

        $is_logged_in = is_user_logged_in();
        $current_user = $is_logged_in ? wp_get_current_user() : null;

        $login_page_id   = (int) get_option('bp_login_page_id', 0);
        $profile_page_id = (int) get_option('bp_profile_page_id', 0);

        $login_url   = $login_page_id ? get_permalink($login_page_id) : wp_login_url();
        $profile_url = $profile_page_id ? get_permalink($profile_page_id) : admin_url('profile.php');

        $approved_pets = array();
        $avatar_config = array(
            'avatar_type'     => 'human',
            'category'        => 'human',
            'pet_species'     => 'dog',
            'glb_id'          => '',
            'glb_url'         => '',
            'anim_idle'       => '',
            'anim_walk'       => '',
            'anim_kneel_down' => '',
            'anim_kneel_idle' => '',
            'fbx_animations'  => array(),
            'skin'            => '#ffe0bd',
            'shirt'           => '#10b981',
            'pants'           => '#1e3a8a',
            'hair_style'      => 'classic',
            'hair_color'      => '#3b2314',
            'accessory'       => 'none',
            'incognito'       => 0
        );

        if ($is_logged_in) {
            $pets = get_posts(array(
                'post_type'      => 'bp_mascota',
                'author'         => $current_user->ID,
                'posts_per_page' => -1,
                'post_status'    => 'publish',
                'meta_query'     => array(
                    array(
                        'key'     => 'is_approved',
                        'value'   => '1',
                        'compare' => '='
                    )
                )
            ));

            foreach ($pets as $p) {
                $tumba_id = (int) get_post_meta($p->ID, 'tumba_id', true);
                if ($tumba_id === 0) {
                    $approved_pets[] = array(
                        'id'     => $p->ID,
                        'nombre' => get_the_title($p->ID),
                        'especie' => get_post_meta($p->ID, 'especie_raza', true) ?: 'Mascota'
                    );
                }
            }

            $user_avatar = get_user_meta($current_user->ID, 'bp_avatar_config', true);
            if (is_array($user_avatar)) {
                $avatar_config = array_merge($avatar_config, $user_avatar);
            }
        }

        $pusher_key          = get_option('bp_pusher_app_key', '');
        $pusher_cluster      = get_option('bp_pusher_cluster', 'eu');
        $show_version_badge  = (get_option('bp_show_version_badge', '1') === '1');

        // Retrieve Active GLB / FBX Avatars
        $all_glb = get_option('bp_glb_avatars_list', array());
        $active_glb = array();
        if (is_array($all_glb)) {
            foreach ($all_glb as $g) {
                if (!empty($g['active']) && !empty($g['file_url'])) {
                    if (!empty($g['detected_materials']) && is_string($g['detected_materials'])) {
                        $decoded = json_decode($g['detected_materials'], true);
                        $g['detected_materials'] = is_array($decoded) ? $decoded : array();
                    }
                    if (!empty($g['custom_layers']) && is_string($g['custom_layers'])) {
                        $decoded_layers = json_decode($g['custom_layers'], true);
                        $g['custom_layers'] = is_array($decoded_layers) ? $decoded_layers : array();
                    } elseif (empty($g['custom_layers'])) {
                        $g['custom_layers'] = array();
                    }
                    if (!empty($g['fbx_animations']) && is_string($g['fbx_animations'])) {
                        $decoded_fbx = json_decode($g['fbx_animations'], true);
                        $g['fbx_animations'] = is_array($decoded_fbx) ? $decoded_fbx : array();
                    } elseif (empty($g['fbx_animations'])) {
                        $g['fbx_animations'] = array();
                    }
                    $active_glb[] = $g;
                }
            }
        }

        // Sincronizar dinámicamente el avatar del usuario con la configuración del backend si es un modelo GLB/FBX
        if (isset($avatar_config['avatar_type']) && $avatar_config['avatar_type'] === 'glb') {
            $matched_backend_model = null;
            if (!empty($avatar_config['glb_id'])) {
                foreach ($active_glb as $active_item) {
                    if (isset($active_item['id']) && (string) $active_item['id'] === (string) $avatar_config['glb_id']) {
                        $matched_backend_model = $active_item;
                        break;
                    }
                }
            }
            if ($matched_backend_model) {
                // Siempre usar la URL y metadatos actualizados del backend
                $avatar_config['glb_url']  = $matched_backend_model['file_url'];
                if (isset($matched_backend_model['scale'])) $avatar_config['scale'] = $matched_backend_model['scale'];
                if (isset($matched_backend_model['offset_y'])) $avatar_config['offset_y'] = $matched_backend_model['offset_y'];
            } elseif (!empty($avatar_config['glb_url']) && strpos($avatar_config['glb_url'], 'Ch22_female_avatar.glb') !== false) {
                // Fallback de seguridad para rutas antiguas hacia la biblioteca de medios
                $avatar_config['glb_url'] = 'https://bosquepatitas.com/wp-content/uploads/2026/11/Ch22_female_avatar.glb';
            }
        }

        // Version & revision info
        $version    = '1.0.1';
        $revision   = 'Rev 2026.10.29-0850';
        $build_date = '29/10/2026 08:50';

        // Obtener animaciones globales
        $global_anims = class_exists('BP_Admin_GLB') ? BP_Admin_GLB::get_global_animations() : array();

        // Pasar variables de WP a JavaScript
        wp_localize_script('bp-main-3d', 'BP_Settings', array(
            'apiUrl'           => esc_url_raw(rest_url('wp/v2/tumbas')),
            'restRoot'         => esc_url_raw(rest_url()),
            'nonce'            => wp_create_nonce('wp_rest'),
            'authNonce'        => wp_create_nonce('bp_auth_nonce'),
            'isLoggedIn'       => $is_logged_in,
            'currentUserId'    => get_current_user_id(),
            'userName'         => $is_logged_in ? esc_html($current_user->display_name ?: $current_user->user_login) : '',
            'loginUrl'         => esc_url($login_url),
            'profileUrl'       => esc_url($profile_url),
            'approvedPets'     => $approved_pets,
            'avatar'           => $avatar_config,
            'glbAvatars'       => $active_glb,
            'globalAnimations' => $global_anims,
            'pusherKey'        => esc_attr($pusher_key),
            'pusherCluster'    => esc_attr($pusher_cluster),
            'showVersionBadge' => $show_version_badge,
            'version'          => $version,
            'revision'         => $revision,
            'buildDate'        => $build_date
        ));

        return '<div id="bp-canvas-container"><div id="bp-loading">Cargando BosquePatitas...</div></div>';
    }
}

new BosquePatitas();
