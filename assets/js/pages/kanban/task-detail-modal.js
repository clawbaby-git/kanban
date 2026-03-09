import { calculateTaskDays, getInitials, getStatusClass } from '../../shared/task-utils.js';
import { escapeHtml, renderSimpleMarkdown } from '../../shared/text-utils.js';

function buildPeopleSection(title, people) {
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
}

export function createTaskDetailController({ onEdit, onDelete }) {
    const modal = document.getElementById('taskDetailModal');
    const titleEl = document.getElementById('detailTaskTitle');
    const contentEl = document.getElementById('detailContent');
    let currentTaskId = null;

    function setOpen(visible) {
        modal.classList.toggle('active', visible);
        modal.style.display = visible ? 'flex' : 'none';
        document.body.style.overflow = visible ? 'hidden' : '';
    }

    function open(task) {
        currentTaskId = task.task_id;
        titleEl.textContent = task.title;
        const descriptionHtml = task.description
            ? `<div class="detail-description">${renderSimpleMarkdown(task.description)}</div>`
            : '<div class="detail-description detail-empty">暂无任务描述</div>';

        contentEl.innerHTML = `
            <div class="detail-actions-bar">
                <button type="button" class="btn-secondary" data-detail-action="edit" data-task-id="${escapeHtml(task.task_id)}">编辑任务</button>
                <button type="button" class="btn-danger" data-detail-action="delete" data-task-id="${escapeHtml(task.task_id)}">删除任务</button>
            </div>
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
            ${buildPeopleSection('👥 参与人员', task.participants || [])}
            ${buildPeopleSection('✅ 审核人员', task.reviewers || [])}
            <div class="detail-section">
                <h3>📝 任务描述</h3>
                ${descriptionHtml}
            </div>
        `;
        setOpen(true);
    }

    function close() {
        currentTaskId = null;
        setOpen(false);
    }

    contentEl?.addEventListener('click', event => {
        const button = event.target.closest('[data-detail-action]');
        if (!button) {
            return;
        }

        const taskId = button.dataset.taskId || currentTaskId;
        if (button.dataset.detailAction === 'edit') {
            onEdit(taskId);
        }
        if (button.dataset.detailAction === 'delete') {
            onDelete(taskId);
        }
    });

    return {
        open,
        close,
        isOpen: () => modal.classList.contains('active'),
        getCurrentTaskId: () => currentTaskId
    };
}
