import { clearSessionTasks } from '../shared/data-service.js';
import { createKanbanStore, getStatusDomKey } from './kanban/store.js';
import { renderBoardView } from './kanban/renderers.js';
import { createTaskFormController } from './kanban/task-form-modal.js';
import { createTaskDetailController } from './kanban/task-detail-modal.js';
import { createStatsPanelController } from './kanban/stats-panel.js';

const store = createKanbanStore();

function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #4caf50;
        color: #fff;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 2000;
        animation: slideDown 0.3s ease-out;
        max-width: 90%;
        text-align: center;
    `;
    document.body.appendChild(toast);
    window.setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease-in';
        window.setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function render() {
    const filteredTasks = store.getFilteredTasks();
    renderBoardView(store.getState(), filteredTasks);
}

const taskFormController = createTaskFormController({
    async onSubmit({ mode, editingTaskId, payload }) {
        if (!payload.task_id || !payload.title) {
            alert('请填写任务ID和标题');
            return;
        }

        if (store.hasTaskId(payload.task_id, mode === 'edit' ? editingTaskId : null)) {
            alert('任务ID已存在，请使用不同的ID');
            return;
        }

        if (mode === 'edit') {
            const updatedTask = store.updateTask(editingTaskId, payload);
            if (!updatedTask) {
                alert('任务不存在，无法保存修改');
                return;
            }
            taskFormController.close();
            render();
            taskDetailController.open(updatedTask);
            showSuccessMessage('任务修改已保存');
            return;
        }

        const filterReset = store.getState().currentFilter !== 'all';
        if (filterReset) {
            store.setFilter('all');
            document.querySelectorAll('.filter-btn').forEach(button => {
                button.classList.toggle('active', button.dataset.priority === 'all');
            });
        }

        store.addTask(payload);
        taskFormController.close();
        render();
        showSuccessMessage(filterReset ? '任务添加成功，已自动切换到“全部”视图' : '任务添加成功');
    }
});

const taskDetailController = createTaskDetailController({
    onEdit(taskId) {
        const task = store.getTaskById(taskId);
        if (!task) {
            alert('未找到任务详情');
            return;
        }
        taskDetailController.close();
        taskFormController.openEdit(task);
    },
    onDelete(taskId) {
        const task = store.getTaskById(taskId);
        if (!task) {
            alert('未找到任务');
            return;
        }

        if (!window.confirm(`确定删除任务 ${task.task_id} 吗？此操作不可恢复。`)) {
            return;
        }

        const deleted = store.deleteTask(taskId);
        if (!deleted) {
            alert('删除失败，请重试');
            return;
        }

        taskDetailController.close();
        render();
        showSuccessMessage(`任务 ${task.task_id} 已删除`);
    }
});

function exportTasks() {
    try {
        const blob = new Blob([JSON.stringify({ tasks: store.getState().allTasks }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'tasks.json';
        link.click();
        URL.revokeObjectURL(url);
        showSuccessMessage('任务数据已导出为 tasks.json');
    } catch (error) {
        alert(`导出失败: ${error.message}`);
    }
}

function clearAllSessionData() {
    if (!window.confirm('确定要清空所有会话数据吗？此操作不可恢复。')) {
        return;
    }

    clearSessionTasks();
    window.location.reload();
}

function scrollToColumn(target) {
    const indexMap = { todo: 0, progress: 1, done: 2 };
    document.querySelectorAll('.column')[indexMap[target]]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleBoardClick(event) {
    const detailButton = event.target.closest('[data-task-detail]');
    if (detailButton) {
        const task = store.getTaskById(detailButton.dataset.taskDetail);
        if (!task) {
            alert('未找到任务详情');
            return;
        }
        taskDetailController.open(task);
        return;
    }

    const paginationButton = event.target.closest('[data-page-key][data-page]');
    if (paginationButton) {
        const { pageKey, page } = paginationButton.dataset;
        const filteredTasks = store.getFilteredTasks();
        const groups = {
            待办: filteredTasks.filter(task => task.status === '待办'),
            进行中: filteredTasks.filter(task => task.status === '进行中'),
            已完成: filteredTasks.filter(task => task.status === '已完成')
        };
        const status = Object.keys(groups).find(item => getStatusDomKey(item) === pageKey);
        const totalPages = Math.ceil((groups[status] || []).length / store.getState().pagination[pageKey].pageSize);
        const nextPage = Number.parseInt(page, 10);
        if (Number.isFinite(nextPage) && nextPage >= 1 && nextPage <= totalPages) {
            store.setPage(pageKey, nextPage);
            render();
        }
        return;
    }

    const groupToggle = event.target.closest('[data-toggle-group]');
    if (groupToggle) {
        store.toggleGroup(groupToggle.dataset.toggleGroup);
        render();
    }
}

function handleGlobalClick(event) {
    const actionButton = event.target.closest('[data-action]');
    if (actionButton) {
        const { action } = actionButton.dataset;
        if (action === 'export') exportTasks();
        if (action === 'clear-session') clearAllSessionData();
        if (action === 'open-task-modal') {
            taskDetailController.close();
            taskFormController.openCreate();
        }
        if (action === 'close-task-modal') taskFormController.close();
        if (action === 'close-task-detail') taskDetailController.close();
        if (action === 'add-participant') taskFormController.appendParticipant();
        if (action === 'add-reviewer') taskFormController.appendReviewer();
        if (action === 'scroll-top') scrollToTop();
        if (action?.startsWith('scroll-column:')) scrollToColumn(action.split(':')[1]);
        return;
    }

    const removeRowButton = event.target.closest('[data-remove-row]');
    if (removeRowButton) {
        const container = removeRowButton.closest('#participantsContainer, #reviewersContainer');
        if (container && container.children.length > 1) {
            removeRowButton.closest('.participant-row')?.remove();
        }
        return;
    }

    const overlay = event.target.closest('.modal-overlay');
    if (overlay && event.target === overlay) {
        if (overlay.id === 'taskModal') taskFormController.close();
        if (overlay.id === 'taskDetailModal') taskDetailController.close();
    }
}

function initEventListeners() {
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    searchInput?.addEventListener('input', event => {
        window.clearTimeout(searchTimeout);
        searchTimeout = window.setTimeout(() => {
            store.setSearchQuery(event.target.value.trim());
            render();
        }, 300);
    });

    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(item => item.classList.remove('active'));
            button.classList.add('active');
            store.setFilter(button.dataset.priority);
            render();
        });
    });

    document.querySelectorAll('.view-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(item => item.classList.remove('active'));
            button.classList.add('active');
            store.setView(button.dataset.view);
            render();
        });
    });

    document.querySelectorAll('.collapse-btn').forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.column')?.classList.toggle('collapsed');
        });
    });

    document.getElementById('board')?.addEventListener('click', handleBoardClick);
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            taskFormController.close();
            taskDetailController.close();
        }
    });
}

function handleResponsiveView() {
    if (window.innerWidth <= 1024 && store.getState().currentView === 'group') {
        store.setView('list');
        document.querySelectorAll('.view-btn').forEach(button => {
            button.classList.toggle('active', button.dataset.view === 'list');
        });
        render();
    }
}

function applyIOSViewportFix() {
    if (!/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        return;
    }

    const setVH = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    document.addEventListener('touchmove', event => {
        const anyModalOpen = taskFormController.isOpen() || taskDetailController.isOpen();
        if (anyModalOpen && !event.target.closest('.modal')) {
            event.preventDefault();
        }
    }, { passive: false });

    setVH();
    window.addEventListener('resize', setVH);
}

async function init() {
    try {
        await store.init();
        document.getElementById('loading').style.display = 'none';
        document.getElementById('board').style.display = 'grid';
        document.getElementById('quickNav').style.display = 'flex';

        initEventListeners();
        createStatsPanelController().init();
        applyIOSViewportFix();
        render();

        let resizeTimeout;
        window.addEventListener('resize', () => {
            window.clearTimeout(resizeTimeout);
            resizeTimeout = window.setTimeout(handleResponsiveView, 250);
        });
    } catch (error) {
        document.getElementById('loading').style.display = 'none';
        const errorEl = document.getElementById('error');
        errorEl.style.display = 'block';
        errorEl.textContent = error.message || '无法加载任务数据';
    }
}

document.addEventListener('DOMContentLoaded', init);
