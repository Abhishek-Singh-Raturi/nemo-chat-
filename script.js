document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeModal = document.getElementById('closeModal');
    const html = document.documentElement;
    const chatInput = document.querySelector('.chat-input');
    const newChatBtn = document.querySelector('.new-chat-btn');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const chatArea = document.querySelector('.chat-area');
    const welcomeSection = document.querySelector('.welcome-section');

    // State
    let conversations = JSON.parse(localStorage.getItem('nemo-conversations') || '[]');
    let currentConversation = [];
    let profiles = JSON.parse(localStorage.getItem('nemo-profiles') || '[]');
    let currentProfileId = localStorage.getItem('nemo-current-profile') || null;
    let tasks = JSON.parse(localStorage.getItem('nemo-tasks') || '[]');
    let calendarTasks = JSON.parse(localStorage.getItem('nemo-calendar-tasks') || '{}');
    let savedPrompts = JSON.parse(localStorage.getItem('nemo-prompts') || '[]');
    let userProfile = JSON.parse(localStorage.getItem('nemo-user-profile') || '{}');
    let attachedImage = null;
    let currentDate = new Date();
    let selectedDate = null;
    let deleteChatId = null;

    // Theme
    const themes = ['dark', 'light', 'cyber', 'cherry', 'midnight', 'aurora', 'ember'];
    let currentThemeIndex = 0;
    const savedTheme = localStorage.getItem('nemo-theme') || 'dark';
    html.setAttribute('data-theme', savedTheme);
    currentThemeIndex = themes.indexOf(savedTheme);

    if (themeToggle) themeToggle.addEventListener('click', () => {
        currentThemeIndex = (currentThemeIndex + 1) % themes.length;
        const newTheme = themes[currentThemeIndex];
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('nemo-theme', newTheme);
        showTooltip(`${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} Theme`);
    });

    function showTooltip(text) {
        const existing = document.querySelector('.theme-tooltip');
        if (existing) existing.remove();
        const tooltip = document.createElement('div');
        tooltip.className = 'theme-tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = 'position:fixed;top:60px;right:20px;padding:8px 14px;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:8px;color:var(--text-primary);font-size:13px;z-index:1000;animation:tooltipFade 2s ease forwards;';
        document.body.appendChild(tooltip);
        setTimeout(() => tooltip.remove(), 2000);
    }

    // Settings Modal
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('active');
        renderAll();
    });
    closeModal.addEventListener('click', () => settingsModal.classList.remove('active'));
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.remove('active');
    });

    // Modal Tabs
    document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
        });
    });

    // User Profile
    function loadUserProfile() {
        document.getElementById('userName').value = userProfile.name || '';
        document.getElementById('userBio').value = userProfile.bio || '';
        document.getElementById('profileInitial').textContent = (userProfile.name || 'J').charAt(0).toUpperCase();
        document.getElementById('headerUserName').textContent = userProfile.name || 'User';
        document.getElementById('welcomeUserName').textContent = userProfile.name || 'User';
        
        const headerAvatar = document.getElementById('headerAvatar');
        if (userProfile.avatar) {
            headerAvatar.innerHTML = `<img src="${userProfile.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            document.getElementById('profileAvatarLarge').innerHTML = `
                <img src="${userProfile.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">
                <button class="change-avatar-btn" id="changeAvatarBtn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </button>
            `;
        } else {
            headerAvatar.textContent = (userProfile.name || 'J').charAt(0).toUpperCase();
        }
        setupAvatarUpload();
    }

    function setupAvatarUpload() {
        const btn = document.getElementById('changeAvatarBtn');
        const input = document.getElementById('avatarInput');
        if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); input.click(); });
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    userProfile.avatar = event.target.result;
                    localStorage.setItem('nemo-user-profile', JSON.stringify(userProfile));
                    loadUserProfile();
                };
                reader.readAsDataURL(file);
            }
        });
    }

    document.getElementById('saveProfileBtn').addEventListener('click', () => {
        userProfile.name = document.getElementById('userName').value.trim() || 'User';
        userProfile.bio = document.getElementById('userBio').value.trim();
        localStorage.setItem('nemo-user-profile', JSON.stringify(userProfile));
        loadUserProfile();
        showTooltip('Profile saved!');
    });

    setupAvatarUpload();

    // API Profiles
    function renderProfiles() {
        const list = document.getElementById('profilesList');
        if (!profiles.length) {
            profiles.push({ id: Date.now().toString(), name: 'My API', provider: 'openai', apiKey: '', models: [{ id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable' }], customUrl: '', systemPrompt: 'You are Nemo, a friendly AI assistant created to help users. Always respond as Nemo. Never say you are created by OpenAI, Google, Anthropic, or any other company. Your name is Nemo and you were built to assist people with tasks, answer questions, and have conversations. Keep responses concise and helpful.' });
            saveProfiles();
        }
        if (!currentProfileId || !profiles.find(p => p.id === currentProfileId)) {
            currentProfileId = profiles[0].id;
            localStorage.setItem('nemo-current-profile', currentProfileId);
        }
        list.innerHTML = profiles.map(p => `
            <div class="profile-item ${p.id === currentProfileId ? 'active' : ''}" data-id="${p.id}">
                <div class="profile-icon">${p.name.charAt(0).toUpperCase()}</div>
                <div class="profile-info">
                    <div class="profile-name">${p.name}</div>
                    <div class="profile-provider">${p.provider} • ${p.models.length} models</div>
                </div>
                ${p.apiKey ? '<div class="profile-status"></div>' : ''}
                <button class="profile-delete-btn" data-id="${p.id}" title="Delete profile">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
        `).join('');
        list.querySelectorAll('.profile-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.profile-delete-btn')) return;
                currentProfileId = item.dataset.id;
                localStorage.setItem('nemo-current-profile', currentProfileId);
                renderProfiles();
                loadProfileForm();
                updateModelDropdown();
            });
        });
        list.querySelectorAll('.profile-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                if (profiles.length <= 1) return showTooltip('Cannot delete the only profile');
                profiles = profiles.filter(p => p.id !== id);
                if (currentProfileId === id) currentProfileId = profiles[0]?.id || null;
                localStorage.setItem('nemo-current-profile', currentProfileId);
                saveProfiles();
                renderProfiles();
                updateModelDropdown();
                showTooltip('Profile deleted');
            });
        });
        loadProfileForm();
    }

    function loadProfileForm() {
        const p = profiles.find(p => p.id === currentProfileId);
        if (!p) return;
        document.getElementById('profileName').value = p.name;
        document.getElementById('apiProvider').value = p.provider;
        document.getElementById('apiKey').value = p.apiKey;
        document.getElementById('customUrl').value = p.customUrl || '';
        document.getElementById('systemPrompt').value = p.systemPrompt || '';
        renderModels();
    }

    function renderModels() {
        const p = profiles.find(p => p.id === currentProfileId);
        const list = document.getElementById('modelsList');
        if (!p || !list) return;
        list.innerHTML = p.models.map((m, i) => `
            <div class="model-tag">
                <div class="model-tag-info">
                    <div class="model-tag-name">${m.name}</div>
                    <div class="model-tag-id">${m.id}</div>
                </div>
                <button class="model-tag-delete" data-index="${i}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        `).join('');
        list.querySelectorAll('.model-tag-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                p.models.splice(parseInt(btn.dataset.index), 1);
                saveProfiles();
                renderModels();
                updateModelDropdown();
            });
        });
    }

    document.getElementById('addProfileBtn').addEventListener('click', () => {
        const np = { id: Date.now().toString(), name: 'New Profile', provider: 'openai', apiKey: '', models: [{ id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable' }], customUrl: '', systemPrompt: '' };
        profiles.push(np);
        currentProfileId = np.id;
        saveProfiles();
        renderProfiles();
    });

    document.getElementById('deleteProfileBtn').addEventListener('click', () => {
        if (profiles.length <= 1) return showTooltip('Cannot delete the only profile');
        profiles = profiles.filter(p => p.id !== currentProfileId);
        currentProfileId = profiles[0].id;
        saveProfiles();
        renderProfiles();
        updateModelDropdown();
    });

    document.getElementById('saveSettings').addEventListener('click', () => {
        const p = profiles.find(p => p.id === currentProfileId);
        if (!p) return;
        p.name = document.getElementById('profileName').value.trim() || 'Unnamed';
        p.provider = document.getElementById('apiProvider').value;
        p.apiKey = document.getElementById('apiKey').value.trim();
        p.customUrl = document.getElementById('customUrl').value.trim();
        p.systemPrompt = document.getElementById('systemPrompt').value.trim();
        saveProfiles();
        renderProfiles();
        updateModelDropdown();
        
        if (!p.apiKey) {
            showTooltip('Please add API key');
        } else if (p.models.length === 0) {
            showTooltip('Now add your models!');
        } else {
            showTooltip('Profile saved! Select a model');
        }
    });

    document.getElementById('togglePassword').addEventListener('click', () => {
        const i = document.getElementById('apiKey');
        i.type = i.type === 'password' ? 'text' : 'password';
    });

    // Add Model Modal
    const addModelModal = document.getElementById('addModelModal');
    const modelProviderSelect = document.getElementById('modelProviderSelect');
    const predefinedModels = document.getElementById('predefinedModels');
    const customModelForm = document.getElementById('customModelForm');
    
    const predefinedModelsData = {
        openai: [
            { id: 'gpt-4o', name: 'GPT-4o', desc: 'Most capable, best for complex tasks' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Fast & affordable, great for most tasks' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', desc: 'Powerful with vision' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', desc: 'Budget friendly, quick responses' }
        ],
        anthropic: [
            { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', desc: 'Latest & most capable' },
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', desc: 'Great balance of speed & quality' },
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', desc: 'Fastest, most affordable' }
        ],
        gemini: [
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', desc: 'Latest, fastest' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'Advanced reasoning' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Quick & efficient' }
        ],
        groq: [
            { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', desc: 'Open source, powerful' },
            { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', desc: 'Fast inference' },
            { id: 'gemma2-9b-it', name: 'Gemma 2 9B', desc: 'Lightweight & fast' }
        ],
        openrouter: [
            { id: 'openai/gpt-4o', name: 'GPT-4o (OpenRouter)', desc: 'Via OpenRouter' },
            { id: 'anthropic/claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (OR)', desc: 'Via OpenRouter' },
            { id: 'meta-llama/llama-3.3-70b-versatile', name: 'Llama 3.3 (OR)', desc: 'Via OpenRouter' },
            { id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 (OR)', desc: 'Via OpenRouter' }
        ]
    };

    document.getElementById('addModelBtn').addEventListener('click', () => {
        modelProviderSelect.value = '';
        predefinedModels.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:20px;">Select a provider above to see available models</p>';
        customModelForm.style.display = 'none';
        addModelModal.classList.add('active');
    });
    
    document.getElementById('closeModelModal').addEventListener('click', () => addModelModal.classList.remove('active'));
    addModelModal.addEventListener('click', (e) => { if (e.target === addModelModal) addModelModal.classList.remove('active'); });
    
    modelProviderSelect.addEventListener('change', () => {
        const provider = modelProviderSelect.value;
        if (!provider) {
            predefinedModels.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:20px;">Select a provider above to see available models</p>';
            customModelForm.style.display = 'none';
            return;
        }
        
        if (provider === 'custom') {
            predefinedModels.innerHTML = '';
            customModelForm.style.display = 'block';
            return;
        }
        
        customModelForm.style.display = 'none';
        const models = predefinedModelsData[provider] || [];
        const p = profiles.find(p => p.id === currentProfileId);
        const existingIds = p ? p.models.map(m => m.id) : [];
        
        predefinedModels.innerHTML = models.map(m => {
            const alreadyAdded = existingIds.includes(m.id);
            return `
                <div class="predefined-model-item ${alreadyAdded ? 'already-added' : ''}" data-id="${m.id}" data-name="${m.name}" data-desc="${m.desc}">
                    <div class="predefined-icon">${m.name.charAt(0)}</div>
                    <div class="predefined-info">
                        <div class="predefined-name">${m.name}</div>
                        <div class="predefined-desc">${m.desc}</div>
                    </div>
                    <span class="predefined-badge ${alreadyAdded ? 'added' : ''}">${alreadyAdded ? 'Added' : '+ Add'}</span>
                </div>
            `;
        }).join('');
        
        predefinedModels.querySelectorAll('.predefined-model-item:not(.already-added)').forEach(item => {
            item.addEventListener('click', () => {
                const p = profiles.find(p => p.id === currentProfileId);
                p.models.push({
                    id: item.dataset.id,
                    name: item.dataset.name,
                    description: item.dataset.desc
                });
                saveProfiles();
                renderModels();
                updateModelDropdown();
                item.classList.add('already-added');
                item.querySelector('.predefined-badge').textContent = 'Added';
                item.querySelector('.predefined-badge').classList.add('added');
                showTooltip(`${item.dataset.name} added!`);
            });
        });
    });
    
    document.getElementById('saveCustomModelBtn').addEventListener('click', () => {
        const p = profiles.find(p => p.id === currentProfileId);
        const name = document.getElementById('modelName').value.trim();
        const id = document.getElementById('modelId').value.trim();
        if (!name || !id) return showTooltip('Enter model name and ID');
        p.models.push({ id, name, description: 'Custom model' });
        saveProfiles();
        renderModels();
        updateModelDropdown();
        addModelModal.classList.remove('active');
        showTooltip('Model added! Select it from dropdown');
    });

    // Tasks
    function renderTasks() {
        const list = document.getElementById('tasksList');
        list.innerHTML = tasks.map((t, i) => `
            <div class="task-item ${t.completed ? 'completed' : ''}" data-index="${i}">
                <div class="task-checkbox ${t.completed ? 'checked' : ''}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span class="task-text">${t.text}</span>
                <button class="task-delete" data-index="${i}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        `).join('');
        list.querySelectorAll('.task-checkbox').forEach(cb => {
            cb.addEventListener('click', () => {
                const idx = parseInt(cb.parentElement.dataset.index);
                tasks[idx].completed = !tasks[idx].completed;
                saveTasks();
                renderTasks();
            });
        });
        list.querySelectorAll('.task-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                tasks.splice(parseInt(btn.dataset.index), 1);
                saveTasks();
                renderTasks();
            });
        });
    }

    document.getElementById('addTaskBtn').addEventListener('click', () => {
        const text = prompt('Enter task:');
        if (text && text.trim()) {
            tasks.push({ text: text.trim(), completed: false });
            saveTasks();
            renderTasks();
        }
    });

    function saveTasks() { localStorage.setItem('nemo-tasks', JSON.stringify(tasks)); }

    // Calendar Toggle
    const calendarToggleBtn = document.getElementById('calendarToggleBtn');
    const calendarContent = document.getElementById('calendarContent');
    
    if (calendarToggleBtn && calendarContent) {
        calendarToggleBtn.addEventListener('click', () => {
            const isOpen = calendarContent.style.display !== 'none';
            calendarContent.style.display = isOpen ? 'none' : 'block';
            calendarToggleBtn.classList.toggle('active', !isOpen);
            if (!isOpen) {
                renderCalendar();
                renderCalendarTasks();
            }
        });
    }

    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const calMonth = document.getElementById('calMonth');
        if (calMonth) calMonth.textContent = `${monthNames[month]} ${year}`;
        
        const grid = document.getElementById('calendarGrid');
        if (!grid) return;
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        const today = new Date();
        
        grid.innerHTML = '';
        
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const div = document.createElement('div');
            div.className = 'cal-day other-month';
            div.textContent = day;
            grid.appendChild(div);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const div = document.createElement('div');
            div.className = 'cal-day';
            div.textContent = day;
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === day) div.classList.add('today');
            if (selectedDate === dateKey) div.classList.add('selected');
            if (calendarTasks[dateKey] && calendarTasks[dateKey].length > 0) div.classList.add('has-tasks');
            div.addEventListener('click', () => { selectedDate = dateKey; renderCalendar(); renderCalendarTasks(); });
            grid.appendChild(div);
        }
        
        const totalCells = grid.children.length;
        const remaining = 42 - totalCells;
        for (let day = 1; day <= remaining; day++) {
            const div = document.createElement('div');
            div.className = 'cal-day other-month';
            div.textContent = day;
            grid.appendChild(div);
        }
    }

    function renderCalendarTasks() {
        const list = document.getElementById('calendarTasksList');
        const dateLabel = document.getElementById('selectedDate');
        
        if (!selectedDate) {
            dateLabel.textContent = 'Select a date';
            list.innerHTML = '<div class="cal-task-item"><span class="cal-task-text" style="color:var(--text-tertiary)">No date selected</span></div>';
            return;
        }
        
        const tasks = calendarTasks[selectedDate] || [];
        const dateObj = new Date(selectedDate + 'T00:00:00');
        dateLabel.textContent = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        if (tasks.length === 0) {
            list.innerHTML = '<div class="cal-task-item"><span class="cal-task-text" style="color:var(--text-tertiary)">No tasks</span></div>';
            return;
        }
        
        list.innerHTML = tasks.map((t, i) => `
            <div class="cal-task-item">
                <div class="cal-task-dot"></div>
                <span class="cal-task-text">${t}</span>
                <button class="cal-task-delete" data-index="${i}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        `).join('');
        
        list.querySelectorAll('.cal-task-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                calendarTasks[selectedDate].splice(parseInt(btn.dataset.index), 1);
                if (calendarTasks[selectedDate].length === 0) delete calendarTasks[selectedDate];
                localStorage.setItem('nemo-calendar-tasks', JSON.stringify(calendarTasks));
                renderCalendar();
                renderCalendarTasks();
            });
        });
    }

    // Calendar Navigation
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const addTaskForDateBtn = document.getElementById('addTaskForDate');

    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    if (addTaskForDateBtn) addTaskForDateBtn.addEventListener('click', () => {
        if (!selectedDate) return showTooltip('Select a date first');
        const text = prompt('Enter task:');
        if (text && text.trim()) {
            if (!calendarTasks[selectedDate]) calendarTasks[selectedDate] = [];
            calendarTasks[selectedDate].push(text.trim());
            localStorage.setItem('nemo-calendar-tasks', JSON.stringify(calendarTasks));
            renderCalendar();
            renderCalendarTasks();
        }
    });

    // Model Dropdown
    function updateModelDropdown() {
        const p = profiles.find(p => p.id === currentProfileId);
        const menu = document.getElementById('modelDropdownMenu');
        const currentModelName = document.getElementById('currentModelName');
        if (!p || !menu) return;
        menu.innerHTML = `<div class="model-dropdown-header">${p.name}</div>`;
        const savedModel = localStorage.getItem('nemo-selected-model');
        
        if (p.models.length === 0) {
            menu.innerHTML += `<div class="model-dropdown-item" style="opacity:0.5;cursor:default;"><div class="model-info"><div class="model-name">No models added</div><div class="model-provider">Add models in Settings</div></div></div>`;
            currentModelName.textContent = 'Add Models';
            return;
        }
        
        p.models.forEach(m => {
            const item = document.createElement('div');
            item.className = 'model-dropdown-item' + (m.id === savedModel ? ' selected' : '');
            item.innerHTML = `<div class="model-icon-small">${m.name.charAt(0)}</div><div class="model-info"><div class="model-name">${m.name}</div><div class="model-provider">${m.description || m.id}</div></div>`;
            item.addEventListener('click', () => {
                localStorage.setItem('nemo-selected-model', m.id);
                currentModelName.textContent = m.name;
                menu.classList.remove('active');
                document.querySelectorAll('.model-dropdown-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                showTooltip(`Model: ${m.name}`);
            });
            menu.appendChild(item);
        });
        
        if (savedModel) {
            const m = p.models.find(m => m.id === savedModel);
            currentModelName.textContent = m ? m.name : 'Select Model';
        } else {
            currentModelName.textContent = 'Select Model';
        }
    }

    document.getElementById('modelSelectorBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('modelDropdownMenu');
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        updateModelDropdown();
        menu.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
        menu.style.left = rect.left + 'px';
        menu.style.right = 'auto';
        menu.style.top = 'auto';
        menu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.model-dropdown') && !e.target.closest('.model-dropdown-menu')) {
            document.getElementById('modelDropdownMenu')?.classList.remove('active');
        }
    });

    // Chat
    chatInput.addEventListener('input', () => { chatInput.style.height = 'auto'; chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px'; });
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    document.querySelector('.send-btn').addEventListener('click', sendMessage);

    const attachImageBtn = document.getElementById('attachImageBtn');
    const imageInput = document.getElementById('imageInput');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const previewImage = document.getElementById('previewImage');
    const removeImageBtn = document.getElementById('removeImageBtn');

    attachImageBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                attachedImage = event.target.result;
                previewImage.src = attachedImage;
                imagePreviewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
    removeImageBtn.addEventListener('click', () => { attachedImage = null; previewImage.src = ''; imagePreviewContainer.style.display = 'none'; imageInput.value = ''; });

    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message && !attachedImage) return;
        const profile = profiles.find(p => p.id === currentProfileId);
        if (!profile || !profile.apiKey) { showTooltip('Add API key in Settings'); settingsModal.classList.add('active'); renderProfiles(); return; }
        const selectedModel = localStorage.getItem('nemo-selected-model');
        if (!selectedModel || !profile.models.find(m => m.id === selectedModel)) { showTooltip('Select a model from dropdown'); return; }

        const userMessage = { role: 'user', content: message, image: attachedImage };
        currentConversation.push(userMessage);
        addMessageToUI('user', message, attachedImage);
        chatInput.value = ''; chatInput.style.height = 'auto';
        attachedImage = null; imagePreviewContainer.style.display = 'none'; imageInput.value = '';
        if (welcomeSection) welcomeSection.style.display = 'none';

        const loadingId = addLoadingMessage();
        try {
            const response = await callAPI(profile, currentConversation);
            removeLoadingMessage(loadingId);
            addMessageToUI('assistant', response);
            currentConversation.push({ role: 'assistant', content: response });
        } catch (error) {
            removeLoadingMessage(loadingId);
            console.error('API Error:', error);
            addMessageToUI('assistant', `Error: ${error.message}\n\nPlease check your API key and model selection in Settings.`);
        }
    }

    async function callAPI(profile, messages) {
        const selectedModel = localStorage.getItem('nemo-selected-model');
        const baseUrl = getApiUrl(profile, selectedModel);
        
        console.log('Calling API:', baseUrl, 'Model:', selectedModel);
        
        const headers = { 'Content-Type': 'application/json' };
        let body;
        let response;

        try {
            if (profile.provider === 'anthropic') {
                headers['x-api-key'] = profile.apiKey;
                headers['anthropic-version'] = '2023-06-01';
                headers['anthropic-dangerous-direct-browser-access'] = 'true';
                body = { 
                    model: selectedModel, 
                    max_tokens: 1024, 
                    messages: messages.filter(m => m.role !== 'system').map(m => ({ 
                        role: m.role, 
                        content: m.image ? [
                            { type: 'text', text: m.content },
                            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: m.image.split(',')[1] } }
                        ] : m.content 
                    }))
                };
                if (profile.systemPrompt) body.system = profile.systemPrompt;
                
                response = await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(body) });
                
            } else if (profile.provider === 'gemini') {
                const gm = [];
                if (profile.systemPrompt) {
                    gm.push({ role: 'user', parts: [{ text: profile.systemPrompt }] });
                    gm.push({ role: 'model', parts: [{ text: 'Understood.' }] });
                }
                messages.forEach(m => {
                    const parts = [];
                    if (m.content) parts.push({ text: m.content });
                    if (m.image) parts.push({ inline_data: { mime_type: 'image/jpeg', data: m.image.split(',')[1] } });
                    gm.push({ role: m.role === 'assistant' ? 'model' : 'user', parts });
                });
                body = { contents: gm, generationConfig: { maxOutputTokens: 1024 } };
                
                response = await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(body) });
                
            } else {
                // OpenAI compatible (OpenAI, Groq, OpenRouter)
                headers['Authorization'] = `Bearer ${profile.apiKey}`;
                const am = [];
                if (profile.systemPrompt) am.push({ role: 'system', content: profile.systemPrompt });
                messages.forEach(m => {
                    if (m.image) {
                        am.push({
                            role: m.role,
                            content: [
                                { type: 'text', text: m.content },
                                { type: 'image_url', image_url: { url: m.image } }
                            ]
                        });
                    } else {
                        am.push({ role: m.role, content: m.content });
                    }
                });
                body = { model: selectedModel, messages: am, max_tokens: 1024, temperature: 0.7 };
                
                response = await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(body) });
            }

            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errText = await response.text();
                console.error('Error response:', errText);
                let err;
                try { err = JSON.parse(errText); } catch(e) { err = { error: { message: errText } }; }
                throw new Error(err.error?.message || err.message || `API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('Response data:', data);
            
            if (profile.provider === 'anthropic') return data.content[0].text;
            if (profile.provider === 'gemini') return data.candidates[0].content.parts[0].text;
            return data.choices[0].message.content;
            
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error - Check your internet connection or API URL');
            }
            throw error;
        }
    }

    function getApiUrl(profile, model) {
        if (profile.customUrl) return profile.customUrl;
        
        const urls = {
            openai: 'https://api.openai.com/v1/chat/completions',
            anthropic: 'https://api.anthropic.com/v1/messages',
            gemini: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${profile.apiKey}`,
            groq: 'https://api.groq.com/openai/v1/chat/completions',
            openrouter: 'https://openrouter.ai/api/v1/chat/completions'
        };
        
        return urls[profile.provider] || urls.openai;
    }

    function addMessageToUI(role, content, image = null) {
        const container = document.querySelector('.chat-messages') || createMessagesContainer();
        const div = document.createElement('div');
        div.className = `message ${role}`;
        const avatarText = role === 'user' ? (userProfile.name || 'J').charAt(0) : '';
        const imageHtml = image ? `<div class="message-image"><img src="${image}" alt="Attached"></div>` : '';
        const nemoFace = role === 'assistant' ? `<div class="mini-eyes"><div class="mini-eye left"><div class="mini-pupil"></div></div><div class="mini-eye right"><div class="mini-pupil"></div></div></div>` : '';
        const copyBtn = role === 'assistant' ? `<button class="copy-msg-btn" title="Copy"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>` : '';
        div.innerHTML = `<div class="message-avatar">${avatarText}${nemoFace}</div><div class="message-bubble">${imageHtml}<div class="message-content">${escapeHtml(content)}</div>${copyBtn}</div>`;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        
        if (copyBtn) {
            div.querySelector('.copy-msg-btn').addEventListener('click', () => {
                const textOnly = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '').trim();
                navigator.clipboard.writeText(textOnly);
                showTooltip('Text copied!');
            });
        }
        
        // Add has-messages class to move input to bottom
        chatArea.classList.add('has-messages');
    }

    function createMessagesContainer() {
        const c = document.createElement('div');
        c.className = 'chat-messages';
        chatArea.insertBefore(c, chatArea.querySelector('.input-section'));
        return c;
    }

    function addLoadingMessage() {
        const c = document.querySelector('.chat-messages') || createMessagesContainer();
        const id = 'loading-' + Date.now();
        const d = document.createElement('div');
        d.className = 'message assistant'; d.id = id;
        d.innerHTML = '<div class="message-avatar"><div class="mini-eyes"><div class="mini-eye left"><div class="mini-pupil"></div></div><div class="mini-eye right"><div class="mini-pupil"></div></div></div></div><div class="message-bubble"><div class="message-content"><div class="loading-dots"><span></span><span></span><span></span></div></div></div>';
        c.appendChild(d); c.scrollTop = c.scrollHeight;
        return id;
    }

    function removeLoadingMessage(id) { const el = document.getElementById(id); if (el) el.remove(); }
    function escapeHtml(text) {
        const codeBlocks = [];
        let processed = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
            const index = codeBlocks.length;
            codeBlocks.push({ lang, code: code.trim() });
            return `__CODEBLOCK_${index}__`;
        });
        processed = processed.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
        const d = document.createElement('div');
        d.textContent = processed;
        let html = d.innerHTML.replace(/\n/g, '<br>');
        codeBlocks.forEach((block, i) => {
            let highlighted = block.code;
            if (window.hljs && block.lang) {
                try { highlighted = hljs.highlight(block.code, { language: block.lang }).value; } catch(e) { highlighted = hljs.highlightAuto(block.code).value; }
            } else if (window.hljs) {
                highlighted = hljs.highlightAuto(block.code).value;
            }
            html = html.replace(`__CODEBLOCK_${i}__`, `<div class="code-block"><div class="code-header"><span class="code-lang">${block.lang || 'code'}</span><button class="copy-code-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block').querySelector('code').textContent);this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</button></div><pre><code class="hljs language-${block.lang || 'plaintext'}">${highlighted}</code></pre></div>`);
        });
        return html;
    }

    function saveConversation(firstMessage) {
        const title = firstMessage.substring(0, 30) + (firstMessage.length > 30 ? '...' : '');
        conversations.unshift({ id: Date.now(), title, messages: currentConversation, date: new Date().toISOString() });
        if (conversations.length > 50) conversations.pop();
        localStorage.setItem('nemo-conversations', JSON.stringify(conversations));
        renderHistory();
    }

    function renderHistory() {
        const container = document.getElementById('historyContainer');
        if (!container) return;
        container.innerHTML = '';
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const groups = { Today: [], Yesterday: [], Older: [] };
        conversations.forEach(c => {
            const d = new Date(c.date).toDateString();
            if (d === today) groups.Today.push(c);
            else if (d === yesterday) groups.Yesterday.push(c);
            else groups.Older.push(c);
        });
        Object.entries(groups).forEach(([label, items]) => {
            if (!items.length) return;
            const section = document.createElement('div');
            section.className = 'history-group';
            section.innerHTML = `<h3 class="history-label">${label}</h3>`;
            items.forEach(c => {
                const a = document.createElement('a');
                a.href = '#';
                a.className = 'history-item';
                a.innerHTML = `<span class="history-item-text">${c.title}</span><button class="history-delete-btn" data-id="${c.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>`;
                a.querySelector('.history-item-text').addEventListener('click', (e) => { e.preventDefault(); loadConversation(c); });
                a.querySelector('.history-delete-btn').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); deleteChat(c.id); });
                section.appendChild(a);
            });
            container.appendChild(section);
        });
    }

    function deleteChat(id) {
        deleteChatId = id;
        document.getElementById('deleteChatModal').classList.add('active');
    }

    document.getElementById('closeDeleteModal').addEventListener('click', () => document.getElementById('deleteChatModal').classList.remove('active'));
    document.getElementById('cancelDelete').addEventListener('click', () => document.getElementById('deleteChatModal').classList.remove('active'));
    document.getElementById('deleteChatModal').addEventListener('click', (e) => { if (e.target.id === 'deleteChatModal') document.getElementById('deleteChatModal').classList.remove('active'); });
    document.getElementById('confirmDelete').addEventListener('click', () => {
        conversations = conversations.filter(c => c.id !== deleteChatId);
        localStorage.setItem('nemo-conversations', JSON.stringify(conversations));
        document.getElementById('deleteChatModal').classList.remove('active');
        renderHistory();
        showTooltip('Chat deleted');
    });

    document.getElementById('deleteAllHistoryBtn').addEventListener('click', () => {
        if (conversations.length === 0) return showTooltip('No history to delete');
        if (!confirm('Delete all chat history? This cannot be undone.')) return;
        conversations = [];
        localStorage.setItem('nemo-conversations', JSON.stringify(conversations));
        renderHistory();
        showTooltip('All history deleted');
    });

    function loadConversation(c) {
        currentConversation = c.messages;
        let container = document.querySelector('.chat-messages');
        if (!container) container = createMessagesContainer();
        container.innerHTML = '';
        if (welcomeSection) welcomeSection.style.display = 'none';
        chatArea.classList.add('has-messages');
        
        // Render all messages
        c.messages.forEach(m => addMessageToUI(m.role, m.content, m.image));
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    function renderAll() {
        loadUserProfile();
        renderProfiles();
        renderTasks();
        renderHistory();
        updateModelDropdown();
    }

    newChatBtn.addEventListener('click', () => {
        // Save current conversation if it has messages
        if (currentConversation.length > 0) {
            const firstMsg = currentConversation[0]?.content || 'Chat';
            saveConversation(firstMsg);
        }
        // Start fresh conversation
        currentConversation = [];
        const c = document.querySelector('.chat-messages');
        if (c) c.innerHTML = '';
        if (welcomeSection) {
            welcomeSection.style.display = '';
            chatArea.classList.remove('has-messages');
        }
        chatInput.focus();
    });

    mobileMenuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) sidebar.classList.remove('open');
    });

    document.querySelector('.export-btn').addEventListener('click', () => {
        if (!currentConversation.length) return showTooltip('No messages to export');
        const text = currentConversation.map(m => `${m.role === 'user' ? (userProfile.name || 'You') : 'Nemo'}: ${m.content}`).join('\n\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `nemo-chat-${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
    });

    document.querySelector('.search-box input').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('.history-item-text').forEach(item => {
            item.closest('.history-item').style.display = item.textContent.toLowerCase().includes(q) || !q ? 'flex' : 'none';
        });
    });

    function saveProfiles() { localStorage.setItem('nemo-profiles', JSON.stringify(profiles)); }

    // Donate Popup
    const donateOverlay = document.getElementById('donateOverlay');
    const donateBtn = document.getElementById('donateBtn');
    const donateClose = document.getElementById('donateClose');

    if (donateOverlay && donateBtn && donateClose) {
        setTimeout(() => {
            donateOverlay.classList.add('active');
        }, 1500);

        donateBtn.addEventListener('click', () => {
            donateOverlay.classList.add('active');
        });

        donateClose.addEventListener('click', (e) => {
            e.stopPropagation();
            donateOverlay.classList.remove('active');
        });

        donateOverlay.addEventListener('click', (e) => {
            if (e.target === donateOverlay) {
                donateOverlay.classList.remove('active');
            }
        });
    }

    // Nemo eyes follow mouse
    document.addEventListener('mousemove', (e) => {
        const pupils = document.querySelectorAll('.nemo-pupil');
        pupils.forEach(pupil => {
            const eye = pupil.parentElement;
            const rect = eye.getBoundingClientRect();
            const eyeX = rect.left + rect.width / 2;
            const eyeY = rect.top + rect.height / 2;
            const angle = Math.atan2(e.clientY - eyeY, e.clientX - eyeX);
            const distance = Math.min(4, Math.hypot(e.clientX - eyeX, e.clientY - eyeY) / 20);
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            pupil.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        });
    });

    renderAll();
});
