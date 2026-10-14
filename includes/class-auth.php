<?php
if (!defined('ABSPATH')) exit;

class BP_Auth {

    public function __construct() {
        add_action('template_redirect', array($this, 'handle_redirects'));
        add_filter('the_content', array($this, 'inject_login_form'));

        // AJAX handlers for non-logged-in users
        add_action('wp_ajax_nopriv_bp_ajax_login', array($this, 'ajax_login'));
        add_action('wp_ajax_nopriv_bp_ajax_register', array($this, 'ajax_register'));
        add_action('wp_ajax_nopriv_bp_ajax_lost_password', array($this, 'ajax_lost_password'));

        // Also register for logged-in users in case they re-submit
        add_action('wp_ajax_bp_ajax_login', array($this, 'ajax_login'));
        add_action('wp_ajax_bp_ajax_register', array($this, 'ajax_register'));
        add_action('wp_ajax_bp_ajax_lost_password', array($this, 'ajax_lost_password'));
    }

    /**
     * Handle page access control and redirects
     */
    public function handle_redirects() {
        if (is_admin()) {
            return;
        }

        $login_page_id   = (int) get_option('bp_login_page_id', 0);
        $profile_page_id = (int) get_option('bp_profile_page_id', 0);
        $current_page_id = get_queried_object_id();

        // If user is logged in and trying to access Login page
        if ($login_page_id > 0 && $current_page_id === $login_page_id && is_user_logged_in()) {
            $configured_login_redirect = get_option('bp_redirect_url', '');
            if (!empty($configured_login_redirect)) {
                $redirect_target = $configured_login_redirect;
            } elseif ($profile_page_id > 0) {
                $redirect_target = get_permalink($profile_page_id);
            } else {
                $redirect_target = home_url('/');
            }

            wp_safe_redirect($redirect_target);
            exit;
        }

        // If user is NOT logged in and trying to access Profile page
        if ($profile_page_id > 0 && $current_page_id === $profile_page_id && !is_user_logged_in()) {
            $redirect_target = ($login_page_id > 0) ? get_permalink($login_page_id) : wp_login_url();
            wp_safe_redirect($redirect_target);
            exit;
        }
    }

    /**
     * Inject login/register form automatically on designated page
     */
    public function inject_login_form($content) {
        if (is_admin()) {
            return $content;
        }

        $login_page_id = (int) get_option('bp_login_page_id', 0);
        if ($login_page_id > 0 && is_page($login_page_id) && in_the_loop() && is_main_query()) {
            if (is_user_logged_in()) {
                return '<div class="bp-auth-container"><p class="bp-message bp-success">Ya has iniciado sesión. Redirigiendo...</p></div>';
            }
            return $content . $this->render_auth_form();
        }

        return $content;
    }

    /**
     * Render the Auth HTML form structure
     */
    public function render_auth_form() {
        ob_start();
        $redirect_url = get_option('bp_redirect_url', 'https://bosquepatitas.com/bosque-patitas/');
        ?>
        <div class="bp-auth-wrapper">
            <div class="bp-auth-box">
                <div class="bp-auth-header">
                    <div class="bp-auth-icon">🐾</div>
                    <h2>BosquePatitas</h2>
                    <p>Accede o regístrate para entrar al bosque</p>
                </div>

                <div class="bp-auth-tabs">
                    <button type="button" class="bp-tab-btn active" data-tab="bp-login-tab">Iniciar Sesión</button>
                    <button type="button" class="bp-tab-btn" data-tab="bp-register-tab">Registrarse</button>
                </div>

                <div class="bp-auth-feedback" id="bp-auth-feedback" style="display:none;"></div>

                <!-- Google Login Button -->
                <div class="bp-google-social-login">
                    <?php
                    if (shortcode_exists('nextend_social_login')) {
                        echo do_shortcode('[nextend_social_login provider="google" redirect="' . esc_url($redirect_url) . '"]');
                    } else {
                        $google_url = site_url('/wp-login.php?loginSocial=google');
                        ?>
                        <a href="<?php echo esc_url($google_url); ?>"
                           data-plugin="nsl"
                           data-action="connect"
                           data-redirect="<?php echo esc_url($redirect_url); ?>"
                           data-provider="google"
                           data-popupwidth="600"
                           data-popupheight="600"
                           class="bp-google-btn">
                           <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                               <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z" fill="#4285F4"/>
                               <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                               <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                               <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                           </svg>
                           <span>Continuar con Google</span>
                        </a>
                    <?php } ?>
                </div>

                <div class="bp-auth-divider"><span>o con tu correo</span></div>

                <!-- LOGIN TAB -->
                <div class="bp-tab-content active" id="bp-login-tab">
                    <form id="bp-form-login" method="post">
                        <?php wp_nonce_field('bp_auth_nonce', 'bp_nonce'); ?>
                        <div class="bp-form-group">
                            <label for="bp_log_username">Usuario o Correo Electrónico</label>
                            <input type="text" name="log" id="bp_log_username" class="bp-input" required autocomplete="username" />
                        </div>
                        <div class="bp-form-group">
                            <label for="bp_log_password">Contraseña</label>
                            <input type="password" name="pwd" id="bp_log_password" class="bp-input" required autocomplete="current-password" />
                        </div>
                        <div class="bp-form-options">
                            <label><input type="checkbox" name="rememberme" value="forever"> Recordarme</label>
                            <a href="#" class="bp-toggle-lost">¿Olvidaste tu contraseña?</a>
                        </div>
                        <button type="submit" class="bp-btn bp-btn-primary">Entrar al Bosque</button>
                    </form>
                </div>

                <!-- REGISTER TAB -->
                <div class="bp-tab-content" id="bp-register-tab">
                    <form id="bp-form-register" method="post">
                        <?php wp_nonce_field('bp_auth_nonce', 'bp_nonce'); ?>
                        <div class="bp-form-group">
                            <label for="bp_reg_username">Nombre de Usuario</label>
                            <input type="text" name="user_login" id="bp_reg_username" class="bp-input" required />
                        </div>
                        <div class="bp-form-group">
                            <label for="bp_reg_email">Correo Electrónico</label>
                            <input type="email" name="user_email" id="bp_reg_email" class="bp-input" required />
                        </div>
                        <div class="bp-form-group">
                            <label for="bp_reg_password">Contraseña</label>
                            <input type="password" name="user_pass" id="bp_reg_password" class="bp-input" required />
                        </div>
                        <button type="submit" class="bp-btn bp-btn-primary">Crear Cuenta</button>
                    </form>
                </div>

                <!-- LOST PASSWORD TAB -->
                <div class="bp-tab-content" id="bp-lost-tab" style="display:none;">
                    <h3>Recuperar Contraseña</h3>
                    <p class="bp-subtitle">Introduce tu correo y te enviaremos las instrucciones.</p>
                    <form id="bp-form-lost" method="post">
                        <?php wp_nonce_field('bp_auth_nonce', 'bp_nonce'); ?>
                        <div class="bp-form-group">
                            <label for="bp_lost_user">Usuario o Correo Electrónico</label>
                            <input type="text" name="user_login" id="bp_lost_user" class="bp-input" required />
                        </div>
                        <button type="submit" class="bp-btn bp-btn-primary">Enviar Instrucciones</button>
                        <div class="bp-back-to-login">
                            <a href="#" class="bp-cancel-lost">« Volver al Inicio de Sesión</a>
                        </div>
                    </form>
                </div>

            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * AJAX Login Handler
     */
    public function ajax_login() {
        check_ajax_referer('bp_auth_nonce', 'bp_nonce');

        $username = isset($_POST['log']) ? sanitize_user($_POST['log']) : '';
        $password = isset($_POST['pwd']) ? $_POST['pwd'] : '';
        $remember = !empty($_POST['rememberme']);

        if (empty($username) || empty($password)) {
            wp_send_json_error(array('message' => 'Por favor, rellena todos los campos.'));
        }

        // Support logging in with email address as well
        if (is_email($username)) {
            $user_obj = get_user_by('email', $username);
            if ($user_obj) {
                $username = $user_obj->user_login;
            }
        }

        $creds = array(
            'user_login'    => $username,
            'user_password' => $password,
            'remember'      => $remember
        );

        $user = wp_signon($creds, is_ssl());

        if (is_wp_error($user)) {
            wp_send_json_error(array('message' => 'Usuario o contraseña incorrectos.'));
        }

        $redirect_url = get_option('bp_redirect_url', 'https://bosquepatitas.com/bosque-patitas/');
        wp_send_json_success(array(
            'message'  => '¡Inicio de sesión correcto! Redirigiendo...',
            'redirect' => $redirect_url
        ));
    }

    /**
     * AJAX Register Handler
     */
    public function ajax_register() {
        check_ajax_referer('bp_auth_nonce', 'bp_nonce');

        $username = isset($_POST['user_login']) ? sanitize_user($_POST['user_login']) : '';
        $email    = isset($_POST['user_email']) ? sanitize_email($_POST['user_email']) : '';
        $password = isset($_POST['user_pass']) ? $_POST['user_pass'] : '';

        if (empty($username) || empty($email) || empty($password)) {
            wp_send_json_error(array('message' => 'Por favor, completa todos los campos.'));
        }

        if (!is_email($email)) {
            wp_send_json_error(array('message' => 'El correo electrónico no es válido.'));
        }

        if (username_exists($username)) {
            wp_send_json_error(array('message' => 'El nombre de usuario ya está registrado.'));
        }

        if (email_exists($email)) {
            wp_send_json_error(array('message' => 'El correo electrónico ya está registrado.'));
        }

        $user_id = wp_create_user($username, $password, $email);

        if (is_wp_error($user_id)) {
            wp_send_json_error(array('message' => $user_id->get_error_message()));
        }

        // Auto signon after registration
        wp_set_current_user($user_id);
        wp_set_auth_cookie($user_id);

        $register_redirect_url = get_option('bp_register_redirect_url', get_option('bp_redirect_url', 'https://bosquepatitas.com/bosque-patitas/'));
        wp_send_json_success(array(
            'message'  => '¡Registro completado con éxito! Redirigiendo...',
            'redirect' => $register_redirect_url
        ));
    }

    /**
     * AJAX Lost Password Handler
     */
    public function ajax_lost_password() {
        check_ajax_referer('bp_auth_nonce', 'bp_nonce');

        $user_input = isset($_POST['user_login']) ? sanitize_text_field($_POST['user_login']) : '';

        if (empty($user_input)) {
            wp_send_json_error(array('message' => 'Por favor, escribe tu correo o nombre de usuario.'));
        }

        $user_data = is_email($user_input) ? get_user_by('email', $user_input) : get_user_by('login', $user_input);

        if (!$user_data) {
            wp_send_json_error(array('message' => 'No existe ningún usuario registrado con esos datos.'));
        }

        $result = retrieve_password($user_data->user_login);

        if (is_wp_error($result)) {
            wp_send_json_error(array('message' => $result->get_error_message()));
        }

        wp_send_json_success(array('message' => 'Te hemos enviado un enlace para restablecer tu contraseña a tu correo electrónico.'));
    }
}

new BP_Auth();
