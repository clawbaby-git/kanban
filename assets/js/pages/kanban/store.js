import { PRIORITY_ORDER, STATUS_ORDER } from '../../shared/constants.js';
import { loadTasks, saveTasksToSession } from '../../shared/data-service.js';
import {
    getAssigneeNames,
    groupTasksByStatus,
    normalizeTask
} from '../../shared/task-utils.js';

const ITEMS_PER_PAGE = 50;

function createInitialState() {
    return {
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
}

const STATUS_DOM_KEY = {
    待办: 'todo',
    进行中: 'progress',
    已完成: 'done'
};

export function getStatusDomKey(status) {
    return STATUS_DOM_KEY[status] || STATUS_DOM_KEY[STATUS_ORDER[0]];
}

export function createKanbanStore() {
    const state = createInitialState();

    function resetPagination() {
        Object.values(state.pagination).forEach(item => {
            item.page = 1;
        });
    }

    function getFilteredTasks() {
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

    function syncPagination() {
        const groups = groupTasksByStatus(getFilteredTasks());
        STATUS_ORDER.forEach(status => {
            const key = getStatusDomKey(status);
            const totalPages = Math.max(1, Math.ceil((groups[status] || []).length / state.pagination[key].pageSize));
            if (state.pagination[key].page > totalPages) {
                state.pagination[key].page = totalPages;
            }
        });
    }

    function persist() {
        saveTasksToSession(state.allTasks);
    }

    async function init() {
        state.allTasks = await loadTasks({ preferSession: true });
        state.filteredTasks = [...state.allTasks];
        syncPagination();
        return state.allTasks;
    }

    function setSearchQuery(query) {
        state.searchQuery = query;
        resetPagination();
        syncPagination();
    }

    function setFilter(priority) {
        state.currentFilter = PRIORITY_ORDER.includes(priority) ? priority : 'all';
        resetPagination();
        syncPagination();
    }

    function setView(view) {
        state.currentView = view === 'group' ? 'group' : 'list';
    }

    function setPage(key, page) {
        const target = state.pagination[key];
        if (!target) {
            return;
        }

        target.page = Math.max(1, page);
        syncPagination();
    }

    function toggleGroup(priority) {
        if (state.collapsedGroups.has(priority)) {
            state.collapsedGroups.delete(priority);
        } else {
            state.collapsedGroups.add(priority);
        }
    }

    function getTaskById(taskId) {
        return state.allTasks.find(task => task.task_id === taskId) || null;
    }

    function hasTaskId(taskId, excludeTaskId = null) {
        return state.allTasks.some(task => task.task_id === taskId && task.task_id !== excludeTaskId);
    }

    function addTask(taskInput) {
        const task = normalizeTask(taskInput);
        state.allTasks.push(task);
        persist();
        syncPagination();
        return task;
    }

    function updateTask(taskId, taskInput) {
        const index = state.allTasks.findIndex(task => task.task_id === taskId);
        if (index === -1) {
            return null;
        }

        const original = state.allTasks[index];
        const updated = normalizeTask({
            ...original,
            ...taskInput,
            created_at: taskInput.created_at || original.created_at
        });
        state.allTasks[index] = updated;
        persist();
        syncPagination();
        return updated;
    }

    function deleteTask(taskId) {
        const index = state.allTasks.findIndex(task => task.task_id === taskId);
        if (index === -1) {
            return false;
        }

        state.allTasks.splice(index, 1);
        persist();
        syncPagination();
        return true;
    }

    function clearTransientViewState() {
        state.currentFilter = 'all';
        state.searchQuery = '';
        state.currentView = 'list';
        resetPagination();
        state.collapsedGroups.clear();
        syncPagination();
    }

    function getState() {
        return state;
    }

    return {
        init,
        getState,
        getFilteredTasks,
        setSearchQuery,
        setFilter,
        setView,
        setPage,
        toggleGroup,
        getTaskById,
        hasTaskId,
        addTask,
        updateTask,
        deleteTask,
        resetPagination,
        clearTransientViewState,
        syncPagination
    };
}
