import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';
import * as XLSX from 'xlsx';
import { switchView } from './userDashboard';
import { createIcons, DatabaseArrowUp } from 'lucide';
import { getUserDetails } from './userDashboard';
import { renderPartsTable } from './partsDisplay';

let currentUser = null;
let hasWritePermission = false;

const data = await getUserDetails();
currentUser = data.currentUser;
hasWritePermission = Boolean(
  currentUser.permissions?.write === true || currentUser.role === 'admin',
);

//function to render part availability table
function renderProjectAvailabilityTable(comparisonList) {
  const fileDisplayDiv = document.getElementById('fileDisplayDiv');
  if (!fileDisplayDiv) return;

  const tableRows = comparisonList
    .map((item) => {
      let availabilityDisplay = '';
      let badgeStyle = '';

      if (item.statusType === 'sufficient') {
        // Green style: reqd. qty / reqd. qty
        badgeStyle =
          'color: #16a34a; font-weight: 500; background-color: #dcfce7; padding: 4px 8px; border-radius: 4px;';
        availabilityDisplay = `${item.quantityRequired} / ${item.quantityRequired} (Sufficient)`;
      } else if (item.statusType === 'shortage') {
        // Red style: available qty / required qty
        badgeStyle =
          'color: #dc2626; font-weight: 500; background-color: #fee2e2; padding: 4px 8px; border-radius: 4px;';
        availabilityDisplay = `${item.availableQuantity} / ${item.quantityRequired} (Shortage)`;
      } else {
        // Yellow style: 0 for parts newly added from project list
        badgeStyle =
          'color: #ca8a04; font-weight: 500; background-color: #fef9c3; padding: 4px 8px; border-radius: 4px;';
        availabilityDisplay = `0 / ${item.quantityRequired} (New Part Added)`;
      }

      return `
      <tr>
        <td>${item.mpn}</td>
        <td>${item.footprint}</td>
        <td>${item.value}</td>
        <td>${item.description}</td>
        <td><span style="${badgeStyle}">${availabilityDisplay}</span></td>
        <td>${item.lastUpdated}</td>
      </tr>
    `;
    })
    .join('');

  fileDisplayDiv.innerHTML = `
  <div class="ims-table">
    <table id="componentsAvailabilityTable">
      <thead>
        <tr>
          <th>MPN</th>
          <th>Footprint</th>
          <th>Value</th>
          <th>Description</th>
          <th>Availability (Available / Req.)</th>
          <th>Last Updated</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
    </div>

    <div class="ims-btn-v1">
      <button id="updateInventoryBtn" class="updateInventory" ${!hasWritePermission ? 'disabled style="cursor: not-allowed;"' : ''}>
      <i data-lucide="DatabaseArrowUp" stroke-width=1.5></i>
      Update Inventory
      </button>
    </div>
  `;
}

const projectSidePanel = document.getElementById('projectSidePanel');
const projectUploadForm = document.getElementById('projectUploadForm');
const overlay = document.getElementById('Overlay');
const createProjectPage = document.getElementById('createProjectPage');

let currentParsedRows = [];
let componentsToUpdate = [];
// 2. Catch the submit event and parse with SheetJS
projectUploadForm.addEventListener('change', async (e) => {
  e.preventDefault();

  // Make sure we target the file input properly (whether e.target is the form or the input)
  const fileInput = e.target.files ? e.target : document.getElementById('CSVFileInput');
  const inputFile = fileInput && fileInput.files ? fileInput.files[0] : null;

  if (!inputFile) {
    alert('Please select a file!');
    return;
  }

  try {
    const buffer = await inputFile.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    const cleanRows = matrix.filter((row) => row.some((cell) => String(cell).trim() !== ''));

    if (cleanRows.length === 0) {
      throw new Error('The selected spreadsheet is empty.');
    }

    const headers = cleanRows[0].map((h) => String(h).replace(/["']/g, '').trim());

    const mpnColIndex = headers.findIndex((h) => {
      const cleanHeader = String(h)
        .replace(/["'\s]/g, '')
        .toLowerCase();
      return ['mpn', 'mfgpartnumber', 'partnumber', 'partno', 'mfgpartno'].includes(cleanHeader);
    });

    const qtyColIdx = headers.findIndex((h) => {
      const cleanHeader = String(h)
        .replace(/["'\s]/g, '')
        .toLowerCase();
      return [
        'qty',
        'quantity',
        'amount',
        'reqd',
        'required',
        'quantityrequired',
        'qtyrequired',
        'qtyreqd',
      ].includes(cleanHeader);
    });

    // Extract data rows (everything after the header)
    const dataRows = cleanRows.slice(1);

    // Store globally if needed elsewhere, but map directly from dataRows here!
    currentParsedRows = dataRows;

    const itemsToCheck = dataRows
      .map((row) => {
        const mpn =
          mpnColIndex !== -1
            ? String(row[mpnColIndex] || '')
                .replace(/["']/g, '')
                .trim()
            : '';
        const qtyNeeded = qtyColIdx !== -1 ? Number(row[qtyColIdx]) || 0 : 0;
        return { mpn, qtyNeeded };
      })
      .filter((item) => item.mpn !== '');

    console.log('Final itemsToCheck Payload:', itemsToCheck);

    if (itemsToCheck.length === 0) {
      throw new Error('No valid parts with MPNs found in the file.');
    }

    const response = await fetch('/parts/checkAvailability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: itemsToCheck }),
    });

    const data = await response.json();
    // console.log('comparison list received from backend: ', data.comparisonList);
    componentsToUpdate = data.comparisonList;
    if (!response.ok) throw new Error(data.message);

    projectSidePanel.classList.remove('open');
    setTimeout(() => {
      overlay.classList.add('hidden');
      projectSidePanel.classList.add('hidden'); // Fully hide after animation completes
    }, 300);
    switchView(createProjectPage);

    // Render table view
    renderProjectAvailabilityTable(data.comparisonList);
    createIcons({
      icons: { DatabaseArrowUp },
    });
  } catch (error) {
    console.error('Error in displaying parts-availability status:', error);
    Toastify({
      text: error.message || 'Error processing spreadsheet',
      duration: 3000,
      gravity: 'top',
      position: 'right',
      style: { background: '#ff6b6b' },
    }).showToast();
  }
});

const closeFormBtn = document.getElementById('closeProjectOverlayBtn');
closeFormBtn.addEventListener('click', async (e) => {
  e.preventDefault();

  projectSidePanel.classList.remove('open');
  setTimeout(() => {
    overlay.classList.add('hidden');
    projectSidePanel.classList.add('hidden'); // Fully hide after animation completes
  }, 300);
  switchView(createProjectPage);
});

const fileDisplayDiv = document.getElementById('fileDisplayDiv');

fileDisplayDiv.addEventListener('click', async (e) => {
  const updateInventoryBtn = e.target.closest('.updateInventory');
  if (updateInventoryBtn) {
    try {
      const itemsToUpdate = componentsToUpdate.map((item) => {
        if (item.statusType === 'brand-new') {
          return {
            isNew: true,
            mpn: item.mpn,
            availableQuantity: item.availableQuantity,
            quantityRequired: item.quantityRequired,
            description: item.description,
            footprint: item.footprint,
            value: item.value,
            remarks: 'added from project-components list',
          };
        } else {
          return {
            isNew: false,
            mpn: item.mpn,
            quantityRequired: item.quantityRequired,
            remarks: 'used in project',
          };
        }
      });

      updateInventoryBtn.disabled = true;

      const response = await fetch('/parts/updateProjectComponents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemsToUpdate),
      });

      const data = await response.json();
      console.log('project-components updation message: ', data.message);

      if (!response.ok) {
        throw new Error(data.message);
      }

      Toastify({
        text: 'Project-components successfully updated in Inventory!',
        duration: 3000,
        position: 'right',
        gravity: 'top',
        style: {
          background: '#00db28',
        },
      }).showToast();

      window.location.replace('/');
      renderPartsTable();

      //   const defaultDashboard = document.getElementById('defaultDashboard');
      //   switchView(defaultDashboard);
    } catch (error) {
      console.log('error in updating inventory: ', error);
      Toastify({
        text: 'Inventory Update Failed!',
        duration: 3000,
        position: 'right',
        gravity: 'top',
        style: {
          background: '#db3535',
        },
      }).showToast();

      updateInventoryBtn.disabled = false;
      return;
    }
  }
});
