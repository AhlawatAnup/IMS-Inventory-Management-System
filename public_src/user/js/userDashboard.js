import Swal from 'sweetalert2';
import { createIcons, Upload, MapPlus } from 'lucide';

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

function setActiveNav(selectedItem) {
  const navItems = document.querySelectorAll('aside a, aside button, aside #userOptions a');
  navItems.forEach((item) => item.classList.remove('active'));
  selectedItem.classList.add('active');
}

// const userDetails = document.getElementById('userDetails');
export async function getUserDetails() {
  const response = await fetch('/user/getDetails');
  const data = await response.json();

  if (!response.ok) {
    console.log('Error fetching user details: ', data.message);
    // (userDetails, (innerHTML = `<p>Couldn't fetch user details!</p>`));
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
// const activePermissions = Object.entries(user.permissions || {})
//   .filter(([key, value]) => value === true)
//   .map(([key]) => key)
//   .join(', ');
// userDetails.innerHTML = `
//   <p>Username: ${user.name}</p>
//   <p>Email: ${user.email}</p>
//   <p>Permissions: ${activePermissions || 'None'}</p>
// `;

const topBar = document.getElementById('topBar');
const userOptions = document.getElementById('userOptions');
if (hasWritePermission) {
  topBar.insertAdjacentHTML(
    'beforeend',
    `<div class="navSection">
      <button id="uploadFormBtn">
      <i data-lucide="Upload" stroke-width=1.5></i>
        Upload CSV
      </button>`,
  );
  userOptions.innerHTML = `<a id="createProject">
      <i data-lucide="MapPlus" stroke-width="1.5"></i>
      Create Project
    </a>`;
  createIcons({
    icons: {
      Upload,
      MapPlus,
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
const CsvSidePanel = document.getElementById('CsvSidePanel');
const overlay = document.getElementById('Overlay');
// 1. Inject the form
if (uploadFormBtn) {
  uploadFormBtn.addEventListener('click', () => {
    CsvSidePanel.classList.remove('hidden');
    overlay.classList.remove('hidden');
    setTimeout(() => CsvSidePanel.classList.add('open'), 10);
  });
}

const profileBtn = document.getElementById('userProfile');
const profilePage = document.getElementById('profilePage');
profileBtn.addEventListener('click', async () => {
  defaultDashboard.style.display = 'none';
  setActiveNav(profileBtn);
  switchView(profilePage);
});

const createProjectBtn = document.getElementById('createProject');
const createProjectPage = document.getElementById('createProjectPage');
createProjectBtn.addEventListener('click', async () => {
  defaultDashboard.style.display = 'none';
  setActiveNav(createProjectBtn);
  switchView(createProjectPage);
});

const uploadBtn = document.getElementById('uploadProjectFormBtn');
const projectSidePanel = document.getElementById('projectSidePanel');
const projectUploadOverlay = document.getElementById('Overlay');
// 1. Inject the form
if (uploadBtn) {
  uploadBtn.addEventListener('click', () => {
    projectSidePanel.classList.remove('hidden');
    projectUploadOverlay.classList.remove('hidden');
    setTimeout(() => projectSidePanel.classList.add('open'), 10);
  });
}

window.addEventListener('pageshow', (event) => {
  // If loaded from browser cache (back/forward button), force reload from server
  if (event.persisted) {
    window.location.reload();
  }
});

const logoutBtn = document.getElementById('userLogoutBtn');

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
