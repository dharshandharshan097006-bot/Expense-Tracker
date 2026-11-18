/**
 * Expense Tracker System - Chart.js Visualizations Manager
 */

class ChartManager {
  static instances = {};

  /**
   * Helper to get theme-aware colors for Chart.js
   */
  static getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      textColor: isDark ? '#94a3b8' : '#64748b',
      textMain: isDark ? '#f1f5f9' : '#0f172a',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)',
      tooltipBg: isDark ? 'rgba(19, 27, 46, 0.95)' : 'rgba(15, 23, 42, 0.95)',
      tooltipBorder: isDark ? '#334155' : '#cbd5e1'
    };
  }

  /**
   * Safely destroy an existing chart instance
   */
  static destroyChart(chartKey) {
    if (this.instances[chartKey]) {
      this.instances[chartKey].destroy();
      delete this.instances[chartKey];
    }
  }

  /**
   * Render Dashboard Trends (Income vs Expense bar chart over last 6 months)
   */
  static renderDashboardTrendChart(canvasId, monthlyStats, currencySymbol) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const theme = this.getThemeColors();
    const labels = monthlyStats.map(s => s.monthLabel);
    const incomeData = monthlyStats.map(s => s.income);
    const expenseData = monthlyStats.map(s => s.expense);

    const ctx = canvas.getContext('2d');
    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            backgroundColor: '#10b981',
            borderRadius: 6,
            barPercentage: 0.65,
            categoryPercentage: 0.6
          },
          {
            label: 'Expenses',
            data: expenseData,
            backgroundColor: '#f43f5e',
            borderRadius: 6,
            barPercentage: 0.65,
            categoryPercentage: 0.6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: theme.textColor,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16,
              font: { family: 'Inter', size: 12, weight: '500' }
            }
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            padding: 12,
            titleFont: { family: 'Inter', size: 13, weight: '600' },
            bodyFont: { family: 'Inter', size: 12 },
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                label += `${currencySymbol}${context.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: theme.textColor,
              font: { family: 'Inter', size: 12 }
            }
          },
          y: {
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textColor,
              font: { family: 'Inter', size: 12 },
              callback: function(value) {
                return currencySymbol + (value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value);
              }
            }
          }
        }
      }
    });
  }

  /**
   * Render Category Donut Chart
   */
  static renderCategoryDonutChart(canvasId, categoryData, currencySymbol, emptyText = 'No Expenses Recorded') {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const theme = this.getThemeColors();
    const ctx = canvas.getContext('2d');

    if (!categoryData || categoryData.length === 0) {
      // Draw placeholder empty state
      this.instances[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: [emptyText],
          datasets: [{
            data: [1],
            backgroundColor: [theme.gridColor],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '76%',
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          }
        }
      });
      return;
    }

    const labels = categoryData.map(c => c.name);
    const values = categoryData.map(c => c.total);
    const colors = categoryData.map(c => c.color || '#6366f1');

    this.instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#131b2e' : '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            display: false // We render a customized rich legend in DOM for best UX
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            padding: 12,
            titleFont: { family: 'Inter', size: 13, weight: '600' },
            bodyFont: { family: 'Inter', size: 12 },
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const val = context.parsed;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return ` ${currencySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Render Payment Method Breakdown Chart (Donut / Polar)
   */
  static renderPaymentMethodChart(canvasId, paymentData, currencySymbol) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const theme = this.getThemeColors();
    const ctx = canvas.getContext('2d');

    const labels = Object.keys(paymentData);
    const values = Object.values(paymentData);

    const palette = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

    this.instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: palette.slice(0, labels.length),
          borderWidth: 2,
          borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#131b2e' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: theme.textColor,
              font: { family: 'Inter', size: 11 },
              padding: 10,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: function(context) {
                return ` ${currencySymbol}${context.parsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Render Net Savings / Cash Flow Area Chart (Reports View)
   */
  static renderCashFlowAreaChart(canvasId, monthlyStats, currencySymbol) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const theme = this.getThemeColors();
    const ctx = canvas.getContext('2d');

    const labels = monthlyStats.map(s => s.monthLabel);
    const netSavings = monthlyStats.map(s => s.income - s.expense);

    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.01)');

    this.instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Net Savings',
          data: netSavings,
          fill: true,
          backgroundColor: gradient,
          borderColor: '#6366f1',
          borderWidth: 3,
          tension: 0.35,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: function(context) {
                const val = context.parsed.y;
                const sign = val >= 0 ? '+' : '';
                return ` Net Savings: ${sign}${currencySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: theme.textColor,
              font: { family: 'Inter', size: 12 }
            }
          },
          y: {
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textColor,
              font: { family: 'Inter', size: 12 },
              callback: function(value) {
                return (value >= 0 ? '' : '-') + currencySymbol + Math.abs(value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value);
              }
            }
          }
        }
      }
    });
  }

  /**
   * Redraw all active charts on theme change
   */
  static refreshAllCharts() {
    // Triggers will be handled by app.js re-rendering the active view
  }
}
