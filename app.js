/**
 * Telegram Mini App - Финансовый трекер
 * Полная версия с работающей логикой
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
    currentPage: 'main',
    insights: [
        "Потрачено 6 700 ₽ на кофе за месяц",
        "Через 12 дней конец отопительного сезона - ЖКХ будет стоить меньше",
        "Самая крупная покупка месяца: 25 000 ₽ на технику"
    ],
    settings: {
        currency: '₽',
        theme: 'light'
    },
    sessionStart: Date.now()
};

const DOM = {
    closeBtn: null,
    appContent: null,
    incomeAmount: null,
    expenseAmount: null,
    freeAmount: null,
    currentMonth: null,
    balanceChart: null,
    chartDescription: null,
    goalsList: null,
    addGoalBtn: null,
    insightsCarousel: null,
    insightsDots: null,
    bottomNav: null,
    modalOverlay: null,
    modal: null
};

// ===== ТЕЛЕГРАМ WEB APP =====

function initTelegramWebApp() {
    if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        console.log('Telegram WebApp инициализирован');

        tg.expand();

        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            AppState.user = tg.initDataUnsafe.user;
        }

        document.body.style.backgroundColor = tg.backgroundColor || '#f8f9fa';
    } else {
        console.warn('Telegram WebApp SDK не обнаружен. Запуск в standalone режиме.');
        AppState.user = { id: 123, first_name: 'Тестовый', username: 'test_user' };
    }
}

function closeMiniApp() {
    if (tg && tg.sendData) {
        tg.sendData(JSON.stringify({
            event: 'app_closed',
            data: {
                screen: AppState.currentPage,
                sessionTime: Date.now() - AppState.sessionStart
            }
        }));
    }

    if (tg && tg.close) {
        tg.close();
    } else {
        alert('Приложение будет закрыто в Telegram');
    }
}

function sendToTelegramBot(eventType, data) {
    if (tg && tg.sendData) {
        tg.sendData(JSON.stringify({
            event: eventType,
            data: data,
            userId: AppState.user?.id,
            timestamp: Date.now()
        }));
        console.log('Данные отправлены боту:', eventType);
    }
}

// ===== УПРАВЛЕНИЕ DOM =====

function cacheDOMElements() {
    DOM.closeBtn = document.getElementById('close-btn');
    DOM.appContent = document.getElementById('app-content');
    DOM.incomeAmount = document.getElementById('income-amount');
    DOM.expenseAmount = document.getElementById('expense-amount');
    DOM.freeAmount = document.getElementById('free-amount');
    DOM.currentMonth = document.getElementById('current-month');
    DOM.balanceChart = document.getElementById('balance-chart');
    DOM.chartDescription = document.getElementById('chart-description');
    DOM.goalsList = document.getElementById('goals-list');
    DOM.addGoalBtn = document.getElementById('add-goal-btn');
    DOM.insightsCarousel = document.getElementById('insights-carousel');
    DOM.insightsDots = document.getElementById('insights-dots');
    DOM.bottomNav = document.getElementById('bottom-nav');
    DOM.modalOverlay = document.getElementById('modal-overlay');
    DOM.modal = document.getElementById('modal');
}

function setupEventListeners() {
    // Кнопка закрытия
    if (DOM.closeBtn) {
        DOM.closeBtn.addEventListener('click', closeMiniApp);
    }

    // Кнопки "Добавить" в блоке баланса
    document.querySelectorAll('.add-btn[data-type]').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            if (type === 'income') {
                openAddIncomeScreen();
            } else if (type === 'expense') {
                openAddExpenseScreen();
            }
        });
    });

    // Кнопка добавления цели
    if (DOM.addGoalBtn) {
        DOM.addGoalBtn.addEventListener('click', openAddGoalModal);
    }

    // Кнопки навигации в футере
    document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            navigateToPage(page);
        });
    });

    // Кнопка чата с ботом
    const chatBtn = document.getElementById('chat-with-bot');
    if (chatBtn) {
        chatBtn.addEventListener('click', openChatWithBot);
    }

    // Кнопки отправки форм
    const incomeSubmitBtn = document.getElementById('income-submit-btn');
    if (incomeSubmitBtn) {
        incomeSubmitBtn.addEventListener('click', submitIncome);
    }

    const expenseSubmitBtn = document.getElementById('expense-submit-btn');
    if (expenseSubmitBtn) {
        expenseSubmitBtn.addEventListener('click', submitExpense);
    }

    // Кнопки назад
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            changeScreen('main');
        });
    });
}

// ===== УПРАВЛЕНИЕ ЭКРАНАМИ =====

function openAddIncomeScreen() {
    changeScreen('add-income');
}

function openAddExpenseScreen() {
    changeScreen('add-expense');
    updateAvailableMoney();
}

function openAddGoalModal() {
    alert('Добавление целей в разработке');
}

function changeScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(`${screenName}-screen`);
    if (targetScreen) {
        targetScreen.classList.add('active');
        AppState.currentPage = screenName;
        updateFooterActiveTab();
    }
}

// ===== РАБОТА С ДАННЫМИ =====

function loadInitialData() {
    const now = new Date();
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear();

    AppState.currentMonth = `${currentMonth} ${currentYear}`;
}

function updateUI() {
    updateBalanceUI();
    updateChartUI();
    updateGoalsUI();
    updateMonthUI();
}

function updateBalanceUI() {
    if (DOM.incomeAmount && DOM.expenseAmount && DOM.freeAmount) {
        DOM.incomeAmount.textContent = formatCurrency(AppState.finances.income, AppState.finances.currency);
        DOM.expenseAmount.textContent = formatCurrency(AppState.finances.expenses, AppState.finances.currency);
        DOM.freeAmount.textContent = formatCurrency(AppState.finances.freeMoney, AppState.finances.currency);
    }
}

function updateChartUI() {
    if (DOM.chartDescription) {
        const savingsPercentage = ((AppState.finances.freeMoney / AppState.finances.income) * 100).toFixed(1);
        DOM.chartDescription.innerHTML = `
            <p>В этом месяце вы сохранили <strong>${savingsPercentage}%</strong> от дохода.</p>
            <p>Основные расходы: жильё, транспорт, питание.</p>
        `;
    }
}

function updateGoalsUI() {
    if (!DOM.goalsList) return;

    if (!AppState.goals || AppState.goals.length === 0) {
        DOM.goalsList.innerHTML = '<div class="no-goals">Целей пока нет. Добавьте первую!</div>';
        return;
    }

    const goalsHTML = AppState.goals.map(goal => {
        const progressPercentage = Math.min((goal.saved / goal.target) * 100, 100);
        const formattedSaved = formatCurrency(goal.saved, AppState.finances.currency);
        const formattedTarget = formatCurrency(goal.target, AppState.finances.currency);

        return `
            <div class="goal-item" data-goal-id="${goal.id}">
                <div class="goal-header">
                    <div class="goal-title">${goal.title}</div>
                    <div class="goal-amount">${formattedSaved} / ${formattedTarget}</div>
                </div>
                <div class="goal-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                    </div>
                    <div class="progress-text">${progressPercentage.toFixed(1)}%</div>
                </div>
            </div>
        `;
    }).join('');

    DOM.goalsList.innerHTML = goalsHTML;
}

function updateMonthUI() {
    if (DOM.currentMonth && AppState.currentMonth) {
        DOM.currentMonth.textContent = AppState.currentMonth;
    }
}

function updateAvailableMoney() {
    const availableElem = document.getElementById('available-money');
    if (availableElem) {
        availableElem.textContent = formatCurrency(AppState.finances.freeMoney, AppState.finances.currency);
    }
}

// ===== ОБРАБОТКА ФОРМ =====

function submitIncome() {
    const amountInput = document.getElementById('income-amount-input');
    const descriptionInput = document.getElementById('income-description');
    const categoryInput = document.getElementById('income-category');

    const amount = amountInput ? amountInput.value : 0;
    const description = descriptionInput ? descriptionInput.value : '';
    const category = categoryInput ? categoryInput.value : '';

    if (!amount || amount <= 0) {
        showNotification('Введите корректную сумму', 'error');
        return;
    }

    const newTransaction = {
        id: Date.now(),
        amount: parseInt(amount),
        description: description || 'Без описания',
        category: category || 'Другое',
        date: new Date().toISOString().split('T')[0]
    };

    AppState.transactions.income.push(newTransaction);
    AppState.finances.income += newTransaction.amount;
    AppState.finances.freeMoney += newTransaction.amount;

    sendToTelegramBot('income_added', newTransaction);

    updateUI();
    changeScreen('main');
    showNotification(`Доход ${amount} ₽ добавлен`, 'success');

    if (amountInput) amountInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
    if (categoryInput) categoryInput.value = '';
}

function submitExpense() {
    const amountInput = document.getElementById('expense-amount-input');
    const descriptionInput = document.getElementById('expense-description');
    const categoryInput = document.getElementById('expense-category');

    const amount = amountInput ? amountInput.value : 0;
    const description = descriptionInput ? descriptionInput.value : '';
    const category = categoryInput ? categoryInput.value : '';

    if (!amount || amount <= 0) {
        showNotification('Введите корректную сумму', 'error');
        return;
    }

    if (parseInt(amount) > AppState.finances.freeMoney) {
        showNotification('Недостаточно средств', 'error');
        return;
    }

    const newTransaction = {
        id: Date.now(),
        amount: parseInt(amount),
        description: description || 'Без описания',
        category: category || 'Другое',
        date: new Date().toISOString().split('T')[0]
    };

    AppState.transactions.expenses.push(newTransaction);
    AppState.finances.expenses += newTransaction.amount;
    AppState.finances.freeMoney -= newTransaction.amount;

    sendToTelegramBot('expense_added', newTransaction);

    updateUI();
    changeScreen('main');
    showNotification(`Расход ${amount} ₽ добавлен`, 'success');

    if (amountInput) amountInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
    if (categoryInput) categoryInput.value = '';
}

// ===== НАВИГАЦИЯ И ФУТЕР =====

function initFooter() {
    if (DOM.bottomNav) {
        DOM.bottomNav.style.display = 'flex';
    }
    updateFooterActiveTab();
}

function navigateToPage(page) {
    if (page === 'main') {
        changeScreen('main');
    } else if (page === 'goals') {
        showNotification('Экран целей в разработке', 'info');
    } else if (page === 'stats') {
        showNotification('Статистика в разработке', 'info');
    } else if (page === 'agent') {
        showNotification('Финансовый агент в разработке', 'info');
    }

    AppState.currentPage = page;
    updateFooterActiveTab();
}

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

function openChatWithBot() {
    if (tg && tg.openLink) {
        tg.openLink('https://t.me/your_finance_bot');
    } else {
        alert('Откройте бота @your_finance_bot в Telegram');
    }
}

// ===== КАРУСЕЛЬ ИНСАЙТОВ =====

function initInsightsCarousel() {
    if (!DOM.insightsCarousel || !DOM.insightsDots) return;

    const insights = AppState.insights;
    if (insights.length === 0) return;

    // Создаем точки для навигации
    let dotsHTML = '';
    insights.forEach((_, index) => {
        dotsHTML += `<span class="dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>`;
    });
    DOM.insightsDots.innerHTML = dotsHTML;

    // Добавляем обработчики для точек
    DOM.insightsDots.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            showInsight(index);
        });
    });

    // Автопереключение каждые 5 секунд
    let currentIndex = 0;
    setInterval(() => {
        currentIndex = (currentIndex + 1) % insights.length;
        showInsight(currentIndex);
    }, 5000);
}

function showInsight(index) {
    const insights = document.querySelectorAll('.insight');
    const dots = document.querySelectorAll('.dot');

    insights.forEach(insight => insight.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    if (insights[index]) {
        insights[index].classList.add('active');
    }
    if (dots[index]) {
        dots[index].classList.add('active');
    }
}

// ===== УТИЛИТЫ =====

function showNotification(message, type = 'info') {
    if (tg && tg.showPopup) {
        tg.showPopup({
            title: type === 'error' ? 'Ошибка' :
                   type === 'success' ? 'Успешно' : 'Информация',
            message: message,
            buttons: [{type: 'ok'}]
        });
    } else {
        alert(message);
    }
}

function formatCurrency(amount, currency) {
    return new Intl.NumberFormat('ru-RU').format(amount) + ' ' + currency;
}

// ===== ИНИЦИАЛИЗАЦИЯ =====

function initApp() {
    console.log('🚀 Инициализация приложения...');

    initTelegramWebApp();
    cacheDOMElements();
    setupEventListeners();
    loadInitialData();
    initFooter();
    updateUI();
    initInsightsCarousel();

    console.log('✅ Приложение инициализировано');
}

// Запуск приложения при загрузке
document.addEventListener('DOMContentLoaded', initApp);
