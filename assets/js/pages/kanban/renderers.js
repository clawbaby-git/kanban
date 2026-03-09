import { PRIORITY_ORDER, STATUS_ORDER } from '../../shared/constants.js';
import {
    calculateTaskDays,
    getAssigneeNames,
    getInitials,
    getPriorityClass,
    groupTasksByPriority,
    groupTasksByStatus
} from '../../shared/task-utils.js';
import { escapeHtml } from '../../shared/text-utils.js';
import { getStatusDomKey } from './store.js';

const MAX_ITEMS_WITHOUT_PAGINATION = 30;
const PRIORITY_LABELS = {
    高: '🔴 高优先级',
    中: '🟡 中优先级',
    低: '🟢 低优先级'
};

function createAssigneesHtml(task) {
    const assignees = getAssigneeNames(task);
    if (!assignees.length) {
        return '<span class="task-empty-assignee">未分配</span>';
    }

    const avatars = assignees.slice(0, 3)
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

function renderPagination(container, totalItems, currentPage, pageSize, key) {
    const totalPages = Math.ceil(totalItems / pageSize);
    if (!container || totalPages <= 1) {
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
        }
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = `
        <button class="pagination-btn" type="button" data-page-key="${key}" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
        <span class="pagination-info">第 ${currentPage} / ${totalPages} 页</span>
        <button class="pagination-btn" type="button" data-page-key="${key}" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>
    `;
}

function renderTaskList(containerId, tasks, status, paginationState) {
    const container = document.getElementById(containerId);
    const paginationContainer = document.getElementById(`${getStatusDomKey(status)}-pagination`);
    if (!container) {
        return;
    }

    if (!tasks.length) {
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
        return;
    }

    let displayTasks = tasks;
    if (tasks.length > MAX_ITEMS_WITHOUT_PAGINATION) {
        const paginationKey = getStatusDomKey(status);
        const { page, pageSize } = paginationState[paginationKey];
        const start = (page - 1) * pageSize;
        displayTasks = tasks.slice(start, start + pageSize);
        renderPagination(paginationContainer, tasks.length, page, pageSize, paginationKey);
    } else if (paginationContainer) {
        paginationContainer.style.display = 'none';
        paginationContainer.innerHTML = '';
    }

    container.innerHTML = `<div class="task-list">${displayTasks.map(createTaskCard).join('')}</div>`;
}

function renderGroupedView(containerId, tasks, collapsedGroups) {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }

    const groups = groupTasksByPriority(tasks);
    container.innerHTML = PRIORITY_ORDER.map(priority => {
        const groupTasks = groups[priority] || [];
        const isCollapsed = collapsedGroups.has(priority);
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
}

export function renderBoardView(storeState, filteredTasks) {
    const groups = groupTasksByStatus(filteredTasks);

    STATUS_ORDER.forEach(status => {
        const key = getStatusDomKey(status);
        const containerId = `${key}-container`;
        if (storeState.currentView === 'group') {
            renderGroupedView(containerId, groups[status] || [], storeState.collapsedGroups);
            const paginationContainer = document.getElementById(`${key}-pagination`);
            if (paginationContainer) {
                paginationContainer.style.display = 'none';
                paginationContainer.innerHTML = '';
            }
        } else {
            renderTaskList(containerId, groups[status] || [], status, storeState.pagination);
        }
    });

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

    const totalTasks = STATUS_ORDER.reduce((sum, status) => sum + (groups[status] || []).length, 0);
    const totalHours = STATUS_ORDER.reduce((sum, status) => {
        return sum + (groups[status] || []).reduce((groupSum, task) => groupSum + calculateTaskDays(task), 0);
    }, 0);
    const completionRate = totalTasks ? Math.round(((groups['已完成'] || []).length / totalTasks) * 100) : 0;

    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('totalHours').textContent = totalHours;
    document.getElementById('completionRate').textContent = `${completionRate}%`;
}
