<?php
if (!defined('ABSPATH')) exit;

class BP_Landing_Page {

    public function __construct() {
        add_shortcode('bosque_patitas_home', array($this, 'render_landing'));
    }

    public function render_landing($atts = array()) {
        $atts = shortcode_atts(array(
            'bosque_url' => '/bosque',
            'cuenta_url' => '/mi-cuenta',
        ), $atts, 'bosque_patitas_home');

        // Encolar estilo de la landing page únicamente cuando se ejecute el shortcode
        wp_enqueue_style('bp-landing-style');

        $bosque_url = esc_url($atts['bosque_url']);
        $cuenta_url = esc_url($atts['cuenta_url']);

        ob_start();
        ?>
        <div class="bp-landing-wrapper">
            <header class="bp-hero-section">
                <div class="bp-hero-container">
                    <span class="bp-hero-badge">Cementerio Virtual 3D para Mascotas</span>
                    <h1 class="bp-hero-title">Un santuario eterno para recordar a quien te dio amor incondicional</h1>
                    <p class="bp-hero-subtitle">
                        Rinde un emotivo homenaje para perro o gato en un entorno 3D inmersivo. Un espacio de paz, luz y memoria donde sus huellas perduran para siempre.
                    </p>
                    <div class="bp-hero-cta-group">
                        <a href="<?php echo $bosque_url; ?>" class="bp-btn bp-btn-primary">
                            <span class="bp-btn-icon">🌲</span> Explorar el Bosque 3D
                        </a>
                        <a href="#registro" class="bp-btn bp-btn-secondary bp-smooth-scroll">
                            <span class="bp-btn-icon">✨</span> Crear un Homenaje
                        </a>
                    </div>
                </div>
            </header>

            <main class="bp-main-content">
                <!-- Sección: Explicación del Proyecto -->
                <section class="bp-section bp-about-section">
                    <div class="bp-container">
                        <div class="bp-section-header">
                            <span class="bp-section-subtitle">El Valor de un Recuerdo</span>
                            <h2 class="bp-section-title">Un espacio de consuelo y amor eterno</h2>
                        </div>
                        <div class="bp-about-grid">
                            <article class="bp-about-card">
                                <div class="bp-card-icon">🐾</div>
                                <h3>La trascendencia de su huella</h3>
                                <p>
                                    Nuestras mascotas son parte indispensable de la familia. La pérdida de un compañero deja un vacío inmenso, pero su amor y lealtad permanecen en nuestros corazones para siempre.
                                </p>
                            </article>
                            <article class="bp-about-card">
                                <div class="bp-card-icon">🌳</div>
                                <h3>Experiencia Inmersiva 3D</h3>
                                <p>
                                    BosquePatitas recrea un bosque lleno de vida y serenidad interactivo. Cada tumba 3D simboliza un árbol de recuerdo personalizado en un mapa compartido y pacífico.
                                </p>
                            </article>
                            <article class="bp-about-card">
                                <div class="bp-card-icon">🕯️</div>
                                <h3>Muro del recuerdo virtual</h3>
                                <p>
                                    Crea un homenaje para tu perro, gato u otra mascota amada. Comparte fotos, dedicatorias y enciende velas virtuales accesibles desde cualquier lugar y dispositivo.
                                </p>
                            </article>
                        </div>
                    </div>
                </section>

                <!-- Sección: Cómo Funciona -->
                <section class="bp-section bp-steps-section">
                    <div class="bp-container">
                        <div class="bp-section-header">
                            <span class="bp-section-subtitle">Paso a Paso</span>
                            <h2 class="bp-section-title">¿Cómo funciona BosquePatitas?</h2>
                        </div>
                        <div class="bp-steps-grid">
                            <article class="bp-step-card">
                                <div class="bp-step-number">1</div>
                                <h3>Regístrate en 1 clic</h3>
                                <p>Crea tu cuenta de forma rápida y sencilla con tu perfil o correo electrónico para comenzar el tributo a tu fiel compañero.</p>
                            </article>
                            <article class="bp-step-card">
                                <div class="bp-step-number">2</div>
                                <h3>Ubica la tumba y personalízala</h3>
                                <p>Selecciona la ubicación perfecta en el bosque virtual 3D, añade el nombre de tu mascota, una fotografía y un mensaje de dedicatoria.</p>
                            </article>
                            <article class="bp-step-card">
                                <div class="bp-step-number">3</div>
                                <h3>Visítala y enciende una vela</h3>
                                <p>Accede en cualquier momento para mantener encendida la llama del recuerdo, visitar el muro del recuerdo virtual y transmitir tu cariño.</p>
                            </article>
                        </div>
                    </div>
                </section>

                <!-- Área de Acceso y Registro -->
                <section id="registro" class="bp-section bp-auth-section">
                    <div class="bp-container bp-auth-container">
                        <?php if (!is_user_logged_in()): ?>
                            <div class="bp-auth-box">
                                <div class="bp-auth-header">
                                    <span class="bp-auth-badge">Únete al Santuario</span>
                                    <h2>Crea un homenaje para tu compañero inolvidable</h2>
                                    <p>Accede de forma rápida para ubicar una tumba en el cementerio virtual 3D para mascotas y guardar sus recuerdos.</p>
                                </div>
                                <div class="bp-auth-body">
                                    <div class="bp-social-login-wrapper">
                                        <?php echo do_shortcode('[nextend_social_login provider="google"]'); ?>
                                    </div>
                                    <div class="bp-auth-divider">
                                        <span>o accede con tu cuenta nativa</span>
                                    </div>
                                    <div class="bp-auth-native-links">
                                        <a href="<?php echo esc_url(wp_login_url()); ?>" class="bp-btn bp-btn-outline">
                                            Iniciar Sesión / Registrarse con Correo
                                        </a>
                                    </div>
                                </div>
                            </div>
                        <?php else: ?>
                            <?php $current_user = wp_get_current_user(); ?>
                            <div class="bp-auth-box bp-welcome-box">
                                <div class="bp-auth-header">
                                    <span class="bp-welcome-avatar">💚</span>
                                    <h2>¡Bienvenido de nuevo, <?php echo esc_html($current_user->display_name); ?>!</h2>
                                    <p>Tu espacio de homenaje y recuerdo está listo. Visita el Bosque Virtual 3D o gestiona tu espacio personal.</p>
                                </div>
                                <div class="bp-welcome-actions">
                                    <a href="<?php echo $bosque_url; ?>" class="bp-btn bp-btn-primary">
                                        🌲 Explorar el Bosque 3D
                                    </a>
                                    <a href="<?php echo $cuenta_url; ?>" class="bp-btn bp-btn-secondary">
                                        👤 Ir a Mi Cuenta / Mis Tumbas
                                    </a>
                                </div>
                            </div>
                        <?php endif; ?>
                    </div>
                </section>

                <!-- Sección: Preguntas Frecuentes (FAQ) -->
                <section class="bp-section bp-faq-section">
                    <div class="bp-container">
                        <div class="bp-section-header">
                            <span class="bp-section-subtitle">Resolvemos tus dudas</span>
                            <h2 class="bp-section-title">Preguntas Frecuentes</h2>
                        </div>
                        <div class="bp-faq-list">
                            <article class="bp-faq-item">
                                <h3 class="bp-faq-question">¿Qué es un cementerio virtual 3D para mascotas?</h3>
                                <div class="bp-faq-answer">
                                    <p>Es un espacio digital interactivo tridimensional creado para rendir homenaje a nuestras mascotas fallecidas. Permite colocar un espacio conmemorativo en un paisaje virtual 3D, añadir fotos, mensajes y encender velas de recuerdo.</p>
                                </div>
                            </article>
                            <article class="bp-faq-item">
                                <h3 class="bp-faq-question">¿Cómo puedo crear un homenaje para perro o gato en BosquePatitas?</h3>
                                <div class="bp-faq-answer">
                                    <p>Solo necesitas registrarte en 1 clic. Posteriormente, podrás elegir una ubicación en el bosque 3D, agregar la información de tu mascota (nombre, fechas, biografía y foto) y publicar tu tributo en el muro del recuerdo virtual.</p>
                                </div>
                            </article>
                            <article class="bp-faq-item">
                                <h3 class="bp-faq-question">¿Es posible encender velas virtuales o dejar dedicatorias?</h3>
                                <div class="bp-faq-answer">
                                    <p>Sí, cada homenaje cuenta con opciones interactivas para que tanto tú como tus seres queridos puedan encender una vela virtual y compartir palabras de aliento en cualquier momento.</p>
                                </div>
                            </article>
                            <article class="bp-faq-item">
                                <h3 class="bp-faq-question">¿Puedo acceder desde cualquier dispositivo móvil o tablet?</h3>
                                <div class="bp-faq-answer">
                                    <p>Absolutamente. BosquePatitas está totalmente optimizado y adaptado para ofrecer una experiencia fluida tanto en teléfonos inteligentes como en tablets y ordenadores de escritorio.</p>
                                </div>
                            </article>
                        </div>
                    </div>
                </section>
            </main>

            <footer class="bp-footer-section">
                <div class="bp-container">
                    <p class="bp-footer-text">
                        &copy; <?php echo date('Y'); ?> <strong>BosquePatitas</strong> - Cementerio Virtual 3D para Mascotas. Siempre en nuestras memorias.
                    </p>
                </div>
            </footer>
        </div>

        <!-- Schema.org JSON-LD FAQPage para SEO y Answer Engine Optimization (AEO) -->
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "¿Qué es un cementerio virtual 3D para mascotas?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Es un espacio digital interactivo tridimensional creado para rendir homenaje a nuestras mascotas fallecidas. Permite colocar un espacio conmemorativo en un paisaje virtual 3D, añadir fotos, mensajes y encender velas de recuerdo."
              }
            },
            {
              "@type": "Question",
              "name": "¿Cómo puedo crear un homenaje para perro o gato en BosquePatitas?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Solo necesitas registrarte en 1 clic. Posteriormente, podrás elegir una ubicación en el bosque 3D, agregar la información de tu mascota (nombre, fechas, biografía y foto) y publicar tu tributo en el muro del recuerdo virtual."
              }
            },
            {
              "@type": "Question",
              "name": "¿Es posible encender velas virtuales o dejar dedicatorias?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Sí, cada homenaje cuenta con opciones interactivas para que tanto tú como tus seres queridos puedan encender una vela virtual y compartir palabras de aliento en cualquier momento."
              }
            },
            {
              "@type": "Question",
              "name": "¿Puedo acceder desde cualquier dispositivo móvil o tablet?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Absolutamente. BosquePatitas está totalmente optimizado y adaptado para ofrecer una experiencia fluida tanto en teléfonos inteligentes como en tablets y ordenadores de escritorio."
              }
            }
          ]
        }
        </script>
        <?php
        return ob_get_clean();
    }
}

new BP_Landing_Page();
