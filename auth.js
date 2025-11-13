// ========================
// Firebase Auth + Firestore
// ========================

// Helper
function $(selector, root) { return (root || document).querySelector(selector); }
function on(el, event, handler) { if (el) el.addEventListener(event, handler); }

// Save user profile to localStorage
function saveUserProfile(profile) {
    if (!profile || !profile.email) return;
    localStorage.setItem('profile:' + profile.email.toLowerCase(), JSON.stringify(profile));
    localStorage.setItem('currentUser', JSON.stringify(profile));
}

// Read profile from localStorage
function readUserProfile(email) {
    if (!email) return null;
    const raw = localStorage.getItem('profile:' + email.toLowerCase());
    return raw ? JSON.parse(raw) : null;
}

// ========================
// SIGNUP FUNCTIONALITY
// ========================
function bindSignup() {
    const form = document.querySelector('.form-card form');
    if (!form) return;

    let teachSkills = [];
    let learnSkills = [];

    const teachInput = $('#teachInput');
    const learnInput = $('#learnInput');
    const teachList = $('#teachList');
    const learnList = $('#learnList');
    const addTeach = $('#addTeach');
    const addLearn = $('#addLearn');

    function createChip(skill, list, array) {
        const chip = document.createElement("div");
        chip.className = "chip";
        chip.innerHTML = `${skill} <button type="button">&times;</button>`;
        chip.querySelector("button").addEventListener("click", () => {
            chip.remove();
            const idx = array.indexOf(skill);
            if (idx > -1) array.splice(idx, 1);
        });
        list.appendChild(chip);
    }

    addTeach.addEventListener("click", () => {
        const skill = teachInput.value.trim();
        if (skill && !teachSkills.includes(skill)) {
            teachSkills.push(skill);
            createChip(skill, teachList, teachSkills);
            teachInput.value = "";
        }
    });

    addLearn.addEventListener("click", () => {
        const skill = learnInput.value.trim();
        if (skill && !learnSkills.includes(skill)) {
            learnSkills.push(skill);
            createChip(skill, learnList, learnSkills);
            learnInput.value = "";
        }
    });

    teachInput.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addTeach.click(); } });
    learnInput.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addLearn.click(); } });

    on(form, "submit", async e => {
        e.preventDefault();
        const username = $('#username')?.value.trim();
        const email = $('#email')?.value.trim();
        const password = $('#password')?.value;

        if (!username || !email || !password) return alert("Please fill all required fields!");

        try {
            console.log('Attempting createUserWithEmailAndPassword for', email);
            const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
            console.log('createUserWithEmailAndPassword success:', cred);
            const uid = cred.user.uid;

            const profile = {
                uid,
                username,
                email,
                teachSkills,
                learnSkills,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                await firebase.firestore().collection("users").doc(uid).set(profile);
                saveUserProfile(profile);
            } catch (fireErr) {
                console.warn('Firestore write failed, trying Realtime Database as fallback', fireErr);
                try {
                    if (window.firebaseDatabase) {
                        await firebaseDatabase.ref('users/' + uid).set(profile);
                        saveUserProfile(profile);
                    } else if (firebase.database) {
                        // older SDK reference
                        await firebase.database().ref('users/' + uid).set(profile);
                        saveUserProfile(profile);
                    } else {
                        // fallback to localStorage only
                        saveUserProfile(profile);
                        console.warn('No database SDK available, profile saved locally only');
                    }
                } catch (dbErr) {
                    console.warn('Realtime DB write failed, saving profile locally only', dbErr);
                    saveUserProfile(profile);
                }
            }

            alert("Signup successful! Redirecting to login...");
            form.reset();
            teachSkills = [];
            learnSkills = [];
            teachList.innerHTML = "";
            learnList.innerHTML = "";
            window.location.href = "login.html";

        } catch (err) {
            console.error("Signup error:", err);
            // Provide code + message where available for easier troubleshooting
            var code = err && err.code ? err.code : 'unknown';
            var msg = err && err.message ? err.message : String(err);
            // If email already in use, suggest login
            if (code === 'auth/email-already-in-use') {
                if (confirm('The email is already used. Do you want to go to login page?')) {
                    window.location.href = 'login.html';
                }
            } else {
                alert('Signup failed (' + code + '): ' + msg);
            }
        }
    });
}

// ========================
// LOGIN FUNCTIONALITY
// ========================
function bindLogin() {
    const loginForm = document.querySelector(".login-form");
    if (!loginForm) return;

    on(loginForm, "submit", async e => {
        e.preventDefault();

        const emailInput = loginForm.querySelector('input[type="email"]');
        const passwordInput = $('#password');
        let input = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!input || !password) return alert("Email/Username & Password are required!");

        try {
            let email = input;

            // Resolve username -> email
            if (!/@/.test(input)) {
                const usersSnapshot = await firebase.firestore().collection("users")
                    .where("username", "==", input)
                    .get();

                if (!usersSnapshot.empty) {
                    email = usersSnapshot.docs[0].data().email;
                } else {
                    return alert("Username not found. Please use email.");
                }
            }

            const cred = await firebase.auth().signInWithEmailAndPassword(email, password);

            let profile = null;
            try {
                const doc = await firebase.firestore().collection("users").doc(cred.user.uid).get();
                profile = doc.exists ? doc.data() : null;
            } catch (readErr) {
                console.warn('Firestore read failed, attempting Realtime DB read', readErr);
                try {
                    if (window.firebaseDatabase) {
                        const snap = await firebaseDatabase.ref('users/' + cred.user.uid).once('value');
                        profile = snap.exists() ? snap.val() : null;
                    } else if (firebase.database) {
                        const snap = await firebase.database().ref('users/' + cred.user.uid).once('value');
                        profile = snap.exists() ? snap.val() : null;
                    }
                } catch (dbReadErr) {
                    console.warn('Realtime DB read failed', dbReadErr);
                }
            }
            if (!profile) profile = { uid: cred.user.uid, email };
            saveUserProfile(profile);

            console.log("Login successful:", profile.email);
            window.location.href = "Dashboard.html";

        } catch (err) {
            console.error("Login error:", err);
            alert(err.message || "Login failed!");
        }
    });
}

// ========================
// LOGOUT FUNCTIONALITY
// ========================
function bindLogout(logoutBtnSelector) {
    const logoutBtn = $(logoutBtnSelector);
    if (!logoutBtn) return;

    on(logoutBtn, "click", async () => {
        try {
            await firebase.auth().signOut();
            localStorage.removeItem("currentUser");
            alert("Logged out successfully!");
            window.location.href = "login.html";
        } catch (err) {
            console.error("Logout error:", err);
            alert("Logout failed!");
        }
    });
}

// ========================
// DASHBOARD AUTH CHECK
// ========================
function checkAuthRedirect() {
    firebase.auth().onAuthStateChanged(user => {
        if (!user) {
            window.location.href = "login.html";
        } else {
            console.log("User logged in:", user.email);
        }
    });
}

// ========================
// AUTO BIND ON DOM READY
// ========================
document.addEventListener("DOMContentLoaded", () => {
    bindSignup();
    bindLogin();
    // bindLogout("#logoutBtn"); // Use this on dashboard
    // checkAuthRedirect();     // Use this on dashboard
});
