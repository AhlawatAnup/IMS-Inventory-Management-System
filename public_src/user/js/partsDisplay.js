import Swal from 'sweetalert2';
import { createIcons, Pencil, Upload, Trash, Search, Copy, Plus, Minus } from 'lucide';
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

export function renderPartsTable(partsArr) {
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
        <button class="qty-popup-btn" data-id="${part._id}" data-action="add" title="Add Quantity">
        <i data-lucide="Plus" stroke-width = 1.5 stroke="#4f545e"></i>
        </button>
        <button class="qty-popup-btn" data-id="${part._id}" data-action="subtract" title="Subtract Quantity">
        <i data-lucide="Minus" stroke-width = 1.5 stroke="#4f545e"></i>
        </button>
        </div>`
        : `<span class="text-muted">Read-only</span>`;

      return `
        <tr>
          <td>
          <button class="clickable-mpn" data-id="${part._id}">${part.mfgPartNumber || ''}</button>
          <button class="copy-btn" data-mpn="${part.mfgPartNumber || ''}" title="Copy MPN"><i data-lucide="Copy" stroke-width=1.5></i></button>
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
    createIcons({ icons: { Pencil, Trash, Search, Copy, Plus, Minus } });

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

const editPartSidePanel = document.getElementById('editPartSidePanel');
const editPartForm = document.getElementById('editPartForm');
const editPartsOverlay = document.getElementById('Overlay');
const closeEditOverlayBtn = document.getElementById('closeEditOverlayBtn');

const historyPanel = document.getElementById('historyPanel');
const closePanelBtn = document.getElementById('closePanelBtn');
const panelMpnTitle = document.getElementById('panelMpnTitle');
const panelContent = document.getElementById('panelContent');
const historyOverlay = document.getElementById('Overlay');

const partsDisplayDiv = document.getElementById('partsDisplayDiv');

// Event delegation for clicking the Edit and Delete button inside the table
if (partsDisplayDiv) {
  partsDisplayDiv.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');
    const copyBtn = e.target.closest('.copy-btn');
    const qtyPopupBtn = e.target.closest('.qty-popup-btn');
    const mpn = e.target.closest('.clickable-mpn');

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

      editPartSidePanel.classList.remove('hidden');
      editPartsOverlay.classList.remove('hidden');
      // Small timeout allows display:flex to register before adding the slide-in class
      setTimeout(() => editPartSidePanel.classList.add('open'), 10);
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

        editPartSidePanel.classList.add('hidden');
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

      editPartSidePanel.classList.add('hidden');
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

    if (qtyPopupBtn) {
      const partId = qtyPopupBtn.getAttribute('data-id');
      const action = qtyPopupBtn.getAttribute('data-action');
      const isAdd = action == 'add';

      Swal.fire({
        title: isAdd ? 'Enter Quantity Increased' : 'Enter Quantity Decreased',
        html: `
          <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 15px;">
            <input type="number" id="swalQtyInput" class="swal2-input" value="1" min="1" style="width: 100px; margin: 0; text-align: center;" />
            
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Confirm',
        confirmButtonColor: '#2ecc71',
        cancelButtonColor: '#db3535',
        scrollbarPadding: false,
        heightAuto: false,
        didOpen: () => {
          // Focus the input automatically
          const input = document.getElementById('swalQtyInput');
          if (input) {
            input.focus();
            input.select();
          }
        },
        preConfirm: () => {
          const qtyVal = parseInt(document.getElementById('swalQtyInput').value, 10);
          if (isNaN(qtyVal) || qtyVal <= 0) {
            Swal.showValidationMessage('Please enter a valid positive number');
            return false;
          }
          // Return signed delta (+ or -)
          return isAdd ? qtyVal : -qtyVal;
        },
      }).then(async (result) => {
        if (result.isConfirmed) {
          const delta = result.value;

          try {
            // Send request to update quantity
            const response = await fetch(`/parts/updateQty/${partId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ delta }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            Toastify({
              text: 'Quantity updated successfully!',
              duration: 2500,
              gravity: 'top',
              position: 'right',
              style: { background: '#00db28' },
            }).showToast();

            // Refresh table
            initPartsTable();
          } catch (error) {
            Toastify({
              text: `Quantity update failed: ${error.message}`,
              duration: 3000,
              gravity: 'top',
              position: 'right',
              style: { background: '#db3535' },
            }).showToast();
          }
        }
      });
      return;
    }

    if (mpn) {
      const partId = mpn.getAttribute('data-id');

      try {
        const response = await fetch(`/parts/fetchById/${partId}`);
        const data = await response.json();
        const part = data.partDetails;

        if (!part) return;

        panelMpnTitle.textContent = `History: ${part.mfgPartNumber}`;

        // Render History List
        if (!part.stockHistory || part.stockHistory.length === 0) {
          panelContent.innerHTML = `<p class="text-muted">No stock history recorded yet.</p>`;
        } else {
          // Sort history by date descending (newest first)
          const sortedHistory = [...part.stockHistory].sort(
            (a, b) => new Date(b.date) - new Date(a.date),
          );

          const timelineItemsHtml = sortedHistory
            .map((item) => {
              const isAdd = item.type === 1;
              const sign = isAdd ? '+' : '-';
              const formattedDate = new Date(item.date).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              return `
                <div class="timeline-item">
                  <div class="timeline-dot ${isAdd ? 'added' : 'removed'}"></div>
                  <div class="timeline-content">
                    <div class="timeline-header-row">
                      <span class="timeline-qty ${isAdd ? 'added' : 'removed'}">
                        ${sign}${item.quantity} units
                      </span>
                      <span class="timeline-date">${formattedDate}</span>
                    </div>
                    <div class="timeline-remarks">
                      ${item.remarks || (isAdd ? 'Stock Added' : 'Stock Removed')}
                    </div>
                  </div>
                </div>
              `;
            })
            .join('');

          panelContent.innerHTML = `<div class="timeline-container">${timelineItemsHtml}</div>`;
        }

        // --- TRIGGER THE SLIDE IN ---
        historyPanel.classList.remove('hidden');
        historyOverlay.classList.remove('hidden');
        // Small timeout allows display:flex to register before adding the slide-in class
        setTimeout(() => historyPanel.classList.add('open'), 10);
      } catch (error) {
        console.error('Failed to fetch stock history:', error);
      }
      return;
    }
  });
}

// Close form handler
if (closeEditOverlayBtn) {
  closeEditOverlayBtn.addEventListener('click', (e) => {
    e.preventDefault();
    editPartSidePanel.classList.add('hidden');
    if (editPartsOverlay) editPartsOverlay.classList.add('hidden');
    // Switch back to default dashboard or parts table view
    switchView(partsDisplayDiv);
    initPartsTable();
  });
}

if (closePanelBtn) {
  closePanelBtn.addEventListener('click', () => {
    historyPanel.classList.remove('open'); // Slide out
    setTimeout(() => {
      historyOverlay.classList.add('hidden');
      historyPanel.classList.add('hidden'); // Fully hide after animation completes
    }, 300);
  });
}

editPartSidePanel.addEventListener('submit', async (e) => {
  e.preventDefault();

  const updatedData = {
    value: document.getElementById('editValue').value.trim(),
    footprint: document.getElementById('editFootprint').value.trim(),
    description: document.getElementById('editDescription').value.trim(),
    quantity: Number(document.getElementById('editQuantity').value) || 0,
    remarks: document.getElementById('remarks').value.trim(),
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

    editPartSidePanel.classList.remove('open'); // Slide out
    setTimeout(() => {
      editPartsOverlay.classList.add('hidden');
      editPartSidePanel.classList.add('hidden'); // Fully hide after animation completes
    }, 300);
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

  editPartSidePanel.classList.remove('open'); // Slide out
  setTimeout(() => {
    editPartsOverlay.classList.add('hidden');
    editPartSidePanel.classList.add('hidden'); // Fully hide after animation completes
  }, 300);
  switchView(partsDisplayDiv);
  initPartsTable();
});

initPartsTable(1);
