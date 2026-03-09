import { loadProjectData } from '../shared/data-service.js';
import { getStatusClass, getTaskHoursForPerson } from '../shared/task-utils.js';
import { escapeHtml } from '../shared/text-utils.js';

const HOURS_PER_DAY = 8;
let chartInstance = null;
let tasksData = [];
let personPool = [];
let dateRange = { start: null, end: null, dates: [] };
let heatmapData = [];

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function showError(message) {
    const container = document.querySelector('.heatmap-container');
    if (container) {
        container.innerHTML = `<div class="error-message">${escapeHtml(message)}</div>`;
    }
}

function parseConfig(config) {
    const dates = [];
    const startDate = new Date(config.date_range.start);
    const endDate = new Date(config.date_range.end);

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        dates.push(date.toISOString().split('T')[0]);
    }

    return {
        personPool: (config.resource_pool || []).map(person => person.name),
        dateRange: {
            start: config.date_range.start,
            end: config.date_range.end,
            dates
        }
    };
}

function calculateWorkload(tasks, members, dates) {
    const workload = Object.fromEntries(
        members.map(person => [person, Object.fromEntries(dates.map(date => [date, 0]))])
    );

    tasks.forEach(task => {
        [...(task.participants || []), ...(task.reviewers || [])].forEach(worker => {
            if (!workload[worker.name] || !worker.estimated_days) {
                return;
            }

            const dailyHours = (Number(worker.estimated_days) * HOURS_PER_DAY) / dates.length;
            dates.forEach(date => {
                workload[worker.name][date] += dailyHours;
            });
        });
    });

    return members.flatMap((person, personIndex) =>
        dates.map((date, dayIndex) => [dayIndex, personIndex, workload[person][date]])
    );
}

function getTasksForPerson(_date, person) {
    return tasksData.filter(task => {
        const workers = [...(task.participants || []), ...(task.reviewers || [])];
        return workers.some(worker => worker.name === person);
    });
}

function getStatusText(status) {
    return status || '待办';
}

function renderTaskList(person, date) {
    const tasks = getTasksForPerson(date, person);
    if (!tasks.length) {
        return '<div class="no-tasks">该日期无分配任务</div>';
    }

    return `
        <ul class="task-list">
            ${tasks.map(task => `
                <li class="task-item">
                    <h4>${escapeHtml(task.title)}</h4>
                    <p>${escapeHtml(task.description || '无描述')}</p>
                    <p>预计工时: ${getTaskHoursForPerson(task, person, HOURS_PER_DAY).toFixed(1)} 小时</p>
                    <span class="task-status ${getStatusClass(task.status)}">${escapeHtml(getStatusText(task.status))}</span>
                </li>
            `).join('')}
        </ul>
    `;
}

function showModal(date, person, hours) {
    document.getElementById('modal-date').textContent = date;
    document.getElementById('modal-person').textContent = person;
    document.getElementById('modal-hours').textContent = hours.toFixed(1);
    document.getElementById('modal-tasks').innerHTML = renderTaskList(person, date);
    document.getElementById('task-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('task-modal').classList.remove('active');
}

function initChart() {
    const chartDom = document.getElementById('heatmap-chart');
    if (chartInstance) {
        chartInstance.dispose();
    }

    chartInstance = echarts.init(chartDom);
    chartInstance.setOption({
        tooltip: {
            position: 'top',
            formatter(params) {
                const date = dateRange.dates[params.data[0]];
                const person = personPool[params.data[1]];
                const hours = params.data[2].toFixed(1);
                const tasks = getTasksForPerson(date, person);
                const taskList = tasks.length
                    ? tasks.map(task => `<br/>• ${escapeHtml(task.title)}`).join('')
                    : '<br/>• 无任务';
                return `<strong>${date}</strong><br/>人员: ${person}<br/>工作时长: ${hours} 小时<br/>任务:${taskList}`;
            }
        },
        grid: {
            top: 10,
            left: 100,
            right: 50,
            bottom: 60,
            containLabel: false
        },
        xAxis: {
            type: 'category',
            data: dateRange.dates.map(date => {
                const current = new Date(date);
                return `${current.getMonth() + 1}/${current.getDate()}`;
            }),
            splitArea: { show: true },
            axisLabel: { rotate: 45, fontSize: 11 }
        },
        yAxis: {
            type: 'category',
            data: personPool,
            splitArea: { show: true },
            axisLabel: { fontSize: 12 }
        },
        visualMap: {
            min: 0,
            max: 10,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 0,
            pieces: [
                { min: 0, max: 0, label: '0h', color: '#9e9e9e' },
                { min: 0.01, max: 6, label: '0-6h', color: '#4caf50' },
                { min: 6, max: 8, label: '6-8h', color: '#ff9800' },
                { min: 8, label: '>8h', color: '#f44336' }
            ]
        },
        series: [{
            name: '工作负荷',
            type: 'heatmap',
            data: heatmapData,
            label: { show: false },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }]
    });

    chartInstance.on('click', params => {
        if (params.componentType !== 'series') {
            return;
        }

        const date = dateRange.dates[params.data[0]];
        const person = personPool[params.data[1]];
        showModal(date, person, params.data[2]);
    });
}

async function init() {
    showLoading(true);
    try {
        const { config, tasks } = await loadProjectData({
            includeConfig: true,
            includeNonTasks: false,
            preferSessionTasks: true
        });
        const parsed = parseConfig(config);
        tasksData = tasks;
        personPool = parsed.personPool;
        dateRange = parsed.dateRange;
        heatmapData = calculateWorkload(tasksData, personPool, dateRange.dates);
        initChart();
        showLoading(false);
    } catch (error) {
        console.error('加载热力图失败:', error);
        showLoading(false);
        showError(`数据加载失败: ${error.message || '未知错误'}`);
    }
}

window.addEventListener('resize', () => {
    chartInstance?.resize();
});

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('[data-action="close-heatmap-modal"]')?.addEventListener('click', closeModal);
    document.getElementById('task-modal')?.addEventListener('click', event => {
        if (event.target === event.currentTarget) {
            closeModal();
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeModal();
        }
    });
    init();
});
