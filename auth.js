// Initialize Firebase with your config
firebase.initializeApp(firebaseConfig);

// Auth reference
const auth = firebase.auth();
// Make sure Firestore is available before trying to use it
let db;
if (firebase.firestore) {
    db = firebase.firestore();
} else {
    console.error("Firestore is not available. Make sure to include the Firestore SDK.");
}

// Check if user is already logged in
auth.onAuthStateChanged(function(user) {
    if (user) {
        // User is signed in
        if (window.location.pathname.includes('index.html') || 
            window.location.pathname.endsWith('/') || 
            window.location.pathname.includes('signup.html')) {
            // Redirect to dashboard if on login/signup page
            window.location.href = 'dashboard.html';
        }
    } else {
        // No user is signed in
        if (window.location.pathname.includes('dashboard.html')) {
            // Redirect to login if on dashboard page
            window.location.href = 'index.html';
        }
    }
});

// Login functionality
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');
        
        // Clear previous error messages
        errorMessage.textContent = '';
        
        // Sign in with email and password
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in successfully
                window.location.href = 'dashboard.html';
            })
            .catch((error) => {
                // Handle errors
                const errorCode = error.code;
                switch(errorCode) {
                    case 'auth/user-not-found':
                        errorMessage.textContent = 'No user found with this email address.';
                        break;
                    case 'auth/wrong-password':
                        errorMessage.textContent = 'Incorrect password. Please try again.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage.textContent = 'Invalid email address format.';
                        break;
                    default:
                        errorMessage.textContent = 'Error: ' + error.message;
                }
            });
    });
}

// Signup functionality
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorMessage = document.getElementById('error-message');
        
        // Clear previous error messages
        errorMessage.textContent = '';
        
        // Check if passwords match
        if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match.';
            return;
        }
        
        // Create user with email and password
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed up successfully
                const user = userCredential.user;
                
                // Update profile with display name
                user.updateProfile({
                    displayName: name
                }).then(() => {
                    // Create user document in Firestore
                    return db.collection('users').doc(user.uid).set({
                        name: name,
                        email: email,
                        createdAt: new Date(),
                        lastLogin: new Date()
                    });
                }).then(() => {
                    // Redirect to dashboard
                    window.location.href = 'dashboard.html';
                });
            })
            .catch((error) => {
                // Handle errors
                const errorCode = error.code;
                switch(errorCode) {
                    case 'auth/email-already-in-use':
                        errorMessage.textContent = 'Email address is already in use.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage.textContent = 'Invalid email address format.';
                        break;
                    case 'auth/weak-password':
                        errorMessage.textContent = 'Password is too weak. It should be at least 6 characters.';
                        break;
                    default:
                        errorMessage.textContent = 'Error: ' + error.message;
                }
            });
    });
}

// Forgot password functionality
const forgotPasswordLink = document.getElementById('forgotPassword');
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const errorMessage = document.getElementById('error-message');
        
        if (!email) {
            errorMessage.textContent = 'Please enter your email address first.';
            return;
        }
        
        // Send password reset email
        auth.sendPasswordResetEmail(email)
            .then(() => {
                // Password reset email sent successfully
                errorMessage.textContent = '';
                alert('Password reset email sent. Check your inbox.');
            })
            .catch((error) => {
                // Handle errors
                const errorCode = error.code;
                switch(errorCode) {
                    case 'auth/user-not-found':
                        errorMessage.textContent = 'No user found with this email address.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage.textContent = 'Invalid email address format.';
                        break;
                    default:
                        errorMessage.textContent = 'Error: ' + error.message;
                }
            });
    });
}