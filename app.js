// Gestione Nulla Osta PA - Application Logic

let statusData = [];
const STORAGE_KEY = 'gestione_servizi_data';

const JSONBIN_BIN_ID = '69d4a07c36566621a8879212';
const JSONBIN_API_KEY = '$2a$10$4JjJNnELOcHncMuEUZYAV.g75Ny7tCvw2oPFQoyOtdNGNhyGAwEZ6';

// Sort State
let currentSortColumn = '';
let currentSortDirection = 1; // 1 asc, -1 desc

// Elements
const tableBody = document.getElementById('table-body');
const emptyState = document.getElementById('empty-state');
const syncStatus = document.getElementById('sync-status');
const searchInput = document.getElementById('filter-search');
const categoryFilter = document.getElementById('filter-categoria');
const serviceFilter = document.getElementById('filter-servizio');
const statusFilter = document.getElementById('filter-status');
const modalOverlay = document.getElementById('modal-overlay');
const serviceForm = document.getElementById('service-form');
const modalTitle = document.getElementById('modal-title');
const btnAddNew = document.getElementById('btn-add-new');
const btnCancel = document.getElementById('btn-cancel');
const btnCloseModal = document.getElementById('btn-close-modal');

// Initial Data Load
async function init() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        statusData = JSON.parse(savedData);
        renderTable();
    } else {
        // Fallback local se localStorage è vuoto all'inizio e jsonbin non è ancora caricato
        try {
            const response = await fetch('data.json');
            statusData = await response.json();
            renderTable();
        } catch(e) { }
    }

    // Caricamento Cloud Silenzioso
    try {
        if (syncStatus) syncStatus.classList.remove('hidden');
        
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
            headers: {
                'X-Master-Key': JSONBIN_API_KEY
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            statusData = result.record; // jsonbin structure
            localStorage.setItem(STORAGE_KEY, JSON.stringify(statusData));
            renderTable();
        } else {
            console.error('Error fetching da jsonbin:', await response.text());
        }
    } catch (error) {
        console.error('Network error:', error);
    } finally {
        if (syncStatus) syncStatus.classList.add('hidden');
    }
}

async function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statusData));
    
    // Save to Cloud async
    try {
        if (syncStatus) syncStatus.classList.remove('hidden');
        
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY
            },
            body: JSON.stringify(statusData)
        });
        
        if (!response.ok) {
            console.error('Error salvando da jsonbin:', await response.text());
        }
    } catch (error) {
        console.error('Network error salvataggio jsonbin:', error);
    } finally {
        if (syncStatus) syncStatus.classList.add('hidden');
    }
}

function renderTable() {
    const query = searchInput.value.toLowerCase();
    const categoryVal = categoryFilter.value;
    const serviceVal = serviceFilter.value;
    const statusVal = statusFilter.value;

    const filtered = statusData.filter(item => {
        const matchesSearch = item.ente.toLowerCase().includes(query);
        const matchesCategory = categoryVal === 'all' || item.categoria === categoryVal;
        const matchesService = serviceVal === 'all' || item.servizio.includes(serviceVal);
        const matchesStatus = statusVal === 'all' ||
            (statusVal === 'concluso' && item.concluso) ||
            (statusVal === 'non-concluso' && !item.concluso);
        return matchesSearch && matchesCategory && matchesService && matchesStatus;
    });

    // Ordina i dati filtrati
    if (currentSortColumn) {
        filtered.sort((a, b) => {
            let valA = a[currentSortColumn];
            let valB = b[currentSortColumn];

            // Gestione dei valori null/undefined
            if (valA == null) valA = '';
            if (valB == null) valB = '';

            // Confronto case-insensitive per le stringhe
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return -1 * currentSortDirection;
            if (valA > valB) return 1 * currentSortDirection;
            return 0;
        });
    }

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        filtered.forEach(item => {
            const tr = document.createElement('tr');
            const catClass = item.categoria ? `cat-${item.categoria.toLowerCase()}` : 'cat-altro';
            tr.innerHTML = `
                <td>${item.ente}</td>
                <td><span class="category-tag ${catClass}">${item.categoria || 'Altro'}</span></td>
                <td><span class="service-tag">${item.servizio}</span></td>
                <td>
                    <span class="badge ${item.concluso ? 'badge-success' : 'badge-danger'}">
                        ${item.concluso ? 'SI' : 'NO'}
                    </span>
                </td>
                <td class="actions">
                    <button class="btn-icon action-edit" onclick="editEntry(${item.id})">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button class="btn-icon action-delete" onclick="deleteEntry(${item.id})">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }
}

// Global functions for inline onclick (simplified for this SPA)
window.editEntry = (id) => {
    const entry = statusData.find(d => d.id === id);
    if (!entry) return;

    document.getElementById('entry-id').value = entry.id;
    document.getElementById('ente').value = entry.ente;
    document.getElementById('categoria').value = entry.categoria || '';
    document.getElementById('srv-st25').checked = entry.servizio.includes('S.T.25');
    document.getElementById('srv-sf08').checked = entry.servizio.includes('S.F.08');
    document.getElementById('concluso').checked = entry.concluso;

    modalTitle.textContent = 'Modifica Servizio';
    openModal();
};

window.deleteEntry = (id) => {
    if (confirm('Sei sicuro di voler eliminare questa richiesta?')) {
        statusData = statusData.filter(d => d.id !== id);
        saveToStorage();
        renderTable();
    }
};

// Modal Logic
function openModal() {
    modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    serviceForm.reset();
    document.getElementById('entry-id').value = '';
    document.getElementById('servizio-error').style.display = 'none';
}

btnAddNew.addEventListener('click', () => {
    modalTitle.textContent = 'Aggiungi Servizio';
    openModal();
});

btnCancel.addEventListener('click', closeModal);
btnCloseModal.addEventListener('click', closeModal);

serviceForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const id = document.getElementById('entry-id').value;
    const ente = document.getElementById('ente').value;
    const categoria = document.getElementById('categoria').value;
    const st25 = document.getElementById('srv-st25').checked;
    const sf08 = document.getElementById('srv-sf08').checked;
    const concluso = document.getElementById('concluso').checked;

    const servizi = [];
    if (st25) servizi.push('S.T.25');
    if (sf08) servizi.push('S.F.08');

    if (servizi.length === 0) {
        document.getElementById('servizio-error').style.display = 'block';
        return;
    }

    const servizioStr = servizi.join(', ');

    if (id) {
        // Update
        const index = statusData.findIndex(d => d.id == id);
        if (index !== -1) {
            statusData[index] = { ...statusData[index], ente, categoria, servizio: servizioStr, concluso };
        }
    } else {
        // Create
        const newId = statusData.length > 0 ? Math.max(...statusData.map(d => d.id)) + 1 : 1;
        statusData.push({ id: newId, ente, categoria, servizio: servizioStr, concluso });
    }

    saveToStorage();
    renderTable();
    closeModal();
});

// Event Listeners for Filters
searchInput.addEventListener('input', renderTable);
categoryFilter.addEventListener('change', renderTable);
serviceFilter.addEventListener('change', renderTable);
statusFilter.addEventListener('change', renderTable);

// Sorting logic
document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
        const column = th.dataset.sort;
        
        if (currentSortColumn === column) {
            currentSortDirection *= -1; // Toggle direction
        } else {
            currentSortColumn = column;
            currentSortDirection = 1; // Default ascending
        }
        
        // Reset all icons
        document.querySelectorAll('th.sortable .sort-icon').forEach(icon => {
            icon.innerHTML = '';
        });
        
        // Set current icon
        const icon = th.querySelector('.sort-icon');
        if (currentSortDirection === 1) {
            icon.innerHTML = '&#9650;'; // Triangle up
        } else {
            icon.innerHTML = '&#9660;'; // Triangle down
        }
        
        renderTable();
    });
});

// Start
init();
