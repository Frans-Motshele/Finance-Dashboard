const registerbtn = document.getElementById("rgbtn");
const continuebtn = document.getElementById("continuebtn");
const backbtn = document.getElementById("backbtn");
const createAccbtn = document.getElementById("createAccbtn");
const loginbtn = document.getElementById("loginbtn");
const logoutbtn = document.getElementById("logoutbtn");

const loginPassword = document.getElementById("login-password");
const loginUsername = document.getElementById("login-username");

const password = document.getElementById("password");
const confirmedPass = document.getElementById("confirm-password");
const username = document.getElementById("username");
const currency = document.getElementById("currency");
const incomeRange = document.getElementById("income-range");
const firstName = document.getElementById("fname");
const lastName = document.getElementById("lname");
const email = document.getElementById("email");
const phoneNo = document.getElementById("phoneNo");
const dob = document.getElementById("dob");

const transactionForm = document.getElementById("transaction-form");
const transactionId = document.getElementById("transaction-id");
const transactionName = document.getElementById("transaction-name");
const transactionAmount = document.getElementById("transaction-amount");
const transactionType = document.getElementById("transaction-type");
const transactionCategory = document.getElementById("transaction-category");
const transactionDate = document.getElementById("transaction-date");
const transactionList = document.getElementById("transaction-list");
const incomeTotal = document.getElementById("income-total");
const expenseTotal = document.getElementById("expense-total");
const balanceTotal = document.getElementById("balance-total");
const monthTotal = document.getElementById("month-total");
const dashboardUsername = document.getElementById("dashboard-username");
const saveTransaction = document.getElementById("save-transaction");
const cancelEdit = document.getElementById("cancel-edit");
const searchTransactions = document.getElementById("search-transactions");
const filterType = document.getElementById("filter-type");
const filterCategory = document.getElementById("filter-category");
const filterMonth = document.getElementById("filter-month");
const clearFilters = document.getElementById("clear-filters");
const emptyTransactions = document.getElementById("empty-transactions");

let transactionsCache = [];

if (registerbtn) {
    registerbtn.addEventListener("click", () => {
        window.location.href = "register.html";
    });
}

if (continuebtn) {
    continuebtn.form.addEventListener("submit", (event) => {
        event.preventDefault();
        savePersonalInfo();
        window.location.href = "Accountsetup.html";
    });
}

if (backbtn) {
    backbtn.addEventListener("click", () => {
        window.location.href = "register.html";
    });
}

if (createAccbtn) {
    createAccbtn.form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!validateAccount()) {
            return;
        }

        const profile = getSavedPersonalInfo();

        if (!profile) {
            window.alert("Please complete the personal information form first");
            window.location.href = "register.html";
            return;
        }

        try {
            await apiRequest("/api/register", {
                method: "POST",
                body: {
                    profile,
                    username: username.value.trim(),
                    password: password.value,
                    currency: currency.value,
                    incomeRange: incomeRange.value
                }
            });

            sessionStorage.removeItem("pendingProfile");
            clearAuth();
            window.alert("Account created. Please log in.");
            window.location.href = "Index.html";
        } catch (error) {
            window.alert(error.message);
        }
    });
}

if (loginbtn) {
    loginbtn.form.addEventListener("submit", async (event) => {
        event.preventDefault();

        try {
            const data = await apiRequest("/api/login", {
                method: "POST",
                body: {
                    username: loginUsername.value.trim(),
                    password: loginPassword.value
                }
            });

            localStorage.setItem("authToken", data.token);
            localStorage.setItem("currentUser", JSON.stringify(data.user));
            window.location.href = "dashboard.html";
        } catch (error) {
            window.alert(error.message);
        }
    });
}

if (logoutbtn) {
    logoutbtn.addEventListener("click", async () => {
        try {
            await apiRequest("/api/logout", { method: "POST", auth: true });
        } catch {
            // The local session should still be cleared if the server is unavailable.
        }

        clearAuth();
        window.location.href = "Index.html";
    });
}

if (document.body.dataset.page === "dashboard") {
    setupDashboard();
}

function validateAccount() {
    const cleanUsername = username.value.trim();

    if (cleanUsername.length < 3) {
        window.alert("Username must be at least 3 characters long");
        return false;
    }

    if (password.value.length < 6) {
        window.alert("Password must be at least 6 characters long");
        return false;
    }

    if (password.value !== confirmedPass.value) {
        window.alert("Passwords do not match");
        return false;
    }

    return true;
}

function savePersonalInfo() {
    const profile = {
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim(),
        email: email.value.trim(),
        phoneNo: phoneNo.value.trim(),
        dob: dob.value
    };

    sessionStorage.setItem("pendingProfile", JSON.stringify(profile));
}

function getSavedPersonalInfo() {
    try {
        return JSON.parse(sessionStorage.getItem("pendingProfile"));
    } catch {
        return null;
    }
}

async function setupDashboard() {
    const token = localStorage.getItem("authToken");

    if (!token) {
        window.location.href = "Index.html";
        return;
    }

    try {
        const data = await apiRequest("/api/me", { auth: true });
        localStorage.setItem("currentUser", JSON.stringify(data.user));

        if (dashboardUsername) {
            dashboardUsername.textContent = data.user.username;
        }

        if (transactionDate) {
            transactionDate.valueAsDate = new Date();
        }

        await loadTransactions();
        bindDashboardEvents();
    } catch {
        clearAuth();
        window.location.href = "Index.html";
    }
}

function bindDashboardEvents() {
    if (transactionForm) {
        transactionForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const transaction = readTransactionForm();

            if (!transaction) {
                return;
            }

            try {
                if (transactionId.value) {
                    await apiRequest(`/api/transactions/${transactionId.value}`, {
                        method: "PUT",
                        auth: true,
                        body: transaction
                    });
                } else {
                    await apiRequest("/api/transactions", {
                        method: "POST",
                        auth: true,
                        body: transaction
                    });
                }

                resetTransactionForm();
                await loadTransactions();
            } catch (error) {
                window.alert(error.message);
            }
        });
    }

    if (cancelEdit) {
        cancelEdit.addEventListener("click", resetTransactionForm);
    }

    [searchTransactions, filterType, filterCategory, filterMonth].forEach((control) => {
        if (control) {
            control.addEventListener("input", renderTransactions);
        }
    });

    if (clearFilters) {
        clearFilters.addEventListener("click", () => {
            searchTransactions.value = "";
            filterType.value = "all";
            filterCategory.value = "all";
            filterMonth.value = "";
            renderTransactions();
        });
    }
}

function readTransactionForm() {
    const name = transactionName.value.trim();
    const amount = Number(transactionAmount.value);
    const type = transactionType.value;
    const category = transactionCategory.value;
    const date = transactionDate.value;

    if (!name || amount <= 0 || !category || !date) {
        window.alert("Enter a name, amount, category, and date");
        return null;
    }

    return {
        name,
        amount,
        type,
        category,
        date
    };
}

async function loadTransactions() {
    const data = await apiRequest("/api/transactions", { auth: true });
    transactionsCache = data.transactions;
    renderTransactions();
}

function renderTransactions() {
    if (!transactionList) {
        return;
    }

    const transactions = transactionsCache;
    const filteredTransactions = filterTransactions(transactions);
    let income = 0;
    let expenses = 0;
    let currentMonthTotal = 0;
    const currentMonth = new Date().toISOString().slice(0, 7);

    transactionList.innerHTML = "";

    transactions.forEach((transaction) => {
        if (transaction.type === "income") {
            income += transaction.amount;
        } else {
            expenses += transaction.amount;
        }

        if (transaction.date.slice(0, 7) === currentMonth) {
            currentMonthTotal += transaction.type === "income" ? transaction.amount : -transaction.amount;
        }
    });

    filteredTransactions.forEach((transaction) => {
        const signedAmount = transaction.type === "income"
            ? formatMoney(transaction.amount)
            : `-${formatMoney(transaction.amount)}`;

        const item = document.createElement("li");
        const info = document.createElement("div");
        const name = document.createElement("span");
        const meta = document.createElement("small");
        const amount = document.createElement("strong");
        const actions = document.createElement("div");
        const editButton = document.createElement("button");
        const deleteButton = document.createElement("button");

        item.className = `transaction-item ${transaction.type}`;
        info.className = "transaction-info";
        name.textContent = transaction.name;
        meta.textContent = `${transaction.category} - ${formatDisplayDate(transaction.date)}`;
        amount.textContent = signedAmount;
        actions.className = "transaction-actions";
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.className = "secondary-button";
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", `Delete ${transaction.name}`);

        editButton.addEventListener("click", () => {
            editTransaction(transaction);
        });

        deleteButton.addEventListener("click", () => {
            deleteTransaction(transaction.id);
        });

        info.append(name, meta);
        actions.append(editButton, deleteButton);
        item.append(info, amount, actions);
        transactionList.appendChild(item);
    });

    incomeTotal.textContent = formatMoney(income);
    expenseTotal.textContent = formatMoney(expenses);
    balanceTotal.textContent = formatMoney(income - expenses);
    monthTotal.textContent = formatMoney(currentMonthTotal);
    emptyTransactions.textContent = transactions.length ? "No transactions match your filters." : "No transactions yet.";
    emptyTransactions.hidden = filteredTransactions.length > 0;
}

async function deleteTransaction(id) {
    const shouldDelete = window.confirm("Delete this transaction?");

    if (!shouldDelete) {
        return;
    }

    try {
        await apiRequest(`/api/transactions/${id}`, {
            method: "DELETE",
            auth: true
        });
        resetTransactionForm();
        await loadTransactions();
    } catch (error) {
        window.alert(error.message);
    }
}

function editTransaction(transaction) {
    transactionId.value = transaction.id;
    transactionName.value = transaction.name;
    transactionAmount.value = transaction.amount;
    transactionType.value = transaction.type;
    transactionCategory.value = transaction.category;
    transactionDate.value = transaction.date;
    saveTransaction.textContent = "Save Changes";
    cancelEdit.hidden = false;
    transactionName.focus();
}

function resetTransactionForm() {
    transactionForm.reset();
    transactionId.value = "";
    transactionDate.valueAsDate = new Date();
    saveTransaction.textContent = "Add Transaction";
    cancelEdit.hidden = true;
}

function filterTransactions(transactions) {
    const searchTerm = searchTransactions.value.trim().toLowerCase();
    const type = filterType.value;
    const category = filterCategory.value;
    const month = filterMonth.value;

    return transactions.filter((transaction) => {
        const matchesSearch = transaction.name.toLowerCase().includes(searchTerm);
        const matchesType = type === "all" || transaction.type === type;
        const matchesCategory = category === "all" || transaction.category === category;
        const matchesMonth = !month || transaction.date.slice(0, 7) === month;

        return matchesSearch && matchesType && matchesCategory && matchesMonth;
    });
}

async function apiRequest(path, options = {}) {
    const headers = {
        "Content-Type": "application/json"
    };

    if (options.auth) {
        const token = localStorage.getItem("authToken");

        if (!token) {
            throw new Error("You are not logged in");
        }

        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(path, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Request failed");
    }

    return data;
}

function clearAuth() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("currentUser"));
    } catch {
        return null;
    }
}

function formatDisplayDate(dateValue) {
    const date = new Date(`${dateValue}T00:00:00`);
    return date.toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function formatMoney(amount) {
    const symbols = {
        ZAR: "R",
        USD: "$",
        EUR: "EUR ",
        GBP: "GBP "
    };
    const currentUser = getCurrentUser();
    const savedCurrency = currentUser?.currency || "ZAR";
    const sign = amount < 0 ? "-" : "";
    const positiveAmount = Math.abs(amount);

    return `${sign}${symbols[savedCurrency] || "R"}${positiveAmount.toFixed(2)}`;
}
