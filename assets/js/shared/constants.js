export const DATA_PATHS = Object.freeze({
    config: 'data/projects/xiyouji/config.json',
    tasks: 'data/projects/xiyouji/tasks.json',
    nonTasks: 'data/projects/xiyouji/non-tasks.json'
});

export const STORAGE_KEYS = Object.freeze({
    tasks: 'kanban_tasks'
});

export const STATUS_ORDER = Object.freeze(['待办', '进行中', '已完成']);
export const PRIORITY_ORDER = Object.freeze(['高', '中', '低']);

export const STATUS_LABELS = Object.freeze({
    待办: '待办',
    进行中: '进行中',
    已完成: '已完成',
    阻塞: '阻塞'
});

export const STATUS_ALIASES = Object.freeze({
    todo: '待办',
    in_progress: '进行中',
    done: '已完成',
    blocked: '阻塞',
    待办: '待办',
    进行中: '进行中',
    已完成: '已完成',
    阻塞: '阻塞'
});

export const STATUS_CLASS_MAP = Object.freeze({
    待办: 'status-todo',
    进行中: 'status-progress',
    已完成: 'status-done',
    阻塞: 'status-blocked'
});

export const PRIORITY_CLASS_MAP = Object.freeze({
    高: 'priority-high',
    中: 'priority-medium',
    低: 'priority-low'
});
