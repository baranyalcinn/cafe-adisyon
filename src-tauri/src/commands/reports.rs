use sea_orm::*;
use sea_orm::sea_query::Expr;
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::State;
use uuid::Uuid;

use crate::db::AppState;
use crate::entities::activity_log as log_entity;
use crate::entities::daily_summary as summary_entity;
use crate::entities::monthly_report as monthly_entity;
use crate::entities::order as order_entity;

use crate::entities::transaction as txn_entity;
use crate::entities::expense as exp_entity;
use crate::error::AppError;

// ─── Activity Logs ───

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LogResponse {
    pub id: String,
    pub action: String,
    pub table_name: Option<String>,
    pub user_name: Option<String>,
    pub details: Option<String>,
    pub created_at: Option<String>,
}

impl From<log_entity::Model> for LogResponse {
    fn from(l: log_entity::Model) -> Self {
        Self {
            id: l.id,
            action: l.action,
            table_name: l.table_name,
            user_name: l.user_name,
            details: l.details,
            created_at: l.created_at,
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn get_recent_logs(
    state: State<'_, AppState>,
    limit: Option<u64>,
    start_date: Option<String>,
    end_date: Option<String>,
    offset: Option<u64>,
    search: Option<String>,
) -> Result<Vec<LogResponse>, String> {
    let mut query = log_entity::Entity::find();

    if let Some(start) = start_date {
        query = query.filter(log_entity::Column::CreatedAt.gte(start));
    }
    if let Some(end) = end_date {
        query = query.filter(log_entity::Column::CreatedAt.lte(format!("{} 23:59:59", end)));
    }
    if let Some(s) = search {
        let pattern = format!("%{}%", s);
        query = query.filter(
            Condition::any()
                .add(log_entity::Column::Action.like(&pattern))
                .add(log_entity::Column::Details.like(&pattern))
                .add(log_entity::Column::TableName.like(&pattern))
        );
    }

    let logs = query
        .order_by_desc(log_entity::Column::CreatedAt)
        .limit(limit.unwrap_or(100))
        .offset(offset.unwrap_or(0))
        .all(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(logs.into_iter().map(LogResponse::from).collect())
}

#[tauri::command]
#[specta::specta]
pub async fn create_log(
    state: State<'_, AppState>,
    action: String,
    table_name: Option<String>,
    user_name: Option<String>,
    details: Option<String>,
) -> Result<LogResponse, String> {
    let id = Uuid::now_v7().to_string();
    let model = log_entity::ActiveModel {
        id: Set(id.clone()),
        action: Set(action.clone()),
        table_name: Set(table_name.clone()),
        user_name: Set(user_name.clone()),
        details: Set(details.clone()),
        created_at: Set(Some(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string())),
    };
    log_entity::Entity::insert(model)
        .exec(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(LogResponse {
        id,
        action,
        table_name,
        user_name,
        details,
        created_at: Some(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string()),
    })
}

// ─── Z-Report ───

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DailySummaryResponse {
    pub id: String,
    pub date: String,
    pub total_cash: i32,
    pub actual_cash: Option<i32>,
    pub total_card: i32,
    pub total_expenses: i32,
    pub net_profit: i32,
    pub cancel_count: i32,
    pub total_vat: i32,
    pub order_count: i32,
    pub total_revenue: i32,
    pub created_at: Option<String>,
}

impl From<summary_entity::Model> for DailySummaryResponse {
    fn from(s: summary_entity::Model) -> Self {
        Self {
            id: s.id,
            date: s.date,
            total_cash: s.total_cash,
            actual_cash: s.actual_cash,
            total_card: s.total_card,
            total_expenses: s.total_expenses,
            net_profit: s.net_profit,
            cancel_count: s.cancel_count,
            total_vat: s.total_vat,
            order_count: s.order_count,
            total_revenue: s.total_revenue,
            created_at: s.created_at,
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn generate_zreport(
    state: State<'_, AppState>,
    actual_cash: Option<i32>,
) -> Result<DailySummaryResponse, String> {
    let db = &state.db;
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    // Check if already generated
    let existing = summary_entity::Entity::find()
        .filter(summary_entity::Column::Date.eq(&today))
        .one(db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    if let Some(s) = existing {
        return Ok(DailySummaryResponse::from(s));
    }

    // Calculate stats from closed orders today
    let orders = order_entity::Entity::find()
        .filter(order_entity::Column::Status.eq("CLOSED"))
        .filter(Expr::col(order_entity::Column::CreatedAt).like(format!("{}%", today)))
        .all(db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    let total_revenue: i32 = orders.iter().map(|o| o.total_amount).sum();
    let order_count = orders.len() as i32;
    let order_ids: Vec<String> = orders.iter().map(|o| o.id.clone()).collect();

    let mut total_cash = 0i32;
    let mut total_card = 0i32;

    if !order_ids.is_empty() {
        let txns = txn_entity::Entity::find()
            .filter(txn_entity::Column::OrderId.is_in(&order_ids))
            .all(db)
            .await
            .map_err(|e| AppError::Database(e).to_string())?;

        for t in &txns {
            match t.payment_method.as_str() {
                "CASH" => total_cash += t.amount,
                "CARD" => total_card += t.amount,
                _ => {}
            }
        }
    }

    // Expenses
    let expenses = exp_entity::Entity::find()
        .filter(Expr::col(exp_entity::Column::CreatedAt).like(format!("{}%", today)))
        .all(db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    let total_expenses: i32 = expenses.iter().map(|e| e.amount).sum();
    let net_profit = total_revenue - total_expenses;

    let id = Uuid::new_v4().to_string();
    let model = summary_entity::ActiveModel {
        id: Set(id.clone()),
        date: Set(today.clone()),
        total_cash: Set(total_cash),
        actual_cash: Set(actual_cash),
        total_card: Set(total_card),
        total_expenses: Set(total_expenses),
        net_profit: Set(net_profit),
        cancel_count: Set(0),
        total_vat: Set(0),
        order_count: Set(order_count),
        total_revenue: Set(total_revenue),
        created_at: Set(Some(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string())),
    };
    summary_entity::Entity::insert(model)
        .exec(db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(DailySummaryResponse {
        id,
        date: today,
        total_cash,
        actual_cash,
        total_card,
        total_expenses,
        net_profit,
        cancel_count: 0,
        total_vat: 0,
        order_count,
        total_revenue,
        created_at: Some(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string()),
    })
}

#[tauri::command]
#[specta::specta]
pub async fn get_zreport_history(
    state: State<'_, AppState>,
    limit: Option<u64>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<Vec<DailySummaryResponse>, String> {
    let mut query = summary_entity::Entity::find();

    if let Some(start) = start_date {
        query = query.filter(summary_entity::Column::Date.gte(start));
    }
    if let Some(end) = end_date {
        query = query.filter(summary_entity::Column::Date.lte(end));
    }

    let reports = query
        .order_by_desc(summary_entity::Column::Date)
        .limit(limit.unwrap_or(30))
        .all(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(reports.into_iter().map(DailySummaryResponse::from).collect())
}

// ─── Monthly Reports ───

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MonthlyReportResponse {
    pub id: String,
    pub month_date: String,
    pub total_revenue: i32,
    pub total_expenses: i32,
    pub net_profit: i32,
    pub order_count: i32,
    pub updated_at: Option<String>,
}

#[tauri::command]
#[specta::specta]
pub async fn get_monthly_reports(
    state: State<'_, AppState>,
    limit: Option<u64>,
) -> Result<Vec<MonthlyReportResponse>, String> {
    let reports = monthly_entity::Entity::find()
        .order_by_desc(monthly_entity::Column::MonthDate)
        .limit(limit.unwrap_or(12))
        .all(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(reports.into_iter().map(|r| MonthlyReportResponse {
        id: r.id,
        month_date: r.month_date,
        total_revenue: r.total_revenue,
        total_expenses: r.total_expenses,
        net_profit: r.net_profit,
        order_count: r.order_count,
        updated_at: r.updated_at,
    }).collect())
}
