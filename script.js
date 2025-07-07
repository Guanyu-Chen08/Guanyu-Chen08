/**
 * Modern Todo List Application
 * Features: CRUD operations, localStorage persistence, filtering, responsive design
 * Author: Guanyu Chen
 */

class TodoApp {
    constructor() {
        // Initialize application state
        this.tasks = [];
        this.currentFilter = 'all';
        this.taskIdCounter = 1;
        this.editingTaskId = null;
        
        // DOM elements
        this.elements = {
            taskForm: document.getElementById('taskForm'),
            taskInput: document.getElementById('taskInput'),
            taskList: document.getElementById('taskList'),
            taskCount: document.getElementById('taskCount'),
            emptyState: document.getElementById('emptyState'),
            filterAll: document.getElementById('filterAll'),
            filterActive: document.getElementById('filterActive'),
            filterCompleted: document.getElementById('filterCompleted'),
            clearCompleted: document.getElementById('clearCompleted'),
            themeToggle: document.getElementById('themeToggle'),
            exportData: document.getElementById('exportData'),
            importData: document.getElementById('importData'),
            importFile: document.getElementById('importFile'),
            confirmModal: document.getElementById('confirmModal'),
            confirmTitle: document.getElementById('confirmTitle'),
            confirmMessage: document.getElementById('confirmMessage'),
            confirmOk: document.getElementById('confirmOk'),
            confirmCancel: document.getElementById('confirmCancel'),
            toastContainer: document.getElementById('toastContainer')
        };
        
        // Initialize application
        this.init();
    }
    
    /**
     * Initialize the application
     */
    init() {
        this.loadFromStorage();
        this.bindEvents();
        this.updateUI();
        this.initializeTheme();
        this.showToast('Welcome to your Todo List!', 'success');
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Task form submission
        this.elements.taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });
        
        // Filter buttons
        this.elements.filterAll.addEventListener('click', () => this.setFilter('all'));
        this.elements.filterActive.addEventListener('click', () => this.setFilter('active'));
        this.elements.filterCompleted.addEventListener('click', () => this.setFilter('completed'));
        
        // Clear completed tasks
        this.elements.clearCompleted.addEventListener('click', () => this.clearCompletedTasks());
        
        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Data export/import
        this.elements.exportData.addEventListener('click', () => this.exportTasks());
        this.elements.importData.addEventListener('click', () => this.elements.importFile.click());
        this.elements.importFile.addEventListener('change', (e) => this.importTasks(e));
        
        // Modal events
        this.elements.confirmCancel.addEventListener('click', () => this.hideModal());
        this.elements.confirmModal.addEventListener('click', (e) => {
            if (e.target === this.elements.confirmModal) {
                this.hideModal();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Task input focus on page load
        this.elements.taskInput.focus();
    }
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Escape key to cancel editing
        if (e.key === 'Escape') {
            if (this.editingTaskId) {
                this.cancelEditTask();
            } else {
                this.hideModal();
            }
        }
        
        // Ctrl/Cmd + A to focus on input
        if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            this.elements.taskInput.focus();
        }
    }
    
    /**
     * Add a new task
     */
    addTask() {
        const taskText = this.elements.taskInput.value.trim();
        
        if (!taskText) {
            this.showToast('Please enter a task', 'error');
            this.elements.taskInput.focus();
            return;
        }
        
        // Check for duplicate tasks
        if (this.tasks.some(task => task.text.toLowerCase() === taskText.toLowerCase())) {
            this.showToast('Task already exists', 'warning');
            this.elements.taskInput.focus();
            return;
        }
        
        const task = {
            id: this.taskIdCounter++,
            text: taskText,
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.tasks.push(task);
        this.elements.taskInput.value = '';
        this.saveToStorage();
        this.updateUI();
        this.showToast('Task added successfully', 'success');
        
        // Focus back on input for continuous adding
        this.elements.taskInput.focus();
    }
    
    /**
     * Delete a task
     */
    deleteTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        this.showConfirmModal(
            'Delete Task',
            `Are you sure you want to delete "${task.text}"?`,
            () => {
                this.tasks = this.tasks.filter(t => t.id !== taskId);
                this.saveToStorage();
                this.updateUI();
                this.showToast('Task deleted', 'success');
            }
        );
    }
    
    /**
     * Toggle task completion status
     */
    toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        task.completed = !task.completed;
        task.updatedAt = new Date().toISOString();
        this.saveToStorage();
        this.updateUI();
        
        const message = task.completed ? 'Task completed' : 'Task marked as active';
        this.showToast(message, 'success');
    }
    
    /**
     * Start editing a task
     */
    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        this.editingTaskId = taskId;
        this.updateTaskUI(task);
    }
    
    /**
     * Save edited task
     */
    saveEditTask(taskId, newText) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        const trimmedText = newText.trim();
        
        if (!trimmedText) {
            this.showToast('Task cannot be empty', 'error');
            return;
        }
        
        // Check for duplicate tasks (excluding current task)
        if (this.tasks.some(t => t.id !== taskId && t.text.toLowerCase() === trimmedText.toLowerCase())) {
            this.showToast('Task already exists', 'warning');
            return;
        }
        
        task.text = trimmedText;
        task.updatedAt = new Date().toISOString();
        this.editingTaskId = null;
        this.saveToStorage();
        this.updateUI();
        this.showToast('Task updated', 'success');
    }
    
    /**
     * Cancel editing task
     */
    cancelEditTask() {
        this.editingTaskId = null;
        this.updateUI();
    }
    
    /**
     * Set filter for tasks
     */
    setFilter(filter) {
        this.currentFilter = filter;
        this.updateFilterButtons();
        this.updateTaskList();
    }
    
    /**
     * Clear all completed tasks
     */
    clearCompletedTasks() {
        const completedTasks = this.tasks.filter(task => task.completed);
        
        if (completedTasks.length === 0) {
            this.showToast('No completed tasks to clear', 'warning');
            return;
        }
        
        this.showConfirmModal(
            'Clear Completed Tasks',
            `Are you sure you want to delete ${completedTasks.length} completed task(s)?`,
            () => {
                this.tasks = this.tasks.filter(task => !task.completed);
                this.saveToStorage();
                this.updateUI();
                this.showToast(`${completedTasks.length} completed task(s) cleared`, 'success');
            }
        );
    }
    
    /**
     * Get filtered tasks based on current filter
     */
    getFilteredTasks() {
        switch (this.currentFilter) {
            case 'active':
                return this.tasks.filter(task => !task.completed);
            case 'completed':
                return this.tasks.filter(task => task.completed);
            default:
                return this.tasks;
        }
    }
    
    /**
     * Update the entire UI
     */
    updateUI() {
        this.updateTaskList();
        this.updateTaskCounter();
        this.updateFilterButtons();
        this.updateEmptyState();
    }
    
    /**
     * Update task list display
     */
    updateTaskList() {
        const filteredTasks = this.getFilteredTasks();
        this.elements.taskList.innerHTML = '';
        
        filteredTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            this.elements.taskList.appendChild(taskElement);
        });
    }
    
    /**
     * Create task element
     */
    createTaskElement(task) {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''} ${this.editingTaskId === task.id ? 'editing' : ''}`;
        li.setAttribute('data-task-id', task.id);
        
        const checkbox = document.createElement('div');
        checkbox.className = `task-checkbox ${task.completed ? 'checked' : ''}`;
        checkbox.setAttribute('role', 'checkbox');
        checkbox.setAttribute('aria-checked', task.completed);
        checkbox.setAttribute('tabindex', '0');
        checkbox.addEventListener('click', () => this.toggleTask(task.id));
        checkbox.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleTask(task.id);
            }
        });
        
        const textElement = document.createElement('div');
        textElement.className = `task-text ${task.completed ? 'completed' : ''}`;
        textElement.setAttribute('contenteditable', this.editingTaskId === task.id);
        textElement.setAttribute('data-placeholder', 'Enter task text...');
        textElement.textContent = task.text;
        
        if (this.editingTaskId === task.id) {
            textElement.focus();
            // Select all text for easy editing
            const range = document.createRange();
            range.selectNodeContents(textElement);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }
        
        textElement.addEventListener('blur', () => {
            if (this.editingTaskId === task.id) {
                this.saveEditTask(task.id, textElement.textContent);
            }
        });
        
        textElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                textElement.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelEditTask();
            }
        });
        
        textElement.addEventListener('dblclick', () => {
            if (this.editingTaskId !== task.id) {
                this.editTask(task.id);
            }
        });
        
        const actions = document.createElement('div');
        actions.className = 'task-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'task-action-btn edit-btn';
        editBtn.innerHTML = '✏️';
        editBtn.setAttribute('aria-label', 'Edit task');
        editBtn.addEventListener('click', () => this.editTask(task.id));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'task-action-btn delete-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.setAttribute('aria-label', 'Delete task');
        deleteBtn.addEventListener('click', () => this.deleteTask(task.id));
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        
        li.appendChild(checkbox);
        li.appendChild(textElement);
        li.appendChild(actions);
        
        return li;
    }
    
    /**
     * Update task for editing
     */
    updateTaskUI(task) {
        const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
        if (!taskElement) return;
        
        taskElement.classList.add('editing');
        const textElement = taskElement.querySelector('.task-text');
        textElement.setAttribute('contenteditable', true);
        textElement.focus();
        
        // Select all text for easy editing
        const range = document.createRange();
        range.selectNodeContents(textElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
    
    /**
     * Update task counter
     */
    updateTaskCounter() {
        const activeTasks = this.tasks.filter(task => !task.completed).length;
        const completedTasks = this.tasks.filter(task => task.completed).length;
        const totalTasks = this.tasks.length;
        
        let counterText = '';
        if (totalTasks === 0) {
            counterText = 'No tasks';
        } else if (activeTasks === 0) {
            counterText = `All ${totalTasks} task${totalTasks === 1 ? '' : 's'} completed! 🎉`;
        } else {
            counterText = `${activeTasks} task${activeTasks === 1 ? '' : 's'} remaining`;
            if (completedTasks > 0) {
                counterText += ` (${completedTasks} completed)`;
            }
        }
        
        this.elements.taskCount.textContent = counterText;
    }
    
    /**
     * Update filter buttons
     */
    updateFilterButtons() {
        const buttons = [this.elements.filterAll, this.elements.filterActive, this.elements.filterCompleted];
        buttons.forEach(btn => btn.classList.remove('active'));
        
        switch (this.currentFilter) {
            case 'active':
                this.elements.filterActive.classList.add('active');
                break;
            case 'completed':
                this.elements.filterCompleted.classList.add('active');
                break;
            default:
                this.elements.filterAll.classList.add('active');
        }
    }
    
    /**
     * Update empty state visibility
     */
    updateEmptyState() {
        const filteredTasks = this.getFilteredTasks();
        const hasVisibleTasks = filteredTasks.length > 0;
        
        this.elements.emptyState.classList.toggle('show', !hasVisibleTasks);
        this.elements.taskList.style.display = hasVisibleTasks ? 'flex' : 'none';
    }
    
    /**
     * Save tasks to localStorage
     */
    saveToStorage() {
        try {
            const data = {
                tasks: this.tasks,
                taskIdCounter: this.taskIdCounter,
                currentFilter: this.currentFilter,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('todoApp', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            this.showToast('Error saving data', 'error');
        }
    }
    
    /**
     * Load tasks from localStorage
     */
    loadFromStorage() {
        try {
            const data = localStorage.getItem('todoApp');
            if (data) {
                const parsed = JSON.parse(data);
                this.tasks = parsed.tasks || [];
                this.taskIdCounter = parsed.taskIdCounter || 1;
                this.currentFilter = parsed.currentFilter || 'all';
                
                // Ensure all tasks have required properties
                this.tasks = this.tasks.map(task => ({
                    id: task.id || this.taskIdCounter++,
                    text: task.text || '',
                    completed: task.completed || false,
                    createdAt: task.createdAt || new Date().toISOString(),
                    updatedAt: task.updatedAt || new Date().toISOString()
                }));
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            this.showToast('Error loading saved data', 'error');
        }
    }
    
    /**
     * Export tasks to JSON file
     */
    exportTasks() {
        try {
            const data = {
                tasks: this.tasks,
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `todo-tasks-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            this.showToast('Tasks exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting tasks:', error);
            this.showToast('Error exporting tasks', 'error');
        }
    }
    
    /**
     * Import tasks from JSON file
     */
    importTasks(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!data.tasks || !Array.isArray(data.tasks)) {
                    throw new Error('Invalid file format');
                }
                
                this.showConfirmModal(
                    'Import Tasks',
                    `This will replace your current ${this.tasks.length} task(s) with ${data.tasks.length} task(s) from the file. Continue?`,
                    () => {
                        this.tasks = data.tasks.map(task => ({
                            id: task.id || this.taskIdCounter++,
                            text: task.text || '',
                            completed: task.completed || false,
                            createdAt: task.createdAt || new Date().toISOString(),
                            updatedAt: task.updatedAt || new Date().toISOString()
                        }));
                        
                        // Update task counter to prevent ID conflicts
                        this.taskIdCounter = Math.max(...this.tasks.map(t => t.id), 0) + 1;
                        
                        this.saveToStorage();
                        this.updateUI();
                        this.showToast('Tasks imported successfully', 'success');
                    }
                );
            } catch (error) {
                console.error('Error importing tasks:', error);
                this.showToast('Error importing tasks. Please check the file format.', 'error');
            }
        };
        
        reader.onerror = () => {
            this.showToast('Error reading file', 'error');
        };
        
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    }
    
    /**
     * Initialize theme
     */
    initializeTheme() {
        const savedTheme = localStorage.getItem('todoApp_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeToggle(savedTheme);
    }
    
    /**
     * Toggle theme
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('todoApp_theme', newTheme);
        this.updateThemeToggle(newTheme);
        
        this.showToast(`Switched to ${newTheme} theme`, 'success');
    }
    
    /**
     * Update theme toggle button
     */
    updateThemeToggle(theme) {
        const icon = this.elements.themeToggle.querySelector('.theme-icon');
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
        this.elements.themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
    }
    
    /**
     * Show confirmation modal
     */
    showConfirmModal(title, message, onConfirm) {
        this.elements.confirmTitle.textContent = title;
        this.elements.confirmMessage.textContent = message;
        this.elements.confirmModal.classList.add('show');
        this.elements.confirmModal.setAttribute('aria-hidden', 'false');
        
        // Focus on confirm button
        this.elements.confirmOk.focus();
        
        // Set up confirm action
        this.elements.confirmOk.onclick = () => {
            this.hideModal();
            onConfirm();
        };
    }
    
    /**
     * Hide confirmation modal
     */
    hideModal() {
        this.elements.confirmModal.classList.remove('show');
        this.elements.confirmModal.setAttribute('aria-hidden', 'true');
        this.elements.confirmOk.onclick = null;
        
        // Return focus to main content
        this.elements.taskInput.focus();
    }
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'alert');
        
        this.elements.toastContainer.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Remove toast after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new TodoApp();
    
    // Make app instance available globally for debugging
    window.todoApp = app;
    
    // Register service worker for PWA functionality (if available)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.log('Service worker registration failed:', err);
        });
    }
    
    // Handle online/offline status
    window.addEventListener('online', () => {
        app.showToast('You are back online', 'success');
    });
    
    window.addEventListener('offline', () => {
        app.showToast('You are offline. Changes will be saved locally.', 'warning');
    });
    
    // Handle before unload to save any pending changes
    window.addEventListener('beforeunload', () => {
        if (app.editingTaskId) {
            app.cancelEditTask();
        }
    });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TodoApp;
}