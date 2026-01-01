/**
 * Database.js - База данных для хранения истории разговоров и памяти
 * Использует IndexedDB для хранения данных
 */

class ARISDatabase {
    constructor() {
        this.dbName = 'ARISDatabase';
        this.version = 2;
        this.db = null;
        this.initialized = false;
        this.initPromise = this.initialize();
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            console.log('🗄️ Инициализация базы данных...');
            
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = (event) => {
                console.error('❌ Ошибка открытия базы данных:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.initialized = true;
                console.log('✅ База данных инициализирована');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                console.log('🔄 Обновление структуры базы данных...');
                const db = event.target.result;
                
                // Создаем хранилище для истории разговоров
                if (!db.objectStoreNames.contains('conversations')) {
                    const conversationStore = db.createObjectStore('conversations', { 
                        keyPath: 'id'
                    });
                    
                    conversationStore.createIndex('timestamp', 'timestamp', { unique: false });
                    conversationStore.createIndex('sessionId', 'sessionId', { unique: false });
                    conversationStore.createIndex('type', 'type', { unique: false });
                    console.log('✅ Создано хранилище conversations');
                }

                // Создаем хранилище для памяти
                if (!db.objectStoreNames.contains('memory')) {
                    const memoryStore = db.createObjectStore('memory', { 
                        keyPath: 'id'
                    });
                    
                    memoryStore.createIndex('timestamp', 'timestamp', { unique: false });
                    memoryStore.createIndex('category', 'category', { unique: false });
                    memoryStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
                    console.log('✅ Создано хранилище memory');
                }

                // Создаем хранилище для приложений
                if (!db.objectStoreNames.contains('applications')) {
                    const appStore = db.createObjectStore('applications', {
                        keyPath: 'name'
                    });
                    
                    appStore.createIndex('protocol', 'protocol', { unique: false });
                    appStore.createIndex('lastUsed', 'lastUsed', { unique: false });
                    console.log('✅ Создано хранилище applications');
                }

                // Создаем хранилище для проектов
                if (!db.objectStoreNames.contains('projects')) {
                    const projectStore = db.createObjectStore('projects', {
                        keyPath: 'name'
                    });
                    
                    projectStore.createIndex('lastOpened', 'lastOpened', { unique: false });
                    projectStore.createIndex('type', 'type', { unique: false });
                    console.log('✅ Создано хранилище projects');
                }

                console.log('✅ Структура базы данных обновлена');
            };
        });
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.initPromise;
        }
    }

    // ==================== История разговоров ====================

    async saveConversation(conversation) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['conversations'], 'readwrite');
            const store = transaction.objectStore('conversations');
            
            // Добавляем метаданные
            conversation.timestamp = Date.now();
            conversation.sessionId = this.getSessionId();
            
            const request = store.add(conversation);

            request.onsuccess = () => {
                console.log('💾 Разговор сохранен в базу данных');
                resolve(request.result);
            };

            request.onerror = (event) => {
                console.error('Ошибка сохранения разговора:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getRecentConversations(limit = 10) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['conversations'], 'readonly');
            const store = transaction.objectStore('conversations');
            const index = store.index('timestamp');
            
            const request = index.openCursor(null, 'prev');
            const conversations = [];
            let count = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && count < limit) {
                    conversations.push(cursor.value);
                    count++;
                    cursor.continue();
                } else {
                    resolve(conversations);
                }
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async getConversationsByDate(date) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);

            const transaction = this.db.transaction(['conversations'], 'readonly');
            const store = transaction.objectStore('conversations');
            const index = store.index('timestamp');
            
            const range = IDBKeyRange.bound(startDate.getTime(), endDate.getTime());
            const request = index.getAll(range);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // ==================== Память ====================

    async saveMemory(memoryItem) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['memory'], 'readwrite');
            const store = transaction.objectStore('memory');
            
            // Добавляем метаданные
            memoryItem.timestamp = Date.now();
            memoryItem.lastAccessed = Date.now();
            memoryItem.id = memoryItem.id || Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            const request = store.add(memoryItem);

            request.onsuccess = () => {
                console.log('💾 Запись памяти сохранена');
                resolve(request.result);
            };

            request.onerror = (event) => {
                console.error('Ошибка сохранения памяти:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getMemoryByCategory(category, limit = 10) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['memory'], 'readonly');
            const store = transaction.objectStore('memory');
            const index = store.index('category');
            
            const request = index.getAll(category);
            
            request.onsuccess = () => {
                // Сортируем по времени и ограничиваем
                const results = request.result
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, limit);
                resolve(results);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async searchMemory(query) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['memory'], 'readonly');
            const store = transaction.objectStore('memory');
            
            const request = store.getAll();
            
            request.onsuccess = () => {
                const results = request.result.filter(item => {
                    const searchable = [
                        item.content || '',
                        item.category || '',
                        item.tags ? item.tags.join(' ') : '',
                        item.metadata ? JSON.stringify(item.metadata) : ''
                    ].join(' ').toLowerCase();
                    
                    return searchable.includes(query.toLowerCase());
                }).sort((a, b) => b.timestamp - a.timestamp);
                
                resolve(results);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async clearOldMemory(daysToKeep = 30) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

            const transaction = this.db.transaction(['memory'], 'readwrite');
            const store = transaction.objectStore('memory');
            const index = store.index('timestamp');
            
            const range = IDBKeyRange.upperBound(cutoffDate);
            const request = index.openCursor(range);

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    console.log('🗑️ Старая память очищена');
                    resolve();
                }
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // ==================== Приложения ====================

    async saveApplication(app) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['applications'], 'readwrite');
            const store = transaction.objectStore('applications');
            
            app.lastUsed = Date.now();
            
            const request = store.put(app);

            request.onsuccess = () => {
                console.log('💾 Приложение сохранено:', app.name);
                resolve(request.result);
            };

            request.onerror = (event) => {
                console.error('Ошибка сохранения приложения:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getApplication(name) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['applications'], 'readonly');
            const store = transaction.objectStore('applications');
            
            const request = store.get(name);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async getAllApplications() {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['applications'], 'readonly');
            const store = transaction.objectStore('applications');
            
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // ==================== Проекты ====================

    async saveProject(project) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects'], 'readwrite');
            const store = transaction.objectStore('projects');
            
            project.lastOpened = Date.now();
            project.created = project.created || Date.now();
            
            const request = store.put(project);

            request.onsuccess = () => {
                console.log('💾 Проект сохранен:', project.name);
                resolve(request.result);
            };

            request.onerror = (event) => {
                console.error('Ошибка сохранения проекта:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getProject(name) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects'], 'readonly');
            const store = transaction.objectStore('projects');
            
            const request = store.get(name);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async getRecentProjects(limit = 5) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects'], 'readonly');
            const store = transaction.objectStore('projects');
            const index = store.index('lastOpened');
            
            const request = index.openCursor(null, 'prev');
            const projects = [];
            let count = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && count < limit) {
                    projects.push(cursor.value);
                    count++;
                    cursor.continue();
                } else {
                    resolve(projects);
                }
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // ==================== Статистика ====================

    async getStatistics() {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const stats = {
                conversations: 0,
                memoryItems: 0,
                applications: 0,
                projects: 0,
                storageUsage: 0
            };

            const transaction = this.db.transaction(
                ['conversations', 'memory', 'applications', 'projects'], 
                'readonly'
            );

            const requests = [
                transaction.objectStore('conversations').count(),
                transaction.objectStore('memory').count(),
                transaction.objectStore('applications').count(),
                transaction.objectStore('projects').count()
            ];

            let completed = 0;
            
            requests.forEach((request, index) => {
                request.onsuccess = () => {
                    switch(index) {
                        case 0: stats.conversations = request.result; break;
                        case 1: stats.memoryItems = request.result; break;
                        case 2: stats.applications = request.result; break;
                        case 3: stats.projects = request.result; break;
                    }
                    
                    completed++;
                    
                    if (completed === requests.length) {
                        // Оцениваем использование хранилища
                        stats.storageUsage = this.estimateStorageSize(stats);
                        resolve(stats);
                    }
                };
                
                request.onerror = () => {
                    completed++;
                    if (completed === requests.length) {
                        resolve(stats);
                    }
                };
            });
        });
    }

    async exportData() {
        await this.ensureInitialized();
        
        return new Promise(async (resolve, reject) => {
            try {
                const data = {
                    conversations: await this.getAllData('conversations'),
                    memory: await this.getAllData('memory'),
                    applications: await this.getAllData('applications'),
                    projects: await this.getAllData('projects'),
                    exportDate: new Date().toISOString(),
                    version: '2.1'
                };

                const blob = new Blob([JSON.stringify(data, null, 2)], {
                    type: 'application/json'
                });

                resolve(blob);
            } catch (error) {
                reject(error);
            }
        });
    }

    async importData(jsonData) {
        await this.ensureInitialized();
        
        return new Promise(async (resolve, reject) => {
            const transaction = this.db.transaction(
                ['conversations', 'memory', 'applications', 'projects'], 
                'readwrite'
            );

            try {
                const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
                
                // Импортируем каждую коллекцию
                for (const [storeName, items] of Object.entries(data)) {
                    if (Array.isArray(items)) {
                        const store = transaction.objectStore(storeName);
                        for (const item of items) {
                            store.put(item);
                        }
                    }
                }

                transaction.oncomplete = () => {
                    console.log('✅ Данные успешно импортированы');
                    resolve();
                };

                transaction.onerror = (event) => {
                    reject(event.target.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    async clearDatabase() {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(
                ['conversations', 'memory', 'applications', 'projects'], 
                'readwrite'
            );

            const stores = ['conversations', 'memory', 'applications', 'projects'];
            let completed = 0;
            
            stores.forEach(storeName => {
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                
                request.onsuccess = () => {
                    completed++;
                    if (completed === stores.length) {
                        console.log('🗑️ База данных очищена');
                        resolve();
                    }
                };
                
                request.onerror = () => {
                    completed++;
                    if (completed === stores.length) {
                        resolve();
                    }
                };
            });
        });
    }

    // ==================== Вспомогательные методы ====================

    async getAllData(storeName) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    getSessionId() {
        let sessionId = localStorage.getItem('arisSessionId');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('arisSessionId', sessionId);
        }
        return sessionId;
    }

    estimateStorageSize(stats) {
        // Примерная оценка размера данных
        const avgConversationSize = 500; // байт
        const avgMemorySize = 300; // байт
        const avgAppSize = 200; // байт
        const avgProjectSize = 400; // байт
        
        const totalSize = 
            (stats.conversations * avgConversationSize) +
            (stats.memoryItems * avgMemorySize) +
            (stats.applications * avgAppSize) +
            (stats.projects * avgProjectSize);
        
        return totalSize;
    }
}

// Экспортируем глобальный экземпляр базы данных
window.arisDatabase = new ARISDatabase();