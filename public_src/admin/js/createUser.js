import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';

const createUserForm = document.getElementById('createUserForm');
const signupBtn = document.getElementById('userSignupBtn');
const originalText = signupBtn.innerHTML;

signupBtn.addEventListener('click', async (e) => {
  try {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPwd = document.getElementById('confirmPwd').value.trim();

    if (!username || !email || !password || !confirmPwd) {
      Toastify({
        text: 'Please fill in complete details!',
        duration: 3000,
        gravity: 'top',
        position: 'right',
        style: { background: '#db3535' },
      }).showToast();

      signupBtn.disabled = false;
      signupBtn.innerHTML = originalText;

      return;
    }

    signupBtn.disabled = true;
    signupBtn.innerHTML = 'Registering...';

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

    if (!passwordRegex.test(password)) {
      if (password.length < 8) {
        Toastify({
          text: 'password must contain atleast 8 characters!',
          duration: 3000,
          gravity: 'top',
          position: 'right',
          style: { background: '#db3535' },
        }).showToast();
      }

      if (!/[a-z]/.test(password)) {
        Toastify({
          text: 'password must contain atleast 1 small letter!',
          duration: 3000,
          gravity: 'top',
          position: 'right',
          style: { background: '#db3535' },
        }).showToast();
      }

      if (!/[A-Z]/.test(password)) {
        Toastify({
          text: 'password must contain atleast 1 capital letter!',
          duration: 3000,
          gravity: 'top',
          position: 'right',
          style: { background: '#db3535' },
        }).showToast();
      }

      if (!/\d/.test(password)) {
        Toastify({
          text: 'password must contain atleast 1 digit!',
          duration: 3000,
          gravity: 'top',
          position: 'right',
          style: { background: '#db3535' },
        }).showToast();
      }

      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        Toastify({
          text: 'password must contain atleast 1 special character!',
          duration: 3000,
          gravity: 'top',
          position: 'right',
          style: { background: '#db3535' },
        }).showToast();
      }

      signupBtn.disabled = false;
      signupBtn.innerHTML = originalText;

      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      Toastify({
        text: 'Enter valid email!',
        duration: 3000,
        gravity: 'top',
        position: 'right',
        style: { background: '#db3535' },
      }).showToast();

      signupBtn.disabled = false;
      signupBtn.innerHTML = originalText;

      return;
    }

    if (confirmPwd !== password) {
      Toastify({
        text: `Confirmation of password doesn't match!`,
        duration: 3000,
        gravity: 'top',
        position: 'right',
        style: { background: '#db3535' },
      }).showToast();

      signupBtn.disabled = false;
      signupBtn.innerHTML = originalText;

      return;
    }

    const payload = {
      username: username,
      email: email,
      password: password,
    };

    const res = await fetch('/auth/userSignup', {
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

      signupBtn.disabled = false;
      signupBtn.innerHTML = originalText;
      createUserForm.reset();
      return;
    } else {
      Toastify({
        text: 'User Created Successfully!',
        duration: 3000,
        gravity: 'top',
        position: 'right',
        style: { background: '#00db28' },
      }).showToast();

      signupBtn.disabled = false;
      signupBtn.innerHTML = originalText;

      createUserForm.reset();

      return;
    }
  } catch (error) {
    console.log('error in user signup: ', error);

    Toastify({
      text: 'Signup Failed due to server-side error!',
      duration: 3000,
      gravity: 'top',
      position: 'right',
      style: { background: '#db3535' },
    }).showToast();

    signupBtn.disabled = false;
    signupBtn.innerHTML = originalText;
  }
});
