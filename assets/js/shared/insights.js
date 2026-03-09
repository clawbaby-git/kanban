import {
    aggregateWorkDaysByRole,
    buildMemberWorkloads,
    calculateTaskDays,
    getTaskWorkers,
    getTaskHoursForPerson
} from './task-utils.js';

export function parseProjectTimeline(config) {
    const dates = [];
    const start = config?.date_range?.start;
    const end = config?.date_range?.end;
    if (!start || !end) {
        return { start: null, end: null, dates };
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        dates.push(date.toISOString().split('T')[0]);
    }

    return { start, end, dates };
}

export function buildAnalyticsSnapshot(tasks, config, nonTasks = []) {
    const teamMembers = (config?.resource_pool || []).map(person => person.name);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === '已完成').length;
    const totalDays = tasks.reduce((sum, task) => sum + calculateTaskDays(task), 0);

    return {
        totalTasks,
        completedTasks,
        completionRate: totalTasks ? (completedTasks / totalTasks) * 100 : 0,
        totalDays,
        avgDays: totalTasks ? totalDays / totalTasks : 0,
        teamMembers,
        teamCount: teamMembers.length,
        roleWorkDays: aggregateWorkDaysByRole(tasks, config?.resource_pool || []),
        ...buildMemberWorkloads(teamMembers, tasks, nonTasks)
    };
}

export function calculateHeatmapMatrix(tasks, members, dates, hoursPerDay = 8) {
    if (!dates.length || !members.length) {
        return [];
    }

    const workload = Object.fromEntries(
        members.map(person => [person, Object.fromEntries(dates.map(date => [date, 0]))])
    );

    tasks.forEach(task => {
        getTaskWorkers(task).forEach(worker => {
            if (!workload[worker.name] || !worker.estimated_days) {
                return;
            }

            const dailyHours = (Number(worker.estimated_days) * hoursPerDay) / dates.length;
            dates.forEach(date => {
                workload[worker.name][date] += dailyHours;
            });
        });
    });

    return members.flatMap((person, personIndex) =>
        dates.map((date, dayIndex) => [dayIndex, personIndex, workload[person][date]])
    );
}

export function getTasksForPerson(tasks, person) {
    return tasks.filter(task => getTaskWorkers(task).some(worker => worker.name === person));
}

export function getHeatmapTaskDetails(tasks, person, hoursPerDay = 8) {
    return getTasksForPerson(tasks, person).map(task => ({
        task,
        hours: getTaskHoursForPerson(task, person, hoursPerDay)
    }));
}

export function formatShortDateLabel(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return dateString;
    }
    return `${date.getMonth() + 1}/${date.getDate()}`;
}
