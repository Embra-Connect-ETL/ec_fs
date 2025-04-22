Vue.component('file-node', {
    props: ['node'],
    data() {
        return { expanded: false };
    },
    methods: {
        toggle() {
            if (this.node.type === 'folder') this.expanded = !this.expanded;
        },
        selectFile(file) {
            this.$emit('select', file);
        }
    },
    template: `
      <li @contextmenu.prevent="$emit('rename', node)">
        <div class="file-item" @click="toggle">
          <i :class="['ion', node.type === 'folder' ? 'ion-folder' : 'ion-document', 'folder-icon']"></i>
          <span @click.stop="node.type === 'file' && selectFile(node.path)">{{ node.name }}</span>
        </div>
        <ul v-show="expanded" v-if="node.children">
          <file-node v-for="(child, i) in node.children" :key="i" :node="child" @select="$emit('select', $event)" @rename="$emit('rename', $event)"></file-node>
        </ul>
      </li>
    `
});

const flattenToTree = (paths) => {
    const root = [];
    const pathMap = {};

    paths.forEach(path => {
        const parts = path.split('/');
        let currentLevel = root;

        parts.forEach((part, idx) => {
            const currentPath = parts.slice(0, idx + 1).join('/') + (idx < parts.length - 1 ? '/' : '');

            if (!pathMap[currentPath]) {
                const isFolder = idx < parts.length - 1;
                const newNode = {
                    name: part,
                    path: currentPath,
                    type: isFolder ? 'folder' : 'file',
                    children: isFolder ? [] : null
                };
                pathMap[currentPath] = newNode;
                currentLevel.push(newNode);
            }
            currentLevel = pathMap[currentPath].children || [];
        });
    });
    return root;
};

const app = new Vue({
    el: '#app',
    data: {
        editor: null,
        tree: [],
        openTabs: [],
        currentTab: null,
        showContextMenu: false,
        contextTarget: null,
        contextMenuX: 0,
        contextMenuY: 0,
        modeMap: {
            'js': 'javascript',
            'py': 'python',
            'html': 'htmlmixed',
            'css': 'css',
            'json': { name: 'javascript', json: true },
            'xml': 'xml',
            'md': 'markdown',
            'c': 'text/x-csrc',
            'cpp': 'text/x-c++src',
            'java': 'text/x-java',
            'sql': 'text/x-sql',
            'sh': 'shell',
            'yaml': 'yaml',
            'yml': 'yaml'
        }
    },
    methods: {
        async fetchFileList() {
            const res = await fetch('http://localhost:3307/files');
            const files = await res.json();
            this.tree = flattenToTree(files);
        },
        async loadFile(filePath) {
            let existing = this.openTabs.find(tab => tab.filename === filePath);
            if (existing) {
                this.switchTab(existing);
                return;
            }

            const res = await fetch(`http://localhost:3307/files/${filePath}`);
            const data = await res.json();
            const content = data.content || '';

            const newTab = { filename: filePath, content };
            this.openTabs.push(newTab);
            this.switchTab(newTab);
        },
        switchTab(tab) {
            this.currentTab = tab;
            const ext = tab.filename.split('.').pop().toLowerCase();
            let mode = this.modeMap[ext] || 'text/plain';
            this.editor.setOption('mode', mode);
            this.editor.setValue(tab.content);
        },
        closeTab(tab) {
            this.openTabs = this.openTabs.filter(t => t !== tab);
            if (this.currentTab === tab) {
                this.currentTab = this.openTabs.length ? this.openTabs[0] : null;
                if (this.currentTab) {
                    this.switchTab(this.currentTab);
                } else {
                    this.editor.setValue('');
                }
            }
        },
        async saveFile() {
            if (!this.currentTab) return;
            this.currentTab.content = this.editor.getValue();
            await fetch(`http://localhost:3307/files/${this.currentTab.filename}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: this.currentTab.content })
            });
            alert('Saved');
        },
        async createFile() {
            const name = prompt("Enter file name:");
            if (!name) return;
            await fetch(`http://localhost:3307/files/${name}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: '' })
            });
            await this.fetchFileList();
        },
        async createFolder() {
            const name = prompt("Enter folder name:");
            if (!name) return;
            await fetch(`http://localhost:3307/files/${name}/placeholder.txt`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: '' })
            });
            await this.fetchFileList();
        },
        async renameItem(node = null) {
            if (!node && !this.currentTab) return alert("Select a file or tab first");

            const target = node ? node : this.currentTab;
            const currentPath = target.filename || target.path;
            const isFolder = target.type === 'folder' || currentPath.endsWith("/");

            const newPath = prompt("Enter new path:", currentPath);
            if (!newPath) return;

            if (isFolder) {
                await fetch(`http://localhost:3307/folders/rename?old_path=${currentPath}&new_path=${newPath}`, {
                    method: 'PUT',
                });
            } else {
                const res = await fetch(`http://localhost:3307/files/${currentPath}`);
                const data = await res.json();
                await fetch(`http://localhost:3307/files/${newPath}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: data.content })
                });
                await fetch(`http://localhost:3307/files/${currentPath}`, {
                    method: 'DELETE',
                });
            }

            this.showContextMenu = false;
            await this.fetchFileList();
            this.openTabs = [];
            this.currentTab = null;
            this.editor.setValue('');
        },
        async deleteItem(node = null) {
            if (!node && !this.currentTab) return alert("Select a file or tab first");
            const target = node ? node : this.currentTab;
            if (!confirm(`Delete ${target.filename}?`)) return;

            await fetch(`http://localhost:3307/files/${target.filename}`, {
                method: 'DELETE'
            });
            this.showContextMenu = false;
            await this.fetchFileList();
            this.openTabs = [];
            this.currentTab = null;
            this.editor.setValue('');
        },
        openContextMenu(event, node) {
            this.showContextMenu = true;
            this.contextMenuX = event.pageX;
            this.contextMenuY = event.pageY;
            this.contextTarget = node;
        },
    },
    mounted() {
        this.fetchFileList();
        this.editor = CodeMirror(document.getElementById('editor-container'), {
            lineNumbers: true,
            theme: 'default',
            mode: 'text/plain'
        });

        window.addEventListener('click', () => {
            this.showContextMenu = false;
        });
    }
});
