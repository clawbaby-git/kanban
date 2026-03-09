import { PRIORITY_ORDER, STATUS_ORDER } from '../shared/constants.js';
import { clearSessionTasks, loadTasks, saveTasksToSession } from '../shared/data-service.js';
import {
    calculateTaskDays,
    getAssigneeNames,
    getInitials,
    getPriorityClass,
    getStatusClass,
    groupTasksByPriority,
    groupTasksByStatus,
    normalizeTask
} from '../shared/task-utils.js';
import { escapeHtml, renderSimpleMarkdown } from '../shared/text-utils.js';

const ITEMS_PER_PAGE = 50;
const MAX_ITEMS_WITHOUT_PAGINATION = 30;
const PRIORITY_LABELS = {
    高: '🔴 高优先级',
    中: '🟡 中优先级',
    低: '🟢 低优先级'
};
const STATUS_DOM_KEY = {
    待办: 'todo',
    进行中: 'progress',
    已完成: 'done'
};

const state = {
    allTasks: [],
    filteredTasks: [],
    currentView: 'list',
    currentFilter: 'all',
    searchQuery: '',
    pagination: {
        todo: { page: 1, pageSize: ITEMS_PER_PAGE },
        progress: { page: 1, pageSize: ITEMS_PER_PAGE },
        done: { page: 1, pageSize: ITEMS_PER_PAGE }
    },
    collapsedGroups: new Set()
};

const dragState = {
    active: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    panelWidth: 0,
    panelHeight: 0,
    pointerId: null
};

function getStatusDomKey(status) {
    return STATUS_DOM_KEY[status] || STATUS_DOM_KEY[STATUS_ORDER[0]];
}

function resetPagination() {
    Object.values(state.pagination).forEach(item => {
        item.page = 1;
    });
}

function filterTasks() {
    let tasks = [...state.allTasks];

    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        tasks = tasks.filter(task => {
            const titleMatch = task.title.toLowerCase().includes(query);
            const idMatch = task.task_id.toLowerCase().includes(query);
            const assigneeMatch = getAssigneeNames(task).some(name => name.toLowerCase().includes(query));
            return titleMatch || idMatch || assigneeMatch;
        });
    }

    if (state.currentFilter !== 'all') {
        tasks = tasks.filter(task => task.priority === state.currentFilter);
    }

    state.filteredTasks = tasks;
    return tasks;
}

function createAssigneesHtml(task) {
    const assignees = getAssigneeNames(task);
    if (!assignees.length) {
        return '<span class="task-empty-assignee">未分配</span>';
    }

    const displayAssignees = assignees.slice(0, 3);
    const avatars = displayAssignees
        .map(name => `<div class="assignee-avatar" title="${escapeHtml(name)}">${escapeHtml(getInitials(name))}</div>`)
        .join('');

    const more = assignees.length > 3
        ? `<div class="assignee-more" title="还有 ${assignees.length - 3} 人">+${assignees.length - 3}</div>`
        : '';

    return avatars + more;
}

function createTaskCard(task) {
    return `
        <div class="task-card" data-task-id="${escapeHtml(task.task_id)}" draggable="false">
            <div class="task-header">
                <span class="task-id">${escapeHtml(task.task_id)}</span>
                <span class="priority-badge ${getPriorityClass(task.priority)}">${escapeHtml(task.priority)}</span>
            </div>
            <div class="task-title" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</div>
            <div class="task-footer">
                <div class="task-hours">${calculateTaskDays(task)}天</div>
                <div class="assignees">${createAssigneesHtml(task)}</div>
                <button class="task-detail-btn" type="button" data-task-detail="${escapeHtml(task.task_id)}" title="查看详情">📋</button>
            </div>
        </div>
    `;
}

function renderEmptyState(container, paginationContainer) {
    container.innerHTML = `
        <div class="empty-state">
            <div style="font-size: 3rem; margin-bottom: 12px;">📭</div>
            <div>暂无任务</div>
        </div>
    `;
    if (paginationContainer) {
        paginationContainer.style.display = 'none';
        paginationContainer.innerHTML = '';
    }
}

function renderPagination(container, totalItems, currentPage, pageSize, key) {
    if (!container) {
        return;
    }

    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = `
        <button class="pagination-btn" type="button" data-page-key="${key}" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
        <span class="pagination-info">第 ${currentPage} / ${totalPages} 页</span>
        <button class="pagination-btn" type="button" data-page-key="${key}" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>
    `;
}

function renderTaskList(containerId, tasks, status) {
    const container = document.getElementById(containerId);
    const paginationContainer = document.getElementById(`${getStatusDomKey(status)}-pagination`);

    if (!container) {
        return;
    }

    if (!tasks.length) {
        renderEmptyState(container, paginationContainer);
        return;
    }

    let displayTasks = tasks;
    if (tasks.length > MAX_ITEMS_WITHOUT_PAGINATION) {
        const paginationKey = getStatusDomKey(status);
        const { page, pageSize } = state.pagination[paginationKey];
        const start = (page - 1) * pageSize;
        displayTasks = tasks.slice(start, start + pageSize);
        renderPagination(paginationContainer, tasks.length, page, pageSize, paginationKey);
    } else if (paginationContainer) {
        paginationContainer.style.display = 'none';
        paginationContainer.innerHTML = '';
    }

    container.innerHTML = `<div class="task-list">${displayTasks.map(createTaskCard).join('')}</div>`;
}

function renderGroupedView(containerId, tasks) {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }

    const groups = groupTasksByPriority(tasks);
    const html = PRIORITY_ORDER.map(priority => {
        const groupTasks = groups[priority] || [];
        const isCollapsed = state.collapsedGroups.has(priority);

        return `
            <div class="priority-group ${isCollapsed ? 'collapsed' : ''}" data-priority="${priority}">
                <button class="priority-group-header" type="button" data-toggle-group="${priority}">
                    <span class="priority-group-title">${PRIORITY_LABELS[priority]}</span>
                    <span class="priority-group-count">${groupTasks.length}</span>
                </button>
                <div class="priority-group-content">
                    ${groupTasks.length ? groupTasks.map(createTaskCard).join('') : '<div class="empty-state">该优先级暂无任务</div>'}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

function updateColumnStats(groups) {
    STATUS_ORDER.forEach(status => {
        const key = getStatusDomKey(status);
        const tasks = groups[status] || [];
        const countEl = document.getElementById(`${key}-count`);
        const hoursEl = document.getElementById(`${key}-hours`);
        if (countEl) {
            countEl.textContent = tasks.length;
        }
        if (hoursEl) {
            hoursEl.textContent = `${tasks.reduce((sum, task) => sum + calculateTaskDays(task), 0)}天`;
        }
    });
}

function updateGlobalStats(groups) {
    const totalTasks = STATUS_ORDER.reduce((sum, status) => sum + (groups[status] || []).length, 0);
    const totalHours = STATUS_ORDER.reduce(
        (sum, status) => sum + (groups[status] || []).reduce((groupSum, task) => groupSum + calculateTaskDays(task), 0),
        0
    );
    const completionRate = totalTasks ? Math.round(((groups['已完成'] || []).length / totalTasks) * 100) : 0;

    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('totalHours').textContent = totalHours;
    document.getElementById('completionRate').textContent = `${completionRate}%`;
}

function renderBoard() {
    const tasks = filterTasks();
    const groups = groupTasksByStatus(tasks);

    STATUS_ORDER.forEach(status => {
        const key = getStatusDomKey(status);
        const containerId = `${key}-container`;
        if (state.currentView === 'group') {
            renderGroupedView(containerId, groups[status] || []);
            const paginationContainer = document.getElementById(`${key}-pagination`);
            if (paginationContainer) {
                paginationContainer.style.display = 'none';
                paginationContainer.innerHTML = '';
            }
        } else {
            renderTaskList(containerId, groups[status] || [], status);
        }
    });

    updateColumnStats(groups);
    updateGlobalStats(groups);
}

function setModalOpen(modalId, visible) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        return;
    }

    modal.classList.toggle('active', visible);
    modal.style.display = visible ? 'flex' : 'none';
    document.body.style.overflow = visible ? 'hidden' : '';
}

function createParticipantRow(type) {
    const isReviewer = type === 'reviewer';
    const nameClass = isReviewer ? 'reviewer-name' : 'participant-name';
    const roleClass = isReviewer ? 'reviewer-role' : 'participant-role';
    const daysClass = isReviewer ? 'reviewer-days' : 'participant-days';

    return `
        <div class="participant-row">
            <input type="text" placeholder="姓名" class="${nameClass}">
            <input type="text" placeholder="角色" class="${roleClass}">
            <input type="number" placeholder="预估天数" class="${daysClass}" step="0.5" min="0">
            <button type="button" class="remove-participant-btn" data-remove-row>×</button>
        </div>
    `;
}

function resetTaskForm() {
    const taskForm = document.getElementById('taskForm');
    const participantsContainer = document.getElementById('participantsContainer');
    const reviewersContainer = document.getElementById('reviewersContainer');

    taskForm?.reset();
    if (participantsContainer) {
        participantsContainer.innerHTML = createParticipantRow('participant');
    }
    if (reviewersContainer) {
        reviewersContainer.innerHTML = createParticipantRow('reviewer');
    }
    document.getElementById('iterationName').value = 'iteration-1';
}

function openModal() {
    setModalOpen('taskModal', true);
    window.setTimeout(() => {
        document.getElementById('taskId')?.focus();
    }, 50);
}

function closeModal() {
    setModalOpen('taskModal', false);
    resetTaskForm();
}

function closeTaskDetail() {
    setModalOpen('taskDetailModal', false);
}

function collectWorkers(containerSelector, nameSelector, roleSelector, daysSelector) {
    return Array.from(document.querySelectorAll(`${containerSelector} .participant-row`))
        .map(row => ({
            name: row.querySelector(nameSelector)?.value.trim() || '',
            role: row.querySelector(roleSelector)?.value.trim() || '未分配',
            estimated_days: row.querySelector(daysSelector)?.value || 0,
            actual_days: 0
        }))
        .filter(worker => worker.name);
}

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

function handleTaskSubmit(event) {
    event.preventDefault();

    const taskId = document.getElementById('taskId').value.trim();
    const taskTitle = document.getElementById('taskTitle').value.trim();
    if (!taskId || !taskTitle) {
        alert('请填写任务ID和标题');
        return;
    }

    if (state.allTasks.some(task => task.task_id === taskId)) {
        alert('任务ID已存在，请使用不同的ID');
        return;
    }

    const newTask = normalizeTask({
        task_id: taskId,
        title: taskTitle,
        status: document.getElementById('taskStatus').value,
        priority: document.getElementById('taskPriority').value,
        iteration_name: document.getElementById('iterationName').value.trim() || 'iteration-1',
        created_at: new Date().toLocaleDateString(),
        participants: collectWorkers('#participantsContainer', '.participant-name', '.participant-role', '.participant-days'),
        reviewers: collectWorkers('#reviewersContainer', '.reviewer-name', '.reviewer-role', '.reviewer-days')
    });

    state.allTasks.push(newTask);
    saveTasksToSession(state.allTasks);

    let filterReset = false;
    if (state.currentFilter !== 'all') {
        filterReset = true;
        state.currentFilter = 'all';
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.priority === 'all');
        });
    }

    resetPagination();
    renderBoard();
    closeModal();
    showSuccessMessage(filterReset ? '任务添加成功，已自动切换到“全部”视图' : '任务添加成功');
}

function openTaskDetail(taskId) {
    const task = state.allTasks.find(item => item.task_id === taskId);
    if (!task) {
        alert('未找到任务详情');
        return;
    }

    document.getElementById('detailTaskTitle').textContent = task.title;
    const contentEl = document.getElementById('detailContent');

    const metaHtml = `
        <div class="detail-meta">
            <div class="detail-meta-item">
                <div class="detail-meta-label">任务ID</div>
                <div class="detail-meta-value">${escapeHtml(task.task_id)}</div>
            </div>
            <div class="detail-meta-item">
                <div class="detail-meta-label">状态</div>
                <div class="detail-status-badge ${getStatusClass(task.status)}">${escapeHtml(task.status)}</div>
            </div>
            <div class="detail-meta-item">
                <div class="detail-meta-label">优先级</div>
                <div class="detail-meta-value">${escapeHtml(task.priority)}</div>
            </div>
            <div class="detail-meta-item">
                <div class="detail-meta-label">迭代名称</div>
                <div class="detail-meta-value">${escapeHtml(task.iteration_name || '未指定')}</div>
            </div>
            <div class="detail-meta-item">
                <div class="detail-meta-label">总工时</div>
                <div class="detail-meta-value">${calculateTaskDays(task)}天</div>
            </div>
            <div class="detail-meta-item">
                <div class="detail-meta-label">创建时间</div>
                <div class="detail-meta-value">${escapeHtml(task.created_at || new Date().toLocaleDateString())}</div>
            </div>
        </div>
    `;

    const buildPeopleSection = (title, people) => {
        if (!people.length) {
            return `<div class="detail-section"><h3>${title}</h3><div class="detail-value detail-empty">暂无数据</div></div>`;
        }

        return `
            <div class="detail-section">
                <h3>${title}</h3>
                <div class="detail-person-list">
                    ${people.map(person => `
                        <div class="detail-person-item">
                            <div class="detail-person-avatar">${escapeHtml(getInitials(person.name))}</div>
                            <div class="detail-person-info">
                                <div class="detail-person-name">${escapeHtml(person.name)}</div>
                                <div class="detail-person-role">${escapeHtml(person.role)} · 预估 ${person.estimated_days}天 · 实际 ${person.actual_days}天</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };

    const descriptionHtml = task.description
        ? `<div class="detail-description">${renderSimpleMarkdown(task.description)}</div>`
        : '<div class="detail-description detail-empty">暂无任务描述</div>';

    contentEl.innerHTML = `
        ${metaHtml}
        ${buildPeopleSection('👥 参与人员', task.participants)}
        ${buildPeopleSection('✅ 审核人员', task.reviewers)}
        <div class="detail-section">
            <h3>📝 任务描述</h3>
            ${descriptionHtml}
        </div>
    `;

    setModalOpen('taskDetailModal', true);
}

function exportTasks() {
    try {
        const blob = new Blob([JSON.stringify({ tasks: state.allTasks }, null, 2)], { type: 'application/json' });
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
    const columns = document.querySelectorAll('.column');
    columns[indexMap[target]]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function startPanelDrag(event) {
    const panel = document.getElementById('statsPanel');
    if (!panel) {
        return;
    }

    const rect = panel.getBoundingClientRect();
    dragState.active = true;
    dragState.pointerId = event.pointerId;
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;
    dragState.offsetX = rect.left;
    dragState.offsetY = rect.top;
    dragState.panelWidth = rect.width;
    dragState.panelHeight = rect.height;

    panel.setPointerCapture?.(event.pointerId);
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top}px`;
    panel.style.right = 'auto';
    panel.style.transform = 'none';
    panel.style.zIndex = '200';
    panel.classList.add('dragging');
    document.body.style.userSelect = 'none';
}

function movePanel(event) {
    if (!dragState.active) {
        return;
    }

    const panel = document.getElementById('statsPanel');
    if (!panel) {
        return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const maxLeft = Math.max(10, window.innerWidth - dragState.panelWidth - 10);
    const maxTop = Math.max(10, window.innerHeight - dragState.panelHeight - 10);
    const left = Math.min(maxLeft, Math.max(10, dragState.offsetX + deltaX));
    const top = Math.min(maxTop, Math.max(10, dragState.offsetY + deltaY));

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
}

function endPanelDrag(event) {
    if (!dragState.active) {
        return;
    }

    const panel = document.getElementById('statsPanel');
    dragState.active = false;
    dragState.pointerId = null;

    if (panel) {
        panel.releasePointerCapture?.(event.pointerId);
        panel.style.zIndex = '150';
        panel.classList.remove('dragging');
    }

    document.body.style.userSelect = '';
}

function initStatsDrag() {
    const handle = document.getElementById('statsDragHandle');
    if (!handle) {
        return;
    }

    handle.addEventListener('pointerdown', startPanelDrag);
    window.addEventListener('pointermove', movePanel);
    window.addEventListener('pointerup', endPanelDrag);
    window.addEventListener('pointercancel', endPanelDrag);
}

function handleBoardClick(event) {
    const detailButton = event.target.closest('[data-task-detail]');
    if (detailButton) {
        openTaskDetail(detailButton.dataset.taskDetail);
        return;
    }

    const paginationButton = event.target.closest('[data-page-key][data-page]');
    if (paginationButton) {
        const { pageKey, page } = paginationButton.dataset;
        const totalPages = Math.ceil(
            (groupTasksByStatus(filterTasks())[STATUS_ORDER.find(status => getStatusDomKey(status) === pageKey)] || []).length /
            state.pagination[pageKey].pageSize
        );
        const nextPage = Number.parseInt(page, 10);
        if (Number.isFinite(nextPage) && nextPage >= 1 && nextPage <= totalPages) {
            state.pagination[pageKey].page = nextPage;
            renderBoard();
        }
        return;
    }

    const groupToggle = event.target.closest('[data-toggle-group]');
    if (groupToggle) {
        const priority = groupToggle.dataset.toggleGroup;
        if (state.collapsedGroups.has(priority)) {
            state.collapsedGroups.delete(priority);
        } else {
            state.collapsedGroups.add(priority);
        }
        renderBoard();
    }
}

function handleGlobalClick(event) {
    const actionButton = event.target.closest('[data-action]');
    if (actionButton) {
        const { action } = actionButton.dataset;
        if (action === 'export') {
            exportTasks();
        } else if (action === 'clear-session') {
            clearAllSessionData();
        } else if (action === 'open-task-modal') {
            openModal();
        } else if (action === 'close-task-modal') {
            closeModal();
        } else if (action === 'close-task-detail') {
            closeTaskDetail();
        } else if (action === 'add-participant') {
            document.getElementById('participantsContainer').insertAdjacentHTML('beforeend', createParticipantRow('participant'));
        } else if (action === 'add-reviewer') {
            document.getElementById('reviewersContainer').insertAdjacentHTML('beforeend', createParticipantRow('reviewer'));
        } else if (action === 'scroll-top') {
            scrollToTop();
        } else if (action?.startsWith('scroll-column:')) {
            scrollToColumn(action.split(':')[1]);
        }
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
        if (overlay.id === 'taskModal') {
            closeModal();
        } else if (overlay.id === 'taskDetailModal') {
            closeTaskDetail();
        }
    }
}

function initEventListeners() {
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    searchInput?.addEventListener('input', event => {
        window.clearTimeout(searchTimeout);
        searchTimeout = window.setTimeout(() => {
            state.searchQuery = event.target.value.trim();
            resetPagination();
            renderBoard();
        }, 300);
    });

    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(item => item.classList.remove('active'));
            button.classList.add('active');
            state.currentFilter = button.dataset.priority;
            resetPagination();
            renderBoard();
        });
    });

    document.querySelectorAll('.view-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(item => item.classList.remove('active'));
            button.classList.add('active');
            state.currentView = button.dataset.view;
            renderBoard();
        });
    });

    document.querySelectorAll('.collapse-btn').forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.column')?.classList.toggle('collapsed');
        });
    });

    document.getElementById('taskForm')?.addEventListener('submit', handleTaskSubmit);
    document.getElementById('board')?.addEventListener('click', handleBoardClick);
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeModal();
            closeTaskDetail();
        }
    });
}

function handleResponsiveView() {
    if (window.innerWidth <= 1024 && state.currentView === 'group') {
        state.currentView = 'list';
        document.querySelectorAll('.view-btn').forEach(button => {
            button.classList.toggle('active', button.dataset.view === 'list');
        });
        renderBoard();
    }
}

function applyIOSViewportFix() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) {
        return;
    }

    const setVH = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    document.addEventListener('touchmove', event => {
        const taskModal = document.getElementById('taskModal');
        const detailModal = document.getElementById('taskDetailModal');
        const anyModalOpen = taskModal?.classList.contains('active') || detailModal?.classList.contains('active');
        if (anyModalOpen && !event.target.closest('.modal')) {
            event.preventDefault();
        }
    }, { passive: false });

    setVH();
    window.addEventListener('resize', setVH);
}

async function init() {
    try {
        state.allTasks = await loadTasks({ preferSession: true });
        state.filteredTasks = [...state.allTasks];

        document.getElementById('loading').style.display = 'none';
        document.getElementById('board').style.display = 'grid';
        document.getElementById('quickNav').style.display = 'flex';

        initEventListeners();
        initStatsDrag();
        applyIOSViewportFix();
        renderBoard();

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
