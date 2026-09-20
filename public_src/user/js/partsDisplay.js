import Swal from 'sweetalert2';
import { createIcons, Pencil, Upload, Trash, Search, Copy } from 'lucide';
import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';
import { switchView, getUserDetails } from './userDashboard';

//Global search-query variable
let currentSearchQuery = '';

// Global user state variables
let currentUser = null;
let hasWritePermission = false;

const data = await getUserDetails();
const user = data.currentUser;
currentUser = data.currentUser;

// Check permissions securely
hasWritePermission = Boolean(
  currentUser.permissions?.write === true || currentUser.role === 'admin',
);

function renderPaginationControls(currentPage, totalPages) {
  const paginationContainer = document.getElementById('paginationContainer');
  if (!paginationContainer) return;

  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  let buttonsHtml = '';

  // Previous Button
  buttonsHtml += `
    <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
      Previous
    </button>
  `;

  // Page Number Buttons
  for (let i = 1; i <= totalPages; i++) {
    buttonsHtml += `
      <button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">
        ${i}
      </button>
    `;
  }

  // Next Button
  buttonsHtml += `
    <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
      Next
    </button>
  `;

  paginationContainer.innerHTML = buttonsHtml;
}

window.changePage = function (newPage) {
  initPartsTable(newPage);
  const userDashDiv = document.getElementById('userDashDiv');
  if (userDashDiv) userDashDiv.scrollTo({ top: 0, behavior: 'smooth' });
};

function renderPartsTable(partsArr) {
  const tableRows = partsArr
    .map((part) => {
      const formattedDate = part.updatedAt
        ? new Date(part.updatedAt).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })
        : 'N/A';

      const ActionButton = hasWritePermission
        ? `<div class="admin-actions">
        <button class="edit-btn" data-id="${part._id}" title="Edit">
        <i data-lucide="Pencil" stroke-width = 1.5 stroke="#4f545e"></i>
        </button>
        <button class="delete-btn" data-id="${part._id}" title="Delete">
        <i data-lucide="Trash" stroke-width = 1.5 stroke="#4f545e"></i>
        </button>
        </div>`
        : `<span class="text-muted">Read-only</span>`;

      return `
        <tr>
          <td>
          ${part.mfgPartNumber || ''}
          <button class="copy-btn"data-mpn="${part.mfgPartNumber || ''}" title="Copy MPN"><i data-lucide="Copy" stroke-width=1.5></i></button>
          </td>
          <td>${part.footprint || ''}</td>
          <td>${part.value || ''}</td>
          <td>${part.description || ''}</td>
          <td>${part.quantity || 0}</td>
          <td>${formattedDate}</td>
          <td>
            ${ActionButton}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
  <div class="ims-table">
  <div class="search-container">
      <i data-lucide = "Search" stroke-width = 1.5></i>
      <input type="text" placeholder="Search parts by MPN or Value..." autocomplete="off" id="searchInput" />
    </div>
  <table id="partsDisplayTable">
  <thead>
  <th>MPN</th>
  <th>Footprint</th>
  <th>Value</th>
  <th>Description</th>
  <th>Quantity</th>
  <th>last Updated</th>
  <th>Actions</th>
  </thead>
  <tbody>
  ${tableRows}
  </tbody>
  </table>
  </div>
  <div id="paginationContainer" class="pagination-container"></div>
  `;
}

async function initPartsTable(page = 1) {
  const partsDisplayDiv = document.getElementById('partsDisplayDiv');

  if (!partsDisplayDiv) {
    console.error('CRITICAL: #partsDisplayDiv not found in DOM!');
    return;
  }

  try {
    // Fetch using the global currentSearchQuery state
    const response = await fetch(`/parts/fetchPage?page=${page}&search=${currentSearchQuery}`);
    const data = await response.json();

    const partsArray = data.parts || [];
    const totalPages = data.totalPages || 1;
    const currentPage = data.currentPage || page;

    // Render table and pagination
    partsDisplayDiv.innerHTML = renderPartsTable(partsArray);
    renderPaginationControls(currentPage, totalPages);
    createIcons({ icons: { Pencil, Trash, Search, Copy } });

    // RESTORE value and cursor position if the search bar was active
    const searchInput = document.getElementById('searchInput');
    if (searchInput && currentSearchQuery) {
      searchInput.value = currentSearchQuery;
      searchInput.focus();
      searchInput.setSelectionRange(currentSearchQuery.length, currentSearchQuery.length);
    }
  } catch (error) {
    console.log('Failed to fetch parts:', error);
  }
}

// Global input listener for live search with debounce
let searchDebounceTimer;
document.addEventListener('input', (e) => {
  const searchInput = e.target.closest('#searchInput');
  if (!searchInput) return;

  clearTimeout(searchDebounceTimer);
  currentSearchQuery = searchInput.value.trim();

  searchDebounceTimer = setTimeout(() => {
    initPartsTable(1); // Reset to page 1 on new search
  }, 300);
});

document.addEventListener('keydown', (e) => {
  const searchInput = document.getElementById('searchInput');

  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
    return;
  }

  if (e.key.length === 1) {
    searchInput.focus();
  }
});

const editPartForm = document.getElementById('editPartForm');
const editPartsOverlay = document.getElementById('editPartOverlay');
const closeEditOverlayBtn = document.getElementById('closeEditOverlayBtn');
const partsDisplayDiv = document.getElementById('partsDisplayDiv');

// Event delegation for clicking the Edit and Delete button inside the table
if (partsDisplayDiv) {
  partsDisplayDiv.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');
    const copyBtn = e.target.closest('.copy-btn');

    if (editBtn) {
      // Get the part ID stored in the button's data-id attribute
      const partId = editBtn.getAttribute('data-id');
      const response = await fetch(`/parts/fetchById/${partId}`);

      const data = await response.json();

      const partToEdit = data.partDetails;
      console.log(partToEdit);
      if (!partToEdit) return;

      // 3. Pre-fill the form fields
      document.getElementById('editMpn').value = partToEdit.mfgPartNumber || '';
      document.getElementById('editValue').value = partToEdit.value || '';
      document.getElementById('editFootprint').value = partToEdit.footprint || '';
      document.getElementById('editDescription').value = partToEdit.description || '';
      document.getElementById('editQuantity').value = partToEdit.quantity || 0;

      editPartForm.setAttribute('data-editing-id', partId);

      switchView(editPartForm);
      if (editPartsOverlay) editPartsOverlay.classList.remove('hidden');
    }

    if (deleteBtn) {
      // Get the part ID stored in the button's data-id attribute
      const partId = deleteBtn.getAttribute('data-id');
      const confirmation = await Swal.fire({
        title: 'Delete part?',
        icon: 'question',
        showCancelButton: true,
        scrollbarPadding: false,
        heightAuto: false,
      });

      if (!confirmation.isConfirmed) return;

      const response = await fetch(`/parts/deleteById/${partId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        Toastify({
          text: `failed to delete part!\nerror: ${data.message}`,
          duration: 3000,
          gravity: 'top',
          position: 'right',
          style: { background: '#db3535' },
        }).showToast();

        editPartForm.classList.add('hidden');
        if (editPartsOverlay) editPartsOverlay.classList.add('hidden');
        switchView(partsDisplayDiv);
        initPartsTable();
        return;
      }

      Toastify({
        text: 'Deleted part successfully!',
        duration: 3000,
        gravity: 'top',
        position: 'right',
        style: { background: '#00db28' },
      }).showToast();

      editPartForm.classList.add('hidden');
      if (editPartsOverlay) editPartsOverlay.classList.add('hidden');
      switchView(partsDisplayDiv);
      initPartsTable();
    }

    if (copyBtn) {
      const mpnText = copyBtn.getAttribute('data-mpn');
      if (!mpnText) return;

      try {
        await navigator.clipboard.writeText(mpnText);
        Toastify({
          text: `Copied MPN: ${mpnText}`,
          duration: 3000,
          gravity: 'top',
          position: 'right',
          style: { background: '#00db28' },
        }).showToast();
      } catch (err) {
        console.log('Failed to copy text: ', err);
        Toastify({
          text: 'Failed to copy to clipboard',
          duration: 3000,
          gravity: 'top',
          position: 'right',
          style: { background: '#db3535' },
        }).showToast();
      }
      return;
    }
  });
}

// Close form handler
if (closeEditOverlayBtn) {
  closeEditOverlayBtn.addEventListener('click', (e) => {
    e.preventDefault();
    editPartForm.classList.add('hidden');
    if (editPartsOverlay) editPartsOverlay.classList.add('hidden');
    // Switch back to default dashboard or parts table view
    switchView(partsDisplayDiv);
    initPartsTable();
  });
}

editPartForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const updatedData = {
    value: document.getElementById('editValue').value.trim(),
    footprint: document.getElementById('editFootprint').value.trim(),
    description: document.getElementById('editDescription').value.trim(),
    quantity: Number(document.getElementById('editQuantity').value) || 0,
  };

  const partId = editPartForm.getAttribute('data-editing-id');

  const response = await fetch(`/parts/updateById/${partId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData),
  });

  const data = await response.json();

  if (!response.ok) {
    Toastify({
      text: `failed to update part data!\nerror: ${data.message}`,
      duration: 3000,
      gravity: 'top',
      position: 'right',
      style: { background: '#db3535' },
    }).showToast();

    editPartForm.classList.add('hidden');
    if (editPartsOverlay) editPartsOverlay.classList.add('hidden');
    switchView(partsDisplayDiv);
    initPartsTable();
    return;
  }

  Toastify({
    text: 'Updated part details successfully!',
    duration: 3000,
    gravity: 'top',
    position: 'right',
    style: { background: '#00db28' },
  }).showToast();

  editPartForm.classList.add('hidden');
  if (editPartsOverlay) editPartsOverlay.classList.add('hidden');
  switchView(partsDisplayDiv);
  initPartsTable();
});

initPartsTable(1);
