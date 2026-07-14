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
const transactionName = document.getElementById("transaction-name");
const transactionAmount = document.getElementById("transaction-amount");
const transactionType = document.getElementById("transaction-type");
const transactionList = document.getElementById("transaction-list");
const incomeTotal = document.getElementById("income-total");
const expenseTotal = document.getElementById("expense-total");
const balanceTotal = document.getElementById("balance-total");
const dashboardUsername = document.getElementById("dashboard-username");

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
    createAccbtn.form.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!validateAccount()) {
            return;
        }

        localStorage.setItem("username", username.value.trim());
        localStorage.setItem("password", password.value);
        localStorage.setItem("currency", currency.value);
        localStorage.setItem("incomeRange", incomeRange.value);
        localStorage.removeItem("loggedIn");
        window.location.href = "Index.html";
    });
}

if (loginbtn) {
    loginbtn.form.addEventListener("submit", (event) => {
        event.preventDefault();

        const savedUsername = localStorage.getItem("username");
        const savedPassword = localStorage.getItem("password");

        if (loginUsername.value.trim() === savedUsername && loginPassword.value === savedPassword) {
            localStorage.setItem("loggedIn", "true");
            window.location.href = "dashboard.html";
        } else {
            window.alert("Login details are incorrect");
        }
    });
}

if (logoutbtn) {
    logoutbtn.addEventListener("click", () => {
        localStorage.removeItem("loggedIn");
        window.location.href = "Index.html";
    });
}

if (document.body.dataset.page === "dashboard") {
    protectDashboard();
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

    localStorage.setItem("profile", JSON.stringify(profile));
}

function protectDashboard() {
    if (localStorage.getItem("loggedIn") !== "true") {
        window.location.href = "Index.html";
    }
}

function setupDashboard() {
    if (dashboardUsername) {
        dashboardUsername.textContent = localStorage.getItem("username") || "User";
    }

    renderTransactions();

    if (transactionForm) {
        transactionForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const name = transactionName.value.trim();
            const amount = Number(transactionAmount.value);
            const type = transactionType.value;

            if (!name || amount <= 0) {
                window.alert("Enter a transaction name and an amount greater than 0");
                return;
            }

            const transactions = getTransactions();
            transactions.push({
                id: Date.now(),
                name,
                amount,
                type
            });

            localStorage.setItem("transactions", JSON.stringify(transactions));
            transactionForm.reset();
            renderTransactions();
        });
    }
}

function getTransactions() {
    try {
        return JSON.parse(localStorage.getItem("transactions")) || [];
    } catch {
        return [];
    }
}

function renderTransactions() {
    if (!transactionList) {
        return;
    }

    const transactions = getTransactions();
    let income = 0;
    let expenses = 0;

    transactionList.innerHTML = "";

    transactions.forEach((transaction) => {
        if (transaction.type === "income") {
            income += transaction.amount;
        } else {
            expenses += transaction.amount;
        }

        const item = document.createElement("li");
        const name = document.createElement("span");
        const amount = document.createElement("strong");
        const deleteButton = document.createElement("button");

        item.className = `transaction-item ${transaction.type}`;
        name.textContent = transaction.name;
        amount.textContent = formatMoney(transaction.amount);
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", `Delete ${transaction.name}`);

        deleteButton.addEventListener("click", () => {
            deleteTransaction(transaction.id);
        });

        item.append(name, amount, deleteButton);
        transactionList.appendChild(item);
    });

    incomeTotal.textContent = formatMoney(income);
    expenseTotal.textContent = formatMoney(expenses);
    balanceTotal.textContent = formatMoney(income - expenses);
}

function deleteTransaction(id) {
    const transactions = getTransactions().filter((transaction) => transaction.id !== id);
    localStorage.setItem("transactions", JSON.stringify(transactions));
    renderTransactions();
}

function formatMoney(amount) {
    const symbols = {
        ZAR: "R",
        USD: "$",
        EUR: "EUR ",
        GBP: "GBP "
    };
    const savedCurrency = localStorage.getItem("currency") || "ZAR";

    return `${symbols[savedCurrency] || "R"}${amount.toFixed(2)}`;
}
