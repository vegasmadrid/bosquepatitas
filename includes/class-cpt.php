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
        add_filter('manage_mascota_tumba_posts_columns', array($this, 'set_mascota_tumba_columns'));
        add_action('manage_mascota_tumba_posts_custom_column', array($this, 'custom_mascota_tumba_column'), 10, 2);
    }

    public function register_cpt() {
        $labels = array(
            'name'          => 'Tumbas',
            'singular_name' => 'Tumba',
            'menu_name'     => 'BosquePatitas',
        );

        $args = array(
            'labels'       => $labels,
            'public'       => true,
            'show_in_rest' => true, // Habilita la REST API en /wp-json/wp/v2/tumbas
            'rest_base'    => 'tumbas',
            'supports'     => array('title', 'editor', 'thumbnail', 'author'),
            'menu_icon'    => 'dashicons-location-alt',
            'capabilities' => array(
                'create_posts' => 'do_not_allow',
            ),
            'map_meta_cap' => true,
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
            'epitafio'         => 'string',
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
            'tributos_velas'   => 'string',
            'tributos_flores'  => 'string',
            'tributos_premios' => 'string',
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

        // Calculate Tribute Statuses
        $now = time();
        $candle_duration = 24 * 3600; // 24 hours
        $flower_duration = 3 * 24 * 3600; // 72 hours
        $treat_duration  = 24 * 3600; // 24 hours

        // Velas
        $velas_json = get_post_meta($post->ID, 'tributos_velas', true);
        $velas_raw = !empty($velas_json) ? json_decode($velas_json, true) : array();
        if (!is_array($velas_raw)) $velas_raw = array();
        $active_velas = array();
        foreach ($velas_raw as $v) {
            $created = isset($v['created_at']) ? intval($v['created_at']) : $now;
            if (($now - $created) < $candle_duration) {
                $active_velas[] = array(
                    'id'         => isset($v['id']) ? $v['id'] : uniqid('v_'),
                    'created_at' => $created,
                    'expires_at' => $created + $candle_duration,
                    'slot'       => isset($v['slot']) ? intval($v['slot']) : count($active_velas)
                );
            }
        }

        // Flores
        $flores_json = get_post_meta($post->ID, 'tributos_flores', true);
        $flores_raw = !empty($flores_json) ? json_decode($flores_json, true) : array();
        if (!is_array($flores_raw)) $flores_raw = array();
        $active_flores = array();
        $fresh_flores_count = 0;
        $wilted_flores_count = 0;
        foreach ($flores_raw as $f) {
            $created = isset($f['created_at']) ? intval($f['created_at']) : $now;
            $expires = isset($f['expires_at']) ? intval($f['expires_at']) : ($created + $flower_duration);
            $is_wilted = ($now >= $expires);
            if ($is_wilted) {
                $wilted_flores_count++;
            } else {
                $fresh_flores_count++;
            }
            $active_flores[] = array(
                'id'         => isset($f['id']) ? $f['id'] : uniqid('f_'),
                'created_at' => $created,
                'expires_at' => $expires,
                'is_wilted'  => $is_wilted,
                'slot'       => isset($f['slot']) ? intval($f['slot']) : count($active_flores)
            );
        }

        // Premios
        $premios_json = get_post_meta($post->ID, 'tributos_premios', true);
        $premios_raw = !empty($premios_json) ? json_decode($premios_json, true) : array();
        if (!is_array($premios_raw)) $premios_raw = array();
        $active_premios = array();
        foreach ($premios_raw as $p) {
            $created = isset($p['created_at']) ? intval($p['created_at']) : $now;
            if (($now - $created) < $treat_duration) {
                $active_premios[] = array(
                    'id'         => isset($p['id']) ? $p['id'] : uniqid('p_'),
                    'created_at' => $created,
                    'expires_at' => $created + $treat_duration,
                    'slot'       => isset($p['slot']) ? intval($p['slot']) : count($active_premios)
                );
            }
        }

        // Determine tomb overall state
        // "cuidada" if there is at least one active candle OR at least one fresh flower
        // "necesita_carino" if no active candles and no fresh flowers (or only wilted flowers)
        $has_active_candles = (count($active_velas) > 0);
        $has_fresh_flowers  = ($fresh_flores_count > 0);
        $tomb_state = ($has_active_candles || $has_fresh_flowers) ? 'cuidada' : 'necesita_carino';

        return array(
            'id'               => $post->ID,
            'nombre'           => get_the_title($post->ID),
            'historia'         => wpautop($post->post_content),
            'imagen_url'       => $thumb_url ?: '',
            'apodos'           => get_post_meta($post->ID, 'apodos', true),
            'epitafio'         => get_post_meta($post->ID, 'epitafio', true),
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
            'count_velas'      => count($active_velas),
            'count_flores'     => count($active_flores),
            'count_premios'    => count($active_premios),
            'velas'            => $active_velas,
            'flores'           => $active_flores,
            'premios'          => $active_premios,
            'fresh_flores_count'  => $fresh_flores_count,
            'wilted_flores_count' => $wilted_flores_count,
            'tomb_state'       => $tomb_state,
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

        register_rest_route('bosquepatitas/v1', '/pusher-auth', array(
            'methods'  => 'POST',
            'callback' => array($this, 'handle_rest_pusher_auth'),
            'permission_callback' => '__return_true'
        ));
    }

    public function handle_rest_pusher_auth($request) {
        $socket_id    = sanitize_text_field($request->get_param('socket_id'));
        $channel_name = sanitize_text_field($request->get_param('channel_name'));

        $key    = get_option('bp_pusher_app_key', '');
        $secret = get_option('bp_pusher_app_secret', '');

        if (empty($key) || empty($secret) || empty($socket_id) || empty($channel_name)) {
            return new WP_REST_Response(array('error' => 'Pusher no configurado o parámetros no válidos'), 400);
        }

        $user_id   = is_user_logged_in() ? ('u_' . get_current_user_id()) : ('guest_' . substr(md5($_SERVER['REMOTE_ADDR'] ?? uniqid()), 0, 8));
        $user_name = is_user_logged_in() ? wp_get_current_user()->display_name : ('Visitante ' . substr($user_id, -4));

        $channel_data = wp_json_encode(array(
            'user_id'   => $user_id,
            'user_info' => array(
                'name' => $user_name
            )
        ));

        if (strpos($channel_name, 'presence-') === 0) {
            $string_to_sign = $socket_id . ':' . $channel_name . ':' . $channel_data;
            $signature = hash_hmac('sha256', $string_to_sign, $secret);
            return new WP_REST_Response(array(
                'auth'         => $key . ':' . $signature,
                'channel_data' => $channel_data
            ), 200);
        } else {
            $string_to_sign = $socket_id . ':' . $channel_name;
            $signature = hash_hmac('sha256', $string_to_sign, $secret);
            return new WP_REST_Response(array(
                'auth' => $key . ':' . $signature
            ), 200);
        }
    }

    public function handle_rest_tributo($request) {
        $mascota_id = (int) $request->get_param('mascota_id');
        $tipo       = sanitize_text_field($request->get_param('tipo'));

        if (!$mascota_id || !in_array($tipo, array('vela', 'flor', 'premio', 'regar', 'limpiar_flores'))) {
            return new WP_REST_Response(array('success' => false, 'message' => 'Parámetros inválidos'), 400);
        }

        $mascota = get_post($mascota_id);
        if (!$mascota || $mascota->post_type !== 'bp_mascota') {
            return new WP_REST_Response(array('success' => false, 'message' => 'Mascota no encontrada'), 404);
        }

        $now = time();
        $candle_duration = 24 * 3600;
        $flower_duration = 3 * 24 * 3600;
        $treat_duration  = 24 * 3600;
        $max_capacity    = 4;

        // Clean active lists helper
        $get_active_velas = function($id) use ($now, $candle_duration) {
            $json = get_post_meta($id, 'tributos_velas', true);
            $raw = !empty($json) ? json_decode($json, true) : array();
            if (!is_array($raw)) $raw = array();
            $clean = array();
            foreach ($raw as $v) {
                if (($now - intval($v['created_at'])) < $candle_duration) {
                    $clean[] = $v;
                }
            }
            return $clean;
        };

        $get_active_flores = function($id) use ($now) {
            $json = get_post_meta($id, 'tributos_flores', true);
            $raw = !empty($json) ? json_decode($json, true) : array();
            if (!is_array($raw)) $raw = array();
            return $raw;
        };

        $get_active_premios = function($id) use ($now, $treat_duration) {
            $json = get_post_meta($id, 'tributos_premios', true);
            $raw = !empty($json) ? json_decode($json, true) : array();
            if (!is_array($raw)) $raw = array();
            $clean = array();
            foreach ($raw as $p) {
                if (($now - intval($p['created_at'])) < $treat_duration) {
                    $clean[] = $p;
                }
            }
            return $clean;
        };

        // Get user identifier
        $actor_id = is_user_logged_in() ? ('u_' . get_current_user_id()) : ('ip_' . md5($_SERVER['REMOTE_ADDR'] ?? 'guest'));

        if ($tipo === 'vela') {
            $velas = $get_active_velas($mascota_id);
            if (count($velas) >= $max_capacity) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'message' => 'Esta tumba ya tiene el máximo de 4 velas encendidas. ¡Gracias por el apoyo!'
                ), 400);
            }

            // Check if this user already has an active candle
            foreach ($velas as $v) {
                if (isset($v['actor_id']) && $v['actor_id'] === $actor_id) {
                    return new WP_REST_Response(array(
                        'success' => false,
                        'message' => 'Ya has encendido tu vela en esta tumba hoy. ¡Invita a amigos o familiares a encender las suyas!'
                    ), 400);
                }
            }

            // Occupied slots
            $used_slots = array_map(function($v) { return isset($v['slot']) ? intval($v['slot']) : 0; }, $velas);
            $available_slot = 0;
            for ($s = 0; $s < $max_capacity; $s++) {
                if (!in_array($s, $used_slots)) {
                    $available_slot = $s;
                    break;
                }
            }

            $velas[] = array(
                'id'         => uniqid('v_'),
                'created_at' => $now,
                'slot'       => $available_slot,
                'actor_id'   => $actor_id
            );
            update_post_meta($mascota_id, 'tributos_velas', wp_json_encode($velas));
            update_post_meta($mascota_id, 'count_velas', count($velas));

        } elseif ($tipo === 'flor') {
            $flores = $get_active_flores($mascota_id);

            // Check if this user already has a fresh flower on this tomb
            foreach ($flores as $f) {
                if (isset($f['actor_id']) && $f['actor_id'] === $actor_id && $now < intval($f['expires_at'])) {
                    return new WP_REST_Response(array(
                        'success' => false,
                        'message' => 'Ya has regalado tu ramo de flores a esta mascota. ¡Comparte la tumba para que otras personas pongan sus flores!'
                    ), 400);
                }
            }

            if (count($flores) >= $max_capacity) {
                // If max flowers, check if any is wilted to replace it
                $replaced = false;
                foreach ($flores as $idx => $f) {
                    if ($now >= intval($f['expires_at'])) {
                        $flores[$idx]['created_at'] = $now;
                        $flores[$idx]['expires_at'] = $now + $flower_duration;
                        $flores[$idx]['actor_id']   = $actor_id;
                        $replaced = true;
                        break;
                    }
                }
                if (!$replaced) {
                    return new WP_REST_Response(array(
                        'success' => false,
                        'message' => 'Esta tumba ya tiene los 4 arreglos florales frescos máximos.'
                    ), 400);
                }
            } else {
                $used_slots = array_map(function($f) { return isset($f['slot']) ? intval($f['slot']) : 0; }, $flores);
                $available_slot = 0;
                for ($s = 0; $s < $max_capacity; $s++) {
                    if (!in_array($s, $used_slots)) {
                        $available_slot = $s;
                        break;
                    }
                }
                $flores[] = array(
                    'id'         => uniqid('f_'),
                    'created_at' => $now,
                    'expires_at' => $now + $flower_duration,
                    'slot'       => $available_slot,
                    'actor_id'   => $actor_id
                );
            }
            update_post_meta($mascota_id, 'tributos_flores', wp_json_encode($flores));
            update_post_meta($mascota_id, 'count_flores', count($flores));

        } elseif ($tipo === 'regar') {
            $flores = $get_active_flores($mascota_id);
            if (empty($flores)) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'message' => 'No hay flores colocadas en esta tumba para regar.'
                ), 400);
            }
            // Revive and extend all flowers
            foreach ($flores as $idx => $f) {
                $flores[$idx]['expires_at'] = $now + $flower_duration;
            }
            update_post_meta($mascota_id, 'tributos_flores', wp_json_encode($flores));

        } elseif ($tipo === 'premio') {
            $premios = $get_active_premios($mascota_id);

            // Check if this user already placed a treat
            foreach ($premios as $p) {
                if (isset($p['actor_id']) && $p['actor_id'] === $actor_id) {
                    return new WP_REST_Response(array(
                        'success' => false,
                        'message' => 'Ya has dejado un premio hoy para esta mascota. ¡Invita a más amigos a consentirla!'
                    ), 400);
                }
            }

            if (count($premios) >= $max_capacity) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'message' => 'Ya hay un máximo de 4 premios sobre la losa de esta tumba.'
                ), 400);
            }

            $used_slots = array_map(function($p) { return isset($p['slot']) ? intval($p['slot']) : 0; }, $premios);
            $available_slot = 0;
            for ($s = 0; $s < $max_capacity; $s++) {
                if (!in_array($s, $used_slots)) {
                    $available_slot = $s;
                    break;
                }
            }

            $premios[] = array(
                'id'         => uniqid('p_'),
                'created_at' => $now,
                'slot'       => $available_slot,
                'actor_id'   => $actor_id
            );
            update_post_meta($mascota_id, 'tributos_premios', wp_json_encode($premios));
            update_post_meta($mascota_id, 'count_premios', count($premios));

            // Bonus perk: Giving a treat also waters/revives all flowers on the tomb!
            $flores = $get_active_flores($mascota_id);
            if (!empty($flores)) {
                foreach ($flores as $idx => $f) {
                    $flores[$idx]['expires_at'] = $now + $flower_duration;
                }
                update_post_meta($mascota_id, 'tributos_flores', wp_json_encode($flores));
            }

        } elseif ($tipo === 'limpiar_flores') {
            // Remove wilted flowers
            $flores = $get_active_flores($mascota_id);
            $clean_flores = array();
            foreach ($flores as $f) {
                if ($now < intval($f['expires_at'])) {
                    $clean_flores[] = $f;
                }
            }
            update_post_meta($mascota_id, 'tributos_flores', wp_json_encode($clean_flores));
            update_post_meta($mascota_id, 'count_flores', count($clean_flores));
        }

        $formatted_data = $this->get_formatted_mascota_data($mascota);

        return new WP_REST_Response(array(
            'success'      => true,
            'tipo'         => $tipo,
            'mascota_data' => $formatted_data
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

        // Delete any existing orphan tumba for this mascota to clean up past attempts
        $existing_tumbas = get_posts(array(
            'post_type'      => 'mascota_tumba',
            'post_status'    => 'any',
            'posts_per_page' => -1,
            'meta_key'       => 'mascota_id',
            'meta_value'     => $mascota_id,
            'fields'         => 'ids'
        ));
        if (!empty($existing_tumbas)) {
            foreach ($existing_tumbas as $old_tumba_id) {
                wp_delete_post($old_tumba_id, true);
            }
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

    public function set_mascota_tumba_columns($columns) {
        $new_columns = array(
            'cb'         => $columns['cb'],
            'title'      => 'Tumba / Título',
            'coordenadas'=> 'Coordenadas 3D (X, Y, Z)',
            'estado'     => 'Estado de Ocupación',
            'mascota'    => 'Mascota Asignada',
            'date'       => $columns['date']
        );
        return $new_columns;
    }

    public function custom_mascota_tumba_column($column, $post_id) {
        switch ($column) {
            case 'coordenadas':
                $x = floatval(get_post_meta($post_id, 'posicion_x', true));
                $y = floatval(get_post_meta($post_id, 'posicion_y', true));
                $z = floatval(get_post_meta($post_id, 'posicion_z', true));
                echo '<code>X: ' . number_format($x, 2) . ' | Y: ' . number_format($y, 2) . ' | Z: ' . number_format($z, 2) . '</code>';
                break;
            case 'estado':
                $mascota_id = (int) get_post_meta($post_id, 'mascota_id', true);
                if ($mascota_id > 0 && get_post($mascota_id)) {
                    echo '<span style="color:#2e7d32; font-weight:bold;">🟢 Asignada</span>';
                } else {
                    echo '<span style="color:#757575; font-weight:bold;">⚪ Vacía / Libre</span>';
                }
                break;
            case 'mascota':
                $mascota_id = (int) get_post_meta($post_id, 'mascota_id', true);
                if ($mascota_id > 0) {
                    $mascota = get_post($mascota_id);
                    if ($mascota) {
                        $edit_link = get_edit_post_link($mascota_id);
                        $author_id = $mascota->post_author;
                        $author_name = get_the_author_meta('display_name', $author_id);
                        echo '<a href="' . esc_url($edit_link) . '"><strong>' . esc_html($mascota->post_title) . '</strong></a>';
                        echo '<br><small>Dueño: ' . esc_html($author_name) . '</small>';
                    } else {
                        echo '<em>Mascota eliminada</em>';
                    }
                } else {
                    echo '<em>— Sin mascota —</em>';
                }
                break;
        }
    }
}

new BP_Custom_Post_Type();