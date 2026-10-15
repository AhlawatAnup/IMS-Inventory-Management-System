import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';
import * as XLSX from 'xlsx';
import { switchView } from './userDashboard';
import { createIcons, DatabaseArrowUp } from 'lucide';

const CsvSidePanel = document.getElementById('CsvSidePanel');
const partsDisplayDiv = document.getElementById('partsDisplayDiv');
const CSVDisplayDiv = document.getElementById('CSVDisplayDiv');
let currentParsedRows = [];
// 2. Catch the submit event and parse with SheetJS
CsvSidePanel.addEventListener('change', async (e) => {
  e.preventDefault();

  const inputFile = e.target.files[0];

  if (!inputFile) {
    alert('Please select a file!');
    return;
  }

  try {
    // Step A: Read file into an ArrayBuffer
    const buffer = await inputFile.arrayBuffer();

    // Step B: Parse workbook using SheetJS
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Step C: Convert sheet rows to JSON
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
      return ['mpn', 'mfgpartnumber', 'partnumber', 'partno'].includes(cleanHeader);
    });

    // Filter out rows where the MPN cell is missing or blank

    const dataRows = cleanRows.slice(1).filter((row) => {
      // If no standard MPN header exists, retain rows so the user can map columns manually
      if (mpnColIndex === -1) return true;

      const mpnValue = row[mpnColIndex];
      return mpnValue !== undefined && String(mpnValue).replace(/["']/g, '').trim() !== '';
    });
    currentParsedRows = dataRows;

    // Step 1: Allowed field types for the dropdown
    const COLUMN_TYPES = [
      { value: 'ignore', label: 'Select Type / Ignore' },
      { value: 'mpn', label: 'MPN' },
      { value: 'footprint', label: 'Footprint' },
      { value: 'description', label: 'Description' },
      { value: 'quantity', label: 'Quantity' },
      { value: 'value', label: 'Value' },
      { value: 'remarks', label: 'Remarks' },
    ];

    CsvSidePanel.classList.remove('open');
    setTimeout(() => {
      overlay.classList.add('hidden');
      CsvSidePanel.classList.add('hidden'); // Fully hide after animation completes
    }, 300);

    switchView(CSVDisplayDiv);

    const tableHeaders = headers
      .map((headerText, colIdx) => {
        const optionsHTML = COLUMN_TYPES.map(
          (type) => `
            <option value="${type.value}">
              ${type.label}
            </option>
          `,
        ).join('');

        return `
          <th>
            <div class="columnHeaderContainer">
              <span class="originalHeaderLabel">${headerText || `Col ${colIdx + 1}`}</span>
              <select class="columnTypePicker" data-col-index="${colIdx}">
                ${optionsHTML}
              </select>
            </div>
          </th>
        `;
      })
      .join('');

    const tableRows = dataRows
      .map((row) => {
        const cells = headers
          .map(
            (_, colIdx) => `
        <td>${row[colIdx] !== undefined ? String(row[colIdx]).replace(/["']/g, '').trim() : ''}</td>
      `,
          )
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    CSVDisplayDiv.innerHTML = `
    <div class="ims-table">
      <table class="partsTable" >
        <thead>
          ${tableHeaders}
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
    <div class="ims-btn-v1">
      <button id="uploadPartsBtn">
      <i data-lucide="DatabaseArrowUp" stroke-width=1.5></i>
      Upload Parts
      </button>
    </div>`;
    createIcons({
      icons: { DatabaseArrowUp },
    });
  } catch (error) {
    console.error('Error in uploading file:', error);
    Toastify({
      text: error.message || 'Error processing spreadsheet',
      duration: 3000,
      gravity: 'top',
      position: 'right',
      style: { background: '#ff6b6b' },
    }).showToast();
  }
});

const closeFormBtn = document.getElementById('closeCSVOverlayBtn');
const overlay = document.getElementById('Overlay');
closeFormBtn.addEventListener('click', async (e) => {
  e.preventDefault();

  overlay.classList.add('hidden');
  CsvSidePanel.classList.remove('open');
  setTimeout(() => {
    overlay.classList.add('hidden');
    CsvSidePanel.classList.add('hidden'); // Fully hide after animation completes
  }, 300);
  switchView(partsDisplayDiv);
});

CSVDisplayDiv.addEventListener('click', async (e) => {
  const uploadPartsBtn = e.target.closest('#uploadPartsBtn');

  if (!uploadPartsBtn) {
    // console.log(uploadPartsBtn);
    return;
  }

  const originalText = uploadPartsBtn.innerHTML;
  // console.log('current parsed rows: ', currentParsedRows);

  try {
    const selectedCols = document.querySelectorAll('.columnTypePicker');
    const colMapping = {};

    selectedCols.forEach((col) => {
      const colIdx = col.getAttribute('data-col-index');
      const colType = col.value;

      if (colType !== 'ignore') {
        colMapping[colIdx] = colType;
      }
    });

    const colsList = Object.values(colMapping);

    if (!colsList.includes('mpn')) {
      Toastify({
        text: 'Select column with MPN values!',
        duration: 3000,
        gravity: 'top',
        position: 'right',
        style: { background: '#ff6b6b' },
      }).showToast();
      return;
    }

    const payload = currentParsedRows
      .map((row) => {
        const item = {
          mfgPartNumber: '',
          footprint: '',
          description: '',
          quantity: 0,
          value: '',
          remarks: '',
        };

        for (const [colIdx, colType] of Object.entries(colMapping)) {
          const value =
            row[colIdx] !== undefined ? String(row[colIdx]).replace(/["']/g, '').trim() : '';

          if (colType === 'mpn') {
            item.mfgPartNumber = value;
          }
          if (colType === 'quantity') {
            item.quantity = Number(value) || 0;
          } else {
            item[colType] = value;
          }
        }
        return item;
      })
      .filter((item) => item.mfgPartNumber !== '');

    if (payload.length == 0) {
      Toastify({
        text: 'No valid part entries to import from the file!',
        duration: 3000,
        gravity: 'top',
        position: 'right',
        style: { background: '#ff6b6b' },
      }).showToast();
      return;
    }

    console.log(payload);
    uploadPartsBtn.disabled = true;
    uploadPartsBtn.innerHTML = 'Uploading Parts...';

    const response = await fetch('parts/bulkUpload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (response.status === 207) {
      const { inserted = 0, updated = 0, failedCount = 0 } = data.summary || {};
      const successTotal = inserted + updated;

      // Extract failed row numbers (e.g., "Rows 4, 12, 18")
      const failedRows = data.failures?.map((f) => f.rowNumber).join(', ');
      const rowInfo = failedRows ? ` (Failed rows: ${failedRows})` : '';

      Toastify({
        text: `⚠️ Partial import: ${successTotal} parts saved, ${failedCount} rows failed.${rowInfo}`,
        duration: 5000,
        gravity: 'top',
        position: 'right',
        style: { background: '#f59e0b' }, // Amber warning color
      }).showToast();

      // Log detailed reasons with MPN in console for troubleshooting
      console.warn('Import failure details:', data.failures);
      return;
    }

    // 3. Handle 100% Complete Success (HTTP 200)
    const { inserted = 0, updated = 0 } = data.summary || data.details || {};
    const totalCount = inserted + updated;

    Toastify({
      text: data.message || `Successfully processed ${totalCount} parts!`,
      duration: 3000,
      gravity: 'top',
      position: 'right',
      style: { background: '#00db28' },
    }).showToast();

    // Clean up UI on complete success
    currentParsedRows = [];
    document.getElementById('CSVDisplayDiv').innerHTML = '';
  } finally {
    if (uploadPartsBtn) {
      uploadPartsBtn.disabled = false;
      uploadPartsBtn.innerHTML = originalText;
      createIcons({ icons: { DatabaseArrowUp } });
    }
  }
});
