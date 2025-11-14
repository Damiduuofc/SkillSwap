(function() {
    function createAvatarDropdown(profile) {
        var container = document.createElement('div');
        container.className = 'dropdown';

        var button = document.createElement('button');
        button.className = 'btn btn-light dropdown-toggle d-flex align-items-center';
        button.type = 'button';
        button.setAttribute('data-bs-toggle', 'dropdown');
        button.setAttribute('aria-expanded', 'false');

        var img = document.createElement('img');
        img.alt = 'Profile';
        img.style.width = '32px';
        img.style.height = '32px';
        img.style.borderRadius = '50%';
        img.style.objectFit = 'cover';
        img.style.marginRight = '8px';
        img.src = profile.photoURL || '/public/pp.png';

        var label = document.createElement('span');
        label.textContent = profile.username || profile.email || 'Me';

        button.appendChild(img);
        button.appendChild(label);

        var menu = document.createElement('ul');
        menu.className = 'dropdown-menu dropdown-menu-end';

        var dashboardItem = document.createElement('li');
        var dashLink = document.createElement('a');
        dashLink.className = 'dropdown-item';
        dashLink.href = '/Dashboard.html';
        dashLink.textContent = 'Dashboard';
        dashboardItem.appendChild(dashLink);

        var logoutItem = document.createElement('li');
        var logoutLink = document.createElement('a');
        logoutLink.className = 'dropdown-item';
        logoutLink.href = '#';
        logoutLink.textContent = 'Logout';
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (window.firebaseAuth) {
                firebaseAuth.signOut().finally(function() {
                    localStorage.removeItem('currentUser');
                    window.location.href = '/home.html';
                });
            } else {
                localStorage.removeItem('currentUser');
                window.location.href = '/home.html';
            }
        });
        logoutItem.appendChild(logoutLink);

        menu.appendChild(dashboardItem);
        menu.appendChild(logoutItem);

        container.appendChild(button);
        container.appendChild(menu);
        return container;
    }

   function replaceSignupWithAvatar(profile) {
    var signupButton = document.querySelector('.btn-signup-corner');
    if (!signupButton) return;

    var avatarDropdown = createAvatarDropdown(profile);
    signupButton.replaceWith(avatarDropdown); // replace button only, keep parent
}


    function updateHeroCTA(isLoggedIn) {
        var heroLoginBtn = document.querySelector('.btn-login');
        if (!heroLoginBtn) return;
        if (isLoggedIn) {
            heroLoginBtn.textContent = 'Get Started';
            heroLoginBtn.addEventListener('click', function(e){
                // Go to dashboard when logged in
                e.preventDefault();
                window.location.href = '/Dashboard.html';
            }, { once: true });
        } else {
            // Keep default behavior (link to login)
        }
    }

    function getCurrentProfile() {
        try {
            var raw = localStorage.getItem('currentUser');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function onAuthState(profile) {
        var isLoggedIn = !!profile;
        if (isLoggedIn) {
            replaceSignupWithAvatar(profile);
        }
        updateHeroCTA(isLoggedIn);
    }

    document.addEventListener('DOMContentLoaded', function() {
        var localProfile = getCurrentProfile();
        onAuthState(localProfile);

        if (window.firebaseAuth) {
            firebaseAuth.onAuthStateChanged(function(user) {
                if (user) {
                    var merged = localProfile || { email: user.email, uid: user.uid };
                    onAuthState(merged);
                } else {
                    onAuthState(null);
                }
            });
        }
    });
})();


