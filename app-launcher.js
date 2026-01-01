/**
 * AppLauncher.js - Открытие локальных приложений через протоколы и пути
 * Исправленная версия с правильным запуском приложений
 */

class AppLauncher {
    constructor() {
        this.appProtocols = {
            vscode: 'vscode://',
            chrome: 'chrome://',
            spotify: 'spotify://',
            telegram: 'tg://',
            steam: 'steam://',
            discord: 'discord://',
            whatsapp: 'whatsapp://',
            zoom: 'zoommtg://',
            teams: 'msteams://',
            slack: 'slack://',
            figma: 'figma://',
            notion: 'notion://',
            obsidian: 'obsidian://'
        };
        
        this.appUrls = {
            vscode: 'https://vscode.dev',
            chrome: 'https://www.google.com',
            spotify: 'https://open.spotify.com',
            telegram: 'https://web.telegram.org',
            steam: 'https://store.steampowered.com',
            discord: 'https://discord.com/app'
        };
        
        this.customApps = {};
        this.loadSettings();
    }

    loadSettings() {
        try {
            const savedApps = localStorage.getItem('arisCustomApps');
            if (savedApps) {
                this.customApps = JSON.parse(savedApps);
            }
        } catch (error) {
            console.error('Ошибка загрузки настроек приложений:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('arisCustomApps', JSON.stringify(this.customApps));
        } catch (error) {
            console.error('Ошибка сохранения настроек приложений:', error);
        }
    }

    async openApplication(appName, args = '') {
        return new Promise((resolve, reject) => {
            try {
                // Проверяем пользовательские приложения
                if (this.customApps[appName]) {
                    this.launchCustomApp(appName, args)
                        .then(resolve)
                        .catch(reject);
                    return;
                }
                
                // Для стандартных приложений
                if (this.appProtocols[appName]) {
                    this.launchWithProtocol(appName, args)
                        .then(resolve)
                        .catch(reject);
                    return;
                }
                
                // Для веб-приложений
                if (this.appUrls[appName]) {
                    this.openWebApp(appName, args)
                        .then(resolve)
                        .catch(reject);
                    return;
                }
                
                reject(new Error(`Приложение "${appName}" не найдено`));
                
            } catch (error) {
                reject(new Error(`Ошибка открытия приложения: ${error.message}`));
            }
        });
    }

    launchWithProtocol(appName, args) {
        return new Promise((resolve, reject) => {
            try {
                const protocol = this.appProtocols[appName];
                
                // Формируем URL
                let url = protocol;
                if (args && appName === 'vscode') {
                    url = `vscode://file/${encodeURIComponent(args)}`;
                } else if (args) {
                    url = `${protocol}${encodeURIComponent(args)}`;
                }
                
                console.log('🔗 Открываю приложение по протоколу:', url);
                
                // Создаем временный iframe для открытия протокола
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = url;
                
                // Добавляем в DOM
                document.body.appendChild(iframe);
                
                // Удаляем через некоторое время
                setTimeout(() => {
                    if (iframe.parentNode) {
                        document.body.removeChild(iframe);
                    }
                }, 1000);
                
                // Также пробуем через window.open (как запасной вариант)
                setTimeout(() => {
                    window.open(url, '_blank');
                }, 100);
                
                // Сохраняем использование приложения
                this.saveAppUsage(appName);
                
                resolve({
                    success: true,
                    method: 'protocol',
                    url: url,
                    app: appName
                });
                
            } catch (error) {
                console.error('❌ Ошибка протокола:', error);
                
                // Пробуем открыть веб-версию как запасной вариант
                if (this.appUrls[appName]) {
                    console.log('🔄 Пробую открыть веб-версию...');
                    this.openWebApp(appName, args)
                        .then(resolve)
                        .catch(reject);
                } else {
                    reject(new Error(`Не удалось открыть ${appName}: ${error.message}`));
                }
            }
        });
    }

    openWebApp(appName, args) {
        return new Promise((resolve, reject) => {
            try {
                const baseUrl = this.appUrls[appName];
                if (!baseUrl) {
                    throw new Error(`Веб-адрес для ${appName} не найден`);
                }
                
                let fullUrl = baseUrl;
                if (args) {
                    fullUrl += args;
                }
                
                console.log('🌐 Открываю веб-приложение:', fullUrl);
                
                // Открываем в новом окне/вкладке
                const newWindow = window.open(fullUrl, '_blank');
                
                if (!newWindow) {
                    throw new Error('Браузер заблокировал открытие окна. Разрешите всплывающие окна.');
                }
                
                // Сохраняем использование приложения
                this.saveAppUsage(appName);
                
                resolve({
                    success: true,
                    method: 'web',
                    url: fullUrl,
                    app: appName,
                    window: newWindow
                });
                
            } catch (error) {
                reject(new Error(`Ошибка открытия веб-приложения: ${error.message}`));
            }
        });
    }

    launchCustomApp(appName, args) {
        return new Promise((resolve, reject) => {
            const customApp = this.customApps[appName];
            
            if (!customApp) {
                reject(new Error(`Пользовательское приложение "${appName}" не найдено`));
                return;
            }
            
            if (customApp.type === 'protocol') {
                this.launchWithProtocol(appName, args)
                    .then(resolve)
                    .catch(reject);
            } else if (customApp.type === 'web') {
                this.openWebApp(customApp.url, args)
                    .then(resolve)
                    .catch(reject);
            } else {
                reject(new Error(`Неизвестный тип приложения: ${customApp.type}`));
            }
        });
    }

    async addCustomApp(name, config) {
        this.customApps[name] = config;
        this.saveSettings();
        
        // Сохраняем в базу данных
        try {
            if (window.arisDatabase) {
                await window.arisDatabase.saveApplication({
                    name: name,
                    type: config.type || 'custom',
                    protocol: config.protocol || config.url,
                    path: config.path || '',
                    lastUsed: Date.now(),
                    metadata: config.metadata || {}
                });
            }
        } catch (error) {
            console.error('Ошибка сохранения приложения в базу данных:', error);
        }
    }

    async removeCustomApp(name) {
        delete this.customApps[name];
        this.saveSettings();
    }

    saveAppUsage(appName) {
        // Сохраняем время использования приложения
        const appData = {
            name: appName,
            type: this.customApps[appName] ? 'custom' : 'standard',
            protocol: this.appProtocols[appName] || this.appUrls[appName] || '',
            lastUsed: Date.now()
        };
        
        // Сохраняем в базу данных
        if (window.arisDatabase) {
            window.arisDatabase.saveApplication(appData).catch(console.error);
        }
        
        // Также сохраняем в памяти
        if (window.memoryManager) {
            window.memoryManager.saveMemoryItem(
                `Открыто приложение: ${appName}`,
                'command',
                ['app', 'usage', appName],
                { action: 'app_launch', app: appName }
            );
        }
    }

    async setupDefaultApps() {
        try {
            // Сохраняем стандартные приложения в базу данных
            for (const [name, protocol] of Object.entries(this.appProtocols)) {
                if (window.arisDatabase) {
                    await window.arisDatabase.saveApplication({
                        name: name,
                        type: 'standard',
                        protocol: protocol,
                        lastUsed: 0
                    });
                }
            }
            
            console.log('✅ Протоколы по умолчанию установлены');
        } catch (error) {
            console.error('Ошибка установки протоколов:', error);
        }
    }

    async getAppSuggestions(query) {
        const suggestions = [];
        const queryLower = query.toLowerCase();
        
        // Ищем в стандартных приложениях
        for (const [name, protocol] of Object.entries(this.appProtocols)) {
            if (name.toLowerCase().includes(queryLower)) {
                suggestions.push({
                    name: name,
                    type: 'standard',
                    protocol: protocol,
                    description: `Открыть ${name}`
                });
            }
        }
        
        // Ищем в пользовательских приложениях
        for (const [name, config] of Object.entries(this.customApps)) {
            if (name.toLowerCase().includes(queryLower)) {
                suggestions.push({
                    name: name,
                    type: 'custom',
                    protocol: config.protocol || config.url,
                    description: config.description || `Пользовательское приложение: ${name}`
                });
            }
        }
        
        // Ищем в веб-приложениях
        for (const [name, url] of Object.entries(this.appUrls)) {
            if (name.toLowerCase().includes(queryLower)) {
                suggestions.push({
                    name: name,
                    type: 'web',
                    protocol: url,
                    description: `Веб-версия: ${name}`
                });
            }
        }
        
        return suggestions.slice(0, 10);
    }

    async openProjectInApp(projectName, appName = 'vscode') {
        try {
            // Получаем информацию о проекте
            const project = await window.arisDatabase.getProject(projectName);
            
            if (!project) {
                throw new Error(`Проект "${projectName}" не найден`);
            }
            
            let args = '';
            
            // Формируем аргументы
            if (appName === 'vscode' && project.path) {
                args = project.path;
            }
            
            // Открываем приложение
            const result = await this.openApplication(appName, args);
            
            // Обновляем проект
            if (window.arisDatabase) {
                project.lastOpened = Date.now();
                await window.arisDatabase.saveProject(project);
            }
            
            // Сохраняем в память
            if (window.memoryManager) {
                await window.memoryManager.saveMemoryItem(
                    `Открыт проект "${projectName}" в ${appName}`,
                    'project',
                    ['project', 'open', appName, projectName],
                    { 
                        action: 'open_project',
                        project: projectName,
                        app: appName,
                        path: project.path 
                    }
                );
            }
            
            return {
                success: true,
                message: `Открываю проект "${projectName}" в ${appName}`,
                project: project,
                result: result
            };
            
        } catch (error) {
            console.error('Ошибка открытия проекта:', error);
            return {
                success: false,
                message: `Не удалось открыть проект: ${error.message}`
            };
        }
    }
}

// Экспортируем глобальный экземпляр AppLauncher
window.appLauncher = new AppLauncher();