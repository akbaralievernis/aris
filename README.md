<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ARIS | Интеллектуальный голосовой ассистент с памятью</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap">
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="animations.css">
    <link rel="stylesheet" href="theme.css">
    <link rel="stylesheet" href="reset.css">
    <link rel="stylesheet" href="utilities.css">
    <link rel="icon" type="image/x-icon" href="favicon.ico">
    <meta name="description" content="ARIS - интеллектуальный голосовой ассистент с памятью и управлением приложениями">
</head>
<body>
    <!-- Toast Notifications Container -->
    <div class="toast-container" id="toastContainer"></div>
    <!-- Onboarding Overlay -->
    <div class="onboarding-overlay hidden" id="onboardingOverlay">
        <div class="onboarding-content">
            <h2 class="onboarding-title">👋 Добро пожаловать в ARIS</h2>
            <p class="onboarding-subtitle">Интеллектуальный голосовой ассистент нового поколения с памятью</p>
            <div class="onboarding-steps">
                <div class="onboarding-step">
                    <div class="step-number">1</div>
                    <div>
                        <h4 class="step-title">API Ключ</h4>
                        <p class="step-description">Получите ключ от Mistral AI или OpenAI</p>
                    </div>
                </div>
                <div class="onboarding-step">
                    <div class="step-number">2</div>
                    <div>
                        <h4 class="step-title">Голосовое управление</h4>
                        <p class="step-description">Нажмите микрофон для голосовых команд</p>
                    </div>
                </div>
                <div class="onboarding-step">
                    <div class="step-number">3</div>
                    <div>
                        <h4 class="step-title">Память и история</h4>
                        <p class="step-description">ARIS запоминает последние 10 разговоров</p>
                    </div>
                </div>
            </div>
            <div class="app-permissions">
                <h4><i class="fas fa-shield-alt"></i> Разрешения приложений</h4>
                <p class="permission-note">Для открытия приложений на вашем компьютере ARIS использует безопасные протоколы.</p>
            </div>
            <button class="btn btn-full" id="startBtn">
                <i class="fas fa-rocket"></i> Начать использование
            </button>
        </div>
    </div>
    <!-- Memory Management Modal -->
    <div class="modal-overlay hidden" id="memoryModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-brain"></i> Управление памятью</h3>
                <button class="modal-close" id="closeMemoryModal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="memory-stats">
                    <div class="stat-item">
                        <i class="fas fa-history"></i>
                        <div>
                            <span class="stat-value" id="memoryCount">0</span>
                            <span class="stat-label">сохраненных записей</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-database"></i>
                        <div>
                            <span class="stat-value" id="memorySize">0 KB</span>
                            <span class="stat-label">использовано памяти</span>
                        </div>
                    </div>
                </div>     
                <div class="memory-actions">
                    <button class="btn btn-secondary" id="exportMemoryBtn">
                        <i class="fas fa-download"></i> Экспорт памяти
                    </button>
                    <button class="btn btn-secondary" id="clearMemoryBtn">
                        <i class="fas fa-trash"></i> Очистить память
                    </button>
                    <button class="btn" id="syncMemoryBtn">
                        <i class="fas fa-sync"></i> Синхронизировать
                    </button>
                </div>
                <div class="memory-list-container">
                    <h4>Последние записи памяти</h4>
                    <div class="memory-list" id="memoryList">
                        <!-- Будет заполнено через JavaScript -->
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="container">
        <!-- Header -->
        <header class="header fade-in">
            <div class="header-top">
                <h1 class="logo">ARIS</h1>
                <div class="header-actions">
                    <button class="btn-icon" id="memoryBtn" title="Управление памятью">
                        <i class="fas fa-brain"></i>
                        <span class="badge" id="memoryBadge">0</span>
                    </button>
                    <button class="btn-icon" id="themeToggleBtn" title="Сменить тему">
                        <i class="fas fa-moon"></i>
                    </button>
                    <button class="btn-icon" id="helpBtn" title="Помощь">
                        <i class="fas fa-question-circle"></i>
                    </button>
                </div>
            </div>  
            <p class="tagline">Audio Recognition Intelligent Support — Интеллектуальный голосовой ассистент с памятью и управлением приложениями</p>    
            <div class="status-bar">
                <div class="status-item">
                    <div class="status-dot" id="apiStatus"></div>
                    <span>API Подключение</span>
                </div>
                <div class="status-item">
                    <div class="status-dot" id="micStatus"></div>
                    <span>Микрофон</span>
                </div>
                <div class="status-item">
                    <div class="status-dot" id="voiceStatusDot"></div>
                    <span>Синтез речи</span>
                </div>
                <div class="status-item">
                    <div class="status-dot active" id="memoryStatus"></div>
                    <span>Память активна</span>
                </div>
            </div>
        </header>
        <!-- Main Content Grid -->
        <main class="main-grid">
            <!-- API Configuration Card -->
            <section class="card slide-up">
                <div class="card-header">
                    <i class="fas fa-key"></i>
                    <h2>Настройка API</h2>
                </div>         
                <div class="provider-selector">
                    <button class="provider-btn active" id="mistralBtn">
                        <i class="fas fa-robot"></i> Mistral AI
                    </button>
                    <button class="provider-btn" id="openaiBtn">
                        <i class="fas fa-brain"></i> OpenAI
                    </button>
                </div>     
                <div class="api-input-group">
                    <div class="input-with-icon">
                        <i class="fas fa-key"></i>
                        <input type="password" class="api-key-input" id="apiKeyInput" placeholder="Введите ваш API ключ">
                    </div>
                    <button class="btn btn-full" id="saveApiKey">
                        <i class="fas fa-save"></i> Сохранить ключ
                    </button>
                </div>    
                <div class="api-info">
                    <h4><i class="fas fa-info-circle"></i> Как получить API ключ</h4>
                    <p>
                        Для Mistral AI: <a href="https://console.mistral.ai/api-keys/" target="_blank" rel="noopener">console.mistral.ai/api-keys</a><br>
                        Для OpenAI: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">platform.openai.com/api-keys</a>
                    </p>
                </div>
            </section>
            <!-- Voice Settings Card -->
            <section class="card slide-up delay-1">
                <div class="card-header">
                    <i class="fas fa-sliders-h"></i>
                    <h2>Настройки голоса</h2>
                </div>     
                <div class="settings-grid">
                    <div class="setting-group">
                        <label for="voiceSelect"><i class="fas fa-user-circle"></i> Голос</label>
                        <select id="voiceSelect" class="api-key-input">
                            <option value="">Загрузка голосов...</option>
                        </select>
                    </div>         
                    <div class="setting-group">
                        <label for="rateInput"><i class="fas fa-tachometer-alt"></i> Скорость</label>
                        <div class="range-container">
                            <input type="range" id="rateInput" min="0.5" max="2" step="0.1" value="1">
                            <span class="range-value" id="rateValue">1.0</span>
                        </div>
                    </div>       
                    <div class="setting-group">
                        <label for="pitchInput"><i class="fas fa-wave-square"></i> Высота тона</label>
                        <div class="range-container">
                            <input type="range" id="pitchInput" min="0.5" max="2" step="0.1" value="1">
                            <span class="range-value" id="pitchValue">1.0</span>
                        </div>
                    </div>       
                    <div class="setting-group">
                        <label for="volumeInput"><i class="fas fa-volume-up"></i> Громкость</label>
                        <div class="range-container">
                            <input type="range" id="volumeInput" min="0" max="1" step="0.1" value="1">
                            <span class="range-value" id="volumeValue">1.0</span>
                        </div>
                    </div>
                </div>   
                <button class="btn btn-secondary btn-full" id="testVoiceBtn">
                    <i class="fas fa-play-circle"></i> Тестировать голос
                </button>
            </section>
            <!-- Voice Control Card -->
            <section class="card slide-up delay-2 full-width">
                <div class="card-header">
                    <i class="fas fa-microphone"></i>
                    <h2>Голосовое управление</h2>
                    <span class="badge memory-badge" id="activeMemoryCount">0</span>
                </div>    
                <div class="voice-control-wrapper">
                    <div class="mic-container">
                        <div class="mic-outer">
                            <div class="mic-inner" id="voiceButton">
                                <i class="fas fa-microphone mic-icon"></i>
                            </div>
                        </div>
                    </div>         
                    <div class="voice-status" id="voiceStatusText">
                        Нажмите микрофон для начала голосового ввода
                    </div>            
                    <div class="voice-commands">
                        <h4><i class="fas fa-bolt"></i> Примеры команд:</h4>
                        <div class="command-grid">
                            <div class="command-item">
                                <span class="command-keyword">"Открой VS Code"</span>
                                <span class="command-desc">Открывает Visual Studio Code</span>
                            </div>
                            <div class="command-item">
                                <span class="command-keyword">"Что я делал вчера?"</span>
                                <span class="command-desc">Показывает историю действий</span>
                            </div>
                            <div class="command-item">
                                <span class="command-keyword">"Запомни проект X"</span>
                                <span class="command-desc">Сохраняет проект в память</span>
                            </div>
                            <div class="command-item">
                                <span class="command-keyword">"Открой мой проект"</span>
                                <span class="command-desc">Открывает последний проект</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <!-- Chat Container -->
            <section class="card slide-up delay-3 chat-container-wrapper">
                <div class="chat-header">
                    <div class="card-header">
                        <i class="fas fa-comments"></i>
                        <h2>Диалог с памятью</h2>
                        <div class="memory-indicator">
                            <i class="fas fa-database"></i>
                            <span id="conversationMemory">Память: 0 записей</span>
                        </div>
                    </div>
                    <div class="chat-actions">
                        <button class="btn btn-secondary" id="clearChatBtn" title="Очистить чат">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn btn-secondary" id="exportChatBtn" title="Экспорт диалога">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>            
                <div class="chat-container" id="chatContainer">
                    <div class="message aris">
                        <div class="message-bubble">
                            Здравствуйте! Я ARIS — ваш интеллектуальный голосовой ассистент с памятью. Я запоминаю наши разговоры и могу открывать приложения на вашем компьютере. Для начала работы сохраните API ключ.
                        </div>
                        <div class="message-time" id="welcomeTime"></div>
                    </div>
                </div>            
                <div class="chat-input-container">
                    <input type="text" id="textInput" placeholder="Введите сообщение или голосовую команду..." autocomplete="off">
                    <button class="btn" id="sendTextBtn">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </section>     
            <!-- Memory Preview Card -->
            <section class="card slide-up delay-4">
                <div class="card-header">
                    <i class="fas fa-history"></i>
                    <h2>История разговоров</h2>
                </div>    
                <div class="memory-preview">
                    <div class="memory-preview-header">
                        <h4>Последние 10 записей памяти:</h4>
                        <button class="btn-icon" id="refreshMemoryBtn" title="Обновить">
                            <i class="fas fa-sync"></i>
                        </button>
                    </div>       
                    <div class="memory-items" id="memoryPreview">
                        <div class="empty-memory">
                            <i class="fas fa-inbox"></i>
                            <p>История разговоров пуста. Начните диалог!</p>
                        </div>
                    </div>    
                    <div class="memory-stats-preview">
                        <div class="stat-preview">
                            <i class="fas fa-message"></i>
                            <div>
                                <span class="stat-number" id="totalMessages">0</span>
                                <span class="stat-label">всего сообщений</span>
                            </div>
                        </div>
                        <div class="stat-preview">
                            <i class="fas fa-calendar"></i>
                            <div>
                                <span class="stat-number" id="todayMessages">0</span>
                                <span class="stat-label">сегодня</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section> 
            <!-- Quick Actions Card -->
            <section class="card slide-up delay-5">
                <div class="card-header">
                    <i class="fas fa-bolt"></i>
                    <h2>Быстрые действия</h2>
                </div>     
                <div class="quick-actions">
                    <button class="quick-action-btn" id="openVSCodeBtn">
                        <i class="fas fa-code"></i>
                        <span>VS Code</span>
                    </button>
                    <button class="quick-action-btn" id="openChromeBtn">
                        <i class="fab fa-chrome"></i>
                        <span>Chrome</span>
                    </button>
                    <button class="quick-action-btn" id="openSpotifyBtn">
                        <i class="fab fa-spotify"></i>
                        <span>Spotify</span>
                    </button>
                    <button class="quick-action-btn" id="openTelegramBtn">
                        <i class="fab fa-telegram"></i>
                        <span>Telegram</span>
                    </button>
                    <button class="quick-action-btn" id="memoryModalBtn">
                        <i class="fas fa-brain"></i>
                        <span>Память</span>
                    </button>
                </div>       
                <div class="recent-projects">
                    <h4><i class="fas fa-folder"></i> Недавние проекты</h4>
                    <div class="projects-list" id="recentProjects">
                        <!-- Будет заполнено через JavaScript -->
                    </div>
                </div>
            </section>
        </main>
        <footer class="footer">
            <p>ARIS v2.1 | Голосовой AI ассистент с памятью | <span id="currentYear">2024</span></p>
            <div class="footer-links">
                <a href="#" id="exportDataBtn">Экспорт данных</a>
            </div>
        </footer>
    </div>
    <!-- Подключение скриптов -->
    <script src="database.js"></script>
    <script src="app-launcher.js"></script>
    <script src="memory-manager.js"></script>
    <script src="speech-manager.js"></script>
    <script src="api-manager.js"></script>
    <script src="ui-manager.js"></script>
    <script src="main.js"></script> 
    <script>
        // Установка текущего года в футере
        document.getElementById('currentYear').textContent = new Date().getFullYear();  
        // Обработка кнопки темы
        document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
            window.uiManager?.toggleTheme();
        });
        // Обработка кнопки открытия модального окна памяти
        document.getElementById('memoryModalBtn')?.addEventListener('click', () => {
            window.uiManager?.showMemoryModal();
        });
        // Обработка кнопки старта
        document.getElementById('startBtn')?.addEventListener('click', () => {
            window.uiManager?.hideOnboarding();
        });
        // Открытие Spotify
        document.getElementById('openSpotifyBtn')?.addEventListener('click', async () => {
            try {
                await window.appLauncher?.openApplication('spotify');
                window.uiManager?.showToast('Spotify открывается...', 'info');
            } catch (error) {
                window.uiManager?.showToast('Ошибка открытия Spotify', 'error');
            }
        });
        // Открытие Telegram
        document.getElementById('openTelegramBtn')?.addEventListener('click', async () => {
            try {
                await window.appLauncher?.openApplication('telegram');
                window.uiManager?.showToast('Telegram открывается...', 'info');
            } catch (error) {
                window.uiManager?.showToast('Ошибка открытия Telegram', 'error');
            }
        });
    </script>
</body>
</html>
