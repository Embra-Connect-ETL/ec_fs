/*-------------
 Toast helper
-------------*/
function showToast(message, background = '#ffa07a') {
    Toastify({
        text: message,
        duration: 3000,
        close: false,
        gravity: 'top',
        position: 'right',
        style: {
            background,
            color: '#fff',
            borderRadius: '24px',
            fontWeight: '600',
            fontSize: '14px',
            letterSpacing: '1.4px',
            textTransform: 'capitalize',
            boxShadow: '0 1rem 1rem 0 rgba(0, 0, 0, .05)'
        }
    }).showToast();
}

/*--------------
 Modal helpers
--------------*/
function showModal(title, defaultValue = '') {
    return new Promise(resolve => {
        const overlay = document.getElementById('modal-overlay');
        const input = document.getElementById('modal-input');

        document.getElementById('modal-title').textContent = title;
        input.value = defaultValue;
        overlay.style.display = 'flex';
        input.focus();

        function cleanup() {
            overlay.style.display = 'none';
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
        }

        function onOk() {
            cleanup();
            resolve(input.value);
        }

        function onCancel() {
            cleanup();
            resolve(null);
        }

        const okBtn = document.getElementById('modal-ok');
        const cancelBtn = document.getElementById('modal-cancel');

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
    });
}

function showConfirm(message) {
    return showModal(message + ' (yes to confirm)')
        .then(value => value && value.toLowerCase() === 'yes');
}

let currentPath = null,
    editor = null,
    selectedHeader = null;


/*----------------------------
 Initialize Codemirror Editor
----------------------------*/
function initEditor() {
    editor = CodeMirror.fromTextArea(
        document.getElementById('editor'), {
        lineNumbers: true,
        mode: 'txt',
        theme: 'neo'
    });

    editor.setSize('100%', '100%');
}

async function loadTree() {
    const list = await (await fetch(`${EC_FS_ENDPOINT}/files`)).json();
    const tree = buildTree(list);
    const container = document.getElementById('file-tree');
    container.innerHTML = '';
    renderTree(tree, container);
}

function buildTree(paths) {
    const root = {};

    for (const p of paths) {
        const parts = p.split('/').filter(Boolean);
        let node = root;

        parts.forEach((part, i) => {
            if (!node[part]) node[part] = {
                __children: {}
            };
            if (i === parts.length - 1 && !p.endsWith('/')) node[part].__file = true;
            node = node[part].__children;
        });
    }
    return root;
}

function renderTree(node, container, basePath = '') {
    const ul = document.createElement('ul');

    Object.entries(node).forEach(([name, entry]) => {
        const li = document.createElement('li'),
            isFile = !!entry.__file;
        const path = basePath + name + (isFile ? '' : '/');
        li.classList.add(isFile ? 'file' : 'folder');
        const header = document.createElement('div');
        header.classList.add('header');

        // toggle
        const toggle = document.createElement('ion-icon');
        toggle.setAttribute('name', 'chevron-forward');
        toggle.classList.add('toggle');

        if (!isFile) toggle.addEventListener('click', e => {
            e.stopPropagation();
            li.classList.toggle('expanded');
            toggle.setAttribute('name', li.classList.contains('expanded') ? 'chevron-down' : 'chevron-forward');
        });
        else toggle.style.visibility = 'hidden';
        header.append(toggle);

        // icon
        const icon = document.createElement('ion-icon');
        icon.setAttribute('name', isFile ? 'document-outline' : 'folder-outline');
        icon.classList.add('icon');
        header.append(icon);

        // text
        header.append(document.createTextNode(name));
        header.addEventListener('click', () => {
            if (selectedHeader) selectedHeader.classList.remove('selected');

            header.classList.add('selected');
            selectedHeader = header;
            currentPath = path;
            document.getElementById('current-path').textContent = path;

            if (isFile) openEntry(path);
            else editor.setValue('');
        });
        li.append(header);

        if (!isFile) renderTree(entry.__children, li, path);
        ul.append(li);
    });
    container.appendChild(ul);
}

async function openEntry(path) {
    const data = await (await fetch(`${EC_FS_ENDPOINT}/files/${encodeURIComponent(path)}`)).json();
    editor.setValue(data.content);
    setMode(path);
}

function setMode(path) {
    const ext = path.split('.').pop().toLowerCase();
    let mode = 'javascript';

    switch (ext) {
        case 'py':
            mode = 'python';
            break;
        case 'sql':
            mode = 'sql';
            break;
        case 'txt':
            mode = 'text';
            break;
        case 'md':
            mode = 'markdown';
            break;
        case 'json':
            mode = {
                name: 'javascript',
                json: true
            };
            break;
        case 'xml':
            mode = 'xml';
            break;
        case 'html':
            mode = 'htmlmixed';
            break;
    }

    editor.setOption('mode', mode);
}

/*-------
 Toolbar
--------*/
document.getElementById('save').onclick = async () => {
    if (!currentPath || currentPath.endsWith('/')) return showToast('Select a file to save', '#ff6347');
    await fetch(`${EC_FS_ENDPOINT}/files/${encodeURIComponent(currentPath)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            content: editor.getValue()
        })
    });
    showToast('Saved', '#ffa07a');
    loadTree();
};

document.getElementById('delete').onclick = async () => {
    if (!currentPath) return showToast('Select an item to delete', '#ff6347');
    const isFolder = currentPath.endsWith('/');
    const confirmed = await showConfirm(`Delete ${path}?`);
    if (!confirmed) return;
    if (isFolder) {
        const folderPath = encodeURIComponent(currentPath.replace(/\/$/, ''));
        await fetch(`${EC_FS_ENDPOINT}/folders/${folderPath}`, {
            method: 'DELETE'
        });
    } else {
        await fetch(`${EC_FS_ENDPOINT}/files/${encodeURIComponent(currentPath)}`, {
            method: 'DELETE'
        });
    }
    showToast('Deleted', '#ff6347');
    editor.setValue('');
    currentPath = null;
    document.getElementById('current-path').textContent = '';
    loadTree();
};

document.getElementById('rename').onclick = async () => {
    if (!currentPath) return showToast('Select an item to rename', '#ff6347');
    const isFolder = currentPath.endsWith('/');
    // Extract base name
    const parts = currentPath.replace(/\/$/, '').split('/');
    const baseName = parts.pop();
    const dir = parts.join('/');
    // Prompt with base name
    const newBase = await showModal('Enter new name:', baseName);
    if (!newBase) return;
    // Construct full new path
    const newPath = dir ? `${dir}/${newBase}` : newBase;
    const oldPathTrimmed = isFolder ? currentPath.replace(/\/$/, '') : currentPath;
    if (isFolder) {
        // Rename folder
        await fetch(
            `${EC_FS_ENDPOINT}/folders/rename?old_path=${encodeURIComponent(oldPathTrimmed)}&new_path=${encodeURIComponent(newPath)}`, {
            method: 'PUT'
        }
        );
    } else {
        // Rename file
        const content = editor.getValue();
        await fetch(
            `${EC_FS_ENDPOINT}/files/${encodeURIComponent(newPath)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content
            })
        }
        );
        await fetch(
            `${EC_FS_ENDPOINT}/files/${encodeURIComponent(oldPathTrimmed)}`, {
            method: 'DELETE'
        }
        );
    }
    showToast('Renamed', '#ffa07a');
    currentPath = isFolder ? `${newPath}/` : newPath;
    document.getElementById('current-path').textContent = currentPath;
    loadTree();
};

document.getElementById('new-file').onclick = async () => {
    const path = await showModal('Path for new file:');
    if (!path) return;
    currentPath = path;
    editor.setValue('');
    document.getElementById('current-path').textContent = path;
};

document.getElementById('new-folder').onclick = async () => {
    const path = await showModal('Path for new folder (no slash):');
    if (!path) return;
    await fetch(`${EC_FS_ENDPOINT}/folders/${encodeURIComponent(path)}`, {
        method: 'POST'
    });
    showToast('Folder created', '#ffa07a');
    loadTree();
};

document.getElementById('refresh').onclick = loadTree;

window.onload = () => {
    initEditor();
    loadTree();
};