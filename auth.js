// DOM elements
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authError = document.getElementById('auth-error');

// Login function
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in
                window.location.href = 'chat.html';
            })
            .catch((error) => {
                authError.textContent = error.message;
            });
    });
}

// Signup function
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (password !== confirmPassword) {
            authError.textContent = 'Passwords do not match';
            return;
        }
        
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed up
                const user = userCredential.user;
                
                // Save user data to Firestore
                return db.collection('users').doc(user.uid).set({
                    name: name,
                    email: email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                window.location.href = 'chat.html';
            })
            .catch((error) => {
                authError.textContent = error.message;
            });
    });
}

// Check auth state
auth.onAuthStateChanged((user) => {
    if (user && (window.location.pathname.includes('login.html') || 
                 window.location.pathname.includes('signup.html'))) {
        window.location.href = 'chat.html';
    } else if (!user && window.location.pathname.includes('chat.html')) {
        window.location.href = 'login.html';
    }
});
