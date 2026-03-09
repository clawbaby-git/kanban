import {
    PRIORITY_CLASS_MAP,
    PRIORITY_ORDER,
    STATUS_ALIASES,
    STATUS_CLASS_MAP,
    STATUS_ORDER
} from './constants.js';

export function toNumber(value) {
    const num = Number.parseFloat(value);
    return Number.isFinite(num) ? num : 0;
}

export function normalizeStatus(status) {
    return STATUS_ALIASES[status] || STATUS_ORDER[0];
}

export function normalizePriority(priority) {
    return PRIORITY_ORDER.includes(priority) ? priority : PRIORITY_ORDER[PRIORITY_ORDER.length - 1];
}

export function normalizeWorker(worker = {}) {
    return {
        name: String(worker.name || '').trim(),
        role: String(worker.role || '未分配').trim() || '未分配',
        estimated_days: toNumber(worker.estimated_days),
        actual_days: toNumber(worker.actual_days)
    };
}

export function normalizeTask(task = {}) {
    return {
        task_id: String(task.task_id || '').trim(),
        title: String(task.title || '').trim(),
        status: normalizeStatus(task.status),
        priority: normalizePriority(task.priority),
        iteration_name: String(task.iteration_name || 'iteration-1').trim() || 'iteration-1',
        description: String(task.description || '').trim(),
        created_at: task.created_at || '',
        participants: Array.isArray(task.participants) ? task.participants.map(normalizeWorker).filter(worker => worker.name) : [],
        reviewers: Array.isArray(task.reviewers) ? task.reviewers.map(normalizeWorker).filter(worker => worker.name) : []
    };
}

export function normalizeTaskList(tasks) {
    if (!Array.isArray(tasks)) {
        return [];
    }

    return tasks
        .map(normalizeTask)
        .filter(task => task.task_id && task.title);
}

export function getTaskWorkers(task = {}) {
    return [...(task.participants || []), ...(task.reviewers || [])];
}

export function calculateTaskDays(task = {}) {
    return getTaskWorkers(task).reduce((sum, worker) => sum + toNumber(worker.estimated_days), 0);
}

export function getTaskHoursForPerson(task, person, hoursPerDay = 8) {
    const worker = getTaskWorkers(task).find(item => item.name === person);
    return worker ? toNumber(worker.estimated_days) * hoursPerDay : 0;
}

export function getAssigneeNames(task = {}) {
    return [...new Set(getTaskWorkers(task).map(worker => worker.name).filter(Boolean))];
}

export function getInitials(name) {
    return name ? String(name).trim().charAt(0) : '?';
}

export function getPriorityClass(priority) {
    return PRIORITY_CLASS_MAP[priority] || PRIORITY_CLASS_MAP[PRIORITY_ORDER[PRIORITY_ORDER.length - 1]];
}

export function getStatusClass(status) {
    return STATUS_CLASS_MAP[normalizeStatus(status)] || STATUS_CLASS_MAP[STATUS_ORDER[0]];
}

export function groupTasksByStatus(tasks) {
    return STATUS_ORDER.reduce((groups, status) => {
        groups[status] = tasks.filter(task => task.status === status);
        return groups;
    }, {});
}

export function groupTasksByPriority(tasks) {
    return PRIORITY_ORDER.reduce((groups, priority) => {
        groups[priority] = tasks.filter(task => task.priority === priority);
        return groups;
    }, {});
}

export function aggregateWorkDaysByRole(tasks, resourcePool = []) {
    const roleWorkDays = {};
    const rolePersonMap = {};

    resourcePool.forEach(person => {
        const roles = Array.isArray(person.roles) ? person.roles : [];
        rolePersonMap[person.name] = roles;
        roles.forEach(role => {
            roleWorkDays[role] = roleWorkDays[role] || 0;
        });
    });

    tasks.forEach(task => {
        getTaskWorkers(task).forEach(worker => {
            const roles = rolePersonMap[worker.name] || [];
            if (!roles.length) {
                return;
            }

            const daysPerRole = toNumber(worker.estimated_days) / roles.length;
            roles.forEach(role => {
                roleWorkDays[role] = (roleWorkDays[role] || 0) + daysPerRole;
            });
        });
    });

    return roleWorkDays;
}

export function buildMemberWorkloads(teamMembers = [], tasks = [], nonTasks = []) {
    const taskHours = Object.fromEntries(teamMembers.map(name => [name, 0]));
    const nonTaskHours = Object.fromEntries(teamMembers.map(name => [name, 0]));
    const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

    tasks.forEach(task => {
        getTaskWorkers(task).forEach(worker => {
            if (hasOwn(taskHours, worker.name)) {
                taskHours[worker.name] += toNumber(worker.estimated_days);
            }
        });
    });

    nonTasks.forEach(item => {
        if (hasOwn(nonTaskHours, item.user)) {
            nonTaskHours[item.user] += toNumber(item.estimated_days);
        }
    });

    return { taskHours, nonTaskHours };
}
