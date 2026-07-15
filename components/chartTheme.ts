// Chart chrome for the dark dashboard surface, following the dataviz
// reference palette (dark mode steps, validated for #0d0d0d/#1a1a19).

export const CHART_COLORS = {
    surface: '#1a1a19',
    textPrimary: '#ffffff',
    textSecondary: '#c3c2b7',
    muted: '#898781',
    gridline: '#2c2c2a',
    axis: '#383835',

    series1: '#3987e5',   // blue — primary series (equity)
    buy: '#199e70',       // aqua — buy markers
    sell: '#e66767',      // red — sell markers
    context: '#898781',   // de-emphasis gray — context lines (price, cash)
}

export const timeScale = (unit: 'day' | 'hour' = 'day') => ({
    type: 'time' as const,
    time: { unit },
    grid: { color: CHART_COLORS.gridline },
    border: { color: CHART_COLORS.axis },
    ticks: { color: CHART_COLORS.muted, maxRotation: 0, autoSkipPadding: 16 },
})

export const linearScale = (title?: string) => ({
    type: 'linear' as const,
    grid: { color: CHART_COLORS.gridline },
    border: { color: CHART_COLORS.axis },
    ticks: { color: CHART_COLORS.muted },
    ...(title ? { title: { display: true, text: title, color: CHART_COLORS.muted } } : {}),
})

export const legendOptions = (display: boolean) => ({
    display,
    labels: {
        color: CHART_COLORS.textSecondary,
        usePointStyle: true,
        boxWidth: 8,
        boxHeight: 8,
    },
})
