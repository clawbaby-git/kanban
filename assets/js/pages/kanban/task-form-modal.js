import { normalizeTask } from '../../shared/task-utils.js';

function createParticipantRow(type, worker = {}) {
    const isReviewer = type === 'reviewer';
    const nameClass = isReviewer ? 'reviewer-name' : 'participant-name';
    const roleClass = isReviewer ? 'reviewer-role' : 'participant-role';
    const daysClass = isReviewer ? 'reviewer-days' : 'participant-days';

    return `
        <div class="participant-row">
            <input type="text" placeholder="姓名" class="${nameClass}" value="${worker.name || ''}">
            <input type="text" placeholder="角色" class="${roleClass}" value="${worker.role || ''}">
            <input type="number" placeholder="预估天数" class="${daysClass}" step="0.5" min="0" value="${worker.estimated_days ?? ''}">
            <button type="button" class="remove-participant-btn" data-remove-row>×</button>
        </div>
    `;
}

export function createTaskFormController({ onSubmit }) {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    const titleNode = document.getElementById('taskModalTitle');
    const submitNode = document.getElementById('taskSubmitButton');
    const descriptionNode = document.getElementById('taskDescription');
    const participantsContainer = document.getElementById('participantsContainer');
    const reviewersContainer = document.getElementById('reviewersContainer');
    let mode = 'create';
    let editingTaskId = null;
    let originalCreatedAt = '';
    let editingTask = null;

    function setOpen(visible) {
        modal.classList.toggle('active', visible);
        modal.style.display = visible ? 'flex' : 'none';
        document.body.style.overflow = visible ? 'hidden' : '';
    }

    function resetRows() {
        participantsContainer.innerHTML = createParticipantRow('participant');
        reviewersContainer.innerHTML = createParticipantRow('reviewer');
    }

    function resetForm() {
        mode = 'create';
        editingTaskId = null;
        originalCreatedAt = '';
        editingTask = null;
        form.reset();
        resetRows();
        document.getElementById('iterationName').value = 'iteration-1';
        if (titleNode) {
            titleNode.textContent = '添加新任务';
        }
        if (submitNode) {
            submitNode.textContent = '添加任务';
        }
        if (descriptionNode) {
            descriptionNode.value = '';
        }
    }

    function collectWorkers(containerSelector, nameSelector, roleSelector, daysSelector, existingPeople = []) {
        return Array.from(document.querySelectorAll(`${containerSelector} .participant-row`))
            .map(row => ({
                name: row.querySelector(nameSelector)?.value.trim() || '',
                role: row.querySelector(roleSelector)?.value.trim() || '未分配',
                estimated_days: row.querySelector(daysSelector)?.value || 0,
                actual_days: 0
            }))
            .filter(worker => worker.name)
            .map(worker => {
                const existing = existingPeople.find(person => person.name === worker.name && person.role === worker.role);
                return {
                    ...worker,
                    actual_days: existing?.actual_days ?? 0
                };
            });
    }

    function buildPayload() {
        const existingParticipants = editingTask?.participants || [];
        const existingReviewers = editingTask?.reviewers || [];
        return normalizeTask({
            task_id: document.getElementById('taskId').value.trim(),
            title: document.getElementById('taskTitle').value.trim(),
            status: document.getElementById('taskStatus').value,
            priority: document.getElementById('taskPriority').value,
            iteration_name: document.getElementById('iterationName').value.trim() || 'iteration-1',
            description: document.getElementById('taskDescription').value.trim(),
            created_at: originalCreatedAt || new Date().toLocaleDateString(),
            participants: collectWorkers('#participantsContainer', '.participant-name', '.participant-role', '.participant-days', existingParticipants),
            reviewers: collectWorkers('#reviewersContainer', '.reviewer-name', '.reviewer-role', '.reviewer-days', existingReviewers)
        });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        const payload = buildPayload();
        await onSubmit({ mode, editingTaskId, payload });
    }

    function openCreate() {
        resetForm();
        setOpen(true);
        window.setTimeout(() => document.getElementById('taskId')?.focus(), 50);
    }

    function fillRows(container, type, people) {
        if (!people.length) {
            container.innerHTML = createParticipantRow(type);
            return;
        }

        container.innerHTML = people.map(person => createParticipantRow(type, person)).join('');
    }

    function openEdit(task) {
        resetForm();
        mode = 'edit';
        editingTaskId = task.task_id;
        originalCreatedAt = task.created_at || '';
        editingTask = task;
        if (titleNode) {
            titleNode.textContent = `编辑任务 ${task.task_id}`;
        }
        if (submitNode) {
            submitNode.textContent = '保存修改';
        }

        document.getElementById('taskId').value = task.task_id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskStatus').value = task.status;
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('iterationName').value = task.iteration_name || 'iteration-1';
        document.getElementById('taskDescription').value = task.description || '';
        fillRows(participantsContainer, 'participant', task.participants || []);
        fillRows(reviewersContainer, 'reviewer', task.reviewers || []);
        setOpen(true);
        window.setTimeout(() => document.getElementById('taskTitle')?.focus(), 50);
    }

    function close() {
        setOpen(false);
        resetForm();
    }

    form?.addEventListener('submit', handleSubmit);

    return {
        openCreate,
        openEdit,
        close,
        isOpen: () => modal.classList.contains('active'),
        appendParticipant: () => participantsContainer.insertAdjacentHTML('beforeend', createParticipantRow('participant')),
        appendReviewer: () => reviewersContainer.insertAdjacentHTML('beforeend', createParticipantRow('reviewer'))
    };
}
