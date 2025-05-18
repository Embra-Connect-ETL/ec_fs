const tableList = document.getElementById('table-list');
const tableContainer = document.getElementById('table-container');
let currentGrid = null;


function setActive(el) {
    document.querySelectorAll('#table-list li').forEach(li => li.classList.remove('active'));
    el.classList.add('active');
}

function loadTables() {
    const tableList = document.getElementById("table-list");
    fetch('http://localhost:8000/catalog/tables')
        .then(res => res.json())
        .then(tables => {
            tableList.innerText = "";
            tables.forEach(table => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="table-entry"><ion-icon name="albums"></ion-icon> ${table}</span>
                `;
                li.onclick = () => {
                    setActive(li);
                    loadTablePreview(table);
                };
                tableList.appendChild(li);
            });
        })
        .catch(err => {
            tableContainer.textContent = 'Failed to load tables.';
            console.error(err);
        });
}

function loadTablePreview(tableName) {
    // Destroy the previous grid instance if it exists
    if (currentGrid) {
        currentGrid.destroy();
        currentGrid = null;
    }

    // Clear the container manually
    tableContainer.innerHTML = 'Loading table content...';

    fetch(`http://localhost:8000/catalog/tables/${tableName}/preview?limit=1000`)
        .then(res => res.json())
        .then(data => {
            const { columns, rows } = data;
            if (!columns || !rows) {
                tableContainer.textContent = 'No preview data.';
                return;
            }

            // Clear again to be absolutely sure before rendering
            tableContainer.innerHTML = '';

            // Create and store the new grid instance
            currentGrid = new gridjs.Grid({
                columns,
                data: rows,
                pagination: {
                    enabled: true,
                    limit: 10,
                    summary: true
                },
                search: {
                    enabled: true,
                    placeholder: 'Search table data...'
                },
                sort: true,
                resizable: true,
                fixedHeader: true,
                className: {
                    table: 'custom-grid-table',
                    th: 'custom-grid-header',
                    td: 'custom-grid-cell',
                    pagination: 'custom-grid-pagination',
                    search: 'custom-grid-search'
                },
                style: {
                    table: {
                        boxShadow: 'none',
                        borderRadius: '0px',
                        border: '1px solid #ebebeb;',
                        backgroundColor: 'var(--white)'
                    },
                    th: {
                        backgroundColor: '#ffffff',
                        color: '#747474',
                        fontWeight: '600',
                        fontSize: '14px',
                        padding: '12px',
                        borderBottom: '1px solid var(--light-gray)'
                    },
                    td: {
                        fontSize: '1rem',
                        color: '#747474',
                        padding: '.6rem',
                        borderBottom: 'none'
                    },
                    pagination: {
                        marginTop: '1rem',
                        color: 'var(--dim-gray)'
                    }
                }
            });

            currentGrid.render(tableContainer);
        })
        .catch(err => {
            tableContainer.textContent = 'Failed to load preview data.';
            console.error(err);
        });
}


document.getElementById("navigate-to-ide").addEventListener("click", () => {
    window.location.href = "./ide.html"
})

document.getElementById("refresh").addEventListener("click", () => {
    loadTables();
})

loadTables();
