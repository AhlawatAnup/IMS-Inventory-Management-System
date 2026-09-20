import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';
import Swal from 'sweetalert2';
import { createIcons, UserPen, UserX } from 'lucide';

function switchView(activeSection) {
  // Add 'hidden' to every section with class 'dash-view'
  document.querySelectorAll('.adminDashContent').forEach((section) => {
    section.classList.add('hidden');
  });

  // Reveal the selected one
  if (activeSection) {
    activeSection.classList.remove('hidden');
  }
}

const navItems = document.querySelectorAll('aside .nav-item, aside a, aside button');

function setActiveNav(selectedItem) {
  navItems.forEach((item) => item.classList.remove('active'));
  selectedItem.classList.add('active');
}

const dashboardBtn = document.getElementById('dashboard');
const defaultDashboard = document.getElementById('defaultDashboard');
dashboardBtn.addEventListener('click', async () => {
  window.location.replace('/');
  setActiveNav(dashboardBtn);
  switchView(defaultDashboard);
});

const createUserDiv = document.getElementById('createUserDiv');
const createUserBtn = document.getElementById('createUserBtn');
createUserBtn.addEventListener('click', async () => {
  try {
    setActiveNav(createUserBtn);
    switchView(createUserDiv);
  } catch (error) {
    console.log('error in create user form loading: ', error);
    createUserDiv.innerHTML = `<p>Error in opening Create User form!</p>`;
  }
});

const viewUsersDiv = document.getElementById('viewUsersDiv');
const viewUserBtn = document.getElementById('viewUsersBtn');
viewUserBtn.addEventListener('click', async () => {
  try {
    setActiveNav(viewUserBtn);
    switchView(viewUsersDiv);

    let fetchedUsers = [];

    const response = await fetch('/admin/AllUsers');

    const data = await response.json();

    fetchedUsers = data.users;

    if (fetchedUsers.length == 0) {
      viewUsersDiv.innerHTML = `<p>No users found!</p>`;
      return;
    }
    viewUsersDiv.innerHTML = `
      <div class="header">
        <h2>User Details & Actions</h2>
      </div>
      <div class="ims-table">
        <table class="UsersTable" >
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Permissions</th>
              <th>Actions</th>
            </tr>
          </thead>
        <tbody>
        ${fetchedUsers
          .map((user) => {
            const activePermissions = Object.entries(user.permissions || {})
              .filter(([Key, value]) => value === true)
              .map(([key]) => key)
              .join(',');
            return `
        <tr>
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td>${activePermissions || 'None'}</td>
          <td>
            <div class="admin-actions">
              <button class="EditUserBtn" data-user-id="${user._id}" title="Edit">
              <i data-lucide="UserPen" stroke-width="1.5" ></i>
              </button>
              <button class="DeleteUserBtn" data-user-id="${user._id}" title="Delete">
              <i data-lucide="UserX" stroke-width="1.5" ></i>
              </button>
            </div>
          </td>
        </tr>`;
          })
          .join('')}
        </tbody>
        </table>
      </div>`;
    createIcons({
      icons: {
        UserPen,
        UserX,
      },
    });
  } catch (error) {
    console.log('error fetching users: ', error);
    viewUsersDiv.innerHTML = `<p>error loading users</p>`;
    return;
  }
});

async function deleteUser(userId) {
  const result = await Swal.fire({
    title: 'Delete User?',
    icon: 'question',
    showCancelButton: true,
    scrollbarPadding: false,
    heightAuto: false,
  });

  if (!result.isConfirmed) return;

  const response = await fetch(`/admin/deleteById/${userId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    Toastify({
      text: 'Error deleting user!',
      duration: 3000,
      gravity: 'top',
      position: 'right',
      style: { background: '#db3535' },
    }).showToast();
  } else {
    Toastify({
      text: 'User deleted Successfully!',
      duration: 3000,
      gravity: 'top',
      position: 'right',
      style: { background: '#2ecc71' },
    }).showToast();
    document.getElementById('viewUsersBtn').click();
  }
}

viewUsersDiv.addEventListener('click', (e) => {
  const editBtn = e.target.closest('.EditUserBtn');
  const deleteBtn = e.target.closest('.DeleteUserBtn');

  if (editBtn) {
    const userId = editBtn.dataset.userId;
    console.log('Edit permissions clicked for user ID:', userId);

    openEditUserModal(userId);
  }

  if (deleteBtn) {
    const userId = deleteBtn.dataset.userId;
    console.log('deleting student with id = ', userId);

    deleteUser(userId);
  }
});

const editModal = document.getElementById('editUserModal');
const editUserForm = document.getElementById('editUserForm');
const closeModalBtn = document.getElementById('closeModalBtn');

async function openEditUserModal(userId) {
  try {
    editModal.showModal();

    const res = await fetch(`/admin/fetchUser/${userId}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    const user = data.user;

    // Populate standard form inputs
    document.getElementById('editUserId').value = user._id;
    document.getElementById('editUsername').value = user.name;
    document.getElementById('editEmail').value = user.email;

    // Populate permission checkboxes
    const userPermissions = user.permissions || [];
    editUserForm.querySelectorAll('input[name="permissions"]').forEach((box) => {
      box.checked = Boolean(userPermissions[box.value]);
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    editModal.close();
  }
}

closeModalBtn.addEventListener('click', () => {
  editModal.close();
  editUserForm.reset();
});

editUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const userId = document.getElementById('editUserId').value;
  const username = document.getElementById('editUsername').value.trim();
  const email = document.getElementById('editEmail').value.trim();

  const permissions = {};
  editUserForm.querySelectorAll('input[name="permissions"]').forEach((box) => {
    permissions[box.value] = box.checked;
  });

  const payload = {
    username,
    email,
    permissions,
  };

  try {
    const res = await fetch(`/admin/updateUser/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    Toastify({
      text: 'User updated successfully!',
      style: { background: '#2ecc71' },
      duration: 3000,
      gravity: 'top',
      position: 'right',
    }).showToast();
    editModal.close();

    // Re-fetch users table to reflect updated data
    document.getElementById('viewUsersBtn').click();
  } catch (error) {
    Toastify({
      text: error.message || 'Update failed',
      style: { background: '#db3535' },
      duration: 3000,
      gravity: 'top',
      position: 'right',
    }).showToast();
  }
});

const logoutBtn = document.getElementById('adminLogoutBtn');

window.addEventListener('pageshow', (event) => {
  // If loaded from browser cache (back/forward button), force reload from server
  if (event.persisted) {
    window.location.reload();
  }
});

function handleLogout() {
  Swal.fire({
    title: 'Log out?',
    icon: 'question',
    showCancelButton: true,
    scrollbarPadding: false,
    heightAuto: false,
  }).then((r) => {
    if (r.isConfirmed) {
      window.location.replace('/auth/logout');
    }
  });
}

logoutBtn.addEventListener('click', async () => {
  setActiveNav(logoutBtn);
  handleLogout();
});
