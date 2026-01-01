ARIS - Голосовой AI ассистент с памятью
https://img.shields.io/badge/ARIS-Voice%2520AI%2520Assistant-blue
https://img.shields.io/badge/version-2.1-green
https://img.shields.io/badge/license-MIT-yellow
https://img.shields.io/badge/Web%2520Speech%2520API-Supported-green

ARIS (Audio Recognition Intelligent Support) — интеллектуальный голосовой ассистент нового поколения с долгосрочной памятью и управлением локальными приложениями.

🌟 Возможности
🎤 Голосовое управление
Распознавание речи на русском языке

Синтез речи с настраиваемыми параметрами

Голосовые команды для управления системой

🧠 Интеллектуальная память
Запоминание истории разговоров (до 10 последних)

Автоматическое сохранение проектов и задач

Контекстное понимание на основе прошлых диалогов

💻 Управление приложениями
Открытие популярных программ (VS Code, Chrome, Spotify, Telegram и др.)

Запуск проектов в средах разработки

Поддержка пользовательских протоколов

🔧 Расширенные функции
Поддержка двух AI провайдеров (Mistral AI и OpenAI)

Кэширование запросов для экономии токенов

Экспорт/импорт данных

Адаптивный интерфейс для всех устройств

🚀 Быстрый старт
Предварительные требования
Современный браузер (Chrome 80+, Firefox 75+, Edge 80+)

Микрофон для голосового ввода

API ключ от Mistral AI или OpenAI

Установка
Клонируйте репозиторий

bash
git clone https://github.com/yourusername/aris.git
cd aris
Запустите локальный сервер

Вы можете использовать любой статический сервер:

bash
# Python 3
python -m http.server 8000

# или с Node.js
npx http-server
Откройте в браузере

Перейдите по адресу: http://localhost:8000

🛠 Настройка
Получение API ключа
<div style="display: flex; flex-wrap: wrap; gap: 20px; margin: 20px 0;"> <div style="flex: 1; min-width: 300px; border: 1px solid #ddd; border-radius: 8px; padding: 15px;"> <h3>Mistral AI</h3> <ol> <li>Зарегистрируйтесь на <a href="https://console.mistral.ai" target="_blank">console.mistral.ai</a></li> <li>Перейдите в раздел API Keys</li> <li>Создайте новый ключ</li> <li>Скопируйте его в ARIS</li> </ol> </div> <div style="flex: 1; min-width: 300px; border: 1px solid #ddd; border-radius: 8px; padding: 15px;"> <h3>OpenAI</h3> <ol> <li>Зарегистрируйтесь на <a href="https://platform.openai.com" target="_blank">platform.openai.com</a></li> <li>Создайте API ключ в соответствующем разделе</li> <li>Используйте его в настройках ARIS</li> </ol> </div> </div>
Настройка голоса
В разделе "Настройки голоса" выберите предпочтительный голос

Отрегулируйте скорость, высоту тона и громкость

Протестируйте настройки кнопкой "Тестировать голос"

📖 Использование
Голосовые команды
ARIS понимает естественный русский язык. Примеры команд:

<table> <thead> <tr> <th>Команда</th> <th>Действие</th> </tr> </thead> <tbody> <tr> <td><code>"Открой VS Code"</code></td> <td>Запускает Visual Studio Code</td> </tr> <tr> <td><code>"Что я делал вчера?"</code></td> <td>Показывает историю действий</td> </tr> <tr> <td><code>"Запомни проект ARIS"</code></td> <td>Сохраняет проект в память</td> </tr> <tr> <td><code>"Открой мой проект"</code></td> <td>Открывает последний проект</td> </tr> <tr> <td><code>"Очисти память"</code></td> <td>Удаляет историю разговоров</td> </tr> </tbody> </table>
Быстрые действия
Используйте панель быстрых действий для:

Быстрого открытия приложений

Доступа к управлению памятью

Просмотра недавних проектов

Ручной ввод
Можете вводить текстовые сообщения в поле ввода чата. ARIS ответит как на голосовые, так и на текстовые запросы.

🗂 Структура проекта
text
aris/
├── index.html          # Главный HTML файл
├── css/
│   ├── style.css      # Основные стили
│   └── animations.css # Анимации
├── js/
│   ├── main.js        # Главный модуль приложения
│   ├── api-manager.js # Управление API запросами
│   ├── speech-manager.js # Распознавание и синтез речи
│   ├── memory-manager.js # Управление памятью
│   ├── database.js    # Работа с IndexedDB
│   ├── app-launcher.js # Запуск приложений
│   └── ui-manager.js  # Управление интерфейсом
├── favicon.ico        # Иконка сайта
└── README.md          # Этот файл
🔧 Технические детали
Используемые технологии
<table> <tr> <td><strong>Frontend</strong></td> <td>HTML5, CSS3, Vanilla JavaScript (ES6+)</td> </tr> <tr> <td><strong>Хранение данных</strong></td> <td>IndexedDB (браузерная база данных)</td> </tr> <tr> <td><strong>Распознавание речи</strong></td> <td>Web Speech API</td> </tr> <tr> <td><strong>AI интеграция</strong></td> <td>REST API (Mistral AI, OpenAI)</td> </tr> <tr> <td><strong>Архитектура</strong></td> <td>Модульная, с использованием классов и событий</td> </tr> </table>
Ключевые особенности
Автономная работа: Все данные хранятся в браузере

Кэширование: Уменьшение количества API запросов

Очередь запросов: Последовательная обработка команд

Обработка ошибок: Гибкая система уведомлений и восстановления

📊 Производительность
ARIS оптимизирован для:

Быстрой загрузки интерфейса (менее 2 секунд)

Эффективного использования памяти (до 100 кэшированных запросов)

Минимальной задержки при распознавании речи

Стабильной работы в фоновом режиме

📱 Скриншоты
<div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0;"> <img src="https://via.placeholder.com/300x200/4a90e2/ffffff?text=Главный+экран" alt="Главный экран" style="border-radius: 8px;"> <img src="https://via.placeholder.com/300x200/7b1fa2/ffffff?text=Чат+с+памятью" alt="Чат с памятью" style="border-radius: 8px;"> <img src="https://via.placeholder.com/300x200/388e3c/ffffff?text=Настройки+API" alt="Настройки API" style="border-radius: 8px;"> </div>
🤝 Вклад в проект
Мы приветствуем вклад в развитие ARIS! Вот как вы можете помочь:

Процесс разработки
Форкните репозиторий

Создайте ветку для вашей функции (git checkout -b feature/amazing-feature)

Зафиксируйте изменения (git commit -m 'Add some amazing feature')

Отправьте в форк (git push origin feature/amazing-feature)

Откройте Pull Request

📄 Лицензия
Этот проект распространяется под лицензией MIT. Подробности см. в файле LICENSE.

📞 Контакты и поддержка
Issues: GitHub Issues

Вопросы по использованию: Откройте Discussion в репозитории

🚧 Известные ограничения
Требуется стабильное интернет-соединение для работы с AI API

Поддержка микрофона зависит от браузера и настроек разрешений

Некоторые функции голосового управления требуют установленных приложений

🔮 Планы развития
Поддержка большего количества языков

Интеграция с календарем и задачами

Плагины для расширения функциональности

Мобильное приложение

Автоматическое обновление моделей AI

Оффлайн-режим с локальными моделями

Интеграция с GitHub/GitLab

Умные напоминания

🎯 Цели проекта
ARIS создан с целью предоставить:

Доступность: Простое веб-приложение без установки

Конфиденциальность: Данные хранятся локально

Гибкость: Поддержка разных AI провайдеров

Расширяемость: Модульная архитектура для новых функций

<div align="center"> <h3>⭐ Если вам нравится проект, поставьте звезду на GitHub! ⭐</h3> <p> <a href="https://github.com/yourusername/aris"> <img src="https://img.shields.io/github/stars/yourusername/aris?style=social" alt="GitHub Stars"> </a> <a href="https://github.com/yourusername/aris/fork"> <img src="https://img.shields.io/github/forks/yourusername/aris?style=social" alt="GitHub Forks"> </a> </p> <p> <strong>ARIS v2.1</strong> · Последнее обновление: Январь 2024 </p> </div>
