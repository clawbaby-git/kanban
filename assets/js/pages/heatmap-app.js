import { loadProjectData } from '../shared/data-service.js';
import {
    calculateHeatmapMatrix,
    formatShortDateLabel,
    getHeatmapTaskDetails,
    parseProjectTimeline
} from '../shared/insights.js';
import { getStatusClass } from '../shared/task-utils.js';
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
    const container = document.querySelector('.heatmap-card');
    if (container) {
        container.innerHTML = `<div class="error-message">${escapeHtml(message)}</div>`;
    }
}

function renderTaskList(person) {
    const taskDetails = getHeatmapTaskDetails(tasksData, person, HOURS_PER_DAY);
    if (!taskDetails.length) {
        return '<div class="no-tasks">该日期无分配任务</div>';
    }

    return `
        <ul class="task-list">
            ${taskDetails.map(({ task, hours }) => `
                <li class="task-item">
                    <h4>${escapeHtml(task.title)}</h4>
                    <p>${escapeHtml(task.description || '无描述')}</p>
                    <p>预计工时: ${hours.toFixed(1)} 小时</p>
                    <span class="task-status ${getStatusClass(task.status)}">${escapeHtml(task.status || '待办')}</span>
                </li>
            `).join('')}
        </ul>
    `;
}

function showModal(date, person, hours) {
    document.getElementById('modal-date').textContent = date;
    document.getElementById('modal-person').textContent = person;
    document.getElementById('modal-hours').textContent = hours.toFixed(1);
    document.getElementById('modal-tasks').innerHTML = renderTaskList(person);
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
                const taskList = getHeatmapTaskDetails(tasksData, person, HOURS_PER_DAY)
                    .map(({ task }) => `<br/>• ${escapeHtml(task.title)}`)
                    .join('') || '<br/>• 无任务';
                return `<strong>${date}</strong><br/>人员: ${person}<br/>工作时长: ${hours} 小时<br/>任务:${taskList}`;
            }
        },
        grid: {
            top: 16,
            left: 100,
            right: 40,
            bottom: 72,
            containLabel: false
        },
        xAxis: {
            type: 'category',
            data: dateRange.dates.map(formatShortDateLabel),
            splitArea: { show: true },
            axisLabel: { rotate: 38, fontSize: 11 }
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
            bottom: 10,
            textStyle: { color: '#435143' },
            pieces: [
                { min: 0, max: 0, label: '0h', color: '#c8cec6' },
                { min: 0.01, max: 6, label: '0-6h', color: '#67a57f' },
                { min: 6, max: 8, label: '6-8h', color: '#d6a35f' },
                { min: 8, label: '>8h', color: '#bd6256' }
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
                    shadowColor: 'rgba(31, 42, 31, 0.25)'
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
        tasksData = tasks;
        personPool = (config?.resource_pool || []).map(person => person.name);
        dateRange = parseProjectTimeline(config);
        heatmapData = calculateHeatmapMatrix(tasksData, personPool, dateRange.dates, HOURS_PER_DAY);
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
