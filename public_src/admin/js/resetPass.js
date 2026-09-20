import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';

const resetPassBtn = document.getElementById('resetPassBtn');
const originalText = resetPassBtn.innerHTML;
resetPassBtn.addEventListener('click', async (e) => {
  try {
    e.preventDefault();

    resetPassBtn.disabled = true;
    resetPassBtn.innerHTML = 'Resetting Password...';

    const oldPassword = document.getElementById('oldPass').value.trim();
    const newPassword = document.getElementById('newPass').value.trim();

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      if (newPassword.length < 8) {
        Toastify({
          text: 'password must contain atleast 8 characters!',
          duration: 3000,
          gravity: 'top',
          position: 'right',
          style: { background: '#db3535' },
        }).showToast();
      }

      if (!/[a-z]/.test(newPassword)) {
        Toastify({
          text: 'password must contain atleast 1 small letter!',
          duration: 3000,
          gravity: 'top',
          position: 'right',
          style: { background: '#db3535' },
        }).showToast();
      }

      if (!/[A-Z]/.test(newPassword)) {
        Toastify({
          text: 'password must contain atleast 1 capital letter!',
          duration: 3000,
          gravity: 'top',
          position: 'right',
          style: { background: '#db3535' },
        }).showToast();
      }

      if (!/\d/.test(newPassword)) {
        Toastify({
          text: 'password must contain atleast 1 digit!',
          duration: 3000,
          gravity: 'top',
          position: 'right',
          style: { background: '#db3535' },
        }).showToast();
      }

      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
        Toastify({
          text: 'password must contain atleast 1 special character!',
          duration: 3000,
          gravity: 'top',
          position: 'right',
          style: { background: '#db3535' },
        }).showToast();
      }

      resetPassBtn.disabled = false;
      resetPassBtn.innerHTML = originalText;

      return;
    }

    const payload = {
      oldPassword: oldPassword,
      newPassword: newPassword,
    };

    const res = await fetch('/admin/resetPassword', {
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

      resetPassBtn.disabled = false;
      resetPassBtn.innerHTML = originalText;
    } else {
      window.location.replace('/dashboard');
    }
  } catch (error) {
    console.log('error in resetting password: ', error);
    resetPassBtn.disabled = false;
    resetPassBtn.innerHTML = originalText;
  }
});
