/**
 * UIManager - Оптимизированный менеджер пользовательского интерфейса
 */

class UIManager {
    constructor() {
        this.elements = new Map();
        this.eventListeners = new Map();
        this.thinkingElements = new Map();
        this.toasts = new Set();
        this.messageCount = 0;
        this.isMobile = false;
        this.theme = 'dark';
        
        this.init();
    }

    async init() {
        try {
            console.log('🎨 Инициализация UI...');
            
            await this.cacheElements();
            this.setupEventListeners();
            this.setupTheme();
            this.setupAccessibility();
            this.checkResponsive();
            this.loadState();
            
            console.log('✅ UI инициализирован');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации UI:', error);
        }
    }

    async cacheElements() {
        const elementSelectors = {
            // Toast и onboarding
            'toastContainer': '#toastContainer',
            'onboardingOverlay': '#onboardingOverlay',
            'startBtn': '#startBtn',
            
            // Статус
            'apiStatus': '#apiStatus',
            'micStatus': '#micStatus',
            'voiceStatusDot': '#voiceStatusDot',
            'memoryStatus': '#memoryStatus',
            
            // API настройки
            'apiKeyInput': '#apiKeyInput',
            'saveApiKey': '#saveApiKey',
            'mistralBtn': '#mistralBtn',
            'openaiBtn': '#openaiBtn',
            
            // Настройки голоса
            'voiceSelect': '#voiceSelect',
            'rateInput': '#rateInput',
            'pitchInput': '#pitchInput',
            'volumeInput': '#volumeInput',
            'rateValue': '#rateValue',
            'pitchValue': '#pitchValue',
            'volumeValue': '#volumeValue',
            'testVoiceBtn': '#testVoiceBtn',
            
            // Голосовое управление
            'voiceButton': '#voiceButton',
            'voiceStatusText': '#voiceStatusText',
            
            // Чат
            'chatContainer': '#chatContainer',
            'clearChatBtn': '#clearChatBtn',
            'exportChatBtn': '#exportChatBtn',
            'textInput': '#textInput',
            'sendTextBtn': '#sendTextBtn',
            'welcomeTime': '#welcomeTime',
            
            // Память
            'memoryBtn': '#memoryBtn',
            'memoryBadge': '#memoryBadge',
            'conversationMemory': '#conversationMemory',
            
            // Модальные окна
            'memoryModal': '#memoryModal',
            'closeMemoryModal': '#closeMemoryModal',
            'exportMemoryBtn': '#exportMemoryBtn',
            'clearMemoryBtn': '#clearMemoryBtn',
            'syncMemoryBtn': '#syncMemoryBtn',
            'exportDataBtn': '#exportDataBtn',
            'memoryList': '#memoryList',
            'memoryCount': '#memoryCount',
            'memorySize': '#memorySize',
            'helpBtn': '#helpBtn'
        };

        await this.delay(100);
        
        for (const [name, selector] of Object.entries(elementSelectors)) {
            const element = document.querySelector(selector);
            if (element) {
                this.elements.set(name, element);
            }
        }
        
        console.log(`✅ Загружено ${this.elements.size} элементов`);
    }

    setupEventListeners() {
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
        
        this.setupFormListeners();
        this.setupVoiceListeners();
        this.setupChatListeners();
        this.setupModalListeners();
    }

    handleGlobalClick(event) {
        const target = event.target;
        
        if (target === this.elements.get('memoryModal')) {
            this.hideMemoryModal();
        }
        
        if (target.closest('.toast-close')) {
            const toast = target.closest('.toast');
            if (toast) {
                this.hideToast(toast);
            }
        }
    }

    handleGlobalKeydown(event) {
        if (event.key === 'Escape') {
            this.hideMemoryModal();
        }
        
        if (event.ctrlKey && event.key === 't') {
            event.preventDefault();
            this.toggleTheme();
        }
    }

    setupFormListeners() {
        const apiKeyInput = this.elements.get('apiKeyInput');
        const saveApiKey = this.elements.get('saveApiKey');
        
        if (apiKeyInput && saveApiKey) {
            apiKeyInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.emit('saveApiKey');
                }
            });
            
            saveApiKey.addEventListener('click', () => {
                this.emit('saveApiKey');
            });
        }
        
        const mistralBtn = this.elements.get('mistralBtn');
        const openaiBtn = this.elements.get('openaiBtn');
        
        if (mistralBtn && openaiBtn) {
            mistralBtn.addEventListener('click', () => this.emit('providerChange', 'mistral'));
            openaiBtn.addEventListener('click', () => this.emit('providerChange', 'openai'));
        }
    }

    setupVoiceListeners() {
        const voiceButton = this.elements.get('voiceButton');
        if (voiceButton) {
            voiceButton.addEventListener('click', () => this.emit('voiceToggle'));
        }
        
        const rateInput = this.elements.get('rateInput');
        const pitchInput = this.elements.get('pitchInput');
        const volumeInput = this.elements.get('volumeInput');
        const voiceSelect = this.elements.get('voiceSelect');
        const testVoiceBtn = this.elements.get('testVoiceBtn');
        
        if (rateInput) {
            rateInput.addEventListener('input', () => {
                this.updateRangeValue('rate');
                this.emitVoiceSettings();
            });
        }
        
        if (pitchInput) {
            pitchInput.addEventListener('input', () => {
                this.updateRangeValue('pitch');
                this.emitVoiceSettings();
            });
        }
        
        if (volumeInput) {
            volumeInput.addEventListener('input', () => {
                this.updateRangeValue('volume');
                this.emitVoiceSettings();
            });
        }
        
        if (voiceSelect) {
            voiceSelect.addEventListener('change', () => this.emitVoiceSettings());
        }
        
        if (testVoiceBtn) {
            testVoiceBtn.addEventListener('click', () => this.emit('voiceTest'));
        }
    }

    setupChatListeners() {
        const textInput = this.elements.get('textInput');
        const sendTextBtn = this.elements.get('sendTextBtn');
        const clearChatBtn = this.elements.get('clearChatBtn');
        const exportChatBtn = this.elements.get('exportChatBtn');
        
        if (textInput && sendTextBtn) {
            textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendTextMessage();
                }
            });
            
            sendTextBtn.addEventListener('click', () => this.sendTextMessage());
        }
        
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => this.emit('clearChat'));
        }
        
        if (exportChatBtn) {
            exportChatBtn.addEventListener('click', () => this.emit('exportChat'));
        }
    }

    setupModalListeners() {
        const memoryBtn = this.elements.get('memoryBtn');
        const closeMemoryModal = this.elements.get('closeMemoryModal');
        const exportMemoryBtn = this.elements.get('exportMemoryBtn');
        const clearMemoryBtn = this.elements.get('clearMemoryBtn');
        const syncMemoryBtn = this.elements.get('syncMemoryBtn');
        const exportDataBtn = this.elements.get('exportDataBtn');
        const helpBtn = this.elements.get('helpBtn');
        
        if (memoryBtn) {
            memoryBtn.addEventListener('click', () => this.showMemoryModal());
        }
        
        if (closeMemoryModal) {
            closeMemoryModal.addEventListener('click', () => this.hideMemoryModal());
        }
        
        if (exportMemoryBtn) {
            exportMemoryBtn.addEventListener('click', () => this.emit('exportMemory'));
        }
        
        if (clearMemoryBtn) {
            clearMemoryBtn.addEventListener('click', () => {
                if (confirm('Вы уверены, что хотите очистить всю память? Это действие нельзя отменить.')) {
                    this.emit('clearMemory');
                }
            });
        }
        
        if (syncMemoryBtn) {
            syncMemoryBtn.addEventListener('click', () => this.emit('syncMemory'));
        }
        
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.emit('exportData');
            });
        }
        
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                this.showToast('Для помощи откройте README.md или посетите документацию проекта', 'info');
            });
        }
    }

    setupTheme() {
        this.theme = localStorage.getItem('arisTheme') || 'dark';
        document.documentElement.setAttribute('data-theme', this.theme);
    }

    setupAccessibility() {
        const voiceButton = this.elements.get('voiceButton');
        if (voiceButton) {
            voiceButton.setAttribute('role', 'button');
            voiceButton.setAttribute('aria-label', 'Микрофон для голосового ввода');
            voiceButton.setAttribute('tabindex', '0');
        }
    }

    checkResponsive() {
        this.isMobile = window.innerWidth <= 768;
        document.body.classList.toggle('mobile', this.isMobile);
    }

    loadState() {
        try {
            const state = localStorage.getItem('arisUIState');
            if (state) {
                const parsed = JSON.parse(state);
                
                if (parsed.apiKey && this.elements.get('apiKeyInput')) {
                    this.elements.get('apiKeyInput').value = parsed.apiKey;
                }
                
                if (parsed.provider) {
                    this.updateProviderButtons(parsed.provider);
                }
                
                if (parsed.voiceSettings) {
                    const { voice, rate, pitch, volume } = parsed.voiceSettings;
                    
                    if (voice && this.elements.get('voiceSelect')) {
                        this.elements.get('voiceSelect').value = voice;
                    }
                    
                    if (rate && this.elements.get('rateInput')) {
                        this.elements.get('rateInput').value = rate;
                        this.updateRangeValue('rate');
                    }
                    
                    if (pitch && this.elements.get('pitchInput')) {
                        this.elements.get('pitchInput').value = pitch;
                        this.updateRangeValue('pitch');
                    }
                    
                    if (volume && this.elements.get('volumeInput')) {
                        this.elements.get('volumeInput').value = volume;
                        this.updateRangeValue('volume');
                    }
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки состояния UI:', error);
        }
    }

    saveState() {
        try {
            const state = {
                apiKey: this.elements.get('apiKeyInput')?.value || '',
                provider: this.elements.get('mistralBtn')?.classList.contains('active') ? 'mistral' : 'openai',
                voiceSettings: {
                    voice: this.elements.get('voiceSelect')?.value || '',
                    rate: this.elements.get('rateInput')?.value || 1,
                    pitch: this.elements.get('pitchInput')?.value || 1,
                    volume: this.elements.get('volumeInput')?.value || 1
                }
            };
            
            localStorage.setItem('arisUIState', JSON.stringify(state));
        } catch (error) {
            console.error('Ошибка сохранения состояния UI:', error);
        }
    }

    // ==== Toast уведомления ====

    showToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        toast.innerHTML = `
            <i class="fas fa-${icons[type]}" aria-hidden="true"></i>
            <div class="toast-message">${this.escapeHtml(message)}</div>
            <button class="toast-close" aria-label="Закрыть уведомление">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        const container = this.elements.get('toastContainer');
        if (container) {
            container.appendChild(toast);
            this.toasts.add(toast);
            
            requestAnimationFrame(() => {
                toast.classList.add('visible');
            });
            
            const autoHide = setTimeout(() => {
                this.hideToast(toast);
            }, duration);
            
            const closeBtn = toast.querySelector('.toast-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    clearTimeout(autoHide);
                    this.hideToast(toast);
                });
            }
            
            return toast;
        }
        
        return null;
    }

    hideToast(toast) {
        if (!toast || !toast.parentNode) return;
        
        toast.classList.remove('visible');
        toast.classList.add('hiding');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
                this.toasts.delete(toast);
            }
        }, 300);
    }

    // ==== Управление чатом ====

    addMessage(text, sender) {
        const chatContainer = this.elements.get('chatContainer');
        if (!chatContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.setAttribute('role', 'listitem');
        
        const now = new Date();
        const timeString = now.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const formattedText = this.formatMessageText(text);
        
        messageDiv.innerHTML = `
            <div class="message-bubble" role="article">${formattedText}</div>
            <div class="message-time" aria-label="Время сообщения">${timeString}</div>
        `;
        
        chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
        this.messageCount++;
        
        requestAnimationFrame(() => {
            messageDiv.classList.add('visible');
        });
    }

    formatMessageText(text) {
        if (!text) return '';
        
        let formatted = this.escapeHtml(text);
        
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        formatted = formatted.replace(urlRegex, url => 
            `<a href="${url}" target="_blank" rel="noopener noreferrer" class="message-link">${url}</a>`
        );
        
        formatted = formatted.replace(/\n/g, '<br>');
        
        const codeRegex = /`([^`]+)`/g;
        formatted = formatted.replace(codeRegex, '<code>$1</code>');
        
        return formatted;
    }

    showThinking() {
        const chatContainer = this.elements.get('chatContainer');
        if (!chatContainer) return null;
        
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'thinking thinking-animation';
        thinkingDiv.setAttribute('role', 'status');
        thinkingDiv.setAttribute('aria-label', 'ARIS думает');
        thinkingDiv.innerHTML = `
            <div class="thinking-dot" aria-hidden="true"></div>
            <div class="thinking-dot" aria-hidden="true"></div>
            <div class="thinking-dot" aria-hidden="true"></div>
            <span class="thinking-text">Думаю...</span>
        `;
        
        chatContainer.appendChild(thinkingDiv);
        this.scrollToBottom();
        
        const thinkingId = `thinking-${Date.now()}`;
        this.thinkingElements.set(thinkingId, thinkingDiv);
        
        return thinkingId;
    }

    removeThinking(thinkingId) {
        if (!thinkingId) return;
        
        const thinkingElement = this.thinkingElements.get(thinkingId);
        if (thinkingElement && thinkingElement.parentNode) {
            thinkingElement.remove();
            this.thinkingElements.delete(thinkingId);
        }
    }

    clearChat() {
        const chatContainer = this.elements.get('chatContainer');
        if (!chatContainer) return;
        
        if (chatContainer.children.length <= 1) {
            this.showToast('Нет сообщений для очистки', 'info');
            return;
        }

        if (confirm('Очистить историю текущего диалога? Это не затронет сохраненную память.')) {
            const welcomeMessage = chatContainer.children[0];
            
            while (chatContainer.children.length > 1) {
                chatContainer.removeChild(chatContainer.lastChild);
            }
            
            this.setWelcomeTime();
            this.messageCount = 0;
            this.thinkingElements.clear();
            this.showToast('История диалога очищена', 'success');
        }
    }

    exportChat() {
        const chatContainer = this.elements.get('chatContainer');
        if (!chatContainer) return;
        
        const messages = [];
        Array.from(chatContainer.children).forEach(msg => {
            const textElement = msg.querySelector('.message-bubble');
            const text = textElement ? textElement.textContent : '';
            const timeElement = msg.querySelector('.message-time');
            const time = timeElement ? timeElement.textContent : '';
            const sender = msg.classList.contains('user') ? 'Вы' : 'ARIS';
            messages.push(`[${time}] ${sender}: ${text}`);
        });
        
        if (messages.length === 0) {
            this.showToast('Нет сообщений для экспорта', 'info');
            return;
        }

        const content = messages.join('\n\n');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `ARIS_Диалог_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Диалог экспортирован', 'success');
    }

    sendTextMessage() {
        const textInput = this.elements.get('textInput');
        if (!textInput) return;
        
        const message = textInput.value.trim();
        if (!message) return;
        
        textInput.value = '';
        this.emit('textMessage', message);
        
        setTimeout(() => {
            textInput.focus();
        }, 100);
    }

    scrollToBottom() {
        const chatContainer = this.elements.get('chatContainer');
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }

    // ==== Модальные окна ====

    showMemoryModal() {
        const modal = this.elements.get('memoryModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            modal.focus();
            this.emit('memoryModalOpened');
        }
    }

    hideMemoryModal() {
        const modal = this.elements.get('memoryModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    }

    // ==== Настройки голоса ====

    updateVoiceSelect(voices) {
        const voiceSelect = this.elements.get('voiceSelect');
        if (!voiceSelect || !voices) return;
        
        const currentValue = voiceSelect.value;
        voiceSelect.innerHTML = '';
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Выберите голос...';
        voiceSelect.appendChild(defaultOption);
        
        const availableVoices = voices
            .filter(voice => voice.lang.startsWith('ru') || voice.lang.startsWith('en'))
            .sort((a, b) => {
                if (a.lang < b.lang) return -1;
                if (a.lang > b.lang) return 1;
                return a.name.localeCompare(b.name);
            });
        
        availableVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})`;
            voiceSelect.appendChild(option);
        });
        
        if (currentValue && voiceSelect.querySelector(`option[value="${currentValue}"]`)) {
            voiceSelect.value = currentValue;
        }
    }

    updateRangeValue(type) {
        const input = this.elements.get(`${type}Input`);
        const value = this.elements.get(`${type}Value`);
        
        if (input && value) {
            const numValue = parseFloat(input.value);
            value.textContent = numValue.toFixed(1);
        }
    }

    emitVoiceSettings() {
        const settings = {
            voice: this.elements.get('voiceSelect')?.value || '',
            rate: parseFloat(this.elements.get('rateInput')?.value) || 1,
            pitch: parseFloat(this.elements.get('pitchInput')?.value) || 1,
            volume: parseFloat(this.elements.get('volumeInput')?.value) || 1
        };
        
        this.emit('voiceSettingsChange', settings);
        this.saveState();
    }

    // ==== API управление ====

    updateApiInput(key) {
        const input = this.elements.get('apiKeyInput');
        if (input) {
            input.value = key;
        }
    }

    updateProviderButtons(provider) {
        const mistralBtn = this.elements.get('mistralBtn');
        const openaiBtn = this.elements.get('openaiBtn');
        const apiKeyInput = this.elements.get('apiKeyInput');
        
        if (mistralBtn && openaiBtn) {
            mistralBtn.classList.toggle('active', provider === 'mistral');
            openaiBtn.classList.toggle('active', provider === 'openai');
        }
        
        if (apiKeyInput) {
            apiKeyInput.placeholder = provider === 'mistral' 
                ? 'Введите ваш Mistral API ключ'
                : 'Введите ваш OpenAI API ключ';
        }
    }

    getApiKey() {
        const input = this.elements.get('apiKeyInput');
        return input ? input.value.trim() : '';
    }

    // ==== Управление статусом ====

    setVoiceStatus(status) {
        const voiceButton = this.elements.get('voiceButton');
        const voiceStatusText = this.elements.get('voiceStatusText');
        
        if (!voiceButton || !voiceStatusText) return;
        
        const statusTexts = {
            listening: '🎤 Слушаю... Говорите',
            idle: 'Нажмите микрофон для голосового ввода',
            error: '⚠️ Ошибка микрофона',
            processing: '⚙️ Обрабатываю речь...'
        };
        
        voiceButton.classList.toggle('active', status === 'listening');
        voiceButton.classList.toggle('listening', status === 'listening');
        voiceStatusText.textContent = statusTexts[status] || statusTexts.idle;
        
        voiceButton.setAttribute('aria-label', 
            status === 'listening' ? 'Микрофон активен. Говорите.' : 'Активировать микрофон');
    }

    // ==== Темы ====

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.theme);
        localStorage.setItem('arisTheme', this.theme);
        
        this.showToast(`Тема изменена на ${this.theme === 'dark' ? 'темную' : 'светлую'}`, 'info');
    }

    // ==== Onboarding ====

    showOnboarding() {
        const overlay = this.elements.get('onboardingOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            overlay.focus();
        }
    }

    hideOnboarding() {
        const overlay = this.elements.get('onboardingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
            document.body.style.overflow = 'auto';
            localStorage.setItem('arisHasVisited', 'true');
            this.showToast('Добро пожаловать в ARIS!', 'success');
        }
    }

    checkFirstVisit() {
        const hasVisited = localStorage.getItem('arisHasVisited');
        if (!hasVisited) {
            setTimeout(() => this.showOnboarding(), 1000);
        }
    }

    // ==== Вспомогательные методы ====

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setWelcomeTime() {
        const welcomeTime = this.elements.get('welcomeTime');
        if (welcomeTime) {
            const now = new Date();
            welcomeTime.textContent = now.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ==== Event Emitter ====

    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        if (!this.eventListeners.has(event)) return;
        
        this.eventListeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Ошибка в обработчике события ${event}:`, error);
            }
        });
    }

    off(event, callback) {
        if (!this.eventListeners.has(event)) return;
        
        const listeners = this.eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index !== -1) {
            listeners.splice(index, 1);
        }
    }

    destroy() {
        this.clearAllToasts();
        
        document.removeEventListener('click', this.handleGlobalClick);
        document.removeEventListener('keydown', this.handleGlobalKeydown);
        
        this.elements.clear();
        this.eventListeners.clear();
        this.thinkingElements.clear();
        this.toasts.clear();
        
        console.log('🗑️ UIManager уничтожен');
    }

    clearAllToasts() {
        this.toasts.forEach(toast => this.hideToast(toast));
        this.toasts.clear();
    }
}

// Экспортируем глобальный экземпляр
if (!window.uiManager) {
    window.uiManager = new UIManager();
}
