document.addEventListener('DOMContentLoaded', function() {

    // Tab Switching
    const tabBtns = document.querySelectorAll('.bp-tab-btn');
    const tabContents = document.querySelectorAll('.bp-tab-content');
    const feedbackBox = document.getElementById('bp-auth-feedback');
    const lostTab = document.getElementById('bp-lost-tab');

    if (tabBtns.length > 0) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const targetTab = this.getAttribute('data-tab');

                // Update active tab buttons
                tabBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // Hide feedback
                hideFeedback();

                // Show target tab content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    content.style.display = 'none';
                });

                const activeContent = document.getElementById(targetTab);
                if (activeContent) {
                    activeContent.classList.add('active');
                    activeContent.style.display = 'block';
                }
            });
        });
    }

    // Toggle Lost Password Form
    const lostToggle = document.querySelector('.bp-toggle-lost');
    const cancelLost = document.querySelector('.bp-cancel-lost');

    if (lostToggle && lostTab) {
        lostToggle.addEventListener('click', function(e) {
            e.preventDefault();
            hideFeedback();
            tabContents.forEach(c => {
                c.classList.remove('active');
                c.style.display = 'none';
            });
            lostTab.style.display = 'block';
            lostTab.classList.add('active');
        });
    }

    if (cancelLost && lostTab) {
        cancelLost.addEventListener('click', function(e) {
            e.preventDefault();
            hideFeedback();
            lostTab.style.display = 'none';
            lostTab.classList.remove('active');

            // Return to login tab
            const loginTab = document.getElementById('bp-login-tab');
            const loginBtn = document.querySelector('[data-tab="bp-login-tab"]');
            if (loginTab) {
                loginTab.style.display = 'block';
                loginTab.classList.add('active');
            }
            if (loginBtn) {
                tabBtns.forEach(b => b.classList.remove('active'));
                loginBtn.classList.add('active');
            }
        });
    }

    // Feedback Helpers
    function showFeedback(message, type = 'error') {
        if (!feedbackBox) return;
        feedbackBox.className = 'bp-auth-feedback bp-' + type;
        feedbackBox.innerHTML = message;
        feedbackBox.style.display = 'block';
    }

    function hideFeedback() {
        if (!feedbackBox) return;
        feedbackBox.style.display = 'none';
        feedbackBox.innerHTML = '';
    }

    // AJAX Form Submissions
    function handleFormSubmit(formId, actionName) {
        const form = document.getElementById(formId);
        if (!form) return;

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            hideFeedback();

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.innerText : '';

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Cargando...';
            }

            const formData = new FormData(form);
            formData.append('action', actionName);

            // Fetch AJAX call
            fetch(BP_Auth_Data.ajaxurl, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(res => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalBtnText;
                }

                if (res.success) {
                    showFeedback(res.data.message || 'Operación exitosa', 'success');
                    if (res.data.redirect) {
                        setTimeout(() => {
                            window.location.href = res.data.redirect;
                        }, 1200);
                    }
                } else {
                    showFeedback(res.data.message || 'Ha ocurrido un error. Inténtalo de nuevo.', 'error');
                }
            })
            .catch(err => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalBtnText;
                }
                showFeedback('Error de conexión con el servidor.', 'error');
            });
        });
    }

    handleFormSubmit('bp-form-login', 'bp_ajax_login');
    handleFormSubmit('bp-form-register', 'bp_ajax_register');
    handleFormSubmit('bp-form-lost', 'bp_ajax_lost_password');

});
