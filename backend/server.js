const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = path.resolve(__dirname, "..");
const DB_PATH = path.join(__dirname, "finance.db");
const db = new DatabaseSync(DB_PATH);

db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'ZAR',
        income_range TEXT NOT NULL DEFAULT 'Prefer not to say',
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone_no TEXT NOT NULL,
        dob TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
`);

const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8"
};

const server = http.createServer(async (request, response) => {
    try {
        if (request.url.startsWith("/api/")) {
            await handleApi(request, response);
            return;
        }

        serveStatic(request, response);
    } catch (error) {
        console.error(error);
        sendJson(response, 500, { error: "Server error" });
    }
});

server.listen(PORT, () => {
    console.log(`Finance Tracker running at http://localhost:${PORT}`);
});

async function handleApi(request, response) {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const method = request.method;
    const pathname = url.pathname;

    if (method === "POST" && pathname === "/api/register") {
        const body = await readJsonBody(request);
        registerUser(response, body);
        return;
    }

    if (method === "POST" && pathname === "/api/login") {
        const body = await readJsonBody(request);
        loginUser(response, body);
        return;
    }

    const user = getAuthenticatedUser(request);

    if (!user) {
        sendJson(response, 401, { error: "Not authenticated" });
        return;
    }

    if (method === "POST" && pathname === "/api/logout") {
        logoutUser(request, response);
        return;
    }

    if (method === "GET" && pathname === "/api/me") {
        sendJson(response, 200, { user: publicUser(user) });
        return;
    }

    if (method === "GET" && pathname === "/api/transactions") {
        listTransactions(response, user.id);
        return;
    }

    if (method === "POST" && pathname === "/api/transactions") {
        const body = await readJsonBody(request);
        createTransaction(response, user.id, body);
        return;
    }

    const transactionMatch = pathname.match(/^\/api\/transactions\/(\d+)$/);

    if (transactionMatch && method === "PUT") {
        const body = await readJsonBody(request);
        updateTransaction(response, user.id, Number(transactionMatch[1]), body);
        return;
    }

    if (transactionMatch && method === "DELETE") {
        deleteTransaction(response, user.id, Number(transactionMatch[1]));
        return;
    }

    sendJson(response, 404, { error: "Route not found" });
}

function registerUser(response, body) {
    const profile = body.profile || {};
    const username = cleanText(body.username);
    const password = String(body.password || "");
    const currency = cleanText(body.currency) || "ZAR";
    const incomeRange = cleanText(body.incomeRange) || "Prefer not to say";

    if (username.length < 3 || password.length < 6) {
        sendJson(response, 400, { error: "Username or password is too short" });
        return;
    }

    if (!profile.firstName || !profile.lastName || !profile.email || !profile.phoneNo || !profile.dob) {
        sendJson(response, 400, { error: "Personal information is incomplete" });
        return;
    }

    const passwordData = hashPassword(password);

    try {
        db.prepare(`
            INSERT INTO users (
                username, password_hash, password_salt, currency, income_range,
                first_name, last_name, email, phone_no, dob
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            username,
            passwordData.hash,
            passwordData.salt,
            currency,
            incomeRange,
            cleanText(profile.firstName),
            cleanText(profile.lastName),
            cleanText(profile.email),
            cleanText(profile.phoneNo),
            cleanText(profile.dob)
        );

        sendJson(response, 201, { message: "Account created" });
    } catch (error) {
        if (String(error.message).includes("UNIQUE")) {
            sendJson(response, 409, { error: "Username already exists" });
            return;
        }

        throw error;
    }
}

function loginUser(response, body) {
    const username = cleanText(body.username);
    const password = String(body.password || "");
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

    if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
        sendJson(response, 401, { error: "Login details are incorrect" });
        return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);

    db.prepare("INSERT INTO sessions (token_hash, user_id) VALUES (?, ?)").run(tokenHash, user.id);
    sendJson(response, 200, { token, user: publicUser(user) });
}

function logoutUser(request, response) {
    const token = getBearerToken(request);

    if (token) {
        db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    }

    sendJson(response, 200, { message: "Logged out" });
}

function listTransactions(response, userId) {
    const transactions = db.prepare(`
        SELECT id, name, amount, type, category, date
        FROM transactions
        WHERE user_id = ?
        ORDER BY date DESC, id DESC
    `).all(userId);

    sendJson(response, 200, { transactions });
}

function createTransaction(response, userId, body) {
    const transaction = validateTransaction(body);

    if (!transaction.valid) {
        sendJson(response, 400, { error: transaction.error });
        return;
    }

    const result = db.prepare(`
        INSERT INTO transactions (user_id, name, amount, type, category, date)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        userId,
        transaction.name,
        transaction.amount,
        transaction.type,
        transaction.category,
        transaction.date
    );

    sendJson(response, 201, {
        transaction: {
            id: result.lastInsertRowid,
            name: transaction.name,
            amount: transaction.amount,
            type: transaction.type,
            category: transaction.category,
            date: transaction.date
        }
    });
}

function updateTransaction(response, userId, id, body) {
    const transaction = validateTransaction(body);

    if (!transaction.valid) {
        sendJson(response, 400, { error: transaction.error });
        return;
    }

    const result = db.prepare(`
        UPDATE transactions
        SET name = ?, amount = ?, type = ?, category = ?, date = ?
        WHERE id = ? AND user_id = ?
    `).run(
        transaction.name,
        transaction.amount,
        transaction.type,
        transaction.category,
        transaction.date,
        id,
        userId
    );

    if (result.changes === 0) {
        sendJson(response, 404, { error: "Transaction not found" });
        return;
    }

    sendJson(response, 200, {
        transaction: {
            id,
            name: transaction.name,
            amount: transaction.amount,
            type: transaction.type,
            category: transaction.category,
            date: transaction.date
        }
    });
}

function deleteTransaction(response, userId, id) {
    const result = db.prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?").run(id, userId);

    if (result.changes === 0) {
        sendJson(response, 404, { error: "Transaction not found" });
        return;
    }

    sendJson(response, 200, { message: "Transaction deleted" });
}

function validateTransaction(body) {
    const name = cleanText(body.name);
    const amount = Number(body.amount);
    const type = cleanText(body.type);
    const category = cleanText(body.category);
    const date = cleanText(body.date);

    if (!name || !category || !date || !Number.isFinite(amount) || amount <= 0) {
        return { valid: false, error: "Enter a name, amount, category, and date" };
    }

    if (type !== "income" && type !== "expense") {
        return { valid: false, error: "Transaction type is invalid" };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { valid: false, error: "Transaction date is invalid" };
    }

    return {
        valid: true,
        name,
        amount,
        type,
        category,
        date
    };
}

function getAuthenticatedUser(request) {
    const token = getBearerToken(request);

    if (!token) {
        return null;
    }

    return db.prepare(`
        SELECT users.*
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ?
    `).get(hashToken(token)) || null;
}

function getBearerToken(request) {
    const authHeader = request.headers.authorization || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : "";
}

function publicUser(user) {
    return {
        id: user.id,
        username: user.username,
        currency: user.currency,
        incomeRange: user.income_range,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email
    };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
    return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
    const actualHash = hashPassword(password, salt).hash;
    return crypto.timingSafeEqual(Buffer.from(actualHash, "hex"), Buffer.from(expectedHash, "hex"));
}

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function cleanText(value) {
    return String(value || "").trim();
}

function readJsonBody(request) {
    return new Promise((resolve, reject) => {
        let body = "";

        request.on("data", (chunk) => {
            body += chunk;

            if (body.length > 1_000_000) {
                request.destroy();
                reject(new Error("Request body is too large"));
            }
        });

        request.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch {
                reject(new Error("Invalid JSON"));
            }
        });
    });
}

function sendJson(response, statusCode, data) {
    response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(data));
}

function serveStatic(request, response) {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const requestedPath = url.pathname === "/" ? "/Index.html" : decodeURIComponent(url.pathname);
    const filePath = path.resolve(ROOT_DIR, `.${requestedPath}`);

    if (!filePath.startsWith(ROOT_DIR) || filePath.includes(`${path.sep}backend${path.sep}`)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
    }

    fs.readFile(filePath, (error, contents) => {
        if (error) {
            response.writeHead(404);
            response.end("Not found");
            return;
        }

        const contentType = contentTypes[path.extname(filePath)] || "application/octet-stream";
        response.writeHead(200, { "Content-Type": contentType });
        response.end(contents);
    });
}
