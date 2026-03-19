(function() {
    // ---------- 全局数据 ----------
    let applications = [];
    const STORAGE_KEY = 'jobApplications';
    let currentFilterStatus = null;
    let currentDetailId = null;

    // 柔和风景图片列表
    const backgroundImages = [
        'https://images.pexels.com/photos/1323550/pexels-photo-1323550.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1903702/pexels-photo-1903702.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/167699/pexels-photo-167699.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/814499/pexels-photo-814499.jpeg?auto=compress&cs=tinysrgb&w=1920'
    ];

    // 事件类型选项
    const EVENT_TYPES = [
        '投递', '线上测试', '一面', '二面', '三面', 'offer', '被挂'
    ];

    // ---------- DOM 元素 ----------
    const initialScreen = document.getElementById('initial-screen');
    const mainApp = document.getElementById('main-app');
    const enterBtn = document.getElementById('enter-main-btn');

    const formModal = document.getElementById('formModal');
    const detailModal = document.getElementById('detailModal');
    const closeFormBtn = document.getElementById('closeFormModalBtn');
    const closeDetailBtn = document.getElementById('closeDetailModalBtn');
    const openNewBtn = document.getElementById('openNewModalBtn');
    const addEventBtn = document.getElementById('addEventRowBtn');
    const eventsContainer = document.getElementById('eventsContainer');
    const recordForm = document.getElementById('recordForm');
    const formModalTitle = document.getElementById('formModalTitle');
    const recordIdField = document.getElementById('recordId');

    const detailContent = document.getElementById('detailContent');
    const editFromDetail = document.getElementById('editFromDetailBtn');
    const deleteFromDetail = document.getElementById('deleteFromDetailBtn');

    // 视图相关
    const dashboardView = document.getElementById('dashboard-view');
    const companyView = document.getElementById('company-view');
    const timelineView = document.getElementById('timeline-view');
    const navTabs = document.querySelectorAll('.nav-tab');

    // 看板内部容器
    const statCardsDiv = document.getElementById('statCards');
    const recentTimelineDiv = document.getElementById('recentTimeline');
    const recordListContainer = document.getElementById('recordListContainer');

    // 新视图容器
    const companyListContainer = document.getElementById('companyListContainer');
    const globalTimelineCards = document.getElementById('globalTimelineCards');

    // ---------- 随机背景 ----------
    function setRandomBackground() {
        const randomIndex = Math.floor(Math.random() * backgroundImages.length);
        document.body.style.backgroundImage = `url('${backgroundImages[randomIndex]}')`;
    }

    // ---------- 数据初始化 ----------
    function loadData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                applications = JSON.parse(stored);
                // 兼容旧数据格式
                applications = applications.map(app => {
                    if (app.事件 && Array.isArray(app.事件)) {
                        app.事件 = app.事件.map(ev => ({
                            日期: ev.日期,
                            类型: ev.类型 || (ev.事件名称 || '投递'),
                            备注: ev.备注 || ''
                        }));
                    }
                    return app;
                });
            } catch {
                applications = [];
            }
        } else {
            applications = []; // 无示例数据
        }
    }

    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    }

    function genId() { return Date.now() + '-' + Math.random().toString(36).substring(2, 8); }

    // ---------- 渲染看板统计 ----------
    function renderStats() {
        const total = applications.length;
        const statusCount = { '已投递':0, '初筛':0, '面试':0, 'offer':0, '拒绝':0 };
        applications.forEach(app => { if (statusCount.hasOwnProperty(app.状态)) statusCount[app.状态]++; });

        let html = '';
        html += `<div class="stat-item ${currentFilterStatus === null ? 'active' : ''}" data-status="all"><div class="stat-number">${total}</div><div class="stat-label">全部</div></div>`;
        ['已投递','初筛','面试','offer','拒绝'].forEach(st => {
            html += `<div class="stat-item ${currentFilterStatus === st ? 'active' : ''}" data-status="${st}"><div class="stat-number">${statusCount[st]}</div><div class="stat-label">${st}</div></div>`;
        });
        statCardsDiv.innerHTML = html;

        document.querySelectorAll('.stat-item').forEach(card => {
            card.addEventListener('click', (e) => {
                const status = card.dataset.status;
                currentFilterStatus = status === 'all' ? null : status;
                renderStats();
                renderRecordList();
            });
        });
    }

    // 获取所有拍平事件 (用于近期动态)
    function getAllEvents() {
        const events = [];
        applications.forEach(app => {
            if (app.事件 && Array.isArray(app.事件)) {
                app.事件.forEach(ev => {
                    events.push({
                        记录id: app.id,
                        公司: app.公司,
                        岗位: app.岗位,
                        类型: ev.类型,
                        日期: ev.日期,
                        备注: ev.备注 || ''
                    });
                });
            }
        });
        return events.sort((a,b) => (a.日期 > b.日期 ? -1 : (a.日期 < b.日期 ? 1 : 0)));
    }

    // 近期动态 (最近5条)
    function renderRecentTimeline() {
        const allEvents = getAllEvents();
        const recent = allEvents.slice(0,5);
        recentTimelineDiv.innerHTML = recent.length ? recent.map(ev => `
            <div class="timeline-item" data-record-id="${ev.记录id}">
                <div class="event-main">
                    <span class="event-company">${ev.公司}</span>
                    <span class="event-position">${ev.岗位}</span>
                    <span class="event-name">${ev.类型}</span>
                    ${ev.备注 ? '<span class="event-remark">📎'+ev.备注.substring(0,8)+'…</span>' : ''}
                </div>
                <div class="event-date">📅 ${ev.日期}</div>
            </div>
        `).join('') : '<div style="padding:1rem;">暂无动态</div>';

        document.querySelectorAll('#recentTimeline .timeline-item').forEach(item => {
            item.addEventListener('click', () => {
                const rid = item.dataset.recordId;
                if (rid) showDetail(rid);
            });
        });
    }

    // 渲染记录列表（按筛选）
    function renderRecordList() {
        let filtered = applications;
        if (currentFilterStatus) {
            filtered = applications.filter(app => app.状态 === currentFilterStatus);
        }
        if (!filtered.length) {
            recordListContainer.innerHTML = '<div style="padding:1rem;">暂无记录</div>';
            return;
        }
        let html = '';
        filtered.forEach(app => {
            html += `<div class="record-row">
                <div class="record-info">
                    <span class="record-company">${app.公司}</span>
                    <span>${app.岗位}</span>
                    <span class="record-status">${app.状态}</span>
                    <span>📅 ${app.投递日期}</span>
                </div>
                <button class="detail-btn" data-id="${app.id}">详情</button>
            </div>`;
        });
        recordListContainer.innerHTML = html;
        recordListContainer.querySelectorAll('.detail-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                showDetail(btn.dataset.id);
            });
        });
    }

    // 获取事件图标
    function getIconForType(type) {
        const map = {
            '投递': '📮', '线上测试': '🧪', '一面': '①', '二面': '②', '三面': '③', 'offer': '🎉', '被挂': '❌'
        };
        return map[type] || '📌';
    }

    // 渲染公司视图
    function renderCompanyView() {
        const companies = {};
        applications.forEach(app => {
            if (!companies[app.公司]) companies[app.公司] = [];
            companies[app.公司].push(app);
        });
        const sortedCompanies = Object.keys(companies).sort();
        if (sortedCompanies.length === 0) {
            companyListContainer.innerHTML = '<div style="padding:1rem;">暂无公司记录</div>';
            return;
        }
        let html = '';
        sortedCompanies.forEach(company => {
            const records = companies[company];
            html += `
                <div class="company-group">
                    <div class="company-header">
                        <span class="toggle-icon">▼</span>
                        <span>${company} (${records.length})</span>
                    </div>
                    <div class="company-records" style="display: block;">
            `;
            records.forEach(rec => {
                html += `
                    <div class="company-record-item" data-id="${rec.id}">
                        <span class="position-info">${rec.岗位}</span>
                        <span class="status-badge">${rec.状态}</span>
                        <span>📅 ${rec.投递日期}</span>
                    </div>
                `;
            });
            html += `</div></div>`;
        });
        companyListContainer.innerHTML = html;

        // 折叠/展开
        document.querySelectorAll('.company-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const group = header.closest('.company-group');
                const recordsDiv = group.querySelector('.company-records');
                const icon = header.querySelector('.toggle-icon');
                if (recordsDiv.style.display === 'none') {
                    recordsDiv.style.display = 'block';
                    icon.textContent = '▼';
                } else {
                    recordsDiv.style.display = 'none';
                    icon.textContent = '▶';
                }
            });
        });
        // 点击记录跳转详情
        document.querySelectorAll('.company-record-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                if (id) showDetail(id);
            });
        });
    }

    // 渲染全览时间线（每个记录一个卡片，展示其所有事件）
    function renderGlobalTimeline() {
        if (!applications.length) {
            globalTimelineCards.innerHTML = '<div style="padding:1rem;">暂无投递记录</div>';
            return;
        }
        // 按投递日期倒序排列记录
        const sortedApps = [...applications].sort((a,b) => (a.投递日期 > b.投递日期 ? -1 : 1));
        let html = '';
        sortedApps.forEach(app => {
            // 该记录的事件按日期升序排列
            const events = (app.事件 || []).sort((a,b) => (a.日期 > b.日期 ? 1 : -1));
            let eventsHtml = '';
            events.forEach(ev => {
                eventsHtml += `
                    <div class="timeline-event-row">
                        <span class="event-icon">${getIconForType(ev.类型)}</span>
                        <span class="event-type">${ev.类型}</span>
                        <span class="event-remark">${ev.备注 || ''}</span>
                        <span class="event-date">${ev.日期}</span>
                    </div>
                `;
            });
            html += `
                <div class="timeline-record-card" data-id="${app.id}">
                    <div class="timeline-card-header">
                        <span class="company">${app.公司}</span>
                        <span class="position">${app.岗位}</span>
                        <span class="status">${app.状态}</span>
                        <span class="date">📅 投递: ${app.投递日期}</span>
                    </div>
                    <div class="timeline-card-events">
                        ${eventsHtml || '<div style="padding:0.5rem; color:#aaa;">暂无事件</div>'}
                    </div>
                </div>
            `;
        });
        globalTimelineCards.innerHTML = html;
        // 点击卡片跳转详情
        document.querySelectorAll('.timeline-record-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                if (id) showDetail(id);
            });
        });
    }

    // 思维导图式时间线渲染 (单个记录详情页用)
    function renderMindFlow(events) {
        if (!events || events.length === 0) return '<p>暂无时间线事件</p>';
        const sorted = [...events].sort((a,b) => (a.日期 > b.日期 ? 1 : -1));
        let html = '<div class="mindflow-container">';
        let rejected = false;
        for (let ev of sorted) {
            if (rejected) break;
            const isReject = ev.类型 === '被挂';
            if (isReject) rejected = true;
            html += `
                <div class="mindflow-node">
                    <div class="node-icon">${getIconForType(ev.类型)}</div>
                    <div class="node-content ${isReject ? 'reject' : ''}">
                        <span class="node-type">${ev.类型}</span>
                        <span class="node-remark">${ev.备注 || ''}</span>
                        <span class="node-date">${ev.日期}</span>
                    </div>
                </div>
            `;
        }
        if (rejected) {
            html += '<div class="mindflow-interrupt">⛔ 流程已中断</div>';
        }
        html += '</div>';
        return html;
    }

    // 显示详情
    function showDetail(id) {
        const app = applications.find(a => a.id === id);
        if (!app) return;
        currentDetailId = id;
        const events = app.事件 || [];
        const mindflowHtml = renderMindFlow(events);

        detailContent.innerHTML = `
            <p><strong>公司</strong> ${app.公司}</p>
            <p><strong>岗位</strong> ${app.岗位}</p>
            <p><strong>投递日期</strong> ${app.投递日期}</p>
            <p><strong>状态</strong> ${app.状态}</p>
            <p><strong>地点</strong> ${app.地点 || '未填'}</p>
            <p><strong>JD文本</strong><br> ${(app.JD文本 || '无').replace(/\n/g,'<br>')}</p>
            <p><strong>JD链接</strong> ${app.JD链接 ? '<a class="jd-link" href="'+app.JD链接+'" target="_blank">'+app.JD链接+'</a>' : '无'}</p>
            <div><strong>⏳ 流程图谱</strong>${mindflowHtml}</div>
        `;
        detailModal.style.display = 'flex';
    }

    // 关闭所有模态框
    function closeModals() {
        formModal.style.display = 'none';
        detailModal.style.display = 'none';
    }

    // 打开新增模态框
    function openNewModal() {
        formModalTitle.innerText = '新增投递';
        recordIdField.value = '';
        document.getElementById('company').value = '';
        document.getElementById('position').value = '';
        document.getElementById('applyDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('status').value = '已投递';
        document.getElementById('location').value = '';
        document.getElementById('jdText').value = '';
        document.getElementById('jdLink').value = '';
        eventsContainer.innerHTML = '';
        addEventRow('投递', new Date().toISOString().split('T')[0], '');
        formModal.style.display = 'flex';
    }

    // 添加一行事件 (用于表单)
    function addEventRow(type = '投递', date = '', remark = '') {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'event-row';
        const selectOptions = EVENT_TYPES.map(t => `<option value="${t}" ${t===type?'selected':''}>${t}</option>`).join('');
        rowDiv.innerHTML = `
            <select class="event-type-select">${selectOptions}</select>
            <input type="date" class="event-date-input" value="${date}">
            <input type="text" class="event-remark-input" value="${remark}" placeholder="备注(可选)">
            <button type="button" class="remove-event">移除</button>
        `;
        rowDiv.querySelector('.remove-event').addEventListener('click', () => rowDiv.remove());
        eventsContainer.appendChild(rowDiv);
    }

    // 收集表单事件
    function collectEventsFromContainer() {
        const rows = document.querySelectorAll('#eventsContainer .event-row');
        const events = [];
        rows.forEach(row => {
            const type = row.querySelector('.event-type-select')?.value;
            const date = row.querySelector('.event-date-input')?.value;
            const remark = row.querySelector('.event-remark-input')?.value;
            if (type && date) events.push({ 类型: type, 日期: date, 备注: remark || '' });
        });
        return events;
    }

    // 保存记录
    function saveRecord(e) {
        e.preventDefault();
        const company = document.getElementById('company').value.trim();
        const position = document.getElementById('position').value.trim();
        const applyDate = document.getElementById('applyDate').value;
        const status = document.getElementById('status').value;
        if (!company || !position || !applyDate || !status) {
            alert('请填写公司、岗位、投递日期和状态');
            return;
        }

        const events = collectEventsFromContainer();
        if (events.length === 0) {
            alert('至少添加一个时间线事件');
            return;
        }

        const id = recordIdField.value || genId();
        const newRecord = {
            id,
            公司: company,
            岗位: position,
            投递日期: applyDate,
            状态: status,
            地点: document.getElementById('location').value.trim(),
            JD文本: document.getElementById('jdText').value,
            JD链接: document.getElementById('jdLink').value,
            事件: events
        };

        if (recordIdField.value) {
            const index = applications.findIndex(a => a.id === id);
            if (index !== -1) applications[index] = newRecord;
        } else {
            applications.push(newRecord);
        }

        saveData();
        closeModals();
        fullRender();
    }

    // 删除记录
    function deleteRecord(id) {
        if (!confirm('确认删除该条记录吗？')) return;
        applications = applications.filter(a => a.id !== id);
        saveData();
        closeModals();
        fullRender();
    }

    // 全渲染（所有视图）
    function fullRender() {
        if (dashboardView.classList.contains('active')) {
            renderStats();
            renderRecentTimeline();
            renderRecordList();
        }
        if (companyView.classList.contains('active')) {
            renderCompanyView();
        }
        if (timelineView.classList.contains('active')) {
            renderGlobalTimeline();
        }
    }

    // 填充表单用于编辑
    function fillFormForEdit(id) {
        const app = applications.find(a => a.id === id);
        if (!app) return;
        formModalTitle.innerText = '编辑投递';
        recordIdField.value = app.id;
        document.getElementById('company').value = app.公司 || '';
        document.getElementById('position').value = app.岗位 || '';
        document.getElementById('applyDate').value = app.投递日期 || new Date().toISOString().split('T')[0];
        document.getElementById('status').value = app.状态 || '已投递';
        document.getElementById('location').value = app.地点 || '';
        document.getElementById('jdText').value = app.JD文本 || '';
        document.getElementById('jdLink').value = app.JD链接 || '';
        eventsContainer.innerHTML = '';
        if (app.事件 && app.事件.length) {
            app.事件.forEach(ev => addEventRow(ev.类型, ev.日期, ev.备注));
        } else {
            addEventRow('投递', new Date().toISOString().split('T')[0], '');
        }
        formModal.style.display = 'flex';
    }

    // 视图切换
    function switchView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        navTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.view === viewId.replace('-view', '')) {
                tab.classList.add('active');
            }
        });
        // 渲染对应视图
        if (viewId === 'dashboard-view') {
            renderStats();
            renderRecentTimeline();
            renderRecordList();
        } else if (viewId === 'company-view') {
            renderCompanyView();
        } else if (viewId === 'timeline-view') {
            renderGlobalTimeline();
        }
    }

    // ---------- 事件绑定 ----------
    enterBtn.addEventListener('click', () => {
        setRandomBackground();
        initialScreen.style.display = 'none';
        mainApp.style.display = 'flex';
        loadData();
        switchView('dashboard-view');
    });

    // 导航点击
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const view = tab.dataset.view;
            switchView(view + '-view');
        });
    });

    closeFormBtn.addEventListener('click', closeModals);
    closeDetailBtn.addEventListener('click', closeModals);
    window.addEventListener('click', (e) => {
        if (e.target === formModal) closeModals();
        if (e.target === detailModal) closeModals();
    });

    openNewBtn.addEventListener('click', openNewModal);

    addEventBtn.addEventListener('click', () => {
        addEventRow('投递', new Date().toISOString().split('T')[0], '');
    });

    recordForm.addEventListener('submit', saveRecord);

    editFromDetail.addEventListener('click', () => {
        if (currentDetailId) {
            closeModals();
            fillFormForEdit(currentDetailId);
        }
    });

    deleteFromDetail.addEventListener('click', () => {
        if (currentDetailId) {
            deleteRecord(currentDetailId);
        }
    });

    // 预加载数据
    loadData();
})();
