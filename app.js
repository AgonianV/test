/**
 * Telegram Mini App - Финансовый трекер
 * Дополнено:
 * 1. Закрытие мини-аппа
 * 2. Экран добавления доходов/расходов
 * 3. Навигация через футер
 * 4. Связь с ботом через Web App Data
 */

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let tg = null;

const AppState = {
    user: null,
    finances: {
        income: 125000,
        expenses: 87000,
        freeMoney: 38000,
        currency: '₽'
    },
    goals: [
        { id: 1, title: "Новый ноутбук", target: 88000, saved: 34000 },
        { id: 2, title: "Отпуск в Грузии", target: 150000, saved: 45000 }
    ],

    // НОВОЕ: транзакции пользователя
    transactions: {
        income: [
            { id: 1, amount: 50000, description: "Зарплата", category: "Работа", date: "2024-03-10" },
            { id: 2, amount: 25000, description: "Фриланс", category: "Проект", date: "2024-03-15" }
        ],
        expenses: [
            { id: 1, amount: 15000, description: "Продукты", category: "Еда", date: "2024-03-05" },
            { id: 2, amount: 7000, description: "Кофе", category: "Развлечения", date: "2024-03-12" }
        ]
    },

    currentPage: 'main', // main, goals, stats, agent
    insights: [...],
    settings: {...}
};

const DOM = {...}; // (остаётся как было)

// ===== ТЕЛЕГРАМ WEB APP - ДОПОЛНЕНИЯ =====

/**
 * Отправка данных боту через Telegram WebApp
 */
function sendToTelegramBot(eventType, data) {
    if (window.Telegram && Telegram.WebApp) {
        // Способ 1: Отправка данных через Telegram
        Telegram.WebApp.sendData(JSON.stringify({
            event: eventType,
            data: data,
            userId: AppState.user?.id,
            timestamp: Date.now()
        }));

        // Способ 2: Отправка уведомления в чат
        Telegram.WebApp.showPopup({
            title: 'Успешно',
            message: 'Данные отправлены боту',
            buttons: [{type: 'ok'}]
        });
    } else {
        console.log('Данные для бота:', {eventType, data});
        // Для тестирования вне Telegram
        alert(`Данные отправлены (в Telegram): ${JSON.stringify(data)}`);
    }
}

/**
 * Закрытие мини-аппа с уведомлением бота
 */
function closeMiniApp() {
    if (window.Telegram && Telegram.WebApp) {
        // Сначала отправляем данные о закрытии
        sendToTelegramBot('app_closed', {
            lastAction: AppState.lastAction,
            sessionTime: Date.now() - AppState.sessionStart
        });

        // Затем закрываем
        Telegram.WebApp.close();
    } else {
        alert('Приложение закрыто (в Telegram будет закрыто)');
    }
}

/**
 * Закрытие мини-аппа
 * Есть 2 варианта: мягкое закрытие (оставляет апп открытым для возврата)
 * и полное закрытие
 */
function closeApp() {
    if (!tg) {
        console.log('Приложение закрыто (standalone режим)');
        // В standalone режиме можно показать сообщение
        alert('Приложение будет закрыто в Telegram');
        return;
    }

    // ВАРИАНТ 1: Мягкое закрытие (можно вернуться назад)
    // tg.close();

    // ВАРИАНТ 2: Полное закрытие с подтверждением
    if (confirm('Закрыть приложение?')) {
        tg.close();
    }
}

// ===== ЭКРАНЫ ДОБАВЛЕНИЯ ТРАНЗАКЦИЙ =====

/**
 * Открывает экран добавления дохода
 */
function openAddIncomeScreen() {
    changeScreen('add-income');
}

/**
 * Открывает экран добавления расхода
 */
function openAddExpenseScreen() {
    changeScreen('add-expense');
}

/**
 * Универсальная функция смены экрана
 */
function changeScreen(screenName) {
    // Скрываем все экраны
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Показываем нужный экран
    const targetScreen = document.getElementById(`${screenName}-screen`);
    if (targetScreen) {
        targetScreen.classList.add('active');
        AppState.currentPage = screenName;
        updateFooterActiveTab();
    }
}

/**
 * Добавляет новый доход
 */
function addIncomeTransaction(amount, description, category) {
    if (!amount || amount <= 0) {
        showNotification('Введите корректную сумму', 'error');
        return false;
    }

    const newTransaction = {
        id: Date.now(),
        amount: parseInt(amount),
        description: description || 'Без описания',
        category: category || 'Другое',
        date: new Date().toISOString().split('T')[0]
    };

    // Добавляем в состояние
    AppState.transactions.income.push(newTransaction);

    // Обновляем общий доход
    AppState.finances.income += newTransaction.amount;
    AppState.finances.freeMoney += newTransaction.amount;

    // Отправляем на сервер бота
    sendDataToBot('income_added', newTransaction);

    // Обновляем UI
    updateUI();

    // Возвращаем на главную
    changeScreen('main');

    showNotification('Доход добавлен!', 'success');
    return true;
}

/**
 * Добавляет новый расход
 */
function addExpenseTransaction(amount, description, category) {
    if (!amount || amount <= 0) {
        showNotification('Введите корректную сумму', 'error');
        return false;
    }

    if (amount > AppState.finances.freeMoney) {
        showNotification('Недостаточно средств', 'error');
        return false;
    }

    const newTransaction = {
        id: Date.now(),
        amount: parseInt(amount),
        description: description || 'Без описания',
        category: category || 'Другое',
        date: new Date().toISOString().split('T')[0]
    };

    // Добавляем в состояние
    AppState.transactions.expenses.push(newTransaction);

    // Обновляем общие расходы и свободные деньги
    AppState.finances.expenses += newTransaction.amount;
    AppState.finances.freeMoney -= newTransaction.amount;

    // Отправляем на сервер бота
    sendDataToBot('expense_added', newTransaction);

    // Обновляем UI
    updateUI();

    // Возвращаем на главную
    changeScreen('main');

    showNotification('Расход добавлен!', 'success');
    return true;
}

// ===== СВЯЗЬ С ТЕЛЕГРАМ БОТОМ =====

/**
 * Отправка данных боту через Web App
 * Telegram предоставляет несколько способов:
 * 1. tg.sendData() - отправка данных обратно в бот
 * 2. Fetch API на ваш сервер
 */
function sendDataToBot(eventType, data) {
    // Способ 1: Через Telegram WebApp (если бот настроен)
    if (tg && tg.sendData) {
        const message = {
            event: eventType,
            data: data,
            userId: AppState.user?.id,
            timestamp: Date.now()
        };

        tg.sendData(JSON.stringify(message));
        console.log('Данные отправлены боту через tg.sendData:', message);
    }

    // Способ 2: Через прямой HTTP запрос на ваш сервер
    // Раскомментируйте и настройте под свой сервер:
    /*
    fetch('https://ваш-сервер.ком/bot-webhook', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            event: eventType,
            data: data,
            initData: tg?.initData, // Данные от Telegram для авторизации
            userId: AppState.user?.id
        })
    })
    .then(response => response.json())
    .then(data => console.log('Ответ от сервера:', data))
    .catch(error => console.error('Ошибка отправки:', error));
    */
}

/**
 * Получение данных от бота
 * Бот может отправлять данные через:
 * 1. Web App открытие с параметрами
 * 2. Ответ на запросы
 */
function receiveDataFromBot() {
    // Telegram может передавать данные через start_param
    if (tg && tg.initDataUnsafe.start_param) {
        const startParam = tg.initDataUnsafe.start_param;
        console.log('Параметры запуска от бота:', startParam);
        // Можно распарсить параметры и выполнить действия
    }

    // Или бот может обновлять данные через общие методы
    // Например, запрашиваем обновления каждые 30 секунд
    setInterval(fetchUpdatesFromBot, 30000);
}

/**
 * Запрос обновлений от бота
 */
function fetchUpdatesFromBot() {
    if (!AppState.user?.id) return;

    // Пример запроса к вашему API
    /*
    fetch(`https://ваш-сервер.ком/api/user/${AppState.user.id}/updates`)
        .then(response => response.json())
        .then(updates => {
            if (updates.newTransactions) {
                // Обновляем данные в приложении
                processBotUpdates(updates);
            }
        })
        .catch(error => console.error('Ошибка запроса обновлений:', error));
    */
}

// ===== ФУТЕР И НАВИГАЦИЯ =====

/**
 * Инициализация футера
 */
function initFooter() {
    // Показываем футер
    if (DOM.bottomNav) {
        DOM.bottomNav.style.display = 'flex';
    }

    // Обработчики для кнопок навигации
    document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            navigateToPage(page);
        });
    });

    // Кнопка разговора с ботом
    const chatBtn = document.getElementById('chat-with-bot');
    if (chatBtn) {
        chatBtn.addEventListener('click', openChatWithBot);
    }

    updateFooterActiveTab();
}

/**
 * Навигация по страницам
 */
function navigateToPage(page) {
    if (page === 'main') {
        changeScreen('main');
    } else if (page === 'goals') {
        // В будущем можно сделать экран целей
        showNotification('Экран целей в разработке', 'info');
        // changeScreen('goals');
    } else if (page === 'stats') {
        showNotification('Статистика в разработке', 'info');
        // changeScreen('stats');
    } else if (page === 'agent') {
        showNotification('Финансовый агент в разработке', 'info');
        // changeScreen('agent');
    }

    AppState.currentPage = page;
    updateFooterActiveTab();
}

/**
 * Обновляет активную вкладку в футере
 */
function updateFooterActiveTab() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const page = btn.getAttribute('data-page');
        if (page === AppState.currentPage) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

/**
 * Открывает чат с ботом
 */
function openChatWithBot() {
    if (!tg) {
        showNotification('В Telegram откройте чат с ботом', 'info');
        return;
    }

    // Telegram WebApp может открыть ссылку на бота
    // tg.openLink('https://t.me/your_bot_username');

    // Или показать сообщение
    tg.showPopup({
        title: 'Чат с ботом',
        message: 'Для общения с финансовым ботом перейдите в чат @your_finance_bot',
        buttons: [
            {id: 'open', type: 'default', text: 'Открыть бота'},
            {type: 'cancel', text: 'Закрыть'}
        ]
    }, function(buttonId) {
        if (buttonId === 'open') {
            tg.openLink('https://t.me/your_finance_bot');
        }
    });
}

// ===== УТИЛИТЫ =====

/**
 * Показывает уведомление
 */
function showNotification(message, type = 'info') {
    if (tg && tg.showPopup) {
        tg.showPopup({
            title: type === 'error' ? 'Ошибка' :
                   type === 'success' ? 'Успешно' : 'Информация',
            message: message,
            buttons: [{type: 'ok'}]
        });
    } else {
        // В standalone режиме
        alert(message);
    }
}

/**
 * Форматирует валюту
 */
function formatCurrency(amount, currency) {
    return new Intl.NumberFormat('ru-RU').format(amount) + ' ' + currency;
}

// Обработка кнопки закрытия
DOM.closeBtn?.addEventListener('click', function() {
    // Отправляем событие закрытия боту
    sendToTelegramBot('app_closed', {
        screen: AppState.currentPage,
        transactionsAdded: AppState.transactions.addedCount || 0
    });

    // Закрываем мини-апп
    if (tg && tg.close) {
        tg.close();
    }
});

// Обработка добавления дохода
function submitIncome() {
    const amount = document.getElementById('income-amount-input').value;
    const description = document.getElementById('income-description').value;
    const category = document.getElementById('income-category').value;

    if (!amount || amount <= 0) {
        showNotification('Введите сумму', 'error');
        return;
    }

    const transactionData = {
        amount: parseInt(amount),
        description: description || 'Без описания',
        category: category || 'Другое',
        date: new Date().toISOString().split('T')[0]
    };

    // Отправляем данные боту
    sendToTelegramBot('income_added', transactionData);

    // Обновляем локальное состояние
    addIncomeTransaction(amount, description, category);

    // Показываем уведомление
    showNotification(`Доход ${amount} ₽ добавлен`, 'success');

    // Возвращаем на главную
    changeScreen('main');
}

// ===== ИНИЦИАЛИЗАЦИЯ =====

function initApp() {
    console.log('🚀 Инициализация приложения...');

    initTelegramWebApp();
    cacheDOMElements();
    setupEventListeners();
    loadInitialData();
    initFooter(); // НОВОЕ: инициализируем футер
    updateUI();
    initInsightsCarousel();

    // Получаем данные от бота при старте
    receiveDataFromBot();

    console.log('✅ Приложение инициализировано');
}

// Запуск приложения при загрузке
document.addEventListener('DOMContentLoaded', initApp);