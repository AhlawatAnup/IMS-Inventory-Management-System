import Swal from 'sweetalert2';
import { createIcons, Upload } from 'lucide';

// Global user state variables
let currentUser = null;
let hasWritePermission = false;

export function switchView(activeSection) {
  // Add 'hidden' to every section with class 'dash-view'
  document.querySelectorAll('.userDashContent').forEach((section) => {
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

const userDetails = document.getElementById('userDetails');
export async function getUserDetails() {
  const response = await fetch('/user/getDetails');
  const data = await response.json();

  if (!response.ok) {
    console.log('Error fetching user details: ', data.message);
    (userDetails, (innerHTML = `<p>Couldn't fetch user details!</p>`));
    return '';
  }
  console.log(data);
  return data;
}

const data = await getUserDetails();
const user = data.currentUser;
currentUser = data.currentUser;

// Check permissions securely
hasWritePermission = Boolean(
  currentUser.permissions?.write === true || currentUser.role === 'admin',
);
const activePermissions = Object.entries(user.permissions || {})
  .filter(([key, value]) => value === true)
  .map(([key]) => key)
  .join(', ');
userDetails.innerHTML = `
  <p>Username: ${user.name}</p>
  <p>Email: ${user.email}</p>
  <p>Permissions: ${activePermissions || 'None'}</p>
`;

const topBar = document.getElementById('topBar');
if (hasWritePermission) {
  topBar.insertAdjacentHTML(
    'beforeend',
    `<div class="navSection">
      <button id="uploadFormBtn">
      <i data-lucide="Upload" stroke-width=1.5></i>
        Upload CSV
      </button>`,
  );
  createIcons({
    icons: {
      Upload,
    },
  });
}

const dashboardBtn = document.getElementById('userDashboard');
const defaultDashboard = document.getElementById('defaultDashboard');
dashboardBtn.addEventListener('click', async () => {
  window.location.replace('/');
  setActiveNav(dashboardBtn);
  switchView(defaultDashboard);
});

const uploadFormBtn = document.getElementById('uploadFormBtn');
const CSVUploadForm = document.getElementById('CSVUploadForm');
const overlay = document.getElementById('fileInputOverlay');
// 1. Inject the form
if (uploadFormBtn) {
  uploadFormBtn.addEventListener('click', () => {
    switchView(CSVUploadForm);
    overlay.classList.remove('hidden');
  });
}

const logoutBtn = document.getElementById('userLogoutBtn');

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
  handleLogout();
});
