use sea_orm::*;
use sea_orm::sea_query::Expr;
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::State;

use crate::db::AppState;
use crate::entities::order as order_entity;

use crate::entities::transaction as txn_entity;
use crate::entities::expense as exp_entity;
use crate::error::AppError;

fn smart_today() -> String {
    let now = chrono::Local::now();
    let today = if now.format("%H").to_string().parse::<i32>().unwrap_or(12) < 5 {
        (now - chrono::Duration::days(1)).format("%Y-%m-%d").to_string()
    } else {
        now.format("%Y-%m-%d").to_string()
    };
    today
}

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PaymentBreakdown {
    pub cash: i32,
    pub card: i32,
}

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TopProduct {
    pub product_id: String,
    pub product_name: String,
    pub quantity: i32,
}

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStats {
    pub daily_revenue: i32,
    pub total_orders: i32,
    pub payment_method_breakdown: PaymentBreakdown,
    pub top_products: Vec<TopProduct>,
}

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct HourlyActivity {
    pub hour: String,
    pub revenue: i32,
    pub order_count: i32,
}

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CategoryBreakdownItem {
    pub category_name: String,
    pub revenue: i32,
    pub quantity: i32,
}

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExtendedDashboardStats {
    pub daily_revenue: i32,
    pub total_orders: i32,
    pub payment_method_breakdown: PaymentBreakdown,
    pub top_products: Vec<TopProduct>,
    pub open_tables: i32,
    pub pending_orders: i32,
    pub hourly_activity: Vec<HourlyActivity>,
    pub category_breakdown: Vec<CategoryBreakdownItem>,
    pub bottom_products: Vec<TopProduct>,
    pub daily_expenses: i32,
}

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RevenueTrendItem {
    pub date: String,
    pub revenue: i32,
    pub order_count: i32,
}

#[tauri::command]
#[specta::specta]
pub async fn get_dashboard_stats(state: State<'_, AppState>) -> Result<DashboardStats, String> {
    let db = &state.db;
    let today = smart_today();

    // Daily revenue
    let orders: Vec<order_entity::Model> = order_entity::Entity::find()
        .filter(order_entity::Column::Status.eq("CLOSED"))
        .filter(Expr::col(order_entity::Column::CreatedAt).like(format!("{}%", today)))
        .all(db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    let daily_revenue: i32 = orders.iter().map(|o| o.total_amount).sum();
    let total_orders = orders.len() as i32;

    // Payment breakdown
    let order_ids: Vec<String> = orders.iter().map(|o| o.id.clone()).collect();
    let mut cash = 0i32;
    let mut card = 0i32;

    if !order_ids.is_empty() {
        let txns = txn_entity::Entity::find()
            .filter(txn_entity::Column::OrderId.is_in(&order_ids))
            .all(db)
            .await
            .map_err(|e| AppError::Database(e).to_string())?;

        for t in &txns {
            match t.payment_method.as_str() {
                "CASH" => cash += t.amount,
                "CARD" => card += t.amount,
                _ => {}
            }
        }
    }

    // Top products (raw SQL for aggregation)
    let top_products: Vec<TopProduct> = {
        let rows = db.query_all(Statement::from_string(
            DbBackend::Sqlite,
            format!(
                r#"SELECT oi.productId, p.name, SUM(oi.quantity) as qty
                   FROM OrderItem oi
                   JOIN "Order" o ON o.id = oi.orderId
                   JOIN Product p ON p.id = oi.productId
                   WHERE o.status = 'CLOSED' AND o.createdAt LIKE '{}%'
                   GROUP BY oi.productId
                   ORDER BY qty DESC LIMIT 5"#,
                today
            ),
        ))
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

        rows.iter().map(|r| {
            TopProduct {
                product_id: r.try_get::<String>("", "productId").unwrap_or_default(),
                product_name: r.try_get::<String>("", "name").unwrap_or_default(),
                quantity: r.try_get::<i32>("", "qty").unwrap_or(0),
            }
        }).collect()
    };

    Ok(DashboardStats {
        daily_revenue,
        total_orders,
        payment_method_breakdown: PaymentBreakdown { cash, card },
        top_products,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn get_extended_dashboard_stats(state: State<'_, AppState>) -> Result<ExtendedDashboardStats, String> {
    let db = &state.db;
    let today = smart_today();
    let base = get_dashboard_stats(state.clone()).await?;

    // Open tables count
    let open_orders = order_entity::Entity::find()
        .filter(order_entity::Column::Status.eq("OPEN"))
        .count(db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    // Daily expenses
    let expenses = exp_entity::Entity::find()
        .filter(Expr::col(exp_entity::Column::CreatedAt).like(format!("{}%", today)))
        .all(db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    let daily_expenses: i32 = expenses.iter().map(|e| e.amount).sum();

    // Hourly activity (raw SQL)
    let hourly: Vec<HourlyActivity> = {
        let rows = db.query_all(Statement::from_string(
            DbBackend::Sqlite,
            format!(
                r#"SELECT strftime('%H', createdAt) as hour,
                   SUM(totalAmount) as revenue, COUNT(*) as cnt
                   FROM "Order"
                   WHERE status = 'CLOSED' AND createdAt LIKE '{}%'
                   GROUP BY hour ORDER BY hour"#,
                today
            ),
        ))
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

        rows.iter().map(|r| HourlyActivity {
            hour: r.try_get::<String>("", "hour").unwrap_or_default(),
            revenue: r.try_get::<i32>("", "revenue").unwrap_or(0),
            order_count: r.try_get::<i32>("", "cnt").unwrap_or(0),
        }).collect()
    };

    Ok(ExtendedDashboardStats {
        daily_revenue: base.daily_revenue,
        total_orders: base.total_orders,
        payment_method_breakdown: base.payment_method_breakdown,
        top_products: base.top_products,
        open_tables: open_orders as i32,
        pending_orders: open_orders as i32,
        hourly_activity: hourly,
        category_breakdown: vec![],
        bottom_products: vec![],
        daily_expenses,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn get_revenue_trend(
    state: State<'_, AppState>,
    days: Option<i32>,
) -> Result<Vec<RevenueTrendItem>, String> {
    let days = days.unwrap_or(7);
    let db = &state.db;

    let rows = db.query_all(Statement::from_string(
        DbBackend::Sqlite,
        format!(
            r#"SELECT date(createdAt) as d, SUM(totalAmount) as revenue, COUNT(*) as cnt
               FROM "Order"
               WHERE status = 'CLOSED' AND createdAt >= date('now', '-{} days')
               GROUP BY d ORDER BY d"#,
            days
        ),
    ))
    .await
    .map_err(|e| AppError::Database(e).to_string())?;

    Ok(rows.iter().map(|r| RevenueTrendItem {
        date: r.try_get::<String>("", "d").unwrap_or_default(),
        revenue: r.try_get::<i32>("", "revenue").unwrap_or(0),
        order_count: r.try_get::<i32>("", "cnt").unwrap_or(0),
    }).collect())
}
