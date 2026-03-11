/* ========================================
   CROCS STORE KPI BOARD — LOGIC
   Firebase Realtime Database + Auto MTD/YTD
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ═══════════════════════════════════════
    // FIREBASE SETUP
    // ═══════════════════════════════════════
    const firebaseConfig = {
        apiKey: "AIzaSyAqmupfz8h5BQTEsC3wcVwNA8uFTB7E69Y",
        authDomain: "crocs-kpi-dashboard.firebaseapp.com",
        databaseURL: "https://crocs-kpi-dashboard-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "crocs-kpi-dashboard",
        storageBucket: "crocs-kpi-dashboard.firebasestorage.app",
        messagingSenderId: "773027720222",
        appId: "1:773027720222:web:7c218d2c1a3aec3099d20f"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    const dailyRef = db.ref('daily');
    const targetsRef = db.ref('targets');

    // ═══════════════════════════════════════
    // KPI DEFINITIONS
    // ═══════════════════════════════════════
    const KPI_CONFIG = [
        { key: 'target',       label: 'Target',          icon: '🎯', format: 'currency', subType: 'none' },
        { key: 'tySales',      label: 'This Year Sales', icon: '💰', format: 'currency', subType: 'vsLY' },
        { key: 'lySales',      label: 'Last Year Sales', icon: '📊', format: 'currency', subType: 'none' },
        { key: 'growth',       label: '% Growth',        icon: '📈', format: 'percent',  subType: 'auto', highlight: true },
        { key: 'achievement',  label: 'Achievement',     icon: '🏆', format: 'percent',  subType: 'auto', highlight: true },
        { key: 'invoice',      label: 'Invoice',         icon: '🧾', format: 'number',   subType: 'vsLY_num' },
        { key: 'atv',          label: 'ATV',             icon: '💳', format: 'currency', subType: 'vsLY' },
        { key: 'upt',          label: 'UPT',             icon: '👟', format: 'decimal',  subType: 'vsLY_dec' },
        { key: 'traffic',      label: 'Traffic',         icon: '🚶', format: 'number',   subType: 'vsLY_num' },
        { key: 'conversion',   label: 'Conversion',      icon: '🔄', format: 'percent',  subType: 'auto' },
        { key: 'sales',        label: 'Sales',           icon: '🛒', format: 'currency', subType: 'vsLY' },
        { key: 'average',      label: 'Average',         icon: '📉', format: 'currency', subType: 'vsLY' },
        { key: 'jibbitzSales', label: 'Jibbitz Sales',   icon: '⭐', format: 'currency', subType: 'vsLY' },
    ];

    // ═══════════════════════════════════════
    // IN-MEMORY DATA (synced from Firebase)
    // ═══════════════════════════════════════
    let dailyData = {};
    let targets = { monthly: 0, yearly: 0 };
    let activeTab = 'mtd';
    let dataLoaded = false;

    // ═══════════════════════════════════════
    // FIREBASE LISTENERS (Real-time Sync)
    // ═══════════════════════════════════════
    dailyRef.on('value', (snapshot) => {
        dailyData = snapshot.val() || {};
        dataLoaded = true;
        refreshAll();
    });

    targetsRef.on('value', (snapshot) => {
        targets = snapshot.val() || { monthly: 0, yearly: 0 };
        refreshAll();
    });

    // ═══════════════════════════════════════
    // FIREBASE WRITE OPERATIONS
    // ═══════════════════════════════════════
    function saveDailyEntry(dateStr, entry) {
        return dailyRef.child(dateStr).set(entry);
    }

    function deleteDailyEntry(dateStr) {
        return dailyRef.child(dateStr).remove();
    }

    function saveTargets(t) {
        return targetsRef.set(t);
    }

    // ═══════════════════════════════════════
    // AGGREGATION ENGINE
    // ═══════════════════════════════════════
    function aggregate(period) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const filteredEntries = Object.entries(dailyData).filter(([dateStr]) => {
            const d = new Date(dateStr + 'T00:00:00');
            if (period === 'mtd') {
                return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
            } else {
                return d.getFullYear() === currentYear;
            }
        });

        const dayCount = filteredEntries.length;

        let sumSalesTY = 0, sumSalesLY = 0;
        let sumInvoicesTY = 0, sumInvoicesLY = 0;
        let sumUnitsTY = 0, sumUnitsLY = 0;
        let sumTrafficTY = 0, sumTrafficLY = 0;
        let sumJibbitzTY = 0, sumJibbitzLY = 0;

        filteredEntries.forEach(([, entry]) => {
            sumSalesTY     += Number(entry.salesTY) || 0;
            sumSalesLY     += Number(entry.salesLY) || 0;
            sumInvoicesTY  += Number(entry.invoicesTY) || 0;
            sumInvoicesLY  += Number(entry.invoicesLY) || 0;
            sumUnitsTY     += Number(entry.unitsTY) || 0;
            sumUnitsLY     += Number(entry.unitsLY) || 0;
            sumTrafficTY   += Number(entry.trafficTY) || 0;
            sumTrafficLY   += Number(entry.trafficLY) || 0;
            sumJibbitzTY   += Number(entry.jibbitzTY) || 0;
            sumJibbitzLY   += Number(entry.jibbitzLY) || 0;
        });

        const target = period === 'mtd' ? targets.monthly : targets.yearly;

        const growth      = sumSalesLY > 0 ? ((sumSalesTY - sumSalesLY) / sumSalesLY) * 100 : 0;
        const achievement = target > 0 ? (sumSalesTY / target) * 100 : 0;
        const atv         = sumInvoicesTY > 0 ? sumSalesTY / sumInvoicesTY : 0;
        const atvLY       = sumInvoicesLY > 0 ? sumSalesLY / sumInvoicesLY : 0;
        const upt         = sumInvoicesTY > 0 ? sumUnitsTY / sumInvoicesTY : 0;
        const uptLY       = sumInvoicesLY > 0 ? sumUnitsLY / sumInvoicesLY : 0;
        const conversion  = sumTrafficTY > 0 ? (sumInvoicesTY / sumTrafficTY) * 100 : 0;
        const conversionLY = sumTrafficLY > 0 ? (sumInvoicesLY / sumTrafficLY) * 100 : 0;
        const average     = dayCount > 0 ? sumSalesTY / dayCount : 0;
        const averageLY   = dayCount > 0 ? sumSalesLY / dayCount : 0;

        return {
            dayCount, target,
            tySales: sumSalesTY, lySales: sumSalesLY,
            growth, achievement,
            invoice: sumInvoicesTY, invoiceLY: sumInvoicesLY,
            atv, atvLY, upt, uptLY,
            traffic: sumTrafficTY, trafficLY: sumTrafficLY,
            conversion, conversionLY,
            sales: sumSalesTY, salesLY: sumSalesLY,
            average, averageLY,
            jibbitzSales: sumJibbitzTY, jibbitzSalesLY: sumJibbitzLY,
        };
    }

    // ═══════════════════════════════════════
    // FORMATTERS
    // ═══════════════════════════════════════
    function fmt(value, format) {
        if (value == null || isNaN(value)) return '—';
        switch (format) {
            case 'currency':
                if (Math.abs(value) >= 1_000_000) return 'AED ' + (value / 1_000_000).toFixed(2) + 'M';
                if (Math.abs(value) >= 1_000) return 'AED ' + (value / 1_000).toFixed(1) + 'K';
                return 'AED ' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            case 'percent': return value.toFixed(1) + '%';
            case 'number': return value.toLocaleString('en-US');
            case 'decimal': return value.toFixed(2);
            default: return String(value);
        }
    }

    function fmtNum(n) { return Number(n || 0).toLocaleString('en-US'); }

    function fmtDateShort(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // ═══════════════════════════════════════
    // RENDER KPI CARDS
    // ═══════════════════════════════════════
    const kpiGrid = document.getElementById('kpi-grid');

    function renderCards(tab) {
        const d = aggregate(tab);
        kpiGrid.innerHTML = '';

        if (d.dayCount === 0 && d.target === 0) {
            kpiGrid.innerHTML = `
                <div class="kpi-nodata">
                    <div class="nodata-icon">📭</div>
                    <p>No data yet. Tap <strong>+</strong> to add daily entries<br>and set your <strong>Targets</strong> to get started.</p>
                </div>
            `;
            return;
        }

        KPI_CONFIG.forEach((kpi, i) => {
            const val = d[kpi.key];
            const card = document.createElement('div');
            const classes = ['kpi-card', 'glass-card'];
            if (kpi.highlight) classes.push('highlight-card');
            card.className = classes.join(' ');
            card.style.animationDelay = `${i * 0.03}s`;

            let metaHTML = '';

            if (kpi.subType === 'vsLY' && d[kpi.key + 'LY'] != null) {
                const ly = d[kpi.key + 'LY'];
                const diff = ly > 0 ? ((val - ly) / ly) * 100 : 0;
                const cls = diff >= 0 ? 'positive' : 'negative';
                const arrow = diff >= 0 ? '▲' : '▼';
                metaHTML = `
                    <span class="kpi-badge ${cls}">${arrow} ${Math.abs(diff).toFixed(1)}%</span>
                    <span class="kpi-sub">vs LY: ${fmt(ly, kpi.format)}</span>
                `;
            } else if (kpi.subType === 'vsLY_num' && d[kpi.key + 'LY'] != null) {
                const ly = d[kpi.key + 'LY'];
                const diff = ly > 0 ? ((val - ly) / ly) * 100 : 0;
                const cls = diff >= 0 ? 'positive' : 'negative';
                const arrow = diff >= 0 ? '▲' : '▼';
                metaHTML = `
                    <span class="kpi-badge ${cls}">${arrow} ${Math.abs(diff).toFixed(1)}%</span>
                    <span class="kpi-sub">vs LY: ${fmt(ly, 'number')}</span>
                `;
            } else if (kpi.subType === 'vsLY_dec' && d[kpi.key + 'LY'] != null) {
                const ly = d[kpi.key + 'LY'];
                const diff = ly > 0 ? ((val - ly) / ly) * 100 : 0;
                const cls = diff >= 0 ? 'positive' : 'negative';
                const arrow = diff >= 0 ? '▲' : '▼';
                metaHTML = `
                    <span class="kpi-badge ${cls}">${arrow} ${Math.abs(diff).toFixed(1)}%</span>
                    <span class="kpi-sub">vs LY: ${fmt(ly, 'decimal')}</span>
                `;
            } else if (kpi.subType === 'auto') {
                if (kpi.key === 'growth') {
                    const cls = val >= 0 ? 'positive' : 'negative';
                    const arrow = val >= 0 ? '▲' : '▼';
                    metaHTML = `<span class="kpi-badge ${cls}">${arrow} YoY Growth</span>`;
                } else if (kpi.key === 'achievement') {
                    const cls = val >= 100 ? 'positive' : (val >= 85 ? 'neutral' : 'negative');
                    metaHTML = `
                        <span class="kpi-badge ${cls}">${val >= 100 ? '✓ On Track' : val >= 85 ? '⚠ Close' : '✗ Behind'}</span>
                        <span class="kpi-sub">Target: ${fmt(d.target, 'currency')}</span>
                    `;
                } else if (kpi.key === 'conversion') {
                    const lyConv = d.conversionLY || 0;
                    const diff = val - lyConv;
                    const cls = diff >= 0 ? 'positive' : 'negative';
                    const arrow = diff >= 0 ? '▲' : '▼';
                    metaHTML = `
                        <span class="kpi-badge ${cls}">${arrow} ${Math.abs(diff).toFixed(1)}pp</span>
                        <span class="kpi-sub">vs LY: ${lyConv.toFixed(1)}%</span>
                    `;
                }
            }

            card.innerHTML = `
                <div class="kpi-label">
                    <span class="kpi-icon">${kpi.icon}</span>
                    ${kpi.label}
                </div>
                <div class="kpi-value">${fmt(val, kpi.format)}</div>
                <div class="kpi-meta">${metaHTML}</div>
            `;
            kpiGrid.appendChild(card);
        });
    }

    // ═══════════════════════════════════════
    // TAB SWITCHING
    // ═══════════════════════════════════════
    const tabMTD = document.getElementById('tab-mtd');
    const tabYTD = document.getElementById('tab-ytd');
    const tabIndicator = document.getElementById('tab-indicator');

    function switchTab(tab) {
        activeTab = tab;
        tabMTD.classList.toggle('active', tab === 'mtd');
        tabYTD.classList.toggle('active', tab === 'ytd');
        tabIndicator.classList.toggle('ytd', tab === 'ytd');
        renderCards(tab);
        updateChart(tab);
    }

    tabMTD.addEventListener('click', () => switchTab('mtd'));
    tabYTD.addEventListener('click', () => switchTab('ytd'));

    // ═══════════════════════════════════════
    // CHART
    // ═══════════════════════════════════════
    const ctx = document.getElementById('comparison-chart').getContext('2d');
    let chart = null;

    function updateChart(tab) {
        const d = aggregate(tab);

        const labels = ['Sales', 'Target', 'Jibbitz', 'ATV (×100)', 'Invoices (÷10)'];
        const tyData = [
            d.tySales / 1000, d.target / 1000, d.jibbitzSales / 1000,
            d.atv * 100 / 1000, d.invoice / 10,
        ];
        const lyData = [
            d.salesLY / 1000, null, d.jibbitzSalesLY / 1000,
            d.atvLY * 100 / 1000, d.invoiceLY / 10,
        ];

        if (chart) chart.destroy();

        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'This Year', data: tyData,
                        backgroundColor: 'rgba(34, 197, 94, 0.7)',
                        borderColor: 'rgba(34, 197, 94, 1)',
                        borderWidth: 1, borderRadius: 6, borderSkipped: false,
                    },
                    {
                        label: 'Last Year', data: lyData,
                        backgroundColor: 'rgba(100, 116, 139, 0.4)',
                        borderColor: 'rgba(100, 116, 139, 0.7)',
                        borderWidth: 1, borderRadius: 6, borderSkipped: false,
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#94A3B8',
                            font: { family: 'Inter', size: 12, weight: '500' },
                            padding: 20, usePointStyle: true, pointStyleWidth: 12,
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#F1F5F9', bodyColor: '#94A3B8',
                        borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
                        padding: 12, cornerRadius: 10,
                        titleFont: { family: 'Inter', weight: '600' },
                        bodyFont: { family: 'Inter' },
                        callbacks: {
                            label: (ctx) => ctx.dataset.label + ': ' + (ctx.parsed.y != null ? ctx.parsed.y.toFixed(1) + 'K' : 'N/A')
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { color: '#64748B', font: { family: 'Inter', size: 11 } }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: {
                            color: '#64748B', font: { family: 'Inter', size: 11 },
                            callback: (val) => val + 'K'
                        }
                    }
                }
            }
        });
    }

    // ═══════════════════════════════════════
    // DAILY LOG TABLE
    // ═══════════════════════════════════════
    const logTbody = document.getElementById('log-tbody');
    const logEmpty = document.getElementById('log-empty');
    const logCount = document.getElementById('log-count');
    const logTable = document.getElementById('log-table');

    function renderLog() {
        const dates = Object.keys(dailyData).sort().reverse();
        logCount.textContent = dates.length + ' day' + (dates.length !== 1 ? 's' : '');
        logTbody.innerHTML = '';

        if (dates.length === 0) {
            logTable.style.display = 'none';
            logEmpty.classList.add('show');
            return;
        }

        logTable.style.display = '';
        logEmpty.classList.remove('show');

        dates.forEach(dateStr => {
            const e = dailyData[dateStr];
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${fmtDateShort(dateStr)}</strong></td>
                <td>${fmtNum(e.salesTY)}</td>
                <td>${fmtNum(e.salesLY)}</td>
                <td>${fmtNum(e.invoicesTY)}</td>
                <td>${fmtNum(e.trafficTY)}</td>
                <td>${fmtNum(e.jibbitzTY)}</td>
                <td>
                    <div class="log-actions">
                        <button class="log-btn edit" data-date="${dateStr}" title="Edit">✏️</button>
                        <button class="log-btn delete" data-date="${dateStr}" title="Delete">🗑️</button>
                    </div>
                </td>
            `;
            logTbody.appendChild(tr);
        });

        logTbody.querySelectorAll('.log-btn.edit').forEach(btn => {
            btn.addEventListener('click', () => openEntryForEdit(btn.dataset.date));
        });
        logTbody.querySelectorAll('.log-btn.delete').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm(`Delete entry for ${fmtDateShort(btn.dataset.date)}?`)) {
                    deleteDailyEntry(btn.dataset.date);
                }
            });
        });
    }

    // ═══════════════════════════════════════
    // ENTRY PANEL (Add / Edit Daily Data)
    // ═══════════════════════════════════════
    const fab = document.getElementById('fab-add');
    const entryPanel = document.getElementById('entry-panel');
    const panelClose = document.getElementById('panel-close');
    const overlay = document.getElementById('overlay');
    const entryForm = document.getElementById('entry-form');
    const panelTitle = document.getElementById('panel-title');
    let editingDate = null;

    function openPanel() {
        entryPanel.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closePanel() {
        entryPanel.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        editingDate = null;
        entryForm.reset();
        panelTitle.textContent = 'Add Daily Data';
        document.getElementById('entry-date').value = todayStr();
    }

    fab.addEventListener('click', () => {
        editingDate = null;
        panelTitle.textContent = 'Add Daily Data';
        entryForm.reset();
        document.getElementById('entry-date').value = todayStr();
        openPanel();
    });

    panelClose.addEventListener('click', closePanel);
    overlay.addEventListener('click', closePanel);

    function openEntryForEdit(dateStr) {
        const entry = dailyData[dateStr];
        if (!entry) return;

        editingDate = dateStr;
        panelTitle.textContent = 'Edit — ' + fmtDateShort(dateStr);

        document.getElementById('entry-date').value = dateStr;
        document.getElementById('entry-salesTY').value = entry.salesTY || '';
        document.getElementById('entry-salesLY').value = entry.salesLY || '';
        document.getElementById('entry-invoicesTY').value = entry.invoicesTY || '';
        document.getElementById('entry-invoicesLY').value = entry.invoicesLY || '';
        document.getElementById('entry-unitsTY').value = entry.unitsTY || '';
        document.getElementById('entry-unitsLY').value = entry.unitsLY || '';
        document.getElementById('entry-trafficTY').value = entry.trafficTY || '';
        document.getElementById('entry-trafficLY').value = entry.trafficLY || '';
        document.getElementById('entry-jibbitzTY').value = entry.jibbitzTY || '';
        document.getElementById('entry-jibbitzLY').value = entry.jibbitzLY || '';

        openPanel();
    }

    entryForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const dateStr = document.getElementById('entry-date').value;
        if (!dateStr) return;

        const entry = {
            salesTY:     parseFloat(document.getElementById('entry-salesTY').value) || 0,
            salesLY:     parseFloat(document.getElementById('entry-salesLY').value) || 0,
            invoicesTY:  parseInt(document.getElementById('entry-invoicesTY').value) || 0,
            invoicesLY:  parseInt(document.getElementById('entry-invoicesLY').value) || 0,
            unitsTY:     parseInt(document.getElementById('entry-unitsTY').value) || 0,
            unitsLY:     parseInt(document.getElementById('entry-unitsLY').value) || 0,
            trafficTY:   parseInt(document.getElementById('entry-trafficTY').value) || 0,
            trafficLY:   parseInt(document.getElementById('entry-trafficLY').value) || 0,
            jibbitzTY:   parseFloat(document.getElementById('entry-jibbitzTY').value) || 0,
            jibbitzLY:   parseFloat(document.getElementById('entry-jibbitzLY').value) || 0,
        };

        saveDailyEntry(dateStr, entry);
        closePanel();
    });

    // ═══════════════════════════════════════
    // TARGETS MODAL
    // ═══════════════════════════════════════
    const btnTargets = document.getElementById('btn-targets');
    const targetsModal = document.getElementById('targets-modal');
    const modalClose = document.getElementById('modal-close');
    const targetsForm = document.getElementById('targets-form');

    btnTargets.addEventListener('click', () => {
        document.getElementById('target-monthly').value = targets.monthly || '';
        document.getElementById('target-yearly').value = targets.yearly || '';
        targetsModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    function closeTargetsModal() {
        targetsModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    modalClose.addEventListener('click', closeTargetsModal);
    targetsModal.addEventListener('click', (e) => {
        if (e.target === targetsModal) closeTargetsModal();
    });

    targetsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveTargets({
            monthly: parseFloat(document.getElementById('target-monthly').value) || 0,
            yearly:  parseFloat(document.getElementById('target-yearly').value) || 0,
        });
        closeTargetsModal();
    });

    // ═══════════════════════════════════════
    // REFRESH ALL VIEWS
    // ═══════════════════════════════════════
    function refreshAll() {
        renderCards(activeTab);
        updateChart(activeTab);
        renderLog();
    }

    // ═══════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════
    function todayStr() {
        const now = new Date();
        return now.getFullYear() + '-' +
               String(now.getMonth() + 1).padStart(2, '0') + '-' +
               String(now.getDate()).padStart(2, '0');
    }

    function setDate() {
        const now = new Date();
        const opts = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        document.getElementById('current-date').textContent = '📅 ' + now.toLocaleDateString('en-US', opts);
    }

    // ═══════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════
    setDate();
});
