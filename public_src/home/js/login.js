import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';

const loginBtn = document.getElementById('loginBtn');
const originalText = loginBtn.innerHTML;

loginBtn.addEventListener('click', async (e) => {
  try {
    e.preventDefault();

    const form = document.getElementById('loginForm');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const role = document.getElementById('role').value;

    if (!username || !password || !role) {
      Toastify({
        text: 'Please fill in complete details!',
        duration: 3000,
        gravity: 'top',
        position: 'right',
        style: { background: '#db3535' },
      }).showToast();

      loginBtn.disabled = false;
      loginBtn.innerHTML = originalText;

      return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = 'logging in...';

    const payload = {
      username: username,
      password: password,
      role: role,
    };

    console.log('payload:', payload);
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      Toastify({
        text: data.message,
        duration: 3000,
        gravity: 'top',
        position: 'right',
        style: { background: '#db3535' },
      }).showToast();

      loginBtn.disabled = false;
      loginBtn.innerHTML = originalText;
    } else {
      console.log('login successfull!');
      console.log('role: ', data.role);
      console.log('data: ', data);
      console.log('isPasswordReset: ', data.isPasswordReset);

      if (data.role == 'admin') {
        if (data.isPasswordReset) {
          window.location.replace('/dashboard');
        } else {
          window.location.replace('/admin/resetPass');
        }
      } else if (data.role == 'user') {
        window.location.replace('/dashboard');
      }
    }
  } catch (error) {
    console.log('error logging in: ', error);
    Toastify({
      text: 'Login Failed due to server-side error!',
      duration: 3000,
      gravity: 'top',
      position: 'right',
      style: { background: '#db3535' },
    }).showToast();

    loginBtn.disabled = false;
    loginBtn.innerHTML = originalText;
  }
});
