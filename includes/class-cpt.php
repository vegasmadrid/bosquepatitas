<?php
if (!defined('ABSPATH')) exit;

class BP_Custom_Post_Type {

    public function __construct() {
        add_action('init', array($this, 'register_cpt'));
        add_action('init', array($this, 'register_meta'));
        add_action('add_meta_boxes', array($this, 'add_meta_boxes'));
        add_action('save_post_mascota_tumba', array($this, 'save_meta_boxes'));
        add_filter('rest_prepare_mascota_tumba', array($this, 'filter_rest_response'), 10, 3);
        add_filter('rest_prepare_bp_mascota', array($this, 'filter_rest_mascota_response'), 10, 3);
        add_action('rest_api_init', array($this, 'register_custom_rest_routes'));
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
            'supports'     => array('title', 'editor', 'thumbnail', 'author'),
            'menu_icon'    => 'dashicons-location-alt',
        );

        register_post_type('mascota_tumba', $args);

        // Register CPT bp_mascota
        $mascota_labels = array(
            'name'          => 'Mascotas',
            'singular_name' => 'Mascota',
            'menu_name'     => 'Mascotas',
            'add_new_item'  => 'Añadir Nueva Mascota',
        );

        $mascota_args = array(
            'labels'       => $mascota_labels,
            'public'       => true,
            'show_in_rest' => true,
            'rest_base'    => 'mascotas',
            'supports'     => array('title', 'editor', 'thumbnail', 'author'),
            'menu_icon'    => 'dashicons-heart',
            'show_in_menu' => 'edit.php?post_type=mascota_tumba'
        );

        register_post_type('bp_mascota', $mascota_args);
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
                'sanitize_callback' => function($val) { return floatval($val); },
                'auth_callback'     => function($allowed, $meta_key, $post_id) {
                    return current_user_can('edit_post', $post_id);
                }
            ));
        }

        register_post_meta('mascota_tumba', 'mascota_id', array(
            'show_in_rest'      => true,
            'single'             => true,
            'type'               => 'integer',
            'default'            => 0,
            'sanitize_callback' => function($val) { return absint($val); },
            'auth_callback'     => function($allowed, $meta_key, $post_id) {
                return current_user_can('edit_post', $post_id);
            }
        ));

        // Meta fields for bp_mascota
        $mascota_meta_keys = array(
            'apodos'           => 'string',
            'titulo_honor'     => 'string',
            'especie_raza'     => 'string',
            'fecha_llegada'    => 'string',
            'fecha_despedida'  => 'string',
            'stat_carino'      => 'integer',
            'stat_travesura'   => 'integer',
            'stat_bano'        => 'integer',
            'stat_pena'        => 'integer',
            'superpoder'       => 'string',
            'archienemigo'     => 'string',
            'comida_favorita'  => 'string',
            'travesura_epica'  => 'string',
            'lugar_favorito'   => 'string',
            'juguete_estrella' => 'string',
            'carta_despedida'  => 'string',
            'soundtrack_url'   => 'string',
            'galeria'          => 'string',
            'is_approved'      => 'string',
            'tumba_id'         => 'integer',
            'count_velas'      => 'integer',
            'count_flores'     => 'integer',
            'count_premios'    => 'integer',
            'muro_recuerdos'   => 'string',
        );

        foreach ($mascota_meta_keys as $key => $type) {
            register_post_meta('bp_mascota', $key, array(
                'show_in_rest'  => true,
                'single'         => true,
                'type'           => $type,
                'auth_callback' => function($allowed, $meta_key, $post_id) {
                    if ($meta_key === 'is_approved') {
                        return current_user_can('manage_options');
                    }
                    return current_user_can('edit_post', $post_id);
                }
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

        // Attach pet data if associated
        $mascota_id = (int) get_post_meta($post->ID, 'mascota_id', true);
        if ($mascota_id > 0) {
            $mascota_post = get_post($mascota_id);
            if ($mascota_post && $mascota_post->post_type === 'bp_mascota') {
                $response->data['mascota_data'] = $this->get_formatted_mascota_data($mascota_post);
            }
        }

        return $response;
    }

    public function filter_rest_mascota_response($response, $post, $request) {
        $response->data['mascota_details'] = $this->get_formatted_mascota_data($post);
        return $response;
    }

    public function get_formatted_mascota_data($post) {
        $thumb_url = get_the_post_thumbnail_url($post->ID, 'full');
        $galeria_json = get_post_meta($post->ID, 'galeria', true);
        $galeria = !empty($galeria_json) ? json_decode($galeria_json, true) : array();
        if (!is_array($galeria)) $galeria = array();

        $muro_json = get_post_meta($post->ID, 'muro_recuerdos', true);
        $muro = !empty($muro_json) ? json_decode($muro_json, true) : array();
        if (!is_array($muro)) $muro = array();

        return array(
            'id'               => $post->ID,
            'nombre'           => get_the_title($post->ID),
            'historia'         => wpautop($post->post_content),
            'imagen_url'       => $thumb_url ?: '',
            'apodos'           => get_post_meta($post->ID, 'apodos', true),
            'titulo_honor'     => get_post_meta($post->ID, 'titulo_honor', true),
            'especie_raza'     => get_post_meta($post->ID, 'especie_raza', true),
            'fecha_llegada'    => get_post_meta($post->ID, 'fecha_llegada', true),
            'fecha_despedida'  => get_post_meta($post->ID, 'fecha_despedida', true),
            'stat_carino'      => (int) get_post_meta($post->ID, 'stat_carino', true) ?: 10,
            'stat_travesura'   => (int) get_post_meta($post->ID, 'stat_travesura', true) ?: 5,
            'stat_bano'        => (int) get_post_meta($post->ID, 'stat_bano', true) ?: 5,
            'stat_pena'        => (int) get_post_meta($post->ID, 'stat_pena', true) ?: 10,
            'superpoder'       => get_post_meta($post->ID, 'superpoder', true),
            'archienemigo'     => get_post_meta($post->ID, 'archienemigo', true),
            'comida_favorita'  => get_post_meta($post->ID, 'comida_favorita', true),
            'travesura_epica'  => get_post_meta($post->ID, 'travesura_epica', true),
            'lugar_favorito'   => get_post_meta($post->ID, 'lugar_favorito', true),
            'juguete_estrella' => get_post_meta($post->ID, 'juguete_estrella', true),
            'carta_despedida'  => wpautop(get_post_meta($post->ID, 'carta_despedida', true)),
            'soundtrack_url'   => get_post_meta($post->ID, 'soundtrack_url', true),
            'galeria'          => $galeria,
            'is_approved'      => (bool) get_post_meta($post->ID, 'is_approved', true),
            'tumba_id'         => (int) get_post_meta($post->ID, 'tumba_id', true),
            'count_velas'      => (int) get_post_meta($post->ID, 'count_velas', true),
            'count_flores'     => (int) get_post_meta($post->ID, 'count_flores', true),
            'count_premios'    => (int) get_post_meta($post->ID, 'count_premios', true),
            'muro_recuerdos'   => $muro,
            'author_name'      => get_the_author_meta('display_name', $post->post_author)
        );
    }

    public function register_custom_rest_routes() {
        register_rest_route('bosquepatitas/v1', '/tributo', array(
            'methods'  => 'POST',
            'callback' => array($this, 'handle_rest_tributo'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route('bosquepatitas/v1', '/comentario', array(
            'methods'  => 'POST',
            'callback' => array($this, 'handle_rest_comentario'),
            'permission_callback' => '__return_true'
        ));

        register_rest_route('bosquepatitas/v1', '/asignar-tumba', array(
            'methods'  => 'POST',
            'callback' => array($this, 'handle_rest_asignar_tumba'),
            'permission_callback' => function() { return is_user_logged_in(); }
        ));

        register_rest_route('bosquepatitas/v1', '/desasignar-tumba', array(
            'methods'  => 'POST',
            'callback' => array($this, 'handle_rest_desasignar_tumba'),
            'permission_callback' => function() { return is_user_logged_in(); }
        ));
    }

    public function handle_rest_tributo($request) {
        $mascota_id = (int) $request->get_param('mascota_id');
        $tipo       = sanitize_text_field($request->get_param('tipo'));

        if (!$mascota_id || !in_array($tipo, array('vela', 'flor', 'premio'))) {
            return new WP_REST_Response(array('success' => false, 'message' => 'Parámetros inválidos'), 400);
        }

        $meta_key = 'count_' . ($tipo === 'vela' ? 'velas' : ($tipo === 'flor' ? 'flores' : 'premios'));
        $current  = (int) get_post_meta($mascota_id, $meta_key, true);
        $new_val  = $current + 1;
        update_post_meta($mascota_id, $meta_key, $new_val);

        return new WP_REST_Response(array(
            'success' => true,
            'tipo'    => $tipo,
            'count'   => $new_val
        ), 200);
    }

    public function handle_rest_comentario($request) {
        $mascota_id = (int) $request->get_param('mascota_id');
        $autor      = sanitize_text_field($request->get_param('autor')) ?: 'Amigo del Bosque';
        $mensaje    = sanitize_textarea_field($request->get_param('mensaje'));

        if (!$mascota_id || empty($mensaje)) {
            return new WP_REST_Response(array('success' => false, 'message' => 'Parámetros inválidos'), 400);
        }

        $muro_json = get_post_meta($mascota_id, 'muro_recuerdos', true);
        $muro      = !empty($muro_json) ? json_decode($muro_json, true) : array();
        if (!is_array($muro)) $muro = array();

        $new_comment = array(
            'autor'   => $autor,
            'mensaje' => $mensaje,
            'fecha'   => date('d/m/Y H:i')
        );
        array_unshift($muro, $new_comment);

        update_post_meta($mascota_id, 'muro_recuerdos', wp_json_encode($muro));

        return new WP_REST_Response(array(
            'success'  => true,
            'muro'     => $muro
        ), 200);
    }

    public function handle_rest_asignar_tumba($request) {
        $user_id    = get_current_user_id();
        $mascota_id = (int) $request->get_param('mascota_id');
        $plot_id    = sanitize_text_field($request->get_param('plot_id'));
        $pos_x      = floatval($request->get_param('pos_x'));
        $pos_y      = floatval($request->get_param('pos_y')) ?: 0.5;
        $pos_z      = floatval($request->get_param('pos_z'));

        $mascota = get_post($mascota_id);
        if (!$mascota || $mascota->post_author != $user_id) {
            return new WP_REST_Response(array('success' => false, 'message' => 'Mascota no válida o no te pertenece'), 400);
        }

        $is_approved = (bool) get_post_meta($mascota_id, 'is_approved', true);
        if (!$is_approved) {
            return new WP_REST_Response(array('success' => false, 'message' => 'La mascota aún no ha sido aprobada'), 400);
        }

        $current_tumba_id = (int) get_post_meta($mascota_id, 'tumba_id', true);
        if ($current_tumba_id > 0) {
            return new WP_REST_Response(array('success' => false, 'message' => 'Esta mascota ya tiene una tumba asignada. Primero debes liberarla.'), 400);
        }

        // Create or update tumba
        $tumba_title = 'Tumba de ' . get_the_title($mascota_id);
        $tumba_content = !empty($mascota->post_content) ? $mascota->post_content : '';
        $tumba_id = wp_insert_post(array(
            'post_title'   => $tumba_title,
            'post_content' => $tumba_content,
            'post_type'    => 'mascota_tumba',
            'post_status'  => 'publish',
            'post_author'  => $user_id
        ));

        if (is_wp_error($tumba_id)) {
            return new WP_REST_Response(array('success' => false, 'message' => 'Error al crear la tumba'), 500);
        }

        // Set featured image if pet has one
        $thumb_id = get_post_thumbnail_id($mascota_id);
        if ($thumb_id) {
            set_post_thumbnail($tumba_id, $thumb_id);
        }

        update_post_meta($tumba_id, 'posicion_x', $pos_x);
        update_post_meta($tumba_id, 'posicion_y', $pos_y);
        update_post_meta($tumba_id, 'posicion_z', $pos_z);
        update_post_meta($tumba_id, 'mascota_id', $mascota_id);

        update_post_meta($mascota_id, 'tumba_id', $tumba_id);

        $mascota_data = $this->get_formatted_mascota_data($mascota);

        return new WP_REST_Response(array(
            'success'      => true,
            'tumba_id'     => $tumba_id,
            'mascota_id'   => $mascota_id,
            'plot_id'      => $plot_id,
            'posicion_x'   => $pos_x,
            'posicion_y'   => $pos_y,
            'posicion_z'   => $pos_z,
            'mascota_data' => $mascota_data
        ), 200);
    }

    public function handle_rest_desasignar_tumba($request) {
        $user_id    = get_current_user_id();
        $mascota_id = (int) $request->get_param('mascota_id');

        $mascota = get_post($mascota_id);
        if (!$mascota || ($mascota->post_author != $user_id && !current_user_can('manage_options'))) {
            return new WP_REST_Response(array('success' => false, 'message' => 'No tienes permiso para esta acción'), 400);
        }

        $tumba_id = (int) get_post_meta($mascota_id, 'tumba_id', true);
        if ($tumba_id > 0) {
            wp_delete_post($tumba_id, true);
        }

        update_post_meta($mascota_id, 'tumba_id', 0);

        return new WP_REST_Response(array('success' => true, 'mascota_id' => $mascota_id), 200);
    }
}

new BP_Custom_Post_Type();