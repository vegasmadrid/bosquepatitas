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

        // Cargar loaders GLB/FBX de Three.js (necesarios para los avatares con modelo 3D,
        // como la Tutora Mujer) en el frontend, igual que ya se cargan en el admin.
        wp_register_script('fflate', 'https://cdn.jsdelivr.net/npm/fflate@0.7.4/umd/index.js', array(), '0.7.4', true);
        wp_register_script('three-skeletonutils', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js', array('threejs'), '128', true);
        wp_register_script('three-gltfloader', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js', array('threejs'), '128', true);
        wp_register_script('three-fbxloader', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/FBXLoader.js', array('threejs', 'fflate'), '128', true);

        // Cargar Pusher JS SDK desde CDN
        wp_register_script('pusher-js', 'https://js.pusher.com/8.2.0/pusher.min.js', array(), '8.2.0', true);

        // Entorno natural (cielo, césped, baldosas y árboles procedurales). La versión es la
        // fecha del archivo para que el navegador no sirva una copia antigua tras actualizar.
        wp_register_script(
            'bp-environment',
            BP_PLUGIN_URL . 'assets/js/bp-environment.js',
            array('threejs'),
            (string) @filemtime(BP_PLUGIN_DIR . 'assets/js/bp-environment.js'),
            true
        );

        // Cargar nuestro script 3D principal
        wp_register_script(
            'bp-main-3d',
            BP_PLUGIN_URL . 'assets/js/main-3d.js',
            array('threejs', 'three-orbitcontrols', 'three-skeletonutils', 'three-gltfloader', 'three-fbxloader', 'pusher-js', 'bp-environment'),
            (string) @filemtime(BP_PLUGIN_DIR . 'assets/js/main-3d.js'),
            true
        );

        // Cargar CSS principal 3D
        wp_register_style('bp-style', BP_PLUGIN_URL . 'assets/css/style.css', array(), (string) @filemtime(BP_PLUGIN_DIR . 'assets/css/style.css'));

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

    /**
     * Texturas fotográficas opcionales (assets/textures/).
     *
     * Solo se anuncian al navegador las que existen en disco, así que si la carpeta está
     * vacía no se hace ninguna petición. Se descargan durante la pantalla de carga y
     * sustituyen a las texturas procedurales. Ver assets/textures/LEEME.md.
     */
    private function get_photo_textures() {
        $dir = BP_PLUGIN_DIR . 'assets/textures/';
        $url = BP_PLUGIN_URL . 'assets/textures/';

        // Tamaño real (en metros) que cubre cada textura. Se puede ajustar en config.json.
        $sizes = array('grass' => 2.0, 'paving' => 2.0, 'bark' => 1.0);
        $config_file = $dir . 'config.json';
        if (is_readable($config_file)) {
            $config = json_decode((string) file_get_contents($config_file), true);
            if (is_array($config)) {
                foreach ($sizes as $name => $default) {
                    if (isset($config[$name]) && is_numeric($config[$name]) && $config[$name] > 0) {
                        $sizes[$name] = (float) $config[$name];
                    }
                }
            }
        }

        $sets = array();
        foreach ($sizes as $name => $size) {
            $entry = array('size' => $size);
            foreach (array('color', 'normal', 'rough') as $slot) {
                foreach (array('webp', 'jpg', 'png') as $ext) {
                    $file = $name . '_' . $slot . '.' . $ext;
                    if (file_exists($dir . $file)) {
                        $entry[$slot] = esc_url_raw($url . $file . '?v=' . filemtime($dir . $file));
                        break;
                    }
                }
            }
            if (!empty($entry['color'])) {
                $sets[$name] = $entry;
            }
        }
        return $sets;
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
            'human_gender'    => 'male',
            'gender'          => 'male',
            'hair_color'      => '#3b2314',
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
            } elseif (!empty($avatar_config['glb_url']) && preg_match('/ch22_female_avatar\.glb|mujer\.glb/i', $avatar_config['glb_url'])) {
                // Fallback de seguridad para rutas antiguas (nombre de archivo anterior o
                // biblioteca de medios): usar siempre el modelo fijo del propio plugin.
                $avatar_config['glb_url'] = BP_PLUGIN_URL . 'assets/models/Mujer.glb';
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
            'pluginUrl'        => esc_url_raw(BP_PLUGIN_URL),
            'apiUrl'           => esc_url_raw(rest_url('wp/v2/tumbas')),
            'ajaxUrl'          => admin_url('admin-ajax.php'),
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
            'photoTextures'    => (object) $this->get_photo_textures(),
            'pusherKey'        => esc_attr($pusher_key),
            'pusherCluster'    => esc_attr($pusher_cluster),
            'showVersionBadge' => $show_version_badge,
            'version'          => $version,
            'revision'         => $revision,
            'buildDate'        => $build_date
        ));

        return '<div id="bp-canvas-container">' . $this->render_loader() . '</div>';
    }

    /**
     * Pantalla de carga: huella dentro de un anillo que se va completando, con porcentaje.
     *
     * El script en línea arranca antes de que lleguen Three.js y main-3d.js, para que el
     * porcentaje avance desde el primer momento; después main-3d.js lo dirige con
     * window.BPLoader.set(porcentaje, texto) y BPLoader.finish().
     */
    private function render_loader() {
        $motes = str_repeat('<i></i>', 14);
        return <<<HTML
<style>
/* Estilos en línea para que la pantalla de carga salga bien desde el primer pintado.
   Solo se animan transform y opacity: la animación sigue aunque se esté construyendo la escena. */
#bp-loading {
    position: fixed;
    inset: 0;
    z-index: 2147483000;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    color: #ecfdf5;
    background: radial-gradient(120% 90% at 50% 36%, #1f4f3a 0%, #102c21 46%, #07140f 100%);
    transition: opacity 0.7s ease, visibility 0.7s ease;
    pointer-events: auto;
}

#bp-loading.bp-load-done {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
}

.bp-load-core {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 24px;
}

.bp-load-emblem {
    position: relative;
    width: 136px;
    height: 136px;
    margin-bottom: 22px;
}

.bp-load-emblem::before {
    content: '';
    position: absolute;
    inset: -34px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(52, 211, 153, 0.34) 0%, rgba(52, 211, 153, 0) 68%);
    animation: bp-load-breathe 3.4s ease-in-out infinite;
}

.bp-load-ring {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
}

.bp-load-ring-track {
    fill: none;
    stroke: rgba(255, 255, 255, 0.12);
    stroke-width: 3.5;
}

.bp-load-ring-fill {
    fill: none;
    stroke: url(#bp-load-grad);
    stroke-width: 3.5;
    stroke-linecap: round;
    stroke-dasharray: 339.3;
    stroke-dashoffset: 339.3;
}

/* Punto de luz que recorre el anillo: da vida aunque el porcentaje se detenga un momento */
.bp-load-orbit {
    position: absolute;
    inset: 0;
    animation: bp-load-spin 2.8s linear infinite;
}

.bp-load-orbit::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 50%;
    width: 7px;
    height: 7px;
    margin-left: -3.5px;
    border-radius: 50%;
    background: #fef3c7;
    box-shadow: 0 0 12px 3px rgba(253, 230, 138, 0.75);
}

.bp-load-paw {
    position: absolute;
    top: 27%;
    left: 27%;
    width: 46%;
    height: 46%;
    fill: #d1fae5;
    filter: drop-shadow(0 0 10px rgba(110, 231, 183, 0.5));
    animation: bp-load-paw 3.4s ease-in-out infinite;
}

.bp-load-title {
    font-size: 22px;
    font-weight: 600;
    letter-spacing: 0.6px;
    color: #f0fdf4;
}

.bp-load-status {
    margin-top: 6px;
    min-height: 18px;
    font-size: 13px;
    letter-spacing: 0.3px;
    color: #a7f3d0;
    opacity: 0.9;
}

.bp-load-percent {
    margin-top: 14px;
    font-size: 30px;
    font-weight: 300;
    font-variant-numeric: tabular-nums;
    color: #fef9c3;
}

.bp-load-percent small {
    margin-left: 2px;
    font-size: 15px;
    opacity: 0.7;
}

/* Luciérnagas que suben despacio */
.bp-load-motes {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.bp-load-motes i {
    position: absolute;
    bottom: -12px;
    left: 50%;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #fde68a;
    box-shadow: 0 0 10px 2px rgba(253, 230, 138, 0.55);
    opacity: 0;
    animation: bp-load-rise 11s linear infinite;
}

.bp-load-motes i:nth-child(1)  { left: 6%;  animation-duration: 12s; animation-delay: -1s; }
.bp-load-motes i:nth-child(2)  { left: 14%; animation-duration: 9s;  animation-delay: -6s;  width: 3px; height: 3px; }
.bp-load-motes i:nth-child(3)  { left: 22%; animation-duration: 14s; animation-delay: -9s; }
.bp-load-motes i:nth-child(4)  { left: 30%; animation-duration: 10s; animation-delay: -3s;  width: 4px; height: 4px; }
.bp-load-motes i:nth-child(5)  { left: 38%; animation-duration: 13s; animation-delay: -11s; width: 3px; height: 3px; }
.bp-load-motes i:nth-child(6)  { left: 46%; animation-duration: 11s; animation-delay: -5s; }
.bp-load-motes i:nth-child(7)  { left: 54%; animation-duration: 15s; animation-delay: -2s;  width: 3px; height: 3px; }
.bp-load-motes i:nth-child(8)  { left: 62%; animation-duration: 10s; animation-delay: -8s; }
.bp-load-motes i:nth-child(9)  { left: 70%; animation-duration: 12s; animation-delay: -4s;  width: 4px; height: 4px; }
.bp-load-motes i:nth-child(10) { left: 78%; animation-duration: 9s;  animation-delay: -7s; }
.bp-load-motes i:nth-child(11) { left: 86%; animation-duration: 14s; animation-delay: -10s; width: 3px; height: 3px; }
.bp-load-motes i:nth-child(12) { left: 93%; animation-duration: 11s; animation-delay: -0.5s; }
.bp-load-motes i:nth-child(13) { left: 34%; animation-duration: 16s; animation-delay: -13s; width: 3px; height: 3px; }
.bp-load-motes i:nth-child(14) { left: 66%; animation-duration: 13s; animation-delay: -6.5s; width: 4px; height: 4px; }

@keyframes bp-load-rise {
    0%   { transform: translate3d(0, 0, 0); opacity: 0; }
    12%  { opacity: 0.85; }
    50%  { transform: translate3d(22px, -55vh, 0); opacity: 0.6; }
    88%  { opacity: 0.5; }
    100% { transform: translate3d(-14px, -112vh, 0); opacity: 0; }
}

@keyframes bp-load-breathe {
    0%, 100% { transform: scale(0.92); opacity: 0.55; }
    50%      { transform: scale(1.08); opacity: 1; }
}

@keyframes bp-load-paw {
    0%, 100% { transform: scale(1); opacity: 0.88; }
    50%      { transform: scale(1.07); opacity: 1; }
}

@keyframes bp-load-spin {
    to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
    .bp-load-emblem::before,
    .bp-load-orbit,
    .bp-load-paw,
    .bp-load-motes i {
        animation: none;
    }
    .bp-load-orbit,
    .bp-load-motes {
        display: none;
    }
}
</style>
<div id="bp-loading" role="progressbar" aria-label="Cargando BosquePatitas" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
    <div class="bp-load-motes" aria-hidden="true">{$motes}</div>
    <div class="bp-load-core">
        <div class="bp-load-emblem">
            <svg class="bp-load-ring" viewBox="0 0 120 120" aria-hidden="true">
                <defs>
                    <linearGradient id="bp-load-grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stop-color="#34d399"/>
                        <stop offset="1" stop-color="#fde68a"/>
                    </linearGradient>
                </defs>
                <circle class="bp-load-ring-track" cx="60" cy="60" r="54"/>
                <circle class="bp-load-ring-fill" id="bp-load-ring-fill" cx="60" cy="60" r="54"/>
            </svg>
            <div class="bp-load-orbit" aria-hidden="true"></div>
            <svg class="bp-load-paw" viewBox="0 0 64 64" aria-hidden="true">
                <ellipse cx="13.5" cy="27" rx="5.6" ry="7.6" transform="rotate(-22 13.5 27)"/>
                <ellipse cx="25.5" cy="15.5" rx="6" ry="8.4" transform="rotate(-7 25.5 15.5)"/>
                <ellipse cx="38.5" cy="15.5" rx="6" ry="8.4" transform="rotate(7 38.5 15.5)"/>
                <ellipse cx="50.5" cy="27" rx="5.6" ry="7.6" transform="rotate(22 50.5 27)"/>
                <path d="M32 31c-9.5 0-17.5 9-16.8 16.6.6 6.6 7.3 8.3 16.8 5.4 9.5 2.9 16.2 1.2 16.8-5.4C49.5 40 41.5 31 32 31z"/>
            </svg>
        </div>
        <div class="bp-load-title">BosquePatitas</div>
        <div class="bp-load-status" id="bp-load-status">Preparando el bosque…</div>
        <div class="bp-load-percent"><span id="bp-load-percent">0</span><small>%</small></div>
    </div>
</div>
<script>
(function () {
    var el = document.getElementById('bp-loading');
    if (!el || window.BPLoader) return;
    var pct = document.getElementById('bp-load-percent');
    var ring = document.getElementById('bp-load-ring-fill');
    var status = document.getElementById('bp-load-status');
    var LEN = 2 * Math.PI * 54, shown = 0, target = 0, claimed = false, done = false, t0 = Date.now(), last = t0;
    ring.style.strokeDasharray = LEN;
    ring.style.strokeDashoffset = LEN;
    function frame() {
        // Mientras llegan los scripts del bosque, avance suave hasta el 20 %
        if (!claimed) target = Math.max(target, Math.min(20, (Date.now() - t0) / 220));
        // Suavizado por tiempo, no por fotogramas: tarda lo mismo en un equipo lento
        var now = Date.now();
        shown += (target - shown) * (1 - Math.exp(-(now - last) / 160));
        last = now;
        if (target - shown < 0.4) shown = target;
        var v = Math.round(shown);
        pct.textContent = v;
        el.setAttribute('aria-valuenow', v);
        ring.style.strokeDashoffset = LEN * (1 - shown / 100);
        if (done && shown >= 99.5) {
            el.classList.add('bp-load-done');
            setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 800);
            return;
        }
        requestAnimationFrame(frame);
    }
    window.BPLoader = {
        set: function (p, label) { claimed = true; if (p > target) target = Math.min(100, p); if (label) status.textContent = label; },
        finish: function () { claimed = true; done = true; target = 100; }
    };
    requestAnimationFrame(frame);
})();
</script>
HTML;
    }
}

new BosquePatitas();
