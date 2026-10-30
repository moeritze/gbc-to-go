import { auth, signInWithEmailAndPassword } from '../firebase.js';

const MESSAGES = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/invalid-email': 'That email address is not valid.',
  'auth/too-many-requests': 'Too many tries. Wait a minute, then try again.',
  'auth/network-request-failed': 'No connection. Check your network and try again.',
};

export function mount(root) {
  root.innerHTML = `<section class="center-screen">
    <h1 class="wordmark">gbc-to-go</h1>
    <p class="lede">Your Game Boy library, on any screen.</p>
    <form class="stack" novalidate>
      <label>Email<input name="email" type="email" autocomplete="username" required></label>
      <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
      <p class="form-error" role="alert" hidden></p>
      <button class="primary" type="submit">Sign in</button>
    </form></section>`;
  const form = root.querySelector('form');
  const err = form.querySelector('.form-error');
  form.email.focus();
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    err.hidden = true;
    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    try {
      await signInWithEmailAndPassword(auth, form.email.value.trim(), form.password.value);
      // onAuthStateChanged in app.js moves on.
    } catch (e) {
      err.textContent = MESSAGES[e.code] || e.message;
      err.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  };
}
