export function createManagedChart(registry, container) {
    const chart = echarts.init(container);
    registry.push(chart);
    return chart;
}

export function disposeManagedCharts(registry) {
    registry.splice(0).forEach(chart => chart.dispose());
}

export function resizeManagedCharts(registry) {
    registry.forEach(chart => chart.resize());
}
