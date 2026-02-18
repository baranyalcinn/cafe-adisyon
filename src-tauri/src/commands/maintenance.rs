use sea_orm::*;
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::State;

use crate::db::AppState;
use crate::entities::order as order_entity;
use crate::entities::order_item as item_entity;
use crate::entities::transaction as txn_entity;
use crate::entities::expense as exp_entity;
use crate::entities::daily_summary as summary_entity;
use crate::error::AppError;
use uuid::Uuid;

// ─── Archive ───

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveResult {
    pub deleted_orders: i32,
    pub deleted_items: i32,
    pub deleted_transactions: i32,
    pub deleted_expenses: i32,
    pub deleted_summaries: i32,
}

#[tauri::command]
#[specta::specta]
pub async fn archive_old_data(state: State<'_, AppState>) -> Result<ArchiveResult, String> {
    let db = &state.db;
    let cutoff = (chrono::Local::now() - chrono::Duration::days(90))
        .format("%Y-%m-%d")
        .to_string();

    // Find old closed orders
    let old_orders = order_entity::Entity::find()
        .filter(order_entity::Column::Status.eq("CLOSED"))
        .filter(order_entity::Column::CreatedAt.lt(&cutoff))
        .all(db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    let order_ids: Vec<String> = old_orders.iter().map(|o| o.id.clone()).collect();
    let deleted_orders = old_orders.len() as i32;
    let mut deleted_items = 0i32;
    let mut deleted_transactions = 0i32;

    if !order_ids.is_empty() {
        let items_result = item_entity::Entity::delete_many()
            .filter(item_entity::Column::OrderId.is_in(&order_ids))
            .exec(db)
            .await
            .map_err(|e| AppError::Database(e).to_string())?;
        deleted_items = items_result.rows_affected as i32;

        let txns_result = txn_entity::Entity::delete_many()
            .filter(txn_entity::Column::OrderId.is_in(&order_ids))
            .exec(db)
            .await
            .map_err(|e| AppError::Database(e).to_string())?;
        deleted_transactions = txns_result.rows_affected as i32;

        order_entity::Entity::delete_many()
            .filter(order_entity::Column::Id.is_in(&order_ids))
            .exec(db)
            .await
            .map_err(|e| AppError::Database(e).to_string())?;
    }

    // Old expenses
    let exp_result = exp_entity::Entity::delete_many()
        .filter(exp_entity::Column::CreatedAt.lt(&cutoff))
        .exec(db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    // Old summaries (keep last 365 days)
    let summary_cutoff = (chrono::Local::now() - chrono::Duration::days(365))
        .format("%Y-%m-%d")
        .to_string();
    let sum_result = summary_entity::Entity::delete_many()
        .filter(summary_entity::Column::Date.lt(&summary_cutoff))
        .exec(db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(ArchiveResult {
        deleted_orders,
        deleted_items,
        deleted_transactions,
        deleted_expenses: exp_result.rows_affected as i32,
        deleted_summaries: sum_result.rows_affected as i32,
    })
}

// ─── Vacuum ───

#[tauri::command]
#[specta::specta]
pub async fn vacuum_database(state: State<'_, AppState>) -> Result<(), String> {
    state.db
        .execute(Statement::from_string(DbBackend::Sqlite, "VACUUM".to_owned()))
        .await
        .map_err(|e| AppError::Database(e).to_string())?;
    Ok(())
}

// ─── End of Day ───

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct OpenTableInfo {
    pub table_id: String,
    pub table_name: String,
    pub order_id: String,
    pub total_amount: i32,
}

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct EndOfDayCheckResult {
    pub can_proceed: bool,
    pub open_tables: Vec<OpenTableInfo>,
}

#[tauri::command]
#[specta::specta]
pub async fn check_end_of_day(state: State<'_, AppState>) -> Result<EndOfDayCheckResult, String> {
    let db = &state.db;

    let rows = db.query_all(Statement::from_string(
        DbBackend::Sqlite,
        r#"SELECT o.id as orderId, o.tableId, o.totalAmount, t.name as tableName
           FROM "Order" o
           JOIN "Table" t ON t.id = o.tableId
           WHERE o.status = 'OPEN'"#.to_owned(),
    ))
    .await
    .map_err(|e| AppError::Database(e).to_string())?;

    let open_tables: Vec<OpenTableInfo> = rows.iter().map(|r| OpenTableInfo {
        table_id: r.try_get::<String>("", "tableId").unwrap_or_default(),
        table_name: r.try_get::<String>("", "tableName").unwrap_or_default(),
        order_id: r.try_get::<String>("", "orderId").unwrap_or_default(),
        total_amount: r.try_get::<i32>("", "totalAmount").unwrap_or(0),
    }).collect();

    Ok(EndOfDayCheckResult {
        can_proceed: open_tables.is_empty(),
        open_tables,
    })
}

// ─── Backup ───

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BackupResult {
    pub success: bool,
    pub path: String,
    pub deleted_count: i32,
    pub total_backups: i32,
}

#[tauri::command]
#[specta::specta]
pub async fn backup_database(app: tauri::AppHandle) -> Result<BackupResult, String> {
    use std::fs;
    use tauri::Manager;

    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("caffio.db");
    let backups_dir = app_data_dir.join("backups");

    if !backups_dir.exists() {
        fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;
    }

    let timestamp = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
    let backup_path = backups_dir.join(format!("backup_{}.db", timestamp));

    fs::copy(&db_path, &backup_path).map_err(|e| e.to_string())?;

    Ok(BackupResult {
        success: true,
        path: backup_path.to_string_lossy().to_string(),
        deleted_count: 0,
        total_backups: 1,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn backup_database_with_rotation(
    app: tauri::AppHandle,
    max_backups: Option<usize>,
) -> Result<BackupResult, String> {
    use std::fs;
    use tauri::Manager;

    let res = backup_database(app.clone()).await?;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let backups_dir = app_data_dir.join("backups");
    let max = max_backups.unwrap_or(30);

    let mut entries: Vec<_> = fs::read_dir(&backups_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path().extension().map_or(false, |ext| ext == "db")
                && e.file_name().to_string_lossy().starts_with("backup_")
        })
        .collect();

    // Sort by modification time (oldest first)
    entries.sort_by_key(|e| e.metadata().and_then(|m| m.modified()).ok());

    let total = entries.len();
    let mut deleted = 0;

    if total > max {
        let to_delete = total - max;
        for entry in entries.iter().take(to_delete) {
            if fs::remove_file(entry.path()).is_ok() {
                deleted += 1;
            }
        }
    }

    Ok(BackupResult {
        success: true,
        path: res.path,
        deleted_count: deleted,
        total_backups: (total - deleted as usize) as i32,
    })
}

// ─── End of Day Execution ───

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct EndOfDayExecutionResult {
    pub z_report_id: Option<String>,
    pub backup_path: String,
    pub vacuum_success: bool,
}

#[tauri::command]
#[specta::specta]
pub async fn execute_end_of_day(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    actual_cash: Option<i32>,
) -> Result<EndOfDayExecutionResult, String> {
    use crate::commands::reports::generate_zreport;

    // 1. Generate Z-Report
    // We need to clone state because generate_zreport takes State, but we can't easily construct State.
    // Actually, command handlers take State which is Arc<AppState> wrapper.
    // We can pass `state` directly? `state` is `State<'_, AppState>`.
    // We need `State<'_, AppState>`. It's copy? No, it's Clone.
    
    // Note: Calling another command handler directly is tricky due to types.
    // Better to extract logic or just call it if types align.
    // `generate_zreport` returns `Result<DailySummaryResponse, String>`.
    // It calls `Entity::insert`, so it's idempotent-ish (checks existence).
    
    let z_report = generate_zreport(state.clone(), actual_cash).await?;

    // 2. Backup
    let backup_res = backup_database_with_rotation(app.clone(), Some(30)).await?;

    // 3. Vacuum
    vacuum_database(state).await?;

    Ok(EndOfDayExecutionResult {
        z_report_id: Some(z_report.id),
        backup_path: backup_res.path,
        vacuum_success: true,
    })
}

// ─── Export & Seed ───

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub filepath: String,
    pub count: i32,
}

#[tauri::command]
#[specta::specta]
pub async fn export_database(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<ExportResult, String> {
    use std::fs;
    use tauri::Manager;
    
    // Simple export: Dump all orders to JSON
    let orders = order_entity::Entity::find()
        .all(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    let json = serde_json::to_string_pretty(&orders).map_err(|e| e.to_string())?;
    
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let export_path = app_data_dir.join("export.json");
    
    fs::write(&export_path, json).map_err(|e| e.to_string())?;

    Ok(ExportResult {
        filepath: export_path.to_string_lossy().to_string(),
        count: orders.len() as i32,
    })
}

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SeedResult {
    pub categories: i32,
    pub products: i32,
    pub tables: i32,
}

#[tauri::command]
#[specta::specta]
pub async fn seed_database(state: State<'_, AppState>) -> Result<SeedResult, String> {
    use crate::entities::category as cat_entity;
    use crate::entities::table as table_entity;
    
    // Basic seeding logic
    let db = &state.db;

    // Tables
    let tables = ["T1", "T2", "T3", "T4", "T5"];
    let mut table_count = 0;
    for name in tables {
         let exists = table_entity::Entity::find()
            .filter(table_entity::Column::Name.eq(name))
            .one(db)
            .await
            .map_err(|e| AppError::Database(e).to_string())?;
        
        if exists.is_none() {
            table_entity::Entity::insert(table_entity::ActiveModel {
                id: Set(Uuid::now_v7().to_string()),
                name: Set(name.to_string()),
                ..Default::default()
            }).exec(db).await.map_err(|e| AppError::Database(e).to_string())?;
            table_count += 1;
        }
    }

    // Categories
    let cats = ["Drinks", "Food", "Dessert"];
    let mut cat_count = 0;
    for name in cats {
        let exists = cat_entity::Entity::find()
            .filter(cat_entity::Column::Name.eq(name))
            .one(db)
            .await
            .map_err(|e| AppError::Database(e).to_string())?;
            
        if exists.is_none() {
             cat_entity::Entity::insert(cat_entity::ActiveModel {
                id: Set(Uuid::now_v7().to_string()),
                name: Set(name.to_string()),
                is_deleted: Set(0),
                ..Default::default()
            }).exec(db).await.map_err(|e| AppError::Database(e).to_string())?;
            cat_count += 1;
        }
    }

    Ok(SeedResult {
        categories: cat_count,
        products: 0,
        tables: table_count,
    })
}

// ─── System ───
// ... existing system_check ...

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SystemCheck {
    pub db_connected: bool,
    pub table_count: i64,
    pub product_count: i64,
}

#[tauri::command]
#[specta::specta]
pub async fn system_check(state: State<'_, AppState>) -> Result<SystemCheck, String> {
    use crate::entities::table as table_entity;
    use crate::entities::product as prod_entity;

    let table_count = table_entity::Entity::find()
        .count(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())? as i64;

    let product_count = prod_entity::Entity::find()
        .filter(prod_entity::Column::IsDeleted.eq(0))
        .count(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())? as i64;

    Ok(SystemCheck {
        db_connected: true,
        table_count,
        product_count,
    })
}

// ─── Legacy Import ───

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub success: bool,
    pub message: String,
    pub tables_processed: i32,
    pub errors: Vec<String>,
}

#[tauri::command]
#[specta::specta]
pub async fn import_legacy_data(app: tauri::AppHandle, state: State<'_, AppState>, file_path: Option<String>) -> Result<ImportResult, String> {
    use tauri::Manager;
    use std::path::PathBuf;
    
    let legacy_db_path = if let Some(path) = file_path {
        PathBuf::from(path)
    } else {
        // Default: .../AppData/Roaming/caffio/caffio.db
        let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let roaming_dir = app_data_dir.parent().ok_or("Cannot find roaming dir")?;
        roaming_dir.join("caffio").join("caffio.db")
    };

    if !legacy_db_path.exists() {
        return Err(format!("Eski veri dosyası bulunamadı: {}", legacy_db_path.to_string_lossy()));
    }

    let db = &state.db;
    let legacy_path_str = legacy_db_path.to_string_lossy().replace("\\", "/"); 

    // Attach legacy DB
    let attach_sql = format!("ATTACH DATABASE '{}' AS legacy_db", legacy_path_str);
    db.execute(Statement::from_string(DbBackend::Sqlite, attach_sql))
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    // Tables to import
    let tables = [
        "Category", "Product", "\"Table\"", "\"Order\"", "OrderItem", 
        "\"Transaction\"", "DailySummary", "ActivityLog", "Expense", "MonthlyReport"
    ];

    let mut count = 0;
    let mut errors = Vec::new();

    for table in tables {
        // Use INSERT OR IGNORE to merge data
        let sql = format!("INSERT OR IGNORE INTO main.{} SELECT * FROM legacy_db.{}", table, table);
        match db.execute(Statement::from_string(DbBackend::Sqlite, sql.clone())).await {
            Ok(res) => {
                if res.rows_affected() > 0 {
                    count += 1;
                }
            },
            Err(e) => errors.push(format!("Error importing {}: {}", table, e)),
        }
    }

    // Detach
    let _ = db.execute(Statement::from_string(DbBackend::Sqlite, "DETACH DATABASE legacy_db".to_owned())).await;
    
    Ok(ImportResult {
        success: count > 0,
        message: format!("{} tablo işlem gördü.", count),
        tables_processed: count,
        errors,
    })
}
