import { createIcons, User, AtSign, UserShield } from 'lucide';
import { getUserDetails } from '../js/userDashboard.js';

let currentUser = null;
let hasWritePermission = false;

const data = await getUserDetails();
const user = data.currentUser;
currentUser = data.currentUser;

const userProfile = document.getElementById('profileDetails');

// Check permissions securely
hasWritePermission = Boolean(
  currentUser.permissions?.write === true || currentUser.role === 'admin',
);
const activePermissionsHtml = Object.entries(user.permissions || {})
  .filter(([key, value]) => value === true)
  .map(([key]) => `<span class="permissionTag">${key}</span>`)
  .join('');

const getInitials = (name) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

const userInitials = getInitials(user.name);
const userRole = user.role ? user.role.toUpperCase() : 'MEMBER';

userProfile.innerHTML = `

<div class="profile-header">
<div class="profile-avatar">${userInitials}</div>
<div class="profile-title-section">
<h2 class="profile-name">
${user.name} 
<span class="role-badge">${userRole}</span>
</h2>
</div>
</div>
<p><i data-lucide="User" stroke-width=2></i><strong>Username:</strong> ${user.name}</p>
<p><i data-lucide="AtSign" stroke-width=2></i><strong>Email:</strong> ${user.email}</p>
<div class="permissionsContainer">
<p><i data-lucide="UserShield" stroke-width=2></i><strong>Permissions:</strong><div class="tagsWrapper">${activePermissionsHtml || '<span class="noPermissions">None</span>'}</div></p>
</div>
`;

createIcons({
  icons: { User, AtSign, UserShield },
});
