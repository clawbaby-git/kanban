import { createManagedChart, disposeManagedCharts, resizeManagedCharts } from '../shared/chart-utils.js';
import { loadProjectData } from '../shared/data-service.js';
import { buildAnalyticsSnapshot } from '../shared/insights.js';

const charts = [];

function setText(id, value) {
    const node = document.getElementById(id);
    if (node) {
        node.textContent = value;
    }
}

function renderRoleDistributionChart(roleWorkDays) {
    const container = document.getElementById('role-chart-container');
    container.innerHTML = '';

    const data = Object.entries(roleWorkDays)
        .filter(([, days]) => days > 0)
        .map(([role, days]) => ({ name: role, value: Number(days.toFixed(1)) }));

    if (!data.length) {
        container.innerHTML = '<div class="error-message">暂无角色工时数据</div>';
        return;
    }

    const chart = createManagedChart(charts, container);
    chart.setOption({
        tooltip: {
            trigger: 'item',
            formatter(params) {
                const total = data.reduce((sum, item) => sum + item.value, 0);
                const percentage = total ? ((params.value / total) * 100).toFixed(1) : '0.0';
                return `${params.name}<br/>工时: ${params.value}天<br/>占比: ${percentage}%`;
            }
        },
        legend: {
            orient: 'horizontal',
            bottom: '4%',
            left: 'center',
            type: 'scroll',
            textStyle: { fontSize: 12 }
        },
        color: ['#2f6b55', '#c07a3d', '#517664', '#d1a05e', '#8da18f', '#5c7a6a'],
        series: [{
            name: '角色工时',
            type: 'pie',
            radius: ['38%', '68%'],
            center: ['50%', '44%'],
            avoidLabelOverlap: true,
            itemStyle: {
                borderRadius: 10,
                borderColor: '#fff',
                borderWidth: 2
            },
            label: {
                show: true,
                position: 'outside',
                formatter: '{b}: {d}%',
                fontSize: 12
            },
            emphasis: {
                label: {
                    show: true,
                    fontSize: 14,
                    fontWeight: 'bold'
                }
            },
            data
        }]
    });
}

function renderWorkloadChart(teamMembers, taskHours, nonTaskHours) {
    const container = document.getElementById('workload-chart-container');
    container.innerHTML = '';

    const taskSeries = teamMembers.map(name => Number((taskHours[name] || 0).toFixed(1)));
    const nonTaskSeries = teamMembers.map(name => Number((nonTaskHours[name] || 0).toFixed(1)));
    const chart = createManagedChart(charts, container);

    chart.setOption({
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter(params) {
                const [taskItem, nonTaskItem] = params;
                const total = taskItem.value + nonTaskItem.value;
                return `${taskItem.axisValue}<br/>任务工时: ${taskItem.value.toFixed(1)}天<br/>非任务工时: ${nonTaskItem.value.toFixed(1)}天<br/>合计: ${total.toFixed(1)}天`;
            }
        },
        legend: {
            data: ['任务工时', '非任务工时'],
            top: 10,
            textStyle: { fontSize: 12 }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: 60,
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: teamMembers,
            axisLabel: {
                fontSize: 12,
                rotate: teamMembers.length > 6 ? 24 : 0
            }
        },
        yAxis: {
            type: 'value',
            name: '工时(天)',
            axisLabel: { fontSize: 12 }
        },
        series: [
            {
                name: '任务工时',
                type: 'bar',
                stack: 'total',
                barWidth: '52%',
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#2f6b55' },
                        { offset: 1, color: '#224d3e' }
                    ])
                },
                data: taskSeries
            },
            {
                name: '非任务工时',
                type: 'bar',
                stack: 'total',
                barWidth: '52%',
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#d4a15f' },
                        { offset: 1, color: '#b7742f' }
                    ])
                },
                data: nonTaskSeries,
                label: {
                    show: true,
                    position: 'top',
                    formatter(params) {
                        const total = taskSeries[params.dataIndex] + nonTaskSeries[params.dataIndex];
                        return total > 0 ? `${total.toFixed(1)}天` : '';
                    },
                    fontSize: 11,
                    color: '#2c332c'
                }
            }
        ],
        animationDuration: 700
    });
}

function renderError(message) {
    setText('total-tasks', '--');
    setText('completion-rate', '--');
    setText('avg-hours', '--');
    setText('team-count', '--');
    document.getElementById('role-chart-container').innerHTML = `<div class="error-message">图表加载失败: ${message}</div>`;
    document.getElementById('workload-chart-container').innerHTML = `<div class="error-message">图表加载失败: ${message}</div>`;

    const statsPanel = document.getElementById('stats-panel');
    if (!statsPanel.querySelector('.error-message')) {
        const errorNode = document.createElement('div');
        errorNode.className = 'error-message';
        errorNode.textContent = `统计数据加载失败: ${message}`;
        statsPanel.appendChild(errorNode);
    }
}

async function init() {
    try {
        disposeManagedCharts(charts);
        const { config, tasks, nonTasks } = await loadProjectData({
            includeConfig: true,
            includeNonTasks: true,
            preferSessionTasks: true
        });
        const snapshot = buildAnalyticsSnapshot(tasks, config, nonTasks);

        setText('total-tasks', String(snapshot.totalTasks));
        setText('completion-rate', `${snapshot.completionRate.toFixed(1)}%`);
        setText('avg-hours', `${snapshot.avgDays.toFixed(1)}天`);
        setText('team-count', String(snapshot.teamCount));

        renderRoleDistributionChart(snapshot.roleWorkDays);
        renderWorkloadChart(snapshot.teamMembers, snapshot.taskHours, snapshot.nonTaskHours);
    } catch (error) {
        console.error('加载分析页失败:', error);
        renderError(error.message || '未知错误');
    }
}

window.addEventListener('resize', () => resizeManagedCharts(charts));
document.addEventListener('DOMContentLoaded', init);
