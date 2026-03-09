import { DATA_PATHS, STORAGE_KEYS } from './constants.js';
import { normalizeTaskList } from './task-utils.js';

export async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
}

export function readSessionTasks() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEYS.tasks);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        return normalizeTaskList(parsed.tasks || []);
    } catch (error) {
        console.warn('读取 SessionStorage 失败:', error);
        return null;
    }
}

export function saveTasksToSession(tasks) {
    try {
        const normalizedTasks = normalizeTaskList(tasks);
        sessionStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify({ tasks: normalizedTasks }));
        return true;
    } catch (error) {
        console.warn('写入 SessionStorage 失败:', error);
        return false;
    }
}

export function clearSessionTasks() {
    sessionStorage.removeItem(STORAGE_KEYS.tasks);
}

export async function loadTasks({ preferSession = true } = {}) {
    if (preferSession) {
        const sessionTasks = readSessionTasks();
        if (sessionTasks) {
            return sessionTasks;
        }
    }

    const data = await fetchJSON(DATA_PATHS.tasks);
    const tasks = normalizeTaskList(data.tasks || []);
    saveTasksToSession(tasks);
    return tasks;
}

export async function loadProjectData({
    includeConfig = true,
    includeNonTasks = false,
    preferSessionTasks = true
} = {}) {
    const [config, tasks, nonTasksData] = await Promise.all([
        includeConfig ? fetchJSON(DATA_PATHS.config) : Promise.resolve(null),
        loadTasks({ preferSession: preferSessionTasks }),
        includeNonTasks ? fetchJSON(DATA_PATHS.nonTasks).catch(() => ({ non_tasks: [] })) : Promise.resolve(null)
    ]);

    return {
        config,
        tasks,
        nonTasks: nonTasksData?.non_tasks || []
    };
}
