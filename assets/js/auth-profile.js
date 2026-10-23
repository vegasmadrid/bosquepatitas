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
    function showFeedback(message, type = 'error', targetId = 'bp-auth-feedback') {
        const targetBox = document.getElementById(targetId) || feedbackBox;
        if (!targetBox) return;
        targetBox.className = 'bp-auth-feedback bp-' + type;
        targetBox.innerHTML = message;
        targetBox.style.display = 'block';
    }

    function hideFeedback(targetId = 'bp-auth-feedback') {
        const targetBox = document.getElementById(targetId) || feedbackBox;
        if (!targetBox) return;
        targetBox.style.display = 'none';
        targetBox.innerHTML = '';
    }

    // AJAX Auth Form Submissions
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

    // ----------------------------------------------------
    // PET FORM & MANAGEMENT INTERACTION
    // ----------------------------------------------------
    const openPetFormBtn = document.getElementById('bp-btn-open-pet-form');
    const cancelPetFormBtn = document.getElementById('bp-btn-cancel-pet');
    const petFormContainer = document.getElementById('bp-pet-form-container');
    const petForm = document.getElementById('bp-form-mascota');

    if (openPetFormBtn && petFormContainer) {
        openPetFormBtn.addEventListener('click', function() {
            petFormContainer.classList.toggle('bp-hidden');
            if (!petFormContainer.classList.contains('bp-hidden')) {
                petFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    if (cancelPetFormBtn && petFormContainer) {
        cancelPetFormBtn.addEventListener('click', function() {
            petFormContainer.classList.add('bp-hidden');
        });
    }

    if (petForm) {
        petForm.addEventListener('submit', function(e) {
            e.preventDefault();
            hideFeedback('bp-pet-form-feedback');

            const submitBtn = petForm.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.innerText : '';

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Guardando Ficha...';
            }

            const formData = new FormData(petForm);
            formData.append('action', 'bp_ajax_save_mascota');

            fetch(BP_Auth_Data.ajaxurl, {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(res => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalText;
                }

                if (res.success) {
                    showFeedback(res.data.message, 'success', 'bp-pet-form-feedback');
                    setTimeout(() => {
                        window.location.href = res.data.redirect || window.location.href;
                    }, 1200);
                } else {
                    showFeedback(res.data.message || 'Error al guardar la mascota', 'error', 'bp-pet-form-feedback');
                }
            })
            .catch(err => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalText;
                }
                showFeedback('Error de conexión con el servidor', 'error', 'bp-pet-form-feedback');
            });
        });
    }

    // Unlink Pet Buttons
    document.querySelectorAll('.bp-btn-unlink-pet').forEach(btn => {
        btn.addEventListener('click', function() {
            const petId = this.dataset.petId;
            if (!confirm('¿Deseas quitar esta mascota de su tumba 3D? La tumba quedará libre para otra mascota.')) return;

            const formData = new FormData();
            formData.append('action', 'bp_ajax_unlink_mascota');
            formData.append('mascota_id', petId);
            formData.append('bp_nonce', BP_Auth_Data.nonce);

            fetch(BP_Auth_Data.ajaxurl, { method: 'POST', body: formData })
                .then(res => res.json())
                .then(res => {
                    if (res.success) {
                        window.location.reload();
                    } else {
                        alert(res.data.message || 'Error al desasignar.');
                    }
                });
        });
    });

    // Delete Pet Buttons
    document.querySelectorAll('.bp-btn-delete-pet').forEach(btn => {
        btn.addEventListener('click', function() {
            const petId = this.dataset.petId;
            if (!confirm('¿Seguro que deseas eliminar la ficha de esta mascota? Esta acción no se puede deshacer.')) return;

            const formData = new FormData();
            formData.append('action', 'bp_ajax_delete_mascota');
            formData.append('mascota_id', petId);
            formData.append('bp_nonce', BP_Auth_Data.nonce);

            fetch(BP_Auth_Data.ajaxurl, { method: 'POST', body: formData })
                .then(res => res.json())
                .then(res => {
                    if (res.success) {
                        window.location.reload();
                    } else {
                        alert(res.data.message || 'Error al eliminar.');
                    }
                });
        });
    });

});
