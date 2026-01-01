/**
 * ARIS - Главный модуль приложения
 * Полностью переработанный и оптимизированный
 */

(function() {
    'use strict';

    class ARISApp {
        constructor() {
            this.isProcessing = false;
            this.currentSessionId = this.generateSessionId();
            this.components = {};
            this.init();
        }

        async init() {
            try {
                console.log('🚀 Инициализация ARIS...');
                
                // 1. Сначала инициализируем базу данных
                await this.initializeDatabase();
                
                // 2. Затем инициализируем все компоненты в правильном порядке
                this.initComponents();
                await this.loadComponents();
                
                // 3. Настройка остальных систем
                this.setupEventListeners();
                this.loadSavedData();
                this.setupObservers();
                this.updateStatusIndicators();
                this.setupPerformanceMonitoring();
                
                // 4. Проверяем первый визит
                setTimeout(() => this.components.ui.checkFirstVisit(), 1000);
                
                console.log('✅ ARIS успешно инициализирован');
                this.emit('app:ready');
                
            } catch (error) {
                console.error('❌ Ошибка инициализации ARIS:', error);
                this.showCriticalError('Ошибка инициализации приложения', error.message);
            }
        }

        async initializeDatabase() {
            return new Promise((resolve, reject) => {
                const checkDatabase = () => {
                    if (window.arisDatabase && window.arisDatabase.db) {
                        console.log('✅ База данных готова');
                        resolve();
                    } else if (window.arisDatabase && window.arisDatabase.initPromise) {
                        window.arisDatabase.initPromise.then(resolve).catch(reject);
                    } else {
                        setTimeout(checkDatabase, 100);
                    }
                };
                checkDatabase();
            });
        }

        initComponents() {
            this.components = {
                api: window.apiManager || new APIManager(),
                speech: window.speechManager || new SpeechManager(),
                ui: window.uiManager || new UIManager(),
                memory: window.memoryManager || new MemoryManager(),
                appLauncher: window.appLauncher || new AppLauncher(),
                database: window.arisDatabase
            };
        }

        async loadComponents() {
            const loadPromises = [
                this.components.ui.init().catch(e => console.error('UI ошибка:', e)),
                this.components.speech.init().catch(e => console.error('Speech ошибка:', e)),
                this.components.memory.init().catch(e => console.error('Memory ошибка:', e)),
                this.components.appLauncher.setupDefaultApps().catch(e => console.error('AppLauncher ошибка:', e))
            ];
            
            await Promise.allSettled(loadPromises);
            console.log('✅ Все компоненты загружены');
        }

        loadSavedData() {
            try {
                // API ключ
                const savedApiKey = localStorage.getItem('arisApiKey');
                const savedProvider = localStorage.getItem('aiProvider') || 'mistral';
                
                if (savedApiKey) {
                    this.components.api.setApiKey(savedApiKey);
                    this.components.api.setProvider(savedProvider);
                    
                    // Обновляем UI только после полной загрузки
                    setTimeout(() => {
                        if (this.components.ui.elements.has('apiKeyInput')) {
                            this.components.ui.updateApiInput(savedApiKey);
                            this.components.ui.updateProviderButtons(savedProvider);
                        }
                    }, 500);
                }
                
                // Тема
                const theme = localStorage.getItem('arisTheme') || 'dark';
                document.documentElement.setAttribute('data-theme', theme);
                
            } catch (error) {
                console.error('Ошибка загрузки сохраненных данных:', error);
            }
        }

        setupEventListeners() {
            // API события
            this.components.ui.on('saveApiKey', async () => {
                await this.handleApiKeySave();
            });

            this.components.ui.on('providerChange', (provider) => {
                this.components.api.setProvider(provider);
                this.components.ui.updateProviderButtons(provider);
            });

            // Голосовые события
            this.components.ui.on('voiceSettingsChange', (settings) => {
                this.components.speech.updateSettings(settings);
            });

            this.components.ui.on('voiceTest', async () => {
                await this.components.speech.testVoice();
            });

            this.components.ui.on('voiceToggle', () => {
                this.toggleVoiceRecognition();
            });

            // События чата
            this.components.ui.on('textMessage', async (message) => {
                await this.processUserMessage(message);
            });

            this.components.ui.on('clearChat', () => {
                this.components.ui.clearChat();
            });

            this.components.ui.on('exportChat', () => {
                this.components.ui.exportChat();
            });

            // Память
            this.components.ui.on('memoryModalOpened', () => {
                this.updateMemoryModal();
            });

            // Речевые события
            this.components.speech.on('recognitionStart', () => {
                this.components.ui.setVoiceStatus('listening');
            });

            this.components.speech.on('recognitionResult', async (transcript) => {
                this.components.ui.addMessage(transcript, 'user');
                await this.processUserMessage(transcript);
            });

            this.components.speech.on('recognitionError', (error) => {
                this.components.ui.showToast(error, 'error');
                this.components.ui.setVoiceStatus('error');
            });

            this.components.speech.on('recognitionEnd', () => {
                this.components.ui.setVoiceStatus('idle');
            });

            this.components.speech.on('voicesLoaded', (voices) => {
                this.components.ui.updateVoiceSelect(voices);
            });

            // Быстрые действия
            this.setupQuickActions();
        }

        async handleApiKeySave() {
            const key = this.components.ui.getApiKey();
            const provider = this.components.api.getCurrentProvider();
            
            if (!key.trim()) {
                this.components.ui.showToast('Введите API ключ', 'warning');
                return;
            }

            this.components.ui.showToast('Проверка ключа...', 'info');
            
            try {
                const isValid = await this.components.api.validateApiKey(provider, key);
                
                if (isValid) {
                    this.components.api.setApiKey(key);
                    this.components.ui.showToast('API ключ успешно сохранен', 'success');
                    this.updateStatusIndicators();
                    this.components.ui.addMessage('API ключ сохранен. Система готова к работе.', 'aris');
                } else {
                    this.components.ui.showToast('Неверный API ключ', 'error');
                }
            } catch (error) {
                this.components.ui.showToast('Ошибка проверки ключа: ' + error.message, 'error');
            }
        }

        toggleVoiceRecognition() {
            if (!this.components.api.hasApiKey()) {
                this.components.ui.showToast('Сначала сохраните API ключ', 'warning');
                return;
            }
            
            this.components.speech.toggleRecognition();
        }

        async processUserMessage(message) {
            if (this.isProcessing) {
                this.components.ui.showToast('Подождите, обрабатываю предыдущий запрос', 'warning');
                return;
            }

            this.isProcessing = true;
            
            try {
                const cleanMessage = this.cleanMessage(message);
                
                // Проверяем команды
                const command = this.components.memory.parseCommand(cleanMessage);
                if (command) {
                    await this.executeCommand(command, cleanMessage);
                } else {
                    await this.processWithAI(cleanMessage);
                }
            } catch (error) {
                console.error('Ошибка обработки сообщения:', error);
                this.handleProcessingError(error);
            } finally {
                this.isProcessing = false;
            }
        }

        async processWithAI(message) {
            const thinkingId = this.components.ui.showThinking();
            
            try {
                // Формируем промпт с контекстом
                const systemPrompt = await this.buildSystemPrompt();
                
                // Получаем ответ от AI
                const response = await this.components.api.getAIResponse(message, systemPrompt);
                
                // Убираем индикатор и показываем ответ
                this.components.ui.removeThinking(thinkingId);
                this.components.ui.addMessage(response, 'aris');
                
                // Сохраняем в память (ВАЖНО: перед озвучкой!)
                await this.components.memory.saveConversation(message, response);
                
                // Озвучиваем ответ
                await this.components.speech.say(response);
                
            } catch (error) {
                this.components.ui.removeThinking(thinkingId);
                this.handleAIError(error);
            }
        }

        async buildSystemPrompt() {
            let prompt = `Ты ARIS - интеллектуальный голосовой ассистент с памятью.
Версия: 2.1
Возможности:
1. Распознавание и синтез речи
2. Доступ к истории разговоров
3. Управление приложениями на компьютере
4. Запоминание проектов и задач

Твой характер: дружелюбный, полезный, точный
Язык: русский
Стиль ответа: краткий, информативный, естественный
Максимальная длина ответа: 3-5 предложений

Контекст из памяти:\n`;

            try {
                // Получаем контекст из памяти
                const context = await this.components.memory.getContextForAI();
                
                if (context.recentConversations.length > 0) {
                    prompt += '\nНедавние разговоры:\n';
                    context.recentConversations.forEach((conv, i) => {
                        prompt += `${i + 1}. Пользователь: ${conv.content}\n`;
                    });
                }

                if (context.importantMemories.length > 0) {
                    prompt += '\nВажные записи:\n';
                    context.importantMemories.forEach((mem, i) => {
                        prompt += `${i + 1}. ${mem}\n`;
                    });
                }

                if (context.currentProjects.length > 0) {
                    prompt += '\nТекущие проекты:\n';
                    context.currentProjects.forEach((proj, i) => {
                        prompt += `${i + 1}. ${proj}\n`;
                    });
                }

                prompt += `\n${context.todaySummary}\n`;
                
            } catch (error) {
                console.error('Ошибка получения контекста:', error);
            }

            return prompt;
        }

        async executeCommand(command, originalMessage) {
            const thinkingId = this.components.ui.showThinking();
            
            try {
                const result = await this.components.memory.executeCommand(command);
                
                this.components.ui.removeThinking(thinkingId);
                
                if (result.success) {
                    this.components.ui.addMessage(result.message, 'aris');
                    await this.components.speech.say(result.message);
                    
                    // Сохраняем команду в память
                    await this.components.memory.saveConversation(
                        originalMessage, 
                        result.message,
                        { command: command.type }
                    );
                } else {
                    // Если команда не удалась, обрабатываем как обычное сообщение
                    await this.processWithAI(originalMessage);
                }
                
            } catch (error) {
                this.components.ui.removeThinking(thinkingId);
                console.error('Ошибка выполнения команды:', error);
                await this.processWithAI(originalMessage);
            }
        }

        setupQuickActions() {
            // Открытие VS Code
            document.getElementById('openVSCodeBtn')?.addEventListener('click', async () => {
                try {
                    await this.components.appLauncher.openApplication('vscode');
                    this.components.ui.showToast('VS Code открывается...', 'info');
                    this.components.ui.addMessage('Открываю Visual Studio Code', 'aris');
                } catch (error) {
                    this.components.ui.showToast('Ошибка открытия VS Code: ' + error.message, 'error');
                }
            });

            // Открытие Chrome
            document.getElementById('openChromeBtn')?.addEventListener('click', async () => {
                try {
                    await this.components.appLauncher.openApplication('chrome');
                    this.components.ui.showToast('Chrome открывается...', 'info');
                    this.components.ui.addMessage('Открываю Google Chrome', 'aris');
                } catch (error) {
                    this.components.ui.showToast('Ошибка открытия Chrome: ' + error.message, 'error');
                }
            });

            // Обновление памяти
            document.getElementById('refreshMemoryBtn')?.addEventListener('click', async () => {
                try {
                    await this.components.memory.updateStatistics();
                    this.components.memory.updateUI();
                    this.components.ui.showToast('Память обновлена', 'success');
                } catch (error) {
                    this.components.ui.showToast('Ошибка обновления памяти', 'error');
                }
            });
        }

        setupObservers() {
            // Наблюдатель за изменением размера
            if ('ResizeObserver' in window) {
                this.resizeObserver = new ResizeObserver(() => {
                    this.components.ui.checkResponsive();
                });
                this.resizeObserver.observe(document.body);
            }
        }

        setupPerformanceMonitoring() {
            if ('performance' in window) {
                performance.mark('appInitialized');
            }
        }

        updateStatusIndicators() {
            const apiStatus = document.getElementById('apiStatus');
            const micStatus = document.getElementById('micStatus');
            const voiceStatusDot = document.getElementById('voiceStatusDot');
            const memoryStatus = document.getElementById('memoryStatus');

            if (apiStatus) {
                apiStatus.classList.toggle('active', this.components.api.hasApiKey());
            }
            
            if (micStatus) {
                const status = this.components.speech.getStatus();
                micStatus.classList.toggle('active', status.recognitionSupported);
            }
            
            if (voiceStatusDot) {
                const status = this.components.speech.getStatus();
                voiceStatusDot.classList.toggle('active', status.speechSupported);
            }
            
            if (memoryStatus) {
                memoryStatus.classList.toggle('active', true);
            }
        }

        async updateMemoryModal() {
            try {
                await this.components.memory.updateStatistics();
                await this.components.memory.updateMemoryPreview();
            } catch (error) {
                console.error('Ошибка обновления модального окна памяти:', error);
            }
        }

        handleProcessingError(error) {
            let userMessage = 'Извините, произошла ошибка при обработке вашего запроса.';
            
            if (error.message.includes('network')) {
                userMessage = 'Проблема с подключением к интернету. Проверьте ваше соединение.';
            } else if (error.message.includes('timeout')) {
                userMessage = 'Превышено время ожидания ответа. Попробуйте еще раз.';
            }
            
            this.components.ui.addMessage(userMessage, 'aris');
            this.components.ui.showToast('Ошибка обработки', 'error');
        }

        handleAIError(error) {
            console.error('AI Error:', error);
            
            let errorMessage = 'Извините, произошла ошибка при обращении к AI. ';
            
            if (error.message.includes('401')) {
                errorMessage = 'Неверный API ключ. Пожалуйста, обновите ключ в настройках.';
            } else if (error.message.includes('429')) {
                errorMessage = 'Превышен лимит запросов. Попробуйте позже или проверьте баланс API ключа.';
            } else if (error.message.includes('500') || error.message.includes('503')) {
                errorMessage = 'Сервер AI временно недоступен. Пожалуйста, попробуйте позже.';
            } else if (error.message.includes('network')) {
                errorMessage = 'Проблема с подключением к интернету. Проверьте ваше соединение.';
            }
            
            this.components.ui.addMessage(errorMessage, 'aris');
            this.components.ui.showToast(errorMessage, 'error');
        }

        showCriticalError(title, message) {
            const errorHtml = `
                <div class="critical-error-overlay">
                    <div class="critical-error-content">
                        <h2>${title}</h2>
                        <p>${message}</p>
                        <div class="error-actions">
                            <button class="btn" id="reloadBtn">Перезагрузить</button>
                            <button class="btn btn-secondary" id="resetBtn">Сбросить настройки</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', errorHtml);
            
            document.getElementById('reloadBtn').addEventListener('click', () => {
                window.location.reload();
            });
            
            document.getElementById('resetBtn').addEventListener('click', () => {
                localStorage.clear();
                sessionStorage.clear();
                indexedDB.deleteDatabase('ARISDatabase');
                window.location.reload();
            });
        }

        cleanMessage(text) {
            return text
                .replace(/\s+/g, ' ')
                .replace(/[<>]/g, '')
                .trim();
        }

        generateSessionId() {
            return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        emit(event, data) {
            const customEvent = new CustomEvent(event, { detail: data });
            window.dispatchEvent(customEvent);
        }

        destroy() {
            if (this.resizeObserver) this.resizeObserver.disconnect();
            if (this.components.speech) this.components.speech.destroy();
            console.log('🗑️ ARISApp уничтожен');
        }
    }

    // Инициализация при загрузке страницы
    window.addEventListener('DOMContentLoaded', () => {
        try {
            window.arisApp = new ARISApp();
            
            // Глобальные функции для отладки
            window.debugARIS = {
                status: () => window.arisApp?.components?.speech?.getStatus(),
                testSpeech: () => window.arisApp?.components?.speech?.testVoice(),
                clearCache: () => window.arisApp?.components?.api?.clearCache(),
                exportData: () => window.arisApp?.components?.memory?.exportMemory()
            };
            
        } catch (error) {
            console.error('❌ Критическая ошибка при запуске ARIS:', error);
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'critical-error';
            errorDiv.innerHTML = `
                <h2>Ошибка запуска ARIS</h2>
                <p>Приложение не может быть запущено. Пожалуйста, обновите страницу.</p>
                <button onclick="window.location.reload()">Обновить страницу</button>
            `;
            document.body.appendChild(errorDiv);
        }
    });

    // Обработка закрытия страницы
    window.addEventListener('beforeunload', () => {
        if (window.arisApp) {
            window.arisApp.destroy();
        }
    });

    // Глобальный обработчик ошибок
    window.addEventListener('error', (event) => {
        console.error('Глобальная ошибка:', event.error);
    });

    // Обработка rejected промисов
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Необработанное отклонение промиса:', event.reason);
    });

})();