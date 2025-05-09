const BASE_URL = 'http://localhost:8000'
const EC_JOB_ENDPOINT = `${BASE_URL}/jobs/submit/`;
const EC_JOB_STATUS_ENDPOINT = `${BASE_URL}/jobs/`;
const activeFile = document.getElementById("current-path");



// =================================================================
// IndexedDB Configuration
// =================================================================
let db;
const DB_NAME = 'ec-job-tracker';
const DB_STORE = 'jobs';
const DB_VERSION = 1;



// =================================================================
// The following method initializes Index DB
// =================================================================
function initDB() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    try {
        request.onerror = () => console.error('IndexedDB failed');
        request.onsuccess = (e) => db = e.target.result;
        request.onupgradeneeded = (e) => {
            db = e.target.result;

            // ==========================================================
            // Check if the db contains the "jobs" table i.e. DB_STORE
            // ==========================================================
            if (!db.objectStoreNames.contains(DB_STORE)) {
                db.createObjectStore(DB_STORE, { keyPath: 'job_id' });
            }
        };
    } catch (error) {
        showToast("Something went wrong");
        console.error(`Something went wrong when attempting to initialize Indexed DB => ${error}`);
    }
}



// =================================================================
// The following method writes jobs to Index DB
// =================================================================
function saveJob(job) {
    try {
        const tx = db.transaction([DB_STORE], 'readwrite');
        const store = tx.objectStore(DB_STORE);
        store.put(job);
        tx.oncomplete = () => updateJobHistoryUI();
    } catch (error) {
        showToast("Could not save job details")
        console.error(`Something went wrong when attempting to write to Indexed DB => ${error}`);
    }
}



// =================================================================
// The following method removes jobs from Index DB
// =================================================================
function deleteJob(jobId) {
    try {
        const tx = db.transaction([DB_STORE], 'readwrite');
        const store = tx.objectStore(DB_STORE);
        store.delete(jobId);
        tx.oncomplete = () => updateJobHistoryUI();
    } catch (error) {
        showToast("Could not delete job")
        console.error(`Something went wrong when attempting to remove entry from Indexed DB => ${error}`);
    }
}



// =================================================================
// The following method retrieves all jobs from Index DB
// =================================================================
function getAllJobs(callback) {
    try {
        const tx = db.transaction([DB_STORE], 'readonly');
        const store = tx.objectStore(DB_STORE);
        const jobs = [];

        store.openCursor(null, 'prev').onsuccess = function (e) {
            const cursor = e.target.result;
            if (cursor && jobs.length < 10) {
                jobs.push(cursor.value);
                cursor.continue();
            } else {
                callback(jobs);
            }
        };
    } catch (error) {
        console.err
    }
}



// =================================================================
// The following method updates the entries under the [Recent Jobs]
// section:
// 
// <h4 class="recent-jobs-title">Recent Jobs</h4>
// <ul id="job-history">......</ul>
// =================================================================
function updateJobHistoryUI() {
    getAllJobs(jobs => {
        const list = document.getElementById('job-history');
        list.innerHTML = '';
        jobs.forEach(job => {
            const li = document.createElement('li');
            li.textContent = `Job ID: ${job.job_id} - ${job.status || 'pending'} - ${job.timestamp}`;
            li.style.cursor = 'pointer';

            // ==================================================================
            // Clicking an entry displays a modal containing the job details
            // ==================================================================
            li.onclick = () => showJobDetailModal(job);
            list.appendChild(li);
        });
    });
}



// ========================================================================
// This method displays a modal containing details for the specified job
// ========================================================================
function showJobDetailModal(job) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div id="job-detail-modal-content" class="job-detail-modal-content">
            <span class="job-detail-modal-close-btn" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h3>Job Details</h3>
            <p><strong>Job ID:</strong> ${job.job_id}</p>
            <p><strong>Status:</strong> ${job.status}</p>
            <p><strong>Submitted:</strong> ${job.timestamp}</p>
            <ion-icon name="trash-outline" style="cursor:pointer;" onclick="deleteJobFromAPI('${job.job_id}', this)"></ion-icon>
        </div>`;
    document.body.appendChild(modal);
}

document.getElementById('view-jobs-btn').addEventListener('click', showAllJobsModal);



// ========================================================================
// This method displays a modal that lists all executed jobs
// ========================================================================
function showAllJobsModal() {
    const container = document.createElement('div');
    container.className = 'all-jobs-modal';
    container.style = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;

    const content = document.createElement('div');
    content.className = 'all-jobs-modal-content';
    content.style = `
        background: white;
        padding: 1.6rem;
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        border-radius: 10px;
        position: relative;
    `;

    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.style = `
        position: absolute;
        top: 0.5rem;
        right: 1rem;
        font-size: 2.4rem;
        font-weight: bolder;
        color: rgb(244, 96, 70);
        cursor: pointer;
    `;
    closeBtn.onclick = () => container.remove();

    const title = document.createElement('h3');
    title.textContent = 'All Jobs';
    title.style.fontSize = "1.6rem";
    title.style.fontWeight = "bolder";
    title.style.textDecoration = "underline";

    const list = document.createElement('ul');
    list.style = 'list-style: none; padding: 1rem;';

    getAllJobs(jobs => {
        if (jobs.length === 0) {
            const none = document.createElement('p');
            none.textContent = 'No jobs found.';
            content.appendChild(none);
        } else {
            jobs.forEach(job => {
                const li = document.createElement('li');
                li.style = `
                    padding: 0.5rem 0; 
                    border-bottom: 1px solid rgb(227, 227, 227); 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    cursor: pointer;
                `;

                li.innerHTML = `
                    <span 
                        class="job-history-entry" 
                        onclick="showJobDetailModal(${JSON.stringify(job).replace(/"/g, '&quot;')})">
                        <strong>
                            ${job.job_id}
                        </strong> 
                        - ${job.status || 'pending'} - ${job.timestamp}
                    </span>
                `;
                list.appendChild(li);
            });
        }

        content.appendChild(closeBtn);
        content.appendChild(title);
        content.appendChild(list);
        container.appendChild(content);
        document.body.appendChild(container);
    });
}


async function deleteJobFromAPI(jobId, icon) {
    try {
        icon.style.opacity = '0.5';
        await fetch(`${EC_JOB_STATUS_ENDPOINT}delete_queue`, { method: 'DELETE' });
        deleteJob(jobId);
        document.querySelector('.modal')?.remove();
        showToast(`Deleted job ${jobId}`, '#999');
    } catch (err) {
        showToast(`Error deleting job`, '#ff6347');
    }
}

async function submitSQLToJobAPI() {
    if (!activeFile.innerText || !activeFile.innerText.endsWith('.sql')) return showToast('Only SQL files can be submitted', '#ff6347');
    const activeFileContent = editor.getValue().trim();
    if (!activeFileContent) return showToast('File is empty', '#ff6347');
    const confirm = await showConfirm(`Submit job from "${activeFile.innerText}"?`);
    if (!confirm) return;

    try {
        const res = await fetch(EC_JOB_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ script: activeFileContent })
        });

        if (!res.ok) {
            const err = await res.json();
            const detail = err.detail || 'Submission failed';
            const truncated = detail.length > 200 ? detail.slice(0, 200) + '…' : detail;
            throw new Error(truncated);
        }

        const data = await res.json();
        const job = {
            job_id: data.job_id,
            status: 'pending',
            timestamp: new Date().toLocaleString()
        };
        saveJob(job);
        pollJobStatus(job.job_id);
        showToast(`Job with ID: ${data.job_id} has been submitted`);
    } catch (err) {
        showToast(`Error: ${err.message}`, '#ff6347');
    }
}

function pollJobStatus(jobId) {
    const interval = setInterval(async () => {
        try {
            const res = await fetch(`${EC_JOB_STATUS_ENDPOINT}${jobId}/status`);
            if (!res.ok) throw new Error('Failed to get job status');
            const status = await res.json();
            if (status && status.status && ['completed', 'failed'].includes(status.status)) {
                clearInterval(interval);
                const tx = db.transaction([DB_STORE], 'readwrite');
                const store = tx.objectStore(DB_STORE);
                const req = store.get(jobId);
                req.onsuccess = () => {
                    const job = req.result;
                    if (job) {
                        job.status = status.status;
                        store.put(job);
                        updateJobHistoryUI();
                    }
                };
            }
        } catch (err) {
            console.error(`Polling error for job ${jobId}:`, err);
        }
    }, 3000);
}

function toggleExecutionPanel() {
    const panelBody = document.getElementById('execution-body');
    const toggleIcon = document.getElementById('execution-toggle-icon');
    panelBody.classList.toggle('open');
    toggleIcon.setAttribute('name', panelBody.classList.contains('open') ? 'chevron-up-outline' : 'chevron-down-outline');
}

async function clearJobHistory() {
    try {
        // Show confirmation modal before clearing
        const confirm = await showConfirm('Are you sure you want to clear the job history?');
        if (!confirm) return;

        // First, clear IndexedDB
        await clearAllJobs();

        // Then, call the backend to flush the job queue
        const res = await fetch('http://localhost:8000/jobs/flush', {
            method: 'DELETE',
        });

        if (!res.ok) throw new Error('Failed to clear job history from backend');

        // Update UI to reflect that job history is cleared
        showToast('Job history has been cleared!', '#32cd32');
        updateJobHistoryUI();
    } catch (err) {
        showToast(`Error: ${err.message}`, '#ff6347');
    }
}



async function clearAllJobs() {
    const tx = db.transaction([DB_STORE], 'readwrite');
    const store = tx.objectStore(DB_STORE);
    await store.clear();
    tx.oncomplete = () => updateJobHistoryUI();
}

function updateJobHistoryUI() {
    getAllJobs(jobs => {
        const list = document.getElementById('job-history');
        list.innerHTML = ''; // Clear current list
        if (jobs.length === 0) {
            const none = document.createElement('p');
            none.textContent = 'No job history';
            list.appendChild(none);
        } else {
            jobs.forEach(job => {
                const li = document.createElement('li');
                li.textContent = `Job ID: ${job.job_id} - ${job.status || 'pending'} - ${job.timestamp}`;
                li.style.cursor = 'pointer';
                li.onclick = () => showJobDetailModal(job);
                list.appendChild(li);
                li.classList.add("job-history-entry");
            });
        }
    });
}



function showToast(msg, color = '#fd5321') {
    Toastify({
        text: msg,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: {
            background: color,
            color: "#ffffff",
            borderRadius: "24px",
            fontWeight: "800",
            fontSize: "14px",
            letterSpacing: "1.4px",
            textTransform: "capitalize",
            boxShadow: "0 1rem 1rem 0 rgba(0, 0, 0, .05)"
        }
    }).showToast();
}

function showConfirm(msg) {
    return new Promise(resolve => {
        const confirm = window.confirm(msg);
        resolve(confirm);
    });
}

initDB();
document.addEventListener('DOMContentLoaded', () => setTimeout(updateJobHistoryUI, 500));
