/**
 * SpeechManager - Полностью исправленный менеджер речи
 */

class SpeechManager {
    constructor() {
        this.synth = window.speechSynthesis;
        this.recognition = null;
        this.isListening = false;
        this.isSpeaking = false;
        this.voices = [];
        this.voicesLoaded = false;
        
        this.settings = {
            voice: null,
            rate: 1,
            pitch: 1,
            volume: 1,
            language: 'ru-RU'
        };
        
        this.eventListeners = new Map();
        this.speechQueue = [];
        this.isProcessingQueue = false;
        
        this.init();
    }

    async init() {
        console.log('🔊 Инициализация SpeechManager...');
        
        try {
            await this.initSpeechSynthesis();
            this.initSpeechRecognition();
            this.loadVoiceSettings();
            this.setupEventListeners();
            
            console.log('✅ SpeechManager готов');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации SpeechManager:', error);
            this.emit('initError', error);
        }
    }

    async initSpeechSynthesis() {
        if (!this.synth) {
            console.warn('⚠️ Синтез речи не поддерживается браузером');
            this.emit('speechError', 'Синтез речи не поддерживается');
            return false;
        }

        console.log('🔄 Загрузка голосов...');
        
        // Загружаем голоса
        await this.loadVoicesWithRetry();
        
        // Устанавливаем обработчик изменения голосов
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => {
                console.log('🔊 Список голосов изменился');
                this.loadVoices();
            };
        }
        
        return true;
    }

    async loadVoicesWithRetry(maxRetries = 5) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const voices = this.synth.getVoices();
                
                if (voices.length > 0) {
                    this.voices = voices;
                    this.voicesLoaded = true;
                    
                    console.log(`✅ Загружено ${voices.length} голосов`);
                    this.emit('voicesLoaded', voices);
                    
                    // Автоматически выбираем русский голос
                    await this.autoSelectRussianVoice();
                    
                    return true;
                }
                
                if (i < maxRetries - 1) {
                    console.log(`🔄 Попытка ${i + 2}/${maxRetries} загрузки голосов...`);
                    await this.delay(500);
                }
                
            } catch (error) {
                console.error(`❌ Ошибка загрузки голосов (попытка ${i + 1}):`, error);
            }
        }
        
        console.warn('⚠️ Не удалось загрузить голоса после нескольких попыток');
        this.voicesLoaded = true;
        return false;
    }

    loadVoices() {
        if (!this.synth) return;
        
        try {
            const voices = this.synth.getVoices();
            
            if (voices.length > 0) {
                this.voices = voices;
                this.voicesLoaded = true;
                this.emit('voicesLoaded', voices);
                
                // Обновляем выбранный голос
                this.updateSelectedVoice();
            }
        } catch (error) {
            console.error('Ошибка обновления голосов:', error);
        }
    }

    async autoSelectRussianVoice() {
        if (this.settings.voice) return;
        
        const russianVoices = this.voices.filter(v => v.lang.startsWith('ru'));
        const englishVoices = this.voices.filter(v => v.lang.startsWith('en'));
        
        if (russianVoices.length > 0) {
            // Выбираем первый русский голос
            this.settings.voice = russianVoices[0].name;
            console.log(`🎤 Автоматически выбран голос: ${this.settings.voice}`);
            
        } else if (englishVoices.length > 0) {
            // Выбираем английский голос
            this.settings.voice = englishVoices[0].name;
            console.log(`🎤 Выбран английский голос: ${this.settings.voice}`);
            
        } else if (this.voices.length > 0) {
            // Выбираем любой доступный голос
            this.settings.voice = this.voices[0].name;
            console.log(`🎤 Выбран голос по умолчанию: ${this.settings.voice}`);
        }
        
        this.saveVoiceSettings();
    }

    updateSelectedVoice() {
        if (this.settings.voice) {
            const voiceExists = this.voices.some(v => v.name === this.settings.voice);
            
            if (!voiceExists && this.voices.length > 0) {
                this.autoSelectRussianVoice();
            }
        }
    }

    loadVoiceSettings() {
        try {
            const savedVoice = localStorage.getItem('arisVoice');
            const savedRate = parseFloat(localStorage.getItem('arisRate')) || 1;
            const savedPitch = parseFloat(localStorage.getItem('arisPitch')) || 1;
            const savedVolume = parseFloat(localStorage.getItem('arisVolume')) || 1;

            this.settings.rate = Math.max(0.5, Math.min(2, savedRate));
            this.settings.pitch = Math.max(0.5, Math.min(2, savedPitch));
            this.settings.volume = Math.max(0, Math.min(1, savedVolume));

            if (savedVoice) {
                this.settings.voice = savedVoice;
            }

            this.emit('settingsChanged', this.settings);
            
        } catch (error) {
            console.error('Ошибка загрузки настроек голоса:', error);
        }
    }

    updateSettings(settings) {
        Object.assign(this.settings, settings);
        
        // Валидация значений
        this.settings.rate = Math.max(0.5, Math.min(2, this.settings.rate));
        this.settings.pitch = Math.max(0.5, Math.min(2, this.settings.pitch));
        this.settings.volume = Math.max(0, Math.min(1, this.settings.volume));
        
        localStorage.setItem('arisVoice', settings.voice || '');
        localStorage.setItem('arisRate', this.settings.rate.toString());
        localStorage.setItem('arisPitch', this.settings.pitch.toString());
        localStorage.setItem('arisVolume', this.settings.volume.toString());
        
        this.emit('settingsChanged', this.settings);
    }

    getSelectedVoice() {
        if (!this.voicesLoaded || this.voices.length === 0) {
            return null;
        }
        
        if (this.settings.voice) {
            const voice = this.voices.find(v => v.name === this.settings.voice);
            if (voice) return voice;
        }
        
        // Ищем русский голос
        const russianVoice = this.voices.find(v => v.lang.startsWith('ru'));
        if (russianVoice) return russianVoice;
        
        // Ищем английский голос
        const englishVoice = this.voices.find(v => v.lang.startsWith('en'));
        if (englishVoice) return englishVoice;
        
        // Первый доступный голос
        return this.voices[0] || null;
    }

    async speak(text, options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.synth) {
                reject(new Error('Синтез речи не доступен'));
                return;
            }

            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                reject(new Error('Текст для произношения пуст'));
                return;
            }

            // Останавливаем текущую речь
            if (this.isSpeaking && !options.allowOverlap) {
                this.synth.cancel();
            }

            try {
                const formattedText = this.formatTextForSpeech(text);
                const utterance = new SpeechSynthesisUtterance(formattedText);
                
                // Настраиваем голос
                const voice = this.getSelectedVoice();
                if (voice) {
                    utterance.voice = voice;
                    utterance.lang = voice.lang;
                } else {
                    utterance.lang = this.settings.language;
                }
                
                // Настраиваем параметры
                utterance.rate = options.rate || this.settings.rate;
                utterance.pitch = options.pitch || this.settings.pitch;
                utterance.volume = options.volume || this.settings.volume;
                
                // Обработчики событий
                utterance.onstart = () => {
                    this.isSpeaking = true;
                    console.log('🎤 Начало синтеза');
                    this.emit('speechStart', formattedText);
                };

                utterance.onend = () => {
                    this.isSpeaking = false;
                    console.log('✅ Синтез завершен');
                    this.emit('speechEnd');
                    resolve();
                };

                utterance.onerror = (event) => {
                    this.isSpeaking = false;
                    console.error('❌ Ошибка синтеза:', event.error);
                    
                    let errorMessage = 'Ошибка синтеза речи';
                    this.emit('speechError', errorMessage);
                    reject(new Error(errorMessage));
                };

                // Начинаем синтез
                console.log(`🔊 Произношение текста (${formattedText.length} символов)`);
                this.synth.speak(utterance);

            } catch (error) {
                console.error('❌ Ошибка создания utterance:', error);
                reject(new Error(`Ошибка создания utterance: ${error.message}`));
            }
        });
    }

    async say(text, options = {}) {
        try {
            const formattedText = this.formatTextForSpeech(text);
            await this.speak(formattedText, options);
            return true;
        } catch (error) {
            console.error('❌ Ошибка произношения:', error);
            this.emit('speechError', error.message);
            return false;
        }
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('⚠️ Распознавание речи не поддерживается браузером');
            this.emit('recognitionError', 'Распознавание речи не поддерживается');
            return false;
        }

        try {
            this.recognition = new SpeechRecognition();
            
            // Настройки распознавания
            this.recognition.lang = this.settings.language;
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;
            
            // Обработчики событий
            this.recognition.onstart = () => {
                this.isListening = true;
                console.log('🎤 Начало распознавания речи');
                this.emit('recognitionStart');
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log(`📝 Распознано: "${transcript}"`);
                this.emit('recognitionResult', transcript);
            };

            this.recognition.onerror = (event) => {
                console.error('❌ Ошибка распознавания речи:', event.error);
                
                let errorMessage = '';
                switch(event.error) {
                    case 'no-speech':
                        errorMessage = 'Речь не обнаружена. Пожалуйста, повторите.';
                        break;
                    case 'audio-capture':
                        errorMessage = 'Микрофон не найден. Проверьте подключение микрофона.';
                        break;
                    case 'not-allowed':
                        errorMessage = 'Доступ к микрофона запрещен. Разрешите доступ в настройках браузера.';
                        break;
                    default:
                        errorMessage = `Ошибка распознавания: ${event.error}`;
                }
                
                this.emit('recognitionError', errorMessage);
            };

            this.recognition.onend = () => {
                this.isListening = false;
                console.log('✅ Распознавание речи завершено');
                this.emit('recognitionEnd');
            };

            console.log('✅ Распознавание речи инициализировано');
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка инициализации распознавания речи:', error);
            this.emit('recognitionError', 'Не удалось инициализировать распознавание речи');
            return false;
        }
    }

    toggleRecognition() {
        if (!this.recognition) {
            this.emit('recognitionError', 'Распознавание речи не поддерживается');
            return;
        }

        if (this.isListening) {
            this.stopRecognition();
        } else {
            this.startRecognition();
        }
    }

    startRecognition() {
        if (!this.recognition || this.isListening) return;
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error('❌ Ошибка запуска распознавания:', error);
            this.emit('recognitionError', 'Не удалось запустить распознавание речи');
        }
    }

    stopRecognition() {
        if (!this.recognition || !this.isListening) return;
        
        try {
            this.recognition.stop();
        } catch (error) {
            console.error('❌ Ошибка остановки распознавания:', error);
        }
    }

    stopSpeaking() {
        if (this.synth) {
            this.synth.cancel();
            this.isSpeaking = false;
            this.emit('speechStopped');
        }
    }

    pauseSpeaking() {
        if (this.synth && this.isSpeaking) {
            this.synth.pause();
            this.emit('speechPaused');
        }
    }

    resumeSpeaking() {
        if (this.synth && this.synth.paused) {
            this.synth.resume();
            this.emit('speechResumed');
        }
    }

    async testVoice() {
        console.log('🎵 Тестирование голоса...');
        
        if (!this.hasSpeechSynthesis()) {
            this.emit('speechError', 'Синтез речи не поддерживается');
            return false;
        }

        const testTexts = [
            "Привет! Я ARIS, ваш голосовой ассистент.",
            "Добро пожаловать в мир голосовых технологий.",
            "Я могу помочь вам с различными задачами."
        ];

        try {
            for (const text of testTexts) {
                await this.speak(text);
                await this.delay(1000);
            }
            
            console.log('✅ Тест голоса пройден успешно');
            this.emit('testCompleted');
            return true;
            
        } catch (error) {
            console.error('❌ Тест голоса не удался:', error);
            this.emit('speechError', `Тест не удался: ${error.message}`);
            return false;
        }
    }

    // ==== Вспомогательные методы ====

    hasSpeechSynthesis() {
        return !!window.speechSynthesis;
    }

    hasSpeechRecognition() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    getVoices() {
        return this.voices;
    }

    getSettings() {
        return { ...this.settings };
    }

    getStatus() {
        return {
            isListening: this.isListening,
            isSpeaking: this.isSpeaking,
            voicesLoaded: this.voicesLoaded,
            voicesCount: this.voices.length,
            speechQueueLength: this.speechQueue.length,
            speechSupported: this.hasSpeechSynthesis(),
            recognitionSupported: this.hasSpeechRecognition()
        };
    }

    formatTextForSpeech(text) {
        if (!text || typeof text !== 'string') return '';
        
        let formatted = text
            .replace(/<[^>]*>/g, '')
            .replace(/["]/g, '')
            .replace(/[-]/g, ' ')
            .replace(/[@#$%^&*()_+=\[\]{}|\\<>?]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Ограничиваем длину
        if (formatted.length > 500) {
            formatted = formatted.substring(0, 497) + '...';
        }
        
        return formatted;
    }

    setupEventListeners() {
        // Обработка видимости страницы
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseSpeaking();
                this.stopRecognition();
            }
        });
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    saveVoiceSettings() {
        try {
            localStorage.setItem('arisVoice', this.settings.voice || '');
            localStorage.setItem('arisRate', this.settings.rate.toString());
            localStorage.setItem('arisPitch', this.settings.pitch.toString());
            localStorage.setItem('arisVolume', this.settings.volume.toString());
        } catch (error) {
            console.error('Ошибка сохранения настроек голоса:', error);
        }
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
                console.error(`❌ Error in ${event} listener:`, error);
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
        this.stopSpeaking();
        this.stopRecognition();
        
        // Очищаем все слушатели
        this.eventListeners.clear();
        
        if (this.synth) {
            this.synth.cancel();
        }
        
        console.log('🗑️ SpeechManager уничтожен');
    }
}

// Экспортируем глобальный экземпляр
if (!window.speechManager) {
    window.speechManager = new SpeechManager();
}

// Глобальные функции для отладки
window.debugSpeech = {
    test: () => {
        console.log('🔍 Тестирование синтеза речи...');
        
        if (!window.speechSynthesis) {
            console.error('❌ window.speechSynthesis не найден');
            return false;
        }
        
        console.log('✅ window.speechSynthesis доступен');
        
        const voices = window.speechSynthesis.getVoices();
        console.log(`🎤 Доступно голосов: ${voices.length}`);
        
        return true;
    },
    
    speakTest: async () => {
        try {
            await window.speechManager.speak('Тестирование синтеза речи');
            return true;
        } catch (error) {
            console.error('❌ Ошибка теста:', error);
            return false;
        }
    },
    
    getStatus: () => {
        return window.speechManager?.getStatus() || { error: 'SpeechManager не инициализирован' };
    }
};
