<?php
if (!defined('ABSPATH')) exit;

class BP_Custom_Post_Type {

    public function __construct() {
        add_action('init', array($this, 'register_cpt'));
        add_action('init', array($this, 'register_meta'));
        add_action('add_meta_boxes', array($this, 'add_meta_boxes'));
        add_action('save_post_mascota_tumba', array($this, 'save_meta_boxes'));
        add_filter('rest_prepare_mascota_tumba', array($this, 'filter_rest_response'), 10, 3);
    }

    public function register_cpt() {
        $labels = array(
            'name'          => 'Tumbas',
            'singular_name' => 'Tumba',
            'menu_name'     => 'BosquePatitas',
            'add_new_item'  => 'Añadir Nueva Tumba',
        );

        $args = array(
            'labels'       => $labels,
            'public'       => true,
            'show_in_rest' => true, // Habilita la REST API en /wp-json/wp/v2/tumbas
            'rest_base'    => 'tumbas',
            'supports'     => array('title', 'editor', 'thumbnail'),
            'menu_icon'    => 'dashicons-location-alt',
        );

        register_post_type('mascota_tumba', $args);
    }

    public function register_meta() {
        $coords = array(
            'posicion_x' => 0.0,
            'posicion_y' => 0.5,
            'posicion_z' => 0.0,
        );
        
        foreach ($coords as $coord => $default_val) {
            register_post_meta('mascota_tumba', $coord, array(
                'show_in_rest'      => true,
                'single'             => true,
                'type'               => 'number',
                'default'            => $default_val,
                'sanitize_callback' => 'floatval',
                'auth_callback'     => function() { return current_user_can('edit_posts'); }
            ));
        }
    }

    public function add_meta_boxes() {
        add_meta_box(
            'bp_coordenadas_3d',
            'Coordenadas 3D de la Tumba',
            array($this, 'render_coordenadas_meta_box'),
            'mascota_tumba',
            'side',
            'default'
        );
    }

    public function render_coordenadas_meta_box($post) {
        wp_nonce_field('bp_save_coordenadas', 'bp_coordenadas_nonce');

        $x = get_post_meta($post->ID, 'posicion_x', true);
        $y = get_post_meta($post->ID, 'posicion_y', true);
        $z = get_post_meta($post->ID, 'posicion_z', true);

        $x = ($x !== '' && $x !== false) ? floatval($x) : 0.0;
        $y = ($y !== '' && $y !== false) ? floatval($y) : 0.5;
        $z = ($z !== '' && $z !== false) ? floatval($z) : 0.0;

        ?>
        <p>
            <label for="posicion_x"><strong>Posición X:</strong></label><br />
            <input type="number" step="any" id="posicion_x" name="posicion_x" value="<?php echo esc_attr($x); ?>" class="widefat" />
        </p>
        <p>
            <label for="posicion_y"><strong>Posición Y:</strong></label><br />
            <input type="number" step="any" id="posicion_y" name="posicion_y" value="<?php echo esc_attr($y); ?>" class="widefat" />
        </p>
        <p>
            <label for="posicion_z"><strong>Posición Z:</strong></label><br />
            <input type="number" step="any" id="posicion_z" name="posicion_z" value="<?php echo esc_attr($z); ?>" class="widefat" />
        </p>
        <?php
    }

    public function save_meta_boxes($post_id) {
        if (!isset($_POST['bp_coordenadas_nonce']) || !wp_verify_nonce($_POST['bp_coordenadas_nonce'], 'bp_save_coordenadas')) {
            return;
        }

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        if (!current_user_can('edit_post', $post_id)) {
            return;
        }

        $coords = array('posicion_x', 'posicion_y', 'posicion_z');
        foreach ($coords as $coord) {
            if (isset($_POST[$coord])) {
                $val = floatval($_POST[$coord]);
                update_post_meta($post_id, $coord, $val);
            }
        }
    }

    public function filter_rest_response($response, $post, $request) {
        if (isset($response->data['meta'])) {
            $meta = $response->data['meta'];

            $x = (isset($meta['posicion_x']) && $meta['posicion_x'] !== '') ? floatval($meta['posicion_x']) : 0.0;
            $y = (isset($meta['posicion_y']) && $meta['posicion_y'] !== '') ? floatval($meta['posicion_y']) : 0.5;
            $z = (isset($meta['posicion_z']) && $meta['posicion_z'] !== '') ? floatval($meta['posicion_z']) : 0.0;

            $response->data['meta']['posicion_x'] = $x;
            $response->data['meta']['posicion_y'] = $y;
            $response->data['meta']['posicion_z'] = $z;
        }
        return $response;
    }
}

new BP_Custom_Post_Type();