use sea_orm::*;
use sea_orm::sea_query::Expr;
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::State;
use uuid::Uuid;

use crate::db::AppState;
use crate::entities::order as order_entity;
use crate::entities::order_item as item_entity;
use crate::entities::transaction as txn_entity;
use crate::error::AppError;

use super::orders::{OrderResponse, TransactionResponse, fetch_order_full};

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PaymentResult {
    pub order: OrderResponse,
    pub completed: bool,
}

#[tauri::command]
#[specta::specta]
pub async fn create_payment(
    state: State<'_, AppState>,
    order_id: String,
    amount: i32,
    payment_method: String,
) -> Result<PaymentResult, String> {
    let id = Uuid::now_v7().to_string();
    let model = txn_entity::ActiveModel {
        id: Set(id),
        order_id: Set(order_id.clone()),
        amount: Set(amount),
        payment_method: Set(payment_method),
        created_at: Set(Some(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string())),
    };
    txn_entity::Entity::insert(model)
        .exec(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    // Calculate total paid
    let payments = txn_entity::Entity::find()
        .filter(txn_entity::Column::OrderId.eq(&order_id))
        .all(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    let total_paid: i32 = payments.iter().map(|p| p.amount).sum();

    let order = order_entity::Entity::find_by_id(&order_id)
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .ok_or_else(|| AppError::NotFound("Sipariş bulunamadı".into()).to_string())?;

    let completed = total_paid >= order.total_amount;

    if completed {
        // Close order and mark all items as paid
        let mut active: order_entity::ActiveModel = order.into();
        active.status = Set("CLOSED".to_string());
        active.updated_at = Set(Some(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string()));
        let res = active.update(&state.db).await;
        res.map_err(|e| AppError::Database(e).to_string())?;

        item_entity::Entity::update_many()
            .col_expr(item_entity::Column::IsPaid, Expr::value(1))
            .filter(item_entity::Column::OrderId.eq(&order_id))
            .exec(&state.db)
            .await
            .map_err(|e| AppError::Database(e).to_string())?;
    }

    let order_response = fetch_order_full(&state.db, &order_id).await?;
    Ok(PaymentResult { order: order_response, completed })
}

#[tauri::command]
#[specta::specta]
pub async fn get_payments_by_order(
    state: State<'_, AppState>,
    order_id: String,
) -> Result<Vec<TransactionResponse>, String> {
    let payments = txn_entity::Entity::find()
        .filter(txn_entity::Column::OrderId.eq(&order_id))
        .order_by_asc(txn_entity::Column::CreatedAt)
        .all(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(payments.into_iter().map(|p| TransactionResponse {
        id: p.id,
        order_id: p.order_id,
        amount: p.amount,
        payment_method: p.payment_method,
        created_at: p.created_at,
    }).collect())
}
