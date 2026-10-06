<?php
if (!defined('ABSPATH')) exit;

class BP_Custom_Post_Type {

    public function __construct() {
        add_action('init', array($this, 'register_cpt'));
        add_action('init', array($this, 'register_meta'));
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
        $coords = array('posicion_x', 'posicion_y', 'posicion_z');
        
        foreach ($coords as $coord) {
            register_post_meta('mascota_tumba', $coord, array(
                'show_in_rest' => true,
                'single'       => true,
                'type'         => 'number',
                'sanitize_callback' => 'floatval',
                'auth_callback' => function() { return current_user_can('edit_posts'); }
            ));
        }
    }
}

new BP_Custom_Post_Type();