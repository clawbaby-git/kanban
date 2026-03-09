import { loadProjectData } from '../shared/data-service.js';
import {
    aggregateWorkDaysByRole,
    buildMemberWorkloads,
    calculateTaskDays
} from '../shared/task-utils.js';

const charts = [];

function registerChart(chart) {
    charts.push(chart);
    return chart;
}

function disposeCharts() {
    charts.splice(0).forEach(chart => chart.dispose());
}

function initRoleDistributionChart(roleWorkDays) {
    const container = document.getElementById('role-chart-container');
    container.innerHTML = '';

    const data = Object.entries(roleWorkDays)
        .filter(([, days]) => days > 0)
        .map(([role, days]) => ({ name: role, value: Number(days.toFixed(1)) }));

    if (!data.length) {
        container.innerHTML = '<div class="error-message">暂无角色工时数据</div>';
        return;
    }

    const chart = registerChart(echarts.init(container));
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
            bottom: '5%',
            left: 'center',
            type: 'scroll',
            textStyle: { fontSize: 12 }
        },
        color: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'],
        series: [{
            name: '角色工时',
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '45%'],
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
            labelLine: {
                show: true,
                length: 15,
                length2: 10,
                smooth: true
            },
            emphasis: {
                label: {
                    show: true,
                    fontSize: 14,
                    fontWeight: 'bold'
                },
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            },
            data
        }]
    });
}

function initWorkloadChart(teamMembers, taskHours, nonTaskHours) {
    const container = document.getElementById('workload-chart-container');
    container.innerHTML = '';

    const taskSeries = teamMembers.map(name => Number((taskHours[name] || 0).toFixed(1)));
    const nonTaskSeries = teamMembers.map(name => Number((nonTaskHours[name] || 0).toFixed(1)));
    const chart = registerChart(echarts.init(container));

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
                rotate: teamMembers.length > 6 ? 30 : 0
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
                barWidth: '50%',
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#667eea' },
                        { offset: 1, color: '#764ba2' }
                    ])
                },
                data: taskSeries
            },
            {
                name: '非任务工时',
                type: 'bar',
                stack: 'total',
                barWidth: '50%',
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#f5af19' },
                        { offset: 1, color: '#f12711' }
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
                    color: '#333'
                }
            }
        ],
        animationDuration: 1000,
        animationEasing: 'elasticOut'
    });
}

function renderError(message) {
    document.getElementById('total-tasks').textContent = '--';
    document.getElementById('completion-rate').textContent = '--';
    document.getElementById('avg-hours').textContent = '--';
    document.getElementById('team-count').textContent = '--';
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
        disposeCharts();
        const { config, tasks, nonTasks } = await loadProjectData({
            includeConfig: true,
            includeNonTasks: true,
            preferSessionTasks: true
        });

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.status === '已完成').length;
        const completionRate = totalTasks ? ((completedTasks / totalTasks) * 100).toFixed(1) : '0.0';
        const totalDays = tasks.reduce((sum, task) => sum + calculateTaskDays(task), 0);
        const avgDays = totalTasks ? (totalDays / totalTasks).toFixed(1) : '0.0';
        const teamMembers = (config?.resource_pool || []).map(person => person.name);

        document.getElementById('total-tasks').textContent = totalTasks;
        document.getElementById('completion-rate').textContent = `${completionRate}%`;
        document.getElementById('avg-hours').textContent = `${avgDays}天`;
        document.getElementById('team-count').textContent = teamMembers.length;

        initRoleDistributionChart(aggregateWorkDaysByRole(tasks, config?.resource_pool || []));
        const { taskHours, nonTaskHours } = buildMemberWorkloads(teamMembers, tasks, nonTasks);
        initWorkloadChart(teamMembers, taskHours, nonTaskHours);
    } catch (error) {
        console.error('加载分析页失败:', error);
        renderError(error.message || '未知错误');
    }
}

window.addEventListener('resize', () => {
    charts.forEach(chart => chart.resize());
});

document.addEventListener('DOMContentLoaded', init);
