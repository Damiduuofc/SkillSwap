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
            const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const uid = cred.user.uid;

            const profile = {
                uid,
                username,
                email,
                teachSkills,
                learnSkills,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await firebase.firestore().collection("users").doc(uid).set(profile);
            saveUserProfile(profile);

            alert("Signup successful! Redirecting to login...");
            form.reset();
            teachSkills = [];
            learnSkills = [];
            teachList.innerHTML = "";
            learnList.innerHTML = "";
            window.location.href = "login.html";

        } catch (err) {
            console.error("Signup error:", err);
            alert(err.message || "Signup failed!");
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

            const doc = await firebase.firestore().collection("users").doc(cred.user.uid).get();
            const profile = doc.exists ? doc.data() : { uid: cred.user.uid, email };
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
