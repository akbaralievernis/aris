/**
 * APIManager - Оптимизированный менеджер API
 */

class APIManager {
    constructor() {
        this.apiKey = '';
        this.currentProvider = 'mistral';
        this.baseUrls = {
            mistral: 'https://api.mistral.ai/v1',
            openai: 'https://api.openai.com/v1'
        };
        this.cache = new Map();
        this.maxCacheSize = 100;
        this.cacheDuration = 5 * 60 * 1000; // 5 минут
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.maxRetries = 3;
        this.requestTimeout = 30000;
        
        this.init();
    }

    init() {
        // Восстанавливаем ключ из localStorage
        const savedKey = localStorage.getItem('arisApiKey');
        const savedProvider = localStorage.getItem('aiProvider') || 'mistral';
        
        if (savedKey) {
            this.apiKey = savedKey;
        }
        
        this.currentProvider = savedProvider;
        
        // Очищаем старый кэш
        this.cleanOldCache();
        
        console.log('✅ APIManager инициализирован');
    }

    setApiKey(key) {
        if (!key || typeof key !== 'string') {
            throw new Error('Неверный формат API ключа');
        }
        
        this.apiKey = key.trim();
        localStorage.setItem('arisApiKey', this.apiKey);
        
        // Очищаем кэш при смене ключа
        this.clearCache();
        
        console.log('🔑 API ключ установлен');
    }

    setProvider(provider) {
        if (!['mistral', 'openai'].includes(provider)) {
            throw new Error('Неверный провайдер. Допустимые значения: mistral, openai');
        }
        
        this.currentProvider = provider;
        localStorage.setItem('aiProvider', provider);
        
        console.log(`🔄 Провайдер изменен на: ${provider}`);
    }

    getCurrentProvider() {
        return this.currentProvider;
    }

    hasApiKey() {
        return !!this.apiKey && this.apiKey.length > 10;
    }

    async validateApiKey(provider, key) {
        if (!key || key.length < 10) {
            return false;
        }
        
        try {
            const url = `${this.baseUrls[provider]}/models`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            return response.ok;
            
        } catch (error) {
            console.error('❌ Ошибка валидации API ключа:', error);
            return false;
        }
    }

    async getAIResponse(message, systemPrompt = null) {
        if (!this.hasApiKey()) {
            throw new Error('API ключ не установлен или невалиден');
        }

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            throw new Error('Сообщение не может быть пустым');
        }

        // Проверяем кэш
        const cacheKey = this.generateCacheKey(message, systemPrompt);
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            console.log('💾 Использую кэшированный ответ');
            return cached.response;
        }

        // Добавляем в очередь
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                message,
                systemPrompt,
                resolve,
                reject,
                retries: 0
            });
            
            if (!this.isProcessingQueue) {
                this.processQueue();
            }
        });
    }

    async processQueue() {
        if (this.requestQueue.length === 0 || this.isProcessingQueue) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();
            
            try {
                const response = await this.makeRequestWithRetry(
                    request.message,
                    request.systemPrompt,
                    request.retries
                );
                
                request.resolve(response);
                
            } catch (error) {
                if (request.retries < this.maxRetries) {
                    // Повторная попытка
                    request.retries++;
                    this.requestQueue.unshift(request);
                    
                    // Задержка перед повторной попыткой
                    await this.delay(1000 * Math.pow(2, request.retries));
                    
                } else {
                    // Максимальное количество попыток исчерпано
                    request.reject(error);
                }
            }
            
            // Пауза между запросами
            await this.delay(100);
        }
        
        this.isProcessingQueue = false;
    }

    async makeRequestWithRetry(message, systemPrompt, retryCount = 0) {
        try {
            const url = `${this.baseUrls[this.currentProvider]}/chat/completions`;
            const model = this.currentProvider === 'mistral' 
                ? 'mistral-small-latest' 
                : 'gpt-3.5-turbo';
            
            const messages = [];
            
            // Добавляем системный промпт
            if (systemPrompt) {
                messages.push({
                    role: 'system',
                    content: systemPrompt
                });
            }
            
            // Добавляем сообщение пользователя
            messages.push({
                role: 'user',
                content: message
            });
            
            const body = {
                model,
                messages,
                max_tokens: 500,
                temperature: 0.7,
                top_p: 0.9,
                frequency_penalty: 0.1,
                presence_penalty: 0.1,
                stream: false
            };
            
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.requestTimeout);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw this.createAPIError(response.status, errorData);
            }
            
            const data = await response.json();
            const aiResponse = data.choices[0].message.content.trim();
            
            // Кэшируем ответ
            const cacheKey = this.generateCacheKey(message, systemPrompt);
            this.cache.set(cacheKey, {
                response: aiResponse,
                timestamp: Date.now()
            });
            
            // Очищаем старые записи
            this.cleanCache();
            
            return aiResponse;
            
        } catch (error) {
            console.error(`❌ Ошибка запроса (попытка ${retryCount + 1}):`, error);
            
            // Если это ошибка сети, пробуем снова
            if (error.name === 'AbortError' || error.message.includes('network')) {
                if (retryCount < this.maxRetries) {
                    console.log(`🔄 Повторная попытка ${retryCount + 1}`);
                    return this.makeRequestWithRetry(message, systemPrompt, retryCount + 1);
                }
            }
            
            throw error;
        }
    }

    createAPIError(status, data) {
        let message = 'Неизвестная ошибка API';
        
        switch (status) {
            case 400:
                message = 'Неверный запрос. Проверьте параметры.';
                break;
            case 401:
                message = 'Неверный API ключ. Проверьте ключ и провайдера.';
                break;
            case 403:
                message = 'Доступ запрещен. Убедитесь в правильности ключа.';
                break;
            case 429:
                message = 'Слишком много запросов. Подождите несколько минут.';
                break;
            case 500:
                message = 'Внутренняя ошибка сервера AI. Попробуйте позже.';
                break;
            case 503:
                message = 'Сервис временно недоступен. Попробуйте позже.';
                break;
        }
        
        if (data.error?.message) {
            message += ` ${data.error.message}`;
        }
        
        const error = new Error(message);
        error.status = status;
        error.data = data;
        
        return error;
    }

    generateCacheKey(message, systemPrompt) {
        const keyData = {
            provider: this.currentProvider,
            message: message.substring(0, 100),
            systemPrompt: systemPrompt ? systemPrompt.substring(0, 50) : null
        };
        
        return JSON.stringify(keyData);
    }

    cleanCache() {
        const now = Date.now();
        const toDelete = [];
        
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheDuration) {
                toDelete.push(key);
            }
        }
        
        toDelete.forEach(key => this.cache.delete(key));
        
        // Ограничиваем размер кэша
        if (this.cache.size > this.maxCacheSize) {
            const keys = Array.from(this.cache.keys());
            const keysToDelete = keys.slice(0, this.cache.size - this.maxCacheSize);
            keysToDelete.forEach(key => this.cache.delete(key));
        }
    }

    cleanOldCache() {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 часа
        const toDelete = [];
        
        for (const [key, value] of this.cache.entries()) {
            if (value.timestamp < cutoff) {
                toDelete.push(key);
            }
        }
        
        toDelete.forEach(key => this.cache.delete(key));
        console.log(`🗑️ Удалено ${toDelete.length} устаревших записей кэша`);
    }

    clearCache() {
        this.cache.clear();
        console.log('🗑️ Кэш очищен');
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            duration: this.cacheDuration,
            queueLength: this.requestQueue.length
        };
    }

    async analyzeSentiment(text) {
        try {
            const response = await this.getAIResponse(
                `Проанализируй тональность текста и верни только JSON без дополнительного текста: "${text}"`,
                `Ты анализируешь тональность текста. Верни JSON формата: {
                    "sentiment": "positive|negative|neutral",
                    "confidence": 0.0-1.0,
                    "emotions": ["эмоция1", "эмоция2"],
                    "summary": "краткое описание"
                }`
            );
            
            try {
                // Извлекаем JSON из ответа
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
                return JSON.parse(response);
            } catch {
                return {
                    sentiment: 'neutral',
                    confidence: 0.5,
                    emotions: [],
                    summary: 'Не удалось проанализировать'
                };
            }
        } catch (error) {
            console.error('Ошибка анализа тональности:', error);
            return null;
        }
    }

    async summarizeText(text, maxLength = 200) {
        try {
            const response = await this.getAIResponse(
                `Кратко суммируй этот текст (максимум ${maxLength} символов): ${text}`,
                'Ты суммаризируешь текст кратко и информативно. Возвращай только суммаризацию без дополнительного текста.'
            );
            
            return response.substring(0, maxLength);
            
        } catch (error) {
            console.error('Ошибка суммаризации:', error);
            return text.substring(0, maxLength) + '...';
        }
    }

    async translateText(text, targetLang = 'en') {
        try {
            const response = await this.getAIResponse(
                `Переведи этот текст на ${targetLang}: ${text}`,
                'Ты переводчик. Переводи текст точно и сохраняй смысл. Возвращай только перевод без дополнительного текста.'
            );
            
            return response;
            
        } catch (error) {
            console.error('Ошибка перевода:', error);
            return text;
        }
    }

    destroy() {
        this.clearCache();
        this.requestQueue = [];
        this.isProcessingQueue = false;
        
        console.log('🗑️ APIManager уничтожен');
    }
}

// Экспортируем глобальный экземпляр
if (!window.apiManager) {
    window.apiManager = new APIManager();
}