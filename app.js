/**
 * Expense Tracker System - Main Application Controller
 */

class AppController {
  constructor() {
    this.currentView = 'dashboard';
    this.selectedTxIds = new Set();
    this.activeCatTab = 'expense';
    this.deleteActionCallback = null;
    this.searchDebounceTimer = null;

    // Color Swatches Palette for Category Modal
    this.colorPalette = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
      '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', '#f97316', 
      '#a855f7', '#0284c7', '#84cc16', '#64748b'
    ];
  }

  /**
   * Application Entry Point
   */
  init() {
    this.applySettingsThemeAndCurrency();
    this.bindEvents();
    this.populateStaticDropdowns();
    this.navigateTo('dashboard');
    this.refreshIcons();
  }

  /**
   * Re-render Lucide SVG icons across the DOM
   */
  refreshIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Currency Formatting Helper
   */
  formatCurrency(amount) {
    const settings = StorageManager.getSettings();
    const symbol = settings.currencySymbol || '$';
    const num = Math.abs(parseFloat(amount) || 0);
    return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Date Formatting Helper
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch (e) {}
    return dateStr;
  }

  /**
   * Month Key Helpers (YYYY-MM)
   */
  getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  getLastMonthKey() {
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Apply Theme and Currency Settings
   */
  applySettingsThemeAndCurrency() {
    const settings = StorageManager.getSettings();
    
    // Theme
    document.documentElement.setAttribute('data-theme', settings.theme || 'light');
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    if (settings.theme === 'dark') {
      if (themeIcon) themeIcon.setAttribute('data-lucide', 'sun');
      if (themeText) themeText.textContent = 'Light Mode';
    } else {
      if (themeIcon) themeIcon.setAttribute('data-lucide', 'moon');
      if (themeText) themeText.textContent = 'Dark Mode';
    }

    // Currency Labels
    const currObj = SUPPORTED_CURRENCIES.find(c => c.code === settings.currency) || SUPPORTED_CURRENCIES[0];
    const sidebarLabel = document.getElementById('sidebarCurrencyLabel');
    if (sidebarLabel) sidebarLabel.textContent = `${currObj.code} (${currObj.symbol})`;

    // Prefixes in Modals
    const prefixes = ['txCurrencyPrefix', 'budgetCurrencyPrefix', 'settingsCurrencyPrefix'];
    prefixes.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = currObj.symbol;
    });

    // Current Header Month Text
    const now = new Date();
    const monthName = now.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    const headerMonth = document.getElementById('headerPeriodText');
    if (headerMonth) headerMonth.textContent = monthName;
  }

  /**
   * Populate Static Dropdown Selections
   */
  populateStaticDropdowns() {
    // Currency Select in Settings
    const currSelect = document.getElementById('settingsCurrencySelect');
    if (currSelect) {
      currSelect.innerHTML = SUPPORTED_CURRENCIES.map(c => 
        `<option value="${c.code}" ${c.code === StorageManager.getSettings().currency ? 'selected' : ''}>
          ${c.name}
        </option>`
      ).join('');
    }

    // Default Overall Budget in Settings
    const budgetInput = document.getElementById('settingsMonthlyBudgetInput');
    if (budgetInput) {
      budgetInput.value = StorageManager.getSettings().monthlyBudget || 3500;
    }

    // Color Swatches in Category Modal
    const swatchesContainer = document.getElementById('colorSwatchesContainer');
    if (swatchesContainer) {
      swatchesContainer.innerHTML = this.colorPalette.map((col, idx) => `
        <div class="color-swatch-item ${idx === 0 ? 'selected' : ''}" 
             style="background-color: ${col};" 
             data-color="${col}"></div>
      `).join('');
    }

    // Icon Choices in Category Modal
    const iconContainer = document.getElementById('iconSelectorContainer');
    if (iconContainer) {
      iconContainer.innerHTML = CATEGORY_ICONS.map((ico, idx) => `
        <button type="button" class="icon-btn-choice ${idx === 0 ? 'selected' : ''}" data-icon="${ico}">
          <i data-lucide="${ico}"></i>
        </button>
      `).join('');
    }
  }

  /**
   * Navigation Controller (SPA View Switching)
   */
  navigateTo(viewName) {
    this.currentView = viewName;

    // Update Sidebar Active Links
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
      if (el.getAttribute('data-view') === viewName) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Hide all view sections and show the active one
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const activeSec = document.getElementById(`view-${viewName}`);
    if (activeSec) {
      activeSec.classList.add('active');
    }

    // Update Header Title
    const heading = document.getElementById('pageHeading');
    const subHeading = document.getElementById('pageSubHeading');
    const titles = {
      dashboard: { title: 'Dashboard', sub: 'Financial overview & recent performance' },
      transactions: { title: 'Transactions', sub: 'Comprehensive record of all income and expenses' },
      income: { title: 'Income Streams', sub: 'Monitor your salary, side gigs, and revenue' },
      expenses: { title: 'Expenses & Spending', sub: 'Analyze, categorize, and control your costs' },
      budgets: { title: 'Monthly Budgets', sub: 'Category budgets & spending limits' },
      categories: { title: 'Categories', sub: 'Manage expense and income tags' },
      reports: { title: 'Analytics & Reports', sub: 'Long-term trends and financial health score' }
    };

    if (titles[viewName]) {
      if (heading) heading.textContent = titles[viewName].title;
      if (subHeading) subHeading.textContent = titles[viewName].sub;
    }

    // Close mobile menu if opened
    const sidebar = document.getElementById('appSidebar');
    if (sidebar) sidebar.classList.remove('open');

    // Render corresponding view data
    this.renderCurrentView();
  }

  /**
   * Dispatch view render
   */
  renderCurrentView() {
    switch (this.currentView) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'transactions':
        this.renderTransactions();
        break;
      case 'income':
        this.renderIncomeView();
        break;
      case 'expenses':
        this.renderExpensesView();
        break;
      case 'budgets':
        this.renderBudgetsView();
        break;
      case 'categories':
        this.renderCategoriesView();
        break;
      case 'reports':
        this.renderReportsView();
        break;
    }
    this.refreshIcons();
  }

  // =========================================================================
  // 1. DASHBOARD VIEW RENDERER
  // =========================================================================
  renderDashboard() {
    const transactions = StorageManager.getTransactions();
    const currentMonth = this.getCurrentMonthKey();
    const lastMonth = this.getLastMonthKey();
    const settings = StorageManager.getSettings();
    const currSym = settings.currencySymbol || '$';

    // 1. Calculations for KPIs
    let allTimeIncome = 0;
    let allTimeExpense = 0;
    let currentMonthIncome = 0;
    let currentMonthExpense = 0;
    let lastMonthIncome = 0;
    let lastMonthExpense = 0;

    transactions.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      const tMonth = t.date ? t.date.slice(0, 7) : '';

      if (t.type === 'income') {
        allTimeIncome += amt;
        if (tMonth === currentMonth) currentMonthIncome += amt;
        if (tMonth === lastMonth) lastMonthIncome += amt;
      } else {
        allTimeExpense += amt;
        if (tMonth === currentMonth) currentMonthExpense += amt;
        if (tMonth === lastMonth) lastMonthExpense += amt;
      }
    });

    const totalBalance = allTimeIncome - allTimeExpense;
    const netSavingsCurrentMonth = currentMonthIncome - currentMonthExpense;
    const savingsRate = currentMonthIncome > 0 
      ? Math.max(0, ((netSavingsCurrentMonth / currentMonthIncome) * 100)).toFixed(1)
      : 0;

    // KPI Elements
    const kpiBalance = document.getElementById('kpiTotalBalance');
    if (kpiBalance) kpiBalance.textContent = (totalBalance >= 0 ? '' : '-') + this.formatCurrency(totalBalance);

    const kpiInc = document.getElementById('kpiMonthlyIncome');
    if (kpiInc) kpiInc.textContent = this.formatCurrency(currentMonthIncome);

    const kpiExp = document.getElementById('kpiMonthlyExpenses');
    if (kpiExp) kpiExp.textContent = this.formatCurrency(currentMonthExpense);

    const kpiSav = document.getElementById('kpiSavingsRate');
    if (kpiSav) kpiSav.textContent = `${savingsRate}%`;

    const kpiSavAmt = document.getElementById('kpiSavingsAmount');
    if (kpiSavAmt) kpiSavAmt.textContent = `${netSavingsCurrentMonth >= 0 ? '+' : ''}${this.formatCurrency(netSavingsCurrentMonth)} net`;

    // Trend percentage indicators
    const incBadge = document.getElementById('kpiIncomeChangeBadge');
    if (incBadge) {
      if (lastMonthIncome > 0) {
        const diff = ((currentMonthIncome - lastMonthIncome) / lastMonthIncome) * 100;
        incBadge.innerHTML = `<i data-lucide="${diff >= 0 ? 'trending-up' : 'trending-down'}"></i> ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
        incBadge.className = `badge-trend ${diff >= 0 ? 'up-good' : 'neutral'}`;
      } else {
        incBadge.innerHTML = `<i data-lucide="minus"></i> New`;
        incBadge.className = 'badge-trend neutral';
      }
    }

    const expBadge = document.getElementById('kpiExpenseChangeBadge');
    if (expBadge) {
      if (lastMonthExpense > 0) {
        const diff = ((currentMonthExpense - lastMonthExpense) / lastMonthExpense) * 100;
        expBadge.innerHTML = `<i data-lucide="${diff <= 0 ? 'trending-down' : 'trending-up'}"></i> ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
        expBadge.className = `badge-trend ${diff <= 0 ? 'down-good' : 'up-bad'}`;
      } else {
        expBadge.innerHTML = `<i data-lucide="minus"></i> Steady`;
        expBadge.className = 'badge-trend neutral';
      }
    }

    // 2. Charts
    // Monthly 6-month trend
    const monthlyStats = this.computeMonthlyStats(6);
    ChartManager.renderDashboardTrendChart('dashboardTrendChart', monthlyStats, currSym);

    // Current month expense by category donut chart
    const categorySpending = this.computeCategoryTotals('expense', currentMonth);
    ChartManager.renderCategoryDonutChart('dashboardCategoryChart', categorySpending, currSym, 'No Expenses This Month');
    this.renderCustomLegend('dashboardCategoryLegend', categorySpending, currSym);

    // 3. Budgets mini progress list
    this.renderDashboardBudgets(currentMonth);

    // 4. Recent transactions list
    this.renderDashboardRecentTransactions();
  }

  /**
   * Compute monthly stats for the last N months
   */
  computeMonthlyStats(numMonths = 6) {
    const transactions = StorageManager.getTransactions();
    const stats = [];
    const now = new Date();

    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mLabel = d.toLocaleString(undefined, { month: 'short' });

      let inc = 0;
      let exp = 0;

      transactions.forEach(t => {
        if (t.date && t.date.slice(0, 7) === mKey) {
          const amt = parseFloat(t.amount) || 0;
          if (t.type === 'income') inc += amt;
          else exp += amt;
        }
      });

      stats.push({
        monthKey: mKey,
        monthLabel: mLabel,
        income: inc,
        expense: exp
      });
    }

    return stats;
  }

  /**
   * Compute category totals for a given type & month
   */
  computeCategoryTotals(type, monthKey = null) {
    const transactions = StorageManager.getTransactions();
    const categories = StorageManager.getCategories();
    const totalsMap = {};

    transactions.forEach(t => {
      if (t.type !== type) return;
      if (monthKey && t.date && t.date.slice(0, 7) !== monthKey) return;

      const catId = t.categoryId || 'cat_other_exp';
      const amt = parseFloat(t.amount) || 0;
      totalsMap[catId] = (totalsMap[catId] || 0) + amt;
    });

    const result = [];
    Object.keys(totalsMap).forEach(catId => {
      const cat = categories.find(c => c.id === catId) || { name: 'Other', color: '#64748b', icon: 'tag' };
      result.push({
        id: catId,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        total: totalsMap[catId]
      });
    });

    return result.sort((a, b) => b.total - a.total);
  }

  /**
   * Render custom interactive Legend for donut charts
   */
  renderCustomLegend(containerId, data, currSym) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!data || data.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.82rem; padding: 0.5rem;">No spending recorded yet.</div>`;
      return;
    }

    const grandTotal = data.reduce((sum, item) => sum + item.total, 0);

    container.innerHTML = data.map(item => {
      const pct = grandTotal > 0 ? ((item.total / grandTotal) * 100).toFixed(1) : 0;
      return `
        <div class="legend-item">
          <div class="legend-left">
            <span class="legend-dot" style="background-color: ${item.color || '#6366f1'};"></span>
            <span class="legend-name">${item.name}</span>
          </div>
          <div class="legend-right">
            <span class="legend-pct">${pct}%</span>
            <span class="legend-amount">${currSym}${item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render Budget Progress in Dashboard (Top 4)
   */
  renderDashboardBudgets(monthKey) {
    const container = document.getElementById('dashboardBudgetList');
    if (!container) return;

    const budgets = StorageManager.getBudgetsForMonth(monthKey);
    const transactions = StorageManager.getTransactions();

    if (budgets.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 1.5rem 0;">
          <p>No budgets set for this month.</p>
          <button class="btn btn-secondary btn-sm" onclick="App.openBudgetModal()">Set a Budget</button>
        </div>
      `;
      return;
    }

    // Calculate spending per budgeted category
    const catSpending = {};
    transactions.forEach(t => {
      if (t.type === 'expense' && t.date && t.date.slice(0, 7) === monthKey) {
        catSpending[t.categoryId] = (catSpending[t.categoryId] || 0) + (parseFloat(t.amount) || 0);
      }
    });

    const displayBudgets = budgets.slice(0, 4);

    container.innerHTML = displayBudgets.map(b => {
      const cat = StorageManager.getCategoryById(b.categoryId);
      const spent = catSpending[b.categoryId] || 0;
      const limit = b.limit || 1;
      const pct = Math.min(100, Math.round((spent / limit) * 100));

      let stateClass = 'safe';
      if (pct > 90) stateClass = 'danger';
      else if (pct > 70) stateClass = 'warn';

      return `
        <div class="budget-mini-item">
          <div class="budget-mini-top">
            <span style="font-weight: 600; display: flex; align-items: center; gap: 0.4rem;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${cat.color};"></span>
              ${cat.name}
            </span>
            <span>
              <strong>${this.formatCurrency(spent)}</strong> 
              <span style="color: var(--text-muted); font-size: 0.8rem;">/ ${this.formatCurrency(limit)} (${pct}%)</span>
            </span>
          </div>
          <div class="progress-track">
            <div class="progress-bar-fill ${stateClass}" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render Recent 5 Transactions in Dashboard
   */
  renderDashboardRecentTransactions() {
    const container = document.getElementById('dashboardRecentTxList');
    if (!container) return;

    const transactions = StorageManager.getTransactions();
    const recents = transactions.slice(0, 5);

    if (recents.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 1.5rem 0;">
          <p>No transactions recorded yet.</p>
          <button class="btn btn-primary btn-sm" onclick="App.openTransactionModal()">Add Your First Entry</button>
        </div>
      `;
      return;
    }

    container.innerHTML = recents.map(t => {
      const cat = StorageManager.getCategoryById(t.categoryId);
      const isIncome = t.type === 'income';
      const amountStr = (isIncome ? '+' : '-') + this.formatCurrency(t.amount);

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0; border-bottom: 1px solid var(--border);">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="tx-icon-badge" style="background-color: ${cat.color}20; color: ${cat.color};">
              <i data-lucide="${cat.icon || 'tag'}"></i>
            </div>
            <div>
              <div style="font-weight: 600; font-size: 0.9rem;">${this.escapeHtml(t.title)}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${this.formatDate(t.date)} &bull; ${cat.name}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <span class="tx-amount ${isIncome ? 'income' : 'expense'}">${amountStr}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // =========================================================================
  // 2. TRANSACTIONS VIEW RENDERER
  // =========================================================================
  renderTransactions() {
    // Populate Category filter dropdown
    this.populateTxCategoryFilter();

    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;

    const transactions = StorageManager.getTransactions();
    const filtered = this.getFilteredTransactions(transactions);

    // Update Counter
    const countLabel = document.getElementById('txTotalCountLabel');
    if (countLabel) countLabel.textContent = `Showing ${filtered.length} of ${transactions.length} transactions`;

    // Reset selection if items no longer match
    this.updateBulkSelectionUI();

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-state-icon"><i data-lucide="inbox"></i></div>
              <h4>No transactions found</h4>
              <p>Try clearing your search query or filters, or add a new transaction.</p>
              <button class="btn btn-primary btn-sm" onclick="App.openTransactionModal()">
                <i data-lucide="plus"></i> Add Transaction
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(t => {
      const cat = StorageManager.getCategoryById(t.categoryId);
      const isIncome = t.type === 'income';
      const amountStr = (isIncome ? '+' : '-') + this.formatCurrency(t.amount);
      const isChecked = this.selectedTxIds.has(t.id);

      return `
        <tr data-id="${t.id}">
          <td>
            <input type="checkbox" class="tx-row-chk" data-id="${t.id}" ${isChecked ? 'checked' : ''}>
          </td>
          <td>
            <div class="tx-title-cell">
              <div class="tx-icon-badge" style="background-color: ${cat.color}20; color: ${cat.color};">
                <i data-lucide="${cat.icon || 'tag'}"></i>
              </div>
              <div class="tx-details">
                <span class="tx-title">${this.escapeHtml(t.title)}</span>
                ${t.notes ? `<span class="tx-notes" title="${this.escapeHtml(t.notes)}">${this.escapeHtml(t.notes)}</span>` : ''}
              </div>
            </div>
          </td>
          <td>
            <span class="category-tag" style="background-color: ${cat.color}15; color: ${cat.color};">
              <i data-lucide="${cat.icon || 'tag'}" style="width: 14px; height: 14px;"></i>
              ${cat.name}
            </span>
          </td>
          <td style="white-space: nowrap; color: var(--text-muted);">
            ${this.formatDate(t.date)}
          </td>
          <td>
            <span class="payment-tag">${t.paymentMethod || 'Other'}</span>
          </td>
          <td style="text-align: right;">
            <span class="tx-amount ${isIncome ? 'income' : 'expense'}">${amountStr}</span>
          </td>
          <td style="text-align: center;">
            <div class="table-actions">
              <button class="btn-icon btn-sm" onclick="App.editTransaction('${t.id}')" title="Edit">
                <i data-lucide="edit-3"></i>
              </button>
              <button class="btn-icon btn-sm" onclick="App.duplicateTransaction('${t.id}')" title="Duplicate">
                <i data-lucide="copy"></i>
              </button>
              <button class="btn-icon btn-sm" onclick="App.confirmDeleteTransaction('${t.id}')" title="Delete" style="color: var(--expense);">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    this.bindTxTableCheckboxEvents();
  }

  /**
   * Filter Transactions according to UI filters
   */
  getFilteredTransactions(list) {
    const searchVal = (document.getElementById('txFilterSearch')?.value || '').toLowerCase().trim();
    const typeVal = document.getElementById('txFilterType')?.value || 'all';
    const catVal = document.getElementById('txFilterCategory')?.value || 'all';
    const datePreset = document.getElementById('txFilterDatePreset')?.value || 'this-month';

    const now = new Date();
    const currentMonthKey = this.getCurrentMonthKey();
    const lastMonthKey = this.getLastMonthKey();
    const currentYearKey = String(now.getFullYear());

    return list.filter(t => {
      // Type
      if (typeVal !== 'all' && t.type !== typeVal) return false;

      // Category
      if (catVal !== 'all' && t.categoryId !== catVal) return false;

      // Date Preset
      if (t.date) {
        const mKey = t.date.slice(0, 7);
        const yKey = t.date.slice(0, 4);

        if (datePreset === 'this-month' && mKey !== currentMonthKey) return false;
        if (datePreset === 'last-month' && mKey !== lastMonthKey) return false;
        if (datePreset === 'this-year' && yKey !== currentYearKey) return false;
        if (datePreset === 'last-30') {
          const txDate = new Date(t.date);
          const diffDays = (now - txDate) / (1000 * 60 * 60 * 24);
          if (diffDays < 0 || diffDays > 30) return false;
        }
      }

      // Search keyword
      if (searchVal) {
        const titleMatch = (t.title || '').toLowerCase().includes(searchVal);
        const noteMatch = (t.notes || '').toLowerCase().includes(searchVal);
        const cat = StorageManager.getCategoryById(t.categoryId);
        const catMatch = (cat ? cat.name : '').toLowerCase().includes(searchVal);
        if (!titleMatch && !noteMatch && !catMatch) return false;
      }

      return true;
    });
  }

  populateTxCategoryFilter() {
    const sel = document.getElementById('txFilterCategory');
    if (!sel) return;
    const currentVal = sel.value;
    const categories = StorageManager.getCategories();

    sel.innerHTML = `<option value="all">All Categories</option>` + 
      categories.map(c => `<option value="${c.id}" ${c.id === currentVal ? 'selected' : ''}>${c.name} (${c.type})</option>`).join('');
  }

  bindTxTableCheckboxEvents() {
    const selectAll = document.getElementById('chkSelectAllTx');
    const rowCheckboxes = document.querySelectorAll('.tx-row-chk');

    if (selectAll) {
      selectAll.onchange = (e) => {
        const isChecked = e.target.checked;
        rowCheckboxes.forEach(chk => {
          chk.checked = isChecked;
          const id = chk.getAttribute('data-id');
          if (isChecked) this.selectedTxIds.add(id);
          else this.selectedTxIds.delete(id);
        });
        this.updateBulkSelectionUI();
      };
    }

    rowCheckboxes.forEach(chk => {
      chk.onchange = () => {
        const id = chk.getAttribute('data-id');
        if (chk.checked) this.selectedTxIds.add(id);
        else this.selectedTxIds.delete(id);
        this.updateBulkSelectionUI();
      };
    });
  }

  updateBulkSelectionUI() {
    const count = this.selectedTxIds.size;
    const statsEl = document.getElementById('txSelectionStats');
    const deleteBtn = document.getElementById('btnDeleteSelectedTx');
    const selectAll = document.getElementById('chkSelectAllTx');

    if (statsEl) statsEl.textContent = `${count} item${count === 1 ? '' : 's'} selected`;
    if (deleteBtn) deleteBtn.style.display = count > 0 ? 'inline-flex' : 'none';

    const rowCheckboxes = document.querySelectorAll('.tx-row-chk');
    if (selectAll && rowCheckboxes.length > 0) {
      selectAll.checked = count === rowCheckboxes.length;
    }
  }

  // =========================================================================
  // 3. INCOME VIEW RENDERER
  // =========================================================================
  renderIncomeView() {
    const transactions = StorageManager.getTransactions().filter(t => t.type === 'income');
    const currentMonth = this.getCurrentMonthKey();
    const currSym = StorageManager.getSettings().currencySymbol || '$';

    let currentMonthTotal = 0;
    const currentMonthEntries = [];

    transactions.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      if (t.date && t.date.slice(0, 7) === currentMonth) {
        currentMonthTotal += amt;
        currentMonthEntries.push(t);
      }
    });

    const avg = currentMonthEntries.length > 0 ? (currentMonthTotal / currentMonthEntries.length) : 0;

    // Top source
    const catSpending = this.computeCategoryTotals('income', currentMonth);
    const topSource = catSpending.length > 0 ? catSpending[0].name : 'None';

    document.getElementById('incomeViewTotal').textContent = this.formatCurrency(currentMonthTotal);
    document.getElementById('incomeViewCount').textContent = currentMonthEntries.length;
    document.getElementById('incomeTopSource').textContent = `Top source: ${topSource}`;
    document.getElementById('incomeViewAverage').textContent = this.formatCurrency(avg);

    // Chart
    ChartManager.renderCategoryDonutChart('incomeCategoryChart', catSpending, currSym, 'No Income This Month');
    this.renderCustomLegend('incomeCategoryLegend', catSpending, currSym);

    // Income Table
    const tbody = document.getElementById('incomeTableBody');
    if (tbody) {
      if (transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No income records logged yet.</p></div></td></tr>`;
      } else {
        tbody.innerHTML = transactions.map(t => {
          const cat = StorageManager.getCategoryById(t.categoryId);
          return `
            <tr>
              <td>
                <div class="tx-title-cell">
                  <div class="tx-icon-badge" style="background-color: ${cat.color}20; color: ${cat.color};">
                    <i data-lucide="${cat.icon || 'tag'}"></i>
                  </div>
                  <div>
                    <span class="tx-title">${this.escapeHtml(t.title)}</span>
                    ${t.notes ? `<div class="tx-notes">${this.escapeHtml(t.notes)}</div>` : ''}
                  </div>
                </div>
              </td>
              <td>
                <span class="category-tag" style="background-color: ${cat.color}15; color: ${cat.color};">
                  ${cat.name}
                </span>
              </td>
              <td>${this.formatDate(t.date)}</td>
              <td><span class="payment-tag">${t.paymentMethod || 'Transfer'}</span></td>
              <td style="text-align: right;"><span class="tx-amount income">+${this.formatCurrency(t.amount)}</span></td>
              <td style="text-align: center;">
                <button class="btn-icon btn-sm" onclick="App.editTransaction('${t.id}')"><i data-lucide="edit-3"></i></button>
                <button class="btn-icon btn-sm" onclick="App.confirmDeleteTransaction('${t.id}')" style="color: var(--expense);"><i data-lucide="trash-2"></i></button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  // =========================================================================
  // 4. EXPENSES VIEW RENDERER
  // =========================================================================
  renderExpensesView() {
    const transactions = StorageManager.getTransactions().filter(t => t.type === 'expense');
    const currentMonth = this.getCurrentMonthKey();
    const currSym = StorageManager.getSettings().currencySymbol || '$';

    let currentMonthTotal = 0;
    const currentMonthEntries = [];
    const paymentBreakdown = {};

    transactions.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      if (t.date && t.date.slice(0, 7) === currentMonth) {
        currentMonthTotal += amt;
        currentMonthEntries.push(t);
        const method = t.paymentMethod || 'Other';
        paymentBreakdown[method] = (paymentBreakdown[method] || 0) + amt;
      }
    });

    const now = new Date();
    const dayOfMonth = now.getDate() || 1;
    const dailyAvg = currentMonthTotal / dayOfMonth;

    // Top Category
    const catSpending = this.computeCategoryTotals('expense', currentMonth);
    const topCat = catSpending.length > 0 ? catSpending[0] : null;

    document.getElementById('expenseViewTotal').textContent = this.formatCurrency(currentMonthTotal);
    document.getElementById('expenseViewDailyAvg').textContent = this.formatCurrency(dailyAvg);
    
    if (topCat) {
      document.getElementById('expenseViewTopCategory').textContent = topCat.name;
      document.getElementById('expenseViewTopAmount').textContent = `${this.formatCurrency(topCat.total)} spent`;
    } else {
      document.getElementById('expenseViewTopCategory').textContent = 'None';
      document.getElementById('expenseViewTopAmount').textContent = '$0.00 spent';
    }

    // Charts
    ChartManager.renderCategoryDonutChart('expenseCategoryChart', catSpending, currSym, 'No Expenses This Month');
    this.renderCustomLegend('expenseCategoryLegend', catSpending, currSym);

    ChartManager.renderPaymentMethodChart('expensePaymentChart', paymentBreakdown, currSym);

    // Expense Table
    const tbody = document.getElementById('expenseTableBody');
    if (tbody) {
      if (transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No expense records logged yet.</p></div></td></tr>`;
      } else {
        tbody.innerHTML = transactions.map(t => {
          const cat = StorageManager.getCategoryById(t.categoryId);
          return `
            <tr>
              <td>
                <div class="tx-title-cell">
                  <div class="tx-icon-badge" style="background-color: ${cat.color}20; color: ${cat.color};">
                    <i data-lucide="${cat.icon || 'tag'}"></i>
                  </div>
                  <div>
                    <span class="tx-title">${this.escapeHtml(t.title)}</span>
                    ${t.notes ? `<div class="tx-notes">${this.escapeHtml(t.notes)}</div>` : ''}
                  </div>
                </div>
              </td>
              <td>
                <span class="category-tag" style="background-color: ${cat.color}15; color: ${cat.color};">
                  ${cat.name}
                </span>
              </td>
              <td>${this.formatDate(t.date)}</td>
              <td><span class="payment-tag">${t.paymentMethod || 'Credit Card'}</span></td>
              <td style="text-align: right;"><span class="tx-amount expense">-${this.formatCurrency(t.amount)}</span></td>
              <td style="text-align: center;">
                <button class="btn-icon btn-sm" onclick="App.editTransaction('${t.id}')"><i data-lucide="edit-3"></i></button>
                <button class="btn-icon btn-sm" onclick="App.confirmDeleteTransaction('${t.id}')" style="color: var(--expense);"><i data-lucide="trash-2"></i></button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  // =========================================================================
  // 5. BUDGETS VIEW RENDERER
  // =========================================================================
  renderBudgetsView() {
    const currentMonth = this.getCurrentMonthKey();
    const budgets = StorageManager.getBudgetsForMonth(currentMonth);
    const transactions = StorageManager.getTransactions();

    // Spending per category this month
    const catSpending = {};
    let totalSpentThisMonth = 0;

    transactions.forEach(t => {
      if (t.type === 'expense' && t.date && t.date.slice(0, 7) === currentMonth) {
        const amt = parseFloat(t.amount) || 0;
        totalSpentThisMonth += amt;
        catSpending[t.categoryId] = (catSpending[t.categoryId] || 0) + amt;
      }
    });

    // Total Budgeted
    const totalBudgeted = budgets.reduce((sum, b) => sum + (parseFloat(b.limit) || 0), 0);
    const remainingSafe = Math.max(0, totalBudgeted - totalSpentThisMonth);

    document.getElementById('budgetBannerTotal').textContent = this.formatCurrency(totalBudgeted);
    document.getElementById('budgetBannerSpent').textContent = this.formatCurrency(totalSpentThisMonth);
    document.getElementById('budgetBannerRemaining').textContent = this.formatCurrency(remainingSafe);

    // Overall Progress
    const overallPct = totalBudgeted > 0 ? Math.min(100, Math.round((totalSpentThisMonth / totalBudgeted) * 100)) : 0;
    const overallBar = document.getElementById('overallProgressBar');
    const overallBadge = document.getElementById('overallBudgetBadge');
    const overallText = document.getElementById('overallBudgetStatusText');

    if (overallBar) {
      overallBar.style.width = `${overallPct}%`;
      overallBar.className = `progress-bar-fill ${overallPct > 90 ? 'danger' : overallPct > 70 ? 'warn' : 'safe'}`;
    }
    if (overallText) {
      overallText.textContent = `${overallPct}% of total budget consumed (${this.formatCurrency(totalSpentThisMonth)} / ${this.formatCurrency(totalBudgeted)})`;
    }
    if (overallBadge) {
      if (totalSpentThisMonth > totalBudgeted && totalBudgeted > 0) {
        overallBadge.textContent = 'Exceeded Budget';
        overallBadge.className = 'badge-trend up-bad';
      } else if (overallPct >= 80) {
        overallBadge.textContent = 'Near Limit';
        overallBadge.className = 'badge-trend neutral';
      } else {
        overallBadge.textContent = 'On Track';
        overallBadge.className = 'badge-trend up-good';
      }
    }

    // Category Budgets Grid
    const grid = document.getElementById('budgetCardsContainer');
    if (!grid) return;

    if (budgets.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon"><i data-lucide="wallet-cards"></i></div>
          <h4>No Category Budgets Configured</h4>
          <p>Set specific monthly spending caps on Groceries, Dining, Housing, or Entertainment.</p>
          <button class="btn btn-primary" onclick="App.openBudgetModal()">
            <i data-lucide="plus-circle"></i> Set Category Budget
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = budgets.map(b => {
      const cat = StorageManager.getCategoryById(b.categoryId);
      const spent = catSpending[b.categoryId] || 0;
      const limit = b.limit || 1;
      const pct = Math.round((spent / limit) * 100);
      const remaining = limit - spent;

      let barClass = 'safe';
      let badgeHtml = '';

      if (spent > limit) {
        barClass = 'danger';
        badgeHtml = `<span class="budget-status-badge" style="background-color: var(--expense-light); color: var(--expense);">Over budget by ${this.formatCurrency(Math.abs(remaining))}</span>`;
      } else if (pct >= 80) {
        barClass = 'warn';
        badgeHtml = `<span class="budget-status-badge" style="background-color: var(--warning-light); color: var(--warning);">${this.formatCurrency(remaining)} left</span>`;
      } else {
        barClass = 'safe';
        badgeHtml = `<span class="budget-status-badge" style="background-color: var(--income-light); color: var(--income);">${this.formatCurrency(remaining)} left</span>`;
      }

      return `
        <div class="budget-card">
          <div class="budget-card-header">
            <div class="budget-card-category">
              <div class="category-avatar" style="background-color: ${cat.color}; width: 38px; height: 38px;">
                <i data-lucide="${cat.icon || 'tag'}"></i>
              </div>
              <h4 style="font-weight: 700; font-size: 1rem;">${cat.name}</h4>
            </div>
            <div class="table-actions">
              <button class="btn-icon btn-sm" onclick="App.editBudget('${b.id}')" title="Edit Budget">
                <i data-lucide="edit-3"></i>
              </button>
              <button class="btn-icon btn-sm" onclick="App.confirmDeleteBudget('${b.id}')" title="Delete Budget" style="color: var(--expense);">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>

          <div class="budget-card-body">
            <div class="budget-amounts-row">
              <span class="budget-spent">${this.formatCurrency(spent)}</span>
              <span class="budget-limit">Budget: ${this.formatCurrency(limit)}</span>
            </div>
            <div class="progress-track" style="height: 10px;">
              <div class="progress-bar-fill ${barClass}" style="width: ${Math.min(100, pct)}%;"></div>
            </div>
            <div class="budget-status-row">
              <span style="font-weight: 600; color: var(--text-muted);">${pct}% spent</span>
              ${badgeHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // =========================================================================
  // 6. CATEGORIES VIEW RENDERER
  // =========================================================================
  renderCategoriesView() {
    const categories = StorageManager.getCategories().filter(c => c.type === this.activeCatTab);
    const transactions = StorageManager.getTransactions();
    const grid = document.getElementById('categoriesGridContainer');
    if (!grid) return;

    // Count usage per category
    const catStats = {};
    transactions.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      if (!catStats[t.categoryId]) {
        catStats[t.categoryId] = { count: 0, total: 0 };
      }
      catStats[t.categoryId].count++;
      catStats[t.categoryId].total += amt;
    });

    grid.innerHTML = categories.map(c => {
      const stats = catStats[c.id] || { count: 0, total: 0 };
      const totalStr = this.formatCurrency(stats.total);

      return `
        <div class="category-card">
          <div class="category-left">
            <div class="category-avatar" style="background-color: ${c.color || '#3b82f6'};">
              <i data-lucide="${c.icon || 'tag'}"></i>
            </div>
            <div class="category-info">
              <h4>${this.escapeHtml(c.name)}</h4>
              <p>${stats.count} transactions &bull; ${totalStr}</p>
            </div>
          </div>
          <div class="table-actions">
            <button class="btn-icon btn-sm" onclick="App.editCategory('${c.id}')" title="Edit Category">
              <i data-lucide="edit-3"></i>
            </button>
            ${!c.isDefault ? `
              <button class="btn-icon btn-sm" onclick="App.confirmDeleteCategory('${c.id}')" title="Delete Category" style="color: var(--expense);">
                <i data-lucide="trash-2"></i>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // =========================================================================
  // 7. REPORTS VIEW RENDERER
  // =========================================================================
  renderReportsView() {
    const transactions = StorageManager.getTransactions();
    const currSym = StorageManager.getSettings().currencySymbol || '$';
    const monthlyStats = this.computeMonthlyStats(6);

    let totalSavingsAccumulated = 0;
    let highestExpense = 0;
    let highestMonthLabel = '-';
    let totalIncomeLogged = 0;

    monthlyStats.forEach(s => {
      const net = s.income - s.expense;
      totalSavingsAccumulated += net;
      totalIncomeLogged += s.income;
      if (s.expense > highestExpense) {
        highestExpense = s.expense;
        highestMonthLabel = `${s.monthLabel} (${this.formatCurrency(s.expense)})`;
      }
    });

    const avgSavings = monthlyStats.length > 0 ? (totalSavingsAccumulated / monthlyStats.length) : 0;
    const overallSavingsRate = totalIncomeLogged > 0 ? ((totalSavingsAccumulated / totalIncomeLogged) * 100).toFixed(1) : 0;

    document.getElementById('reportAvgSavings').textContent = (avgSavings >= 0 ? '+' : '-') + this.formatCurrency(avgSavings);
    document.getElementById('reportSavingsRate').textContent = `${overallSavingsRate}%`;
    document.getElementById('reportHighestMonth').textContent = highestMonthLabel;
    document.getElementById('reportTotalCount').textContent = transactions.length;

    // Line Area Chart
    ChartManager.renderCashFlowAreaChart('reportCashFlowChart', monthlyStats, currSym);

    // Smart Insights
    this.renderReportsInsights(monthlyStats, transactions);
  }

  renderReportsInsights(monthlyStats, transactions) {
    const container = document.getElementById('reportsInsightsContainer');
    if (!container) return;

    const insights = [];
    const currentMonth = this.getCurrentMonthKey();
    const currentSpending = this.computeCategoryTotals('expense', currentMonth);

    // 1. Savings Rate insight
    const latest = monthlyStats[monthlyStats.length - 1];
    if (latest && latest.income > 0) {
      const currentRate = ((latest.income - latest.expense) / latest.income) * 100;
      if (currentRate >= 20) {
        insights.push({
          icon: 'check-circle-2',
          title: 'Strong Savings Habit',
          desc: `You are saving ${currentRate.toFixed(1)}% of your income this month, exceeding the recommended 20% benchmark.`
        });
      } else if (currentRate >= 0) {
        insights.push({
          icon: 'alert-triangle',
          title: 'Moderate Surplus',
          desc: `Your savings rate is ${currentRate.toFixed(1)}%. Look for opportunities to trim variable subscriptions or dining.`
        });
      } else {
        insights.push({
          icon: 'alert-octagon',
          title: 'Deficit Warning',
          desc: `Expenses exceeded income this month by ${this.formatCurrency(Math.abs(latest.income - latest.expense))}. Consider reviewing non-essential spending.`
        });
      }
    }

    // 2. Largest expense category insight
    if (currentSpending.length > 0) {
      const top = currentSpending[0];
      insights.push({
        icon: 'pie-chart',
        title: `Top Outflow: ${top.name}`,
        desc: `${top.name} represents your highest expense category this month (${this.formatCurrency(top.total)}).`
      });
    }

    // 3. Data health insight
    insights.push({
      icon: 'shield-check',
      title: 'Local Privacy & Persistence',
      desc: 'All your financial records are encrypted and stored directly in your local browser sandbox. Regular JSON backups are recommended.'
    });

    container.innerHTML = insights.map(item => `
      <div class="insights-item">
        <i data-lucide="${item.icon}"></i>
        <div>
          <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 2px;">${item.title}</h4>
          <p style="font-size: 0.82rem;">${item.desc}</p>
        </div>
      </div>
    `).join('');
  }

  // =========================================================================
  // MODALS & EVENT HANDLERS
  // =========================================================================
  bindEvents() {
    // Navigation Links
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const view = el.getAttribute('data-view');
        this.navigateTo(view);
      });
    });

    // Mobile Sidebar Toggle
    const mobileBtn = document.getElementById('btnMobileToggle');
    const closeSidebarBtn = document.getElementById('btnCloseSidebar');
    const sidebar = document.getElementById('appSidebar');

    if (mobileBtn && sidebar) {
      mobileBtn.onclick = () => sidebar.classList.add('open');
    }
    if (closeSidebarBtn && sidebar) {
      closeSidebarBtn.onclick = () => sidebar.classList.remove('open');
    }

    // Global Search
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) {
      searchInput.oninput = (e) => {
        const val = e.target.value;
        if (this.currentView !== 'transactions') {
          this.navigateTo('transactions');
        }
        const txSearch = document.getElementById('txFilterSearch');
        if (txSearch) txSearch.value = val;
        this.renderTransactions();
        this.refreshIcons();
      };
    }

    // Transaction Filters
    const txSearch = document.getElementById('txFilterSearch');
    const txType = document.getElementById('txFilterType');
    const txCat = document.getElementById('txFilterCategory');
    const txDate = document.getElementById('txFilterDatePreset');

    [txType, txCat, txDate].forEach(el => {
      if (el) el.onchange = () => {
        this.renderTransactions();
        this.refreshIcons();
      };
    });

    if (txSearch) {
      txSearch.oninput = () => {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
          this.renderTransactions();
          this.refreshIcons();
        }, 150);
      };
    }

    // Export CSV
    const btnCsv = document.getElementById('btnExportCSV');
    if (btnCsv) {
      btnCsv.onclick = () => {
        const txs = StorageManager.getTransactions();
        const curr = StorageManager.getSettings().currency;
        ExportManager.exportToCSV(txs, curr);
        this.showToast('CSV export downloaded successfully', 'success');
      };
    }

    // Bulk Delete
    const btnBulkDelete = document.getElementById('btnDeleteSelectedTx');
    if (btnBulkDelete) {
      btnBulkDelete.onclick = () => {
        const count = this.selectedTxIds.size;
        if (count === 0) return;
        this.openConfirmDelete(
          `Delete ${count} Transaction${count > 1 ? 's' : ''}`,
          `Are you sure you want to permanently delete the ${count} selected transactions?`,
          () => {
            StorageManager.deleteMultipleTransactions(Array.from(this.selectedTxIds));
            this.selectedTxIds.clear();
            this.renderCurrentView();
            this.showToast(`Deleted ${count} transactions`, 'info');
          }
        );
      };
    }

    // Theme Toggle
    const themeBtn = document.getElementById('btnThemeToggle');
    if (themeBtn) {
      themeBtn.onclick = () => {
        const currentTheme = StorageManager.getSettings().theme;
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        StorageManager.saveSettings({ theme: newTheme });
        this.applySettingsThemeAndCurrency();
        this.renderCurrentView();
        this.refreshIcons();
        this.showToast(`Switched to ${newTheme} theme`, 'info');
      };
    }

    // Settings Modal Triggers
    const settingsBtn = document.getElementById('btnOpenSettings');
    if (settingsBtn) {
      settingsBtn.onclick = () => this.openSettingsModal();
    }

    const saveSettingsBtn = document.getElementById('btnSaveSettings');
    if (saveSettingsBtn) {
      saveSettingsBtn.onclick = () => {
        const curr = document.getElementById('settingsCurrencySelect').value;
        const monthlyBudget = parseFloat(document.getElementById('settingsMonthlyBudgetInput').value) || 3500;
        const currObj = SUPPORTED_CURRENCIES.find(c => c.code === curr) || SUPPORTED_CURRENCIES[0];

        StorageManager.saveSettings({
          currency: curr,
          currencySymbol: currObj.symbol,
          monthlyBudget
        });

        this.applySettingsThemeAndCurrency();
        this.closeModals();
        this.renderCurrentView();
        this.showToast('Settings saved successfully', 'success');
      };
    }

    // Demo Data & Wipe Data
    const btnDemo = document.getElementById('btnResetDemoData');
    if (btnDemo) {
      btnDemo.onclick = () => {
        this.openConfirmDelete(
          'Load Sample Data',
          'This will reset your data and seed fresh realistic transactions, categories, and budgets.',
          () => {
            StorageManager.resetToDemoData();
            this.closeModals();
            this.applySettingsThemeAndCurrency();
            this.renderCurrentView();
            this.showToast('Sample demo data loaded', 'success');
          }
        );
      };
    }

    const btnClear = document.getElementById('btnClearAllData');
    if (btnClear) {
      btnClear.onclick = () => {
        this.openConfirmDelete(
          'Wipe All Data',
          'This will permanently delete ALL transactions and budgets. This cannot be undone.',
          () => {
            StorageManager.clearAllData();
            this.closeModals();
            this.renderCurrentView();
            this.showToast('All transaction data cleared', 'danger');
          }
        );
      };
    }

    // Import Backup File
    const fileImport = document.getElementById('fileImportBackup');
    if (fileImport) {
      fileImport.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        ExportManager.importFromJSON(
          file,
          () => {
            this.applySettingsThemeAndCurrency();
            this.closeModals();
            this.renderCurrentView();
            this.showToast('Backup restored successfully!', 'success');
          },
          (err) => {
            this.showToast(err, 'danger');
          }
        );
      };
    }

    // Transaction Modal Triggers
    const openAddTxBtn = document.getElementById('btnOpenAddTxModal');
    if (openAddTxBtn) {
      openAddTxBtn.onclick = () => this.openTransactionModal();
    }

    // Transaction Modal Type Toggles
    const btnExp = document.getElementById('btnTypeExpense');
    const btnInc = document.getElementById('btnTypeIncome');
    if (btnExp && btnInc) {
      btnExp.onclick = () => this.setTransactionModalType('expense');
      btnInc.onclick = () => this.setTransactionModalType('income');
    }

    // Form Transaction Submit
    const formTx = document.getElementById('formTransaction');
    if (formTx) {
      formTx.onsubmit = (e) => {
        e.preventDefault();
        this.saveTransactionForm();
      };
    }

    // Category Tabs in Categories View
    document.querySelectorAll('.category-tabs .tab-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.category-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeCatTab = btn.getAttribute('data-cat-tab');
        this.renderCategoriesView();
        this.refreshIcons();
      };
    });

    // Category Modal Triggers
    const openAddCatBtn = document.getElementById('btnOpenAddCategoryModal');
    if (openAddCatBtn) {
      openAddCatBtn.onclick = () => this.openCategoryModal();
    }

    const catBtnExp = document.getElementById('catBtnTypeExpense');
    const catBtnInc = document.getElementById('catBtnTypeIncome');
    if (catBtnExp && catBtnInc) {
      catBtnExp.onclick = () => this.setCategoryModalType('expense');
      catBtnInc.onclick = () => this.setCategoryModalType('income');
    }

    // Swatches selection
    const swatchesContainer = document.getElementById('colorSwatchesContainer');
    if (swatchesContainer) {
      swatchesContainer.onclick = (e) => {
        const swatch = e.target.closest('.color-swatch-item');
        if (!swatch) return;
        document.querySelectorAll('.color-swatch-item').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
        document.getElementById('catInputColor').value = swatch.getAttribute('data-color');
      };
    }

    // Icon selector
    const iconContainer = document.getElementById('iconSelectorContainer');
    if (iconContainer) {
      iconContainer.onclick = (e) => {
        const btn = e.target.closest('.icon-btn-choice');
        if (!btn) return;
        document.querySelectorAll('.icon-btn-choice').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('catInputIcon').value = btn.getAttribute('data-icon');
      };
    }

    // Form Category Submit
    const formCat = document.getElementById('formCategory');
    if (formCat) {
      formCat.onsubmit = (e) => {
        e.preventDefault();
        this.saveCategoryForm();
      };
    }

    // Budget Modal Triggers
    const openAddBudgetBtn = document.getElementById('btnOpenAddBudgetModal');
    if (openAddBudgetBtn) {
      openAddBudgetBtn.onclick = () => this.openBudgetModal();
    }

    // Form Budget Submit
    const formBudget = document.getElementById('formBudget');
    if (formBudget) {
      formBudget.onsubmit = (e) => {
        e.preventDefault();
        this.saveBudgetForm();
      };
    }

    // Confirm Delete Action
    const btnConfirmDelete = document.getElementById('btnConfirmDeleteAction');
    if (btnConfirmDelete) {
      btnConfirmDelete.onclick = () => {
        if (typeof this.deleteActionCallback === 'function') {
          this.deleteActionCallback();
        }
        this.closeModals();
      };
    }

    // Close Modals on Backdrop Click
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.onclick = (e) => {
        if (e.target === modal) this.closeModals();
      };
    });
  }

  // =========================================================================
  // TRANSACTION MODAL LOGIC
  // =========================================================================
  openTransactionModal(type = 'expense') {
    document.getElementById('txEditId').value = '';
    document.getElementById('modalTransactionTitle').textContent = 'Add Transaction';
    document.getElementById('txInputTitle').value = '';
    document.getElementById('txInputAmount').value = '';
    document.getElementById('txInputNotes').value = '';
    
    // Default Date to Today (YYYY-MM-DD)
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('txInputDate').value = today;

    this.setTransactionModalType(type);
    this.openModal('modalTransaction');
  }

  setTransactionModalType(type) {
    const btnExp = document.getElementById('btnTypeExpense');
    const btnInc = document.getElementById('btnTypeIncome');
    if (type === 'income') {
      btnInc.classList.add('active');
      btnExp.classList.remove('active');
    } else {
      btnExp.classList.add('active');
      btnInc.classList.remove('active');
    }

    // Re-populate category select based on type
    const catSelect = document.getElementById('txInputCategory');
    const categories = StorageManager.getCategories().filter(c => c.type === type);
    catSelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  editTransaction(id) {
    const tx = StorageManager.getTransactions().find(t => t.id === id);
    if (!tx) return;

    document.getElementById('txEditId').value = tx.id;
    document.getElementById('modalTransactionTitle').textContent = 'Edit Transaction';
    document.getElementById('txInputTitle').value = tx.title;
    document.getElementById('txInputAmount').value = tx.amount;
    document.getElementById('txInputDate').value = tx.date;
    document.getElementById('txInputMethod').value = tx.paymentMethod || 'Credit Card';
    document.getElementById('txInputNotes').value = tx.notes || '';

    this.setTransactionModalType(tx.type);
    document.getElementById('txInputCategory').value = tx.categoryId;

    this.openModal('modalTransaction');
  }

  duplicateTransaction(id) {
    const tx = StorageManager.getTransactions().find(t => t.id === id);
    if (!tx) return;

    this.openTransactionModal(tx.type);
    document.getElementById('txInputTitle').value = `${tx.title} (Copy)`;
    document.getElementById('txInputAmount').value = tx.amount;
    document.getElementById('txInputCategory').value = tx.categoryId;
    document.getElementById('txInputMethod').value = tx.paymentMethod;
    document.getElementById('txInputNotes').value = tx.notes || '';
  }

  saveTransactionForm() {
    const editId = document.getElementById('txEditId').value;
    const isIncome = document.getElementById('btnTypeIncome').classList.contains('active');
    const type = isIncome ? 'income' : 'expense';

    const title = document.getElementById('txInputTitle').value.trim();
    const amount = parseFloat(document.getElementById('txInputAmount').value);
    const categoryId = document.getElementById('txInputCategory').value;
    const date = document.getElementById('txInputDate').value;
    const paymentMethod = document.getElementById('txInputMethod').value;
    const notes = document.getElementById('txInputNotes').value.trim();

    if (!title || isNaN(amount) || amount <= 0 || !categoryId || !date) {
      this.showToast('Please fill out all required fields with valid values.', 'danger');
      return;
    }

    const payload = {
      type,
      title,
      amount,
      categoryId,
      date,
      paymentMethod,
      notes
    };

    if (editId) {
      StorageManager.updateTransaction(editId, payload);
      this.showToast('Transaction updated successfully', 'success');
    } else {
      StorageManager.addTransaction(payload);
      this.showToast('Transaction logged successfully', 'success');
    }

    this.closeModals();
    this.renderCurrentView();
    this.refreshIcons();
  }

  confirmDeleteTransaction(id) {
    this.openConfirmDelete(
      'Delete Transaction',
      'Are you sure you want to delete this transaction record?',
      () => {
        StorageManager.deleteTransaction(id);
        this.selectedTxIds.delete(id);
        this.renderCurrentView();
        this.showToast('Transaction deleted', 'info');
      }
    );
  }

  // =========================================================================
  // BUDGET MODAL LOGIC
  // =========================================================================
  openBudgetModal(categoryId = null) {
    const expCategories = StorageManager.getCategories().filter(c => c.type === 'expense');
    const catSelect = document.getElementById('budgetInputCategory');
    catSelect.innerHTML = expCategories.map(c => `<option value="${c.id}" ${c.id === categoryId ? 'selected' : ''}>${c.name}</option>`).join('');

    const currentMonth = this.getCurrentMonthKey();
    document.getElementById('budgetInputMonth').value = currentMonth;
    document.getElementById('budgetInputLimit').value = '';

    this.openModal('modalBudget');
  }

  editBudget(id) {
    const budget = StorageManager.getBudgets().find(b => b.id === id);
    if (!budget) return;

    this.openBudgetModal(budget.categoryId);
    document.getElementById('budgetInputLimit').value = budget.limit;
    document.getElementById('budgetInputMonth').value = budget.month;
  }

  saveBudgetForm() {
    const categoryId = document.getElementById('budgetInputCategory').value;
    const limit = parseFloat(document.getElementById('budgetInputLimit').value);
    const month = document.getElementById('budgetInputMonth').value;

    if (!categoryId || isNaN(limit) || limit <= 0 || !month) {
      this.showToast('Please enter a valid budget limit and month.', 'danger');
      return;
    }

    StorageManager.setBudget(month, categoryId, limit);
    this.closeModals();
    this.renderCurrentView();
    this.showToast('Category budget saved', 'success');
  }

  confirmDeleteBudget(id) {
    this.openConfirmDelete(
      'Delete Category Budget',
      'Are you sure you want to remove this category budget threshold?',
      () => {
        StorageManager.deleteBudget(id);
        this.renderCurrentView();
        this.showToast('Budget removed', 'info');
      }
    );
  }

  // =========================================================================
  // CATEGORY MODAL LOGIC
  // =========================================================================
  openCategoryModal() {
    document.getElementById('categoryEditId').value = '';
    document.getElementById('modalCategoryTitle').textContent = 'Create Category';
    document.getElementById('catInputName').value = '';
    this.setCategoryModalType(this.activeCatTab || 'expense');

    // Default swatch & icon
    const firstSwatch = document.querySelector('.color-swatch-item');
    if (firstSwatch) firstSwatch.click();

    const firstIcon = document.querySelector('.icon-btn-choice');
    if (firstIcon) firstIcon.click();

    this.openModal('modalCategory');
  }

  setCategoryModalType(type) {
    const btnExp = document.getElementById('catBtnTypeExpense');
    const btnInc = document.getElementById('catBtnTypeIncome');
    if (type === 'income') {
      btnInc.classList.add('active');
      btnExp.classList.remove('active');
    } else {
      btnExp.classList.add('active');
      btnInc.classList.remove('active');
    }
  }

  editCategory(id) {
    const cat = StorageManager.getCategories().find(c => c.id === id);
    if (!cat) return;

    document.getElementById('categoryEditId').value = cat.id;
    document.getElementById('modalCategoryTitle').textContent = 'Edit Category';
    document.getElementById('catInputName').value = cat.name;
    this.setCategoryModalType(cat.type);

    document.getElementById('catInputColor').value = cat.color;
    document.getElementById('catInputIcon').value = cat.icon;

    // Highlight selected swatch
    document.querySelectorAll('.color-swatch-item').forEach(el => {
      el.classList.toggle('selected', el.getAttribute('data-color') === cat.color);
    });

    // Highlight selected icon
    document.querySelectorAll('.icon-btn-choice').forEach(el => {
      el.classList.toggle('selected', el.getAttribute('data-icon') === cat.icon);
    });

    this.openModal('modalCategory');
  }

  saveCategoryForm() {
    const editId = document.getElementById('categoryEditId').value;
    const isIncome = document.getElementById('catBtnTypeIncome').classList.contains('active');
    const type = isIncome ? 'income' : 'expense';

    const name = document.getElementById('catInputName').value.trim();
    const color = document.getElementById('catInputColor').value || '#3b82f6';
    const icon = document.getElementById('catInputIcon').value || 'tag';

    if (!name) {
      this.showToast('Please provide a category name.', 'danger');
      return;
    }

    if (editId) {
      StorageManager.updateCategory(editId, { name, color, icon, type });
      this.showToast('Category updated', 'success');
    } else {
      StorageManager.addCategory({ name, color, icon, type });
      this.showToast('Category created', 'success');
    }

    this.closeModals();
    this.renderCurrentView();
    this.refreshIcons();
  }

  confirmDeleteCategory(id) {
    this.openConfirmDelete(
      'Delete Category',
      'Are you sure you want to delete this custom category?',
      () => {
        StorageManager.deleteCategory(id);
        this.renderCurrentView();
        this.showToast('Category deleted', 'info');
      }
    );
  }

  // =========================================================================
  // SETTINGS MODAL & GENERIC CONFIRM
  // =========================================================================
  openSettingsModal() {
    this.populateStaticDropdowns();
    this.openModal('modalSettings');
  }

  openConfirmDelete(title, message, onConfirm) {
    document.getElementById('confirmDeleteTitle').textContent = title;
    document.getElementById('confirmDeleteMessage').textContent = message;
    this.deleteActionCallback = onConfirm;
    this.openModal('modalConfirmDelete');
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      this.refreshIcons();
    }
  }

  closeModals() {
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.classList.remove('active');
    });
    this.deleteActionCallback = null;
  }

  // =========================================================================
  // TOAST NOTIFICATIONS
  // =========================================================================
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
      success: 'check-circle-2',
      danger: 'alert-circle',
      info: 'info'
    };
    const iconName = iconMap[type] || 'info';

    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    this.refreshIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(60px)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, 3200);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Global Application Instance
const App = new AppController();

// Boot application upon DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
