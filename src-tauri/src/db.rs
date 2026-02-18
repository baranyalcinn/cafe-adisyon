use sea_orm::{Database, DatabaseConnection, ConnectOptions, Statement, DbBackend, ConnectionTrait};
use std::time::Duration;

use crate::error::AppError;

/// Application state holding the database connection
pub struct AppState {
    pub db: DatabaseConnection,
}

/// Initialize the database connection and ensure schema exists
pub async fn init_database(app_data_dir: &std::path::Path) -> Result<DatabaseConnection, AppError> {
    let db_path = app_data_dir.join("caffio.db");
    let db_url = format!("sqlite:{}?mode=rwc", db_path.to_string_lossy());

    let mut opt = ConnectOptions::new(&db_url);
    opt.max_connections(5)
        .min_connections(1)
        .connect_timeout(Duration::from_secs(10))
        .idle_timeout(Duration::from_secs(300))
        .sqlx_logging(cfg!(debug_assertions));

    let db = Database::connect(opt).await?;

    // SQLite optimizations
    db.execute(Statement::from_string(DbBackend::Sqlite, "PRAGMA journal_mode = WAL".to_owned())).await?;
    db.execute(Statement::from_string(DbBackend::Sqlite, "PRAGMA busy_timeout = 5000".to_owned())).await?;
    db.execute(Statement::from_string(DbBackend::Sqlite, "PRAGMA cache_size = -20000".to_owned())).await?;
    db.execute(Statement::from_string(DbBackend::Sqlite, "PRAGMA foreign_keys = ON".to_owned())).await?;
    db.execute(Statement::from_string(DbBackend::Sqlite, "PRAGMA synchronous = NORMAL".to_owned())).await?;

    // Create tables if they don't exist (backward compatible with existing data)
    run_migrations(&db).await?;

    Ok(db)
}

async fn run_migrations(db: &DatabaseConnection) -> Result<(), AppError> {
    let stmts = vec![
        r#"CREATE TABLE IF NOT EXISTS Category (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT DEFAULT 'utensils',
            isDeleted INTEGER DEFAULT 0
        )"#,
        r#"CREATE TABLE IF NOT EXISTS Product (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            categoryId TEXT NOT NULL,
            isFavorite INTEGER DEFAULT 0,
            isDeleted INTEGER DEFAULT 0,
            FOREIGN KEY (categoryId) REFERENCES Category(id) ON DELETE CASCADE
        )"#,
        r#"CREATE TABLE IF NOT EXISTS "Table" (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL
        )"#,
        r#"CREATE TABLE IF NOT EXISTS "Order" (
            id TEXT PRIMARY KEY,
            tableId TEXT NOT NULL,
            status TEXT DEFAULT 'OPEN',
            totalAmount INTEGER DEFAULT 0,
            isLocked INTEGER DEFAULT 0,
            createdAt TEXT DEFAULT (datetime('now')),
            updatedAt TEXT,
            FOREIGN KEY (tableId) REFERENCES "Table"(id)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS OrderItem (
            id TEXT PRIMARY KEY,
            orderId TEXT NOT NULL,
            productId TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unitPrice INTEGER NOT NULL,
            isPaid INTEGER DEFAULT 0,
            FOREIGN KEY (productId) REFERENCES Product(id),
            FOREIGN KEY (orderId) REFERENCES "Order"(id) ON DELETE CASCADE
        )"#,
        r#"CREATE TABLE IF NOT EXISTS "Transaction" (
            id TEXT PRIMARY KEY,
            orderId TEXT NOT NULL,
            amount INTEGER NOT NULL,
            paymentMethod TEXT NOT NULL,
            createdAt TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (orderId) REFERENCES "Order"(id) ON DELETE CASCADE
        )"#,
        r#"CREATE TABLE IF NOT EXISTS DailySummary (
            id TEXT PRIMARY KEY,
            date TEXT UNIQUE NOT NULL,
            totalCash INTEGER DEFAULT 0,
            actualCash INTEGER DEFAULT 0,
            totalCard INTEGER DEFAULT 0,
            totalExpenses INTEGER DEFAULT 0,
            netProfit INTEGER DEFAULT 0,
            cancelCount INTEGER DEFAULT 0,
            totalVat INTEGER DEFAULT 0,
            orderCount INTEGER DEFAULT 0,
            totalRevenue INTEGER DEFAULT 0,
            createdAt TEXT DEFAULT (datetime('now'))
        )"#,
        r#"CREATE TABLE IF NOT EXISTS ActivityLog (
            id TEXT PRIMARY KEY,
            action TEXT NOT NULL,
            tableName TEXT,
            userName TEXT,
            details TEXT,
            createdAt TEXT DEFAULT (datetime('now'))
        )"#,
        r#"CREATE TABLE IF NOT EXISTS AppSettings (
            id TEXT PRIMARY KEY DEFAULT 'app-settings',
            adminPin TEXT DEFAULT '1234',
            securityAnswer TEXT,
            securityQuestion TEXT
        )"#,
        r#"CREATE TABLE IF NOT EXISTS Expense (
            id TEXT PRIMARY KEY,
            description TEXT NOT NULL,
            amount INTEGER NOT NULL,
            category TEXT,
            paymentMethod TEXT DEFAULT 'CASH',
            createdAt TEXT DEFAULT (datetime('now'))
        )"#,
        r#"CREATE TABLE IF NOT EXISTS MonthlyReport (
            id TEXT PRIMARY KEY,
            monthDate TEXT UNIQUE NOT NULL,
            totalRevenue INTEGER DEFAULT 0,
            totalExpenses INTEGER DEFAULT 0,
            netProfit INTEGER DEFAULT 0,
            orderCount INTEGER DEFAULT 0,
            updatedAt TEXT DEFAULT (datetime('now'))
        )"#,
        // Indexes
        "CREATE INDEX IF NOT EXISTS idx_product_categoryId ON Product(categoryId)",
        "CREATE INDEX IF NOT EXISTS idx_product_isFavorite ON Product(isFavorite)",
        "CREATE INDEX IF NOT EXISTS idx_product_isDeleted ON Product(isDeleted)",
        "CREATE INDEX IF NOT EXISTS idx_product_name ON Product(name)",
        "CREATE INDEX IF NOT EXISTS idx_category_isDeleted ON Category(isDeleted)",
        r#"CREATE INDEX IF NOT EXISTS idx_order_tableId_status ON "Order"(tableId, status)"#,
        r#"CREATE INDEX IF NOT EXISTS idx_order_status ON "Order"(status)"#,
        r#"CREATE INDEX IF NOT EXISTS idx_order_createdAt ON "Order"(createdAt)"#,
        "CREATE INDEX IF NOT EXISTS idx_orderitem_orderId ON OrderItem(orderId)",
        "CREATE INDEX IF NOT EXISTS idx_orderitem_productId ON OrderItem(productId)",
        "CREATE INDEX IF NOT EXISTS idx_orderitem_isPaid ON OrderItem(isPaid)",
        r#"CREATE INDEX IF NOT EXISTS idx_transaction_orderId ON "Transaction"(orderId)"#,
        r#"CREATE INDEX IF NOT EXISTS idx_transaction_createdAt ON "Transaction"(createdAt)"#,
        r#"CREATE INDEX IF NOT EXISTS idx_transaction_paymentMethod ON "Transaction"(paymentMethod)"#,
        "CREATE INDEX IF NOT EXISTS idx_dailysummary_date ON DailySummary(date)",
        "CREATE INDEX IF NOT EXISTS idx_activitylog_createdAt ON ActivityLog(createdAt)",
        "CREATE INDEX IF NOT EXISTS idx_activitylog_action ON ActivityLog(action)",
        "CREATE INDEX IF NOT EXISTS idx_expense_createdAt ON Expense(createdAt)",
        "CREATE INDEX IF NOT EXISTS idx_monthlyreport_monthDate ON MonthlyReport(monthDate)",
        // Ensure default settings
        "INSERT OR IGNORE INTO AppSettings (id, adminPin) VALUES ('app-settings', '1234')",
    ];

    for sql in stmts {
        db.execute(Statement::from_string(DbBackend::Sqlite, sql.to_owned())).await?;
    }

    Ok(())
}
