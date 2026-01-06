/**
 * MemoryManager.js - Управление памятью и историей разговоров
 * Исправленная версия с правильным сохранением памяти
 */

class MemoryManager {
    constructor() {
        this.conversationMemory = [];
        this.maxMemoryItems = 10;
        this.memoryCategories = {
            PROJECT: 'project',
            TASK: 'task',
            COMMAND: 'command',
            INFORMATION: 'information',
            REMINDER: 'reminder'
        };
        
        this.isInitialized = false;
        this.initPromise = this.init();
    }

    async init() {
        try {
            console.log('🧠 Инициализация MemoryManager...');
            
            // Ждем инициализацию базы данных
            await this.waitForDatabase();
            
            // Загружаем память из базы данных
            await this.loadMemory();
            
            // Загружаем настройки
            this.loadSettings();
            
            // Очищаем старую память
            await this.cleanupOldMemory();
            
            this.isInitialized = true;
            console.log('✅ MemoryManager готов');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации MemoryManager:', error);
            throw error;
        }
    }

    async waitForDatabase() {
        return new Promise((resolve) => {
            const check = () => {
                if (window.arisDatabase && window.arisDatabase.db) {
                    resolve(true);
                } else if (window.arisDatabase && window.arisDatabase.initPromise) {
                    window.arisDatabase.initPromise.then(() => resolve(true));
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    async loadMemory() {
        try {
            // Используем существующий метод базы данных
            const recentConversations = await this.getRecentConversations(this.maxMemoryItems);
            this.conversationMemory = recentConversations;
            console.log('✅ Память загружена:', this.conversationMemory.length, 'записей');
        } catch (error) {
            console.error('Ошибка загрузки памяти:', error);
            this.conversationMemory = [];
        }
    }

    loadSettings() {
        try {
            const savedMaxItems = localStorage.getItem('arisMaxMemoryItems');
            if (savedMaxItems) {
                this.maxMemoryItems = parseInt(savedMaxItems);
            }
        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
        }
    }

    async saveConversation(message, response, metadata = {}) {
        try {
            if (!window.arisDatabase || !window.arisDatabase.db) {
                console.warn('База данных не готова, откладываем сохранение');
                return null;
            }

            const conversation = {
                id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                type: 'conversation',
                timestamp: Date.now(),
                message: message,
                response: response,
                metadata: {
                    ...metadata,
                    source: 'voice',
                    length: message.length + response.length
                }
            };

            // Сохраняем в базу данных
            await window.arisDatabase.saveConversation(conversation);
            
            // Добавляем в локальную память
            this.conversationMemory.unshift(conversation);
            
            // Ограничиваем размер памяти
            if (this.conversationMemory.length > this.maxMemoryItems) {
                this.conversationMemory = this.conversationMemory.slice(0, this.maxMemoryItems);
            }
            
            // Обновляем UI
            await this.updateUI();
            
            console.log('💾 Разговор сохранен в память:', conversation.id);
            return conversation.id;
            
        } catch (error) {
            console.error('❌ Ошибка сохранения разговора:', error);
            return null;
        }
    }

    async getRecentConversations(limit = 10) {
        try {
            if (!window.arisDatabase || !window.arisDatabase.db) {
                return [];
            }
            
            const recentConversations = await window.arisDatabase.getRecentConversations(limit);
            return recentConversations;
        } catch (error) {
            console.error('Ошибка получения последних разговоров:', error);
            return [];
        }
    }

    async autoSaveConversation(message, response) {
        try {
            const conversationId = await this.saveConversation(message, response);
            
            // Извлекаем ключевую информацию
            await this.extractAndSaveKeyInformation(message, response, conversationId);
            
            return { conversationId };
            
        } catch (error) {
            console.error('Ошибка автосохранения разговора:', error);
            return null;
        }
    }

    async extractAndSaveKeyInformation(message, response, conversationId) {
        try {
            const extractedInfo = this.extractKeyInformation(message + ' ' + response);
            
            // Сохраняем проекты
            if (extractedInfo.projects.length > 0) {
                for (const project of extractedInfo.projects) {
                    await this.saveMemoryItem(
                        `Упомянут проект: ${project}`,
                        this.memoryCategories.PROJECT,
                        ['auto-extracted', 'project'],
                        { source: 'auto-extract', conversationId }
                    );
                }
            }
            
            // Сохраняем ссылки
            if (extractedInfo.links.length > 0) {
                for (const link of extractedInfo.links) {
                    await this.saveMemoryItem(
                        `Ссылка: ${link}`,
                        this.memoryCategories.INFORMATION,
                        ['link', 'url', 'auto-extracted'],
                        { url: link, conversationId }
                    );
                }
            }
            
        } catch (error) {
            console.error('Ошибка извлечения информации:', error);
        }
    }

    async saveMemoryItem(content, category = 'information', tags = [], metadata = {}) {
        try {
            if (!window.arisDatabase || !window.arisDatabase.db) {
                return null;
            }

            const memoryItem = {
                type: 'memory',
                category: category,
                content: content,
                tags: tags,
                timestamp: Date.now(),
                metadata: {
                    ...metadata,
                    importance: metadata.importance || 1,
                    autoGenerated: metadata.autoGenerated || false
                }
            };

            await window.arisDatabase.saveMemory(memoryItem);
            console.log('💾 Запись памяти сохранена:', content.substring(0, 50) + '...');
            
            return memoryItem;
        } catch (error) {
            console.error('Ошибка сохранения записи памяти:', error);
            return null;
        }
    }

    async getContextForAI() {
        const context = {
            recentConversations: [],
            importantMemories: [],
            currentProjects: [],
            todaySummary: ''
        };
        
        try {
            // Получаем последние разговоры
            const recentConversations = await this.getRecentConversations(5);
            context.recentConversations = recentConversations.map(conv => ({
                role: 'user',
                content: conv.message
            }));
            
            // Получаем важные записи памяти
            const importantMemories = await this.getMemoryByCategory(this.memoryCategories.PROJECT, 3);
            context.importantMemories = importantMemories.map(mem => mem.content);
            
            // Получаем текущие проекты
            const projects = await this.getRecentProjects(3);
            context.currentProjects = projects.map(proj => proj.name);
            
            // Формируем сводку за сегодня
            const today = new Date();
            const todayConversations = await window.arisDatabase.getConversationsByDate(today);
            context.todaySummary = `Сегодня было ${todayConversations.length} разговоров.`;
            
        } catch (error) {
            console.error('Ошибка формирования контекста:', error);
        }
        
        return context;
    }

    // ==== Методы для работы с базой данных ====

    async getMemoryByCategory(category, limit = 10) {
        try {
            return await window.arisDatabase.getMemoryByCategory(category, limit);
        } catch (error) {
            console.error('Ошибка получения памяти по категории:', error);
            return [];
        }
    }

    async getRecentProjects(limit = 5) {
        try {
            return await window.arisDatabase.getRecentProjects(limit);
        } catch (error) {
            console.error('Ошибка получения проектов:', error);
            return [];
        }
    }

    async rememberProject(projectName, projectPath = null, metadata = {}) {
        try {
            const project = {
                name: projectName,
                type: 'project',
                lastOpened: Date.now(),
                created: Date.now(),
                path: projectPath,
                metadata: {
                    ...metadata,
                    technology: metadata.technology || 'unknown',
                    status: metadata.status || 'active'
                }
            };

            await window.arisDatabase.saveProject(project);
            
            // Также сохраняем в память как запись
            await this.saveMemoryItem(
                `Проект: ${projectName}${projectPath ? ` (путь: ${projectPath})` : ''}`,
                this.memoryCategories.PROJECT,
                ['project', 'work', 'development'],
                { projectName, projectPath }
            );
            
            console.log('💾 Проект сохранен:', projectName);
            return project;
            
        } catch (error) {
            console.error('Ошибка сохранения проекта:', error);
            return null;
        }
    }

    async getLastProject() {
        try {
            const recentProjects = await this.getRecentProjects(1);
            return recentProjects[0] || null;
        } catch (error) {
            console.error('Ошибка получения последнего проекта:', error);
            return null;
        }
    }

    async searchMemory(query) {
        try {
            const results = await window.arisDatabase.searchMemory(query);
            return results.slice(0, 10);
        } catch (error) {
            console.error('Ошибка поиска в памяти:', error);
            return [];
        }
    }

    async getYesterdayActivities() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        try {
            const conversations = await window.arisDatabase.getConversationsByDate(yesterday);
            const memoryItems = await window.arisDatabase.searchMemory('вчера');
            
            return {
                conversations: conversations,
                memoryItems: memoryItems,
                date: yesterday.toLocaleDateString('ru-RU')
            };
        } catch (error) {
            console.error('Ошибка получения вчерашних активностей:', error);
            return { conversations: [], memoryItems: [], date: '' };
        }
    }

    async getMemorySummary() {
        try {
            const stats = await window.arisDatabase.getStatistics();
            
            const summary = {
                totalConversations: stats.conversations,
                totalMemoryItems: stats.memoryItems,
                totalProjects: stats.projects,
                storageUsage: this.formatBytes(stats.storageUsage),
                lastUpdated: new Date().toLocaleString('ru-RU')
            };
            
            return summary;
        } catch (error) {
            console.error('Ошибка получения сводки памяти:', error);
            return null;
        }
    }

    // ==== Обработка команд ====

    parseCommand(text) {
        const lowerText = text.toLowerCase();
        
        // Команды для открытия приложений
        const appCommands = {
            'vs code': 'vscode',
            'visual studio code': 'vscode',
            'код': 'vscode',
            'chrome': 'chrome',
            'google chrome': 'chrome',
            'браузер': 'chrome',
            'spotify': 'spotify',
            'музыку': 'spotify',
            'telegram': 'telegram',
            'телеграм': 'telegram',
            'steam': 'steam',
            'дискорд': 'discord',
            'discord': 'discord'
        };
        
        for (const [keyword, appName] of Object.entries(appCommands)) {
            if (lowerText.includes(keyword) && 
                (lowerText.includes('открой') || lowerText.includes('запусти'))) {
                return {
                    type: 'open_app',
                    app: appName,
                    originalCommand: text
                };
            }
        }
        
        // Команды для работы с памятью
        if (lowerText.includes('что я делал') || lowerText.includes('последний раз')) {
            return {
                type: 'get_last_activity',
                timeframe: lowerText.includes('вчера') ? 'yesterday' : 'recent'
            };
        }
        
        if (lowerText.includes('запомни проект') || lowerText.includes('работаю над проектом')) {
            const projectMatch = text.match(/проект[:\s]+([^\.,!?]+)/i);
            const projectName = projectMatch ? projectMatch[1].trim() : 'Новый проект';
            
            return {
                type: 'remember_project',
                projectName: projectName,
                metadata: {
                    mentionedIn: text,
                    timestamp: Date.now()
                }
            };
        }
        
        if (lowerText.includes('открой проект') || lowerText.includes('мой проект')) {
            return {
                type: 'open_last_project'
            };
        }
        
        if (lowerText.includes('очисти память') || lowerText.includes('удали историю')) {
            return {
                type: 'clear_memory',
                confirm: true
            };
        }
        
        return null;
    }

    async executeCommand(command) {
        switch (command.type) {
            case 'open_app':
                return await this.handleOpenApp(command.app);
                
            case 'get_last_activity':
                return await this.handleGetLastActivity(command.timeframe);
                
            case 'remember_project':
                return await this.handleRememberProject(command.projectName, command.metadata);
                
            case 'open_last_project':
                return await this.handleOpenLastProject();
                
            case 'clear_memory':
                return await this.handleClearMemory();
                
            default:
                return { success: false, message: 'Неизвестная команда' };
        }
    }

    async handleOpenApp(appName) {
        try {
            const appLauncher = window.appLauncher || new AppLauncher();
            const result = await appLauncher.openApplication(appName);
            
            // Сохраняем в память
            await this.saveMemoryItem(
                `Открыто приложение: ${appName}`,
                this.memoryCategories.COMMAND,
                ['app', 'open', appName],
                { action: 'open_app', app: appName, timestamp: Date.now() }
            );
            
            return {
                success: true,
                message: `Открываю ${appName}`,
                result: result
            };
        } catch (error) {
            return {
                success: false,
                message: `Не удалось открыть ${appName}: ${error.message}`
            };
        }
    }

    async handleGetLastActivity(timeframe) {
        if (timeframe === 'yesterday') {
            const activities = await this.getYesterdayActivities();
            
            let response = 'Вчера вы:\n';
            
            if (activities.conversations.length > 0) {
                response += 'Общались с ARIS:\n';
                activities.conversations.slice(0, 3).forEach(conv => {
                    response += `- ${conv.message.substring(0, 50)}...\n`;
                });
            }
            
            if (activities.memoryItems.length > 0) {
                response += '\nЗапоминающиеся моменты:\n';
                activities.memoryItems.slice(0, 3).forEach(mem => {
                    response += `- ${mem.content.substring(0, 50)}...\n`;
                });
            }
            
            if (activities.conversations.length === 0 && activities.memoryItems.length === 0) {
                response = 'Вчера не было зафиксировано активностей.';
            }
            
            return {
                success: true,
                message: response,
                data: activities
            };
        } else {
            // Недавние активности
            const recentProjects = await this.getRecentProjects(3);
            const recentConversations = this.conversationMemory.slice(0, 3);
            
            let response = 'Недавно вы:\n';
            
            if (recentProjects.length > 0) {
                response += 'Работали над проектами:\n';
                recentProjects.forEach(proj => {
                    const time = new Date(proj.lastOpened).toLocaleDateString('ru-RU');
                    response += `- ${proj.name} (${time})\n`;
                });
            }
            
            if (recentConversations.length > 0) {
                response += '\nОбсуждали:\n';
                recentConversations.forEach(conv => {
                    response += `- ${conv.message.substring(0, 50)}...\n`;
                });
            }
            
            return {
                success: true,
                message: response,
                data: { projects: recentProjects, conversations: recentConversations }
            };
        }
    }

    async handleRememberProject(projectName, metadata) {
        const project = await this.rememberProject(projectName, null, metadata);
        
        if (project) {
            return {
                success: true,
                message: `Запомнил проект "${projectName}"`,
                project: project
            };
        } else {
            return {
                success: false,
                message: 'Не удалось сохранить проект'
            };
        }
    }

    async handleOpenLastProject() {
        const lastProject = await this.getLastProject();
        
        if (lastProject) {
            // Пытаемся открыть VS Code с проектом
            const appLauncher = window.appLauncher || new AppLauncher();
            const result = await appLauncher.openApplication('vscode');
            
            // Обновляем время открытия проекта
            await window.arisDatabase.saveProject({
                ...lastProject,
                lastOpened: Date.now()
            });
            
            return {
                success: true,
                message: `Открываю Visual Studio Code. Последний проект: "${lastProject.name}"`,
                project: lastProject
            };
        } else {
            return {
                success: false,
                message: 'Не найден последний проект. Сначала создайте или упомяните проект.'
            };
        }
    }

    async handleClearMemory() {
        const success = await this.clearAllMemory();
        
        if (success) {
            return {
                success: true,
                message: 'Память успешно очищена'
            };
        } else {
            return {
                success: false,
                message: 'Не удалось очистить память'
            };
        }
    }

    // ==== Вспомогательные методы ====

    extractKeyInformation(text) {
        const keywords = {
            проекты: ['проект', 'работаю над', 'разрабатываю', 'создаю'],
            задачи: ['задача', 'нужно сделать', 'доделать', 'исправить'],
            идеи: ['идея', 'придумал', 'планирую', 'хочу сделать'],
            ссылки: ['https://', 'http://', 'www.', '.com', '.ru']
        };
        
        const extracted = {
            projects: [],
            tasks: [],
            ideas: [],
            links: [],
            dates: []
        };
        
        // Извлекаем проекты
        keywords.проекты.forEach(keyword => {
            if (text.toLowerCase().includes(keyword)) {
                const match = text.match(new RegExp(`${keyword}\\s+([\\w\\s]+)`, 'i'));
                if (match && match[1]) {
                    extracted.projects.push(match[1].trim());
                }
            }
        });
        
        // Извлекаем ссылки
        const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+\.[^\s]+)/gi;
        const links = text.match(linkRegex);
        if (links) {
            extracted.links = links;
        }
        
        // Извлекаем даты
        const dateRegex = /\b(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4}|\d{4}[\.\/]\d{1,2}[\.\/]\d{1,2})\b/g;
        const dates = text.match(dateRegex);
        if (dates) {
            extracted.dates = dates;
        }
        
        return extracted;
    }

    async cleanupOldMemory() {
        try {
            await window.arisDatabase.clearOldMemory(30);
            console.log('🗑️ Старая память очищена');
        } catch (error) {
            console.error('Ошибка очистки старой памяти:', error);
        }
    }

    async clearAllMemory() {
        try {
            await window.arisDatabase.clearDatabase();
            this.conversationMemory = [];
            console.log('🗑️ Вся память очищена');
            this.updateUI();
            return true;
        } catch (error) {
            console.error('Ошибка очистки памяти:', error);
            return false;
        }
    }

    async updateStatistics() {
        try {
            await this.loadMemory();
            this.updateUI();
        } catch (error) {
            console.error('Ошибка обновления статистики:', error);
        }
    }

    async updateUI() {
        const memoryCount = this.conversationMemory.length;
        
        // Обновляем бейдж памяти
        const memoryBadge = document.getElementById('memoryBadge');
        if (memoryBadge) {
            memoryBadge.textContent = memoryCount;
            memoryBadge.style.display = memoryCount > 0 ? 'flex' : 'none';
        }
        
        // Обновляем счетчик активной памяти
        const activeMemoryCount = document.getElementById('activeMemoryCount');
        if (activeMemoryCount) {
            activeMemoryCount.textContent = memoryCount;
        }
        
        // Обновляем счетчик памяти в чате
        const conversationMemory = document.getElementById('conversationMemory');
        if (conversationMemory) {
            conversationMemory.textContent = `Память: ${memoryCount} записей`;
        }
        
        // Обновляем статистику сообщений
        await this.updateMessageStats();
        
        // Обновляем превью памяти
        this.updateMemoryPreview();
    }

    async updateMessageStats() {
        try {
            if (!window.arisDatabase || !window.arisDatabase.db) {
                return;
            }

            const stats = await window.arisDatabase.getStatistics();
            const totalMessagesEl = document.getElementById('totalMessages');
            const todayMessagesEl = document.getElementById('todayMessages');

            if (totalMessagesEl) {
                totalMessagesEl.textContent = stats.conversations || 0;
            }

            if (todayMessagesEl) {
                const today = new Date();
                const todayConversations = await window.arisDatabase.getConversationsByDate(today);
                todayMessagesEl.textContent = todayConversations.length || 0;
            }
        } catch (error) {
            console.error('Ошибка обновления статистики сообщений:', error);
        }
    }

    async updateMemoryPreview() {
        const memoryPreview = document.getElementById('memoryPreview');
        if (!memoryPreview) return;
        
        try {
            const recentMemories = await this.getRecentConversations(5);
            
            if (recentMemories.length === 0) {
                memoryPreview.innerHTML = `
                    <div class="empty-memory">
                        <i class="fas fa-inbox"></i>
                        <p>История разговоров пуста. Начните диалог!</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            recentMemories.forEach((memory, index) => {
                const time = new Date(memory.timestamp).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                html += `
                    <div class="memory-preview-item">
                        <div class="memory-preview-header">
                            <span class="memory-time">${time}</span>
                            <span class="memory-index">#${index + 1}</span>
                        </div>
                        <div class="memory-preview-content">
                            <p class="memory-question">${this.truncateText(memory.message, 50)}</p>
                            <p class="memory-answer">${this.truncateText(memory.response, 70)}</p>
                        </div>
                    </div>
                `;
            });
            
            memoryPreview.innerHTML = html;
        } catch (error) {
            console.error('Ошибка обновления превью памяти:', error);
        }
    }

    async updateMemoryList() {
        const memoryList = document.getElementById('memoryList');
        if (!memoryList) return;
        
        try {
            const recentMemories = await this.getRecentConversations(10);
            
            if (recentMemories.length === 0) {
                memoryList.innerHTML = `
                    <div class="empty-memory">
                        <i class="fas fa-inbox"></i>
                        <p>История разговоров пуста. Начните диалог!</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            recentMemories.forEach((memory, index) => {
                const date = new Date(memory.timestamp);
                const time = date.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const dateStr = date.toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                
                html += `
                    <div class="memory-item">
                        <div class="memory-item-header">
                            <span class="memory-item-date">${dateStr} ${time}</span>
                            <span class="memory-item-id">#${index + 1}</span>
                        </div>
                        <div class="memory-item-content">
                            <div class="memory-item-question">
                                <strong>Вопрос:</strong> ${this.truncateText(memory.message, 100)}
                            </div>
                            <div class="memory-item-answer">
                                <strong>Ответ:</strong> ${this.truncateText(memory.response, 150)}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            memoryList.innerHTML = html;
        } catch (error) {
            console.error('Ошибка обновления списка памяти:', error);
        }
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    async exportMemory() {
        try {
            const blob = await window.arisDatabase.exportData();
            return blob;
        } catch (error) {
            console.error('Ошибка экспорта памяти:', error);
            return null;
        }
    }
}

// Экспортируем глобальный экземпляр менеджера памяти
window.memoryManager = new MemoryManager();
