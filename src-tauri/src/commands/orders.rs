use sea_orm::*;
use sea_orm::sea_query::Expr;
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::State;
use uuid::Uuid;

use crate::db::AppState;
use crate::entities::order as order_entity;
use crate::entities::order_item as item_entity;
use crate::entities::product as prod_entity;
use crate::entities::transaction as txn_entity;
use crate::error::AppError;

// ─── Response Types ───

#[derive(Serialize, Deserialize, Type, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OrderItemResponse {
    pub id: String,
    pub order_id: String,
    pub product_id: String,
    pub quantity: i32,
    pub unit_price: i32,
    pub is_paid: bool,
    pub product_name: Option<String>,
}

#[derive(Serialize, Deserialize, Type, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TransactionResponse {
    pub id: String,
    pub order_id: String,
    pub amount: i32,
    pub payment_method: String,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Type, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OrderResponse {
    pub id: String,
    pub table_id: String,
    pub status: String,
    pub total_amount: i32,
    pub is_locked: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub items: Vec<OrderItemResponse>,
    pub payments: Vec<TransactionResponse>,
}

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateOrderInput {
    pub status: Option<String>,
    pub total_amount: Option<i32>,
    pub is_locked: Option<bool>,
}

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MarkItemPaidInput {
    pub id: String,
    #[allow(dead_code)]
    pub quantity: i32, // Not used if marking whole item, but good for partial?
}

// ─── Command History Result ───

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct OrderHistoryResult {
    pub orders: Vec<OrderResponse>,
    pub total_count: i64,
    pub has_more: bool,
}

// ─── Helper Functions ───

pub async fn fetch_order_full(db: &DatabaseConnection, order_id: &str) -> Result<OrderResponse, String> {
    let order = order_entity::Entity::find_by_id(order_id)
        .one(db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .ok_or_else(|| AppError::NotFound("Order not found".into()).to_string())?;

    let items = item_entity::Entity::find()
        .filter(item_entity::Column::OrderId.eq(order_id))
        .find_also_related(prod_entity::Entity)
        .all(db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    let order_items: Vec<OrderItemResponse> = items.into_iter().map(|(item, prod)| {
        OrderItemResponse {
            id: item.id,
            order_id: item.order_id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            is_paid: item.is_paid != 0,
            product_name: prod.map(|p| p.name),
        }
    }).collect();

    let payments = txn_entity::Entity::find()
        .filter(txn_entity::Column::OrderId.eq(order_id))
        .all(db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .into_iter()
        .map(|t| TransactionResponse {
            id: t.id,
            order_id: t.order_id,
            amount: t.amount,
            payment_method: t.payment_method,
            created_at: t.created_at,
        })
        .collect();

    Ok(OrderResponse {
        id: order.id,
        table_id: order.table_id,
        status: order.status,
        total_amount: order.total_amount,
        is_locked: order.is_locked != 0,
        created_at: order.created_at,
        updated_at: order.updated_at,
        items: order_items,
        payments,
    })
}

async fn recalculate_order_total(db: &DatabaseConnection, order_id: &str) -> Result<(), String> {
    let items = item_entity::Entity::find()
        .filter(item_entity::Column::OrderId.eq(order_id))
        .all(db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    let total: i32 = items.iter().map(|i| i.quantity * i.unit_price).sum();

    let mut order: order_entity::ActiveModel = order_entity::Entity::find_by_id(order_id)
        .one(db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .ok_or_else(|| AppError::NotFound("Order not found".into()).to_string())?
        .into();

    order.total_amount = Set(total);
    order.updated_at = Set(Some(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string()));
    
    order.update(db).await.map_err(|e| AppError::Database(e).to_string())?;
    Ok(())
}

// ─── Commands ───

#[tauri::command]
#[specta::specta]
pub async fn get_open_order_by_table(state: State<'_, AppState>, table_id: String) -> Result<Option<OrderResponse>, String> {
    let order = order_entity::Entity::find()
        .filter(order_entity::Column::TableId.eq(table_id))
        .filter(order_entity::Column::Status.eq("OPEN"))
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    match order {
        Some(o) => {
            let full = fetch_order_full(&state.db, &o.id).await?;
            Ok(Some(full))
        },
        None => Ok(None)
    }
}

#[tauri::command]
#[specta::specta]
pub async fn create_order(state: State<'_, AppState>, table_id: String) -> Result<OrderResponse, String> {
    // Check if open order exists
    let existing = order_entity::Entity::find()
        .filter(order_entity::Column::TableId.eq(&table_id))
        .filter(order_entity::Column::Status.eq("OPEN"))
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    if let Some(o) = existing {
        return fetch_order_full(&state.db, &o.id).await;
    }

    let id = Uuid::now_v7().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    let new_order = order_entity::ActiveModel {
        id: Set(id.clone()),
        table_id: Set(table_id),
        status: Set("OPEN".to_string()),
        total_amount: Set(0),
        is_locked: Set(0),
        created_at: Set(Some(now.clone())),
        updated_at: Set(Some(now)),
    };

    new_order.insert(&state.db).await.map_err(|e| AppError::Database(e).to_string())?;
    fetch_order_full(&state.db, &id).await
}

#[tauri::command]
#[specta::specta]
pub async fn update_order(state: State<'_, AppState>, id: String, input: UpdateOrderInput) -> Result<OrderResponse, String> {
    let mut order: order_entity::ActiveModel = order_entity::Entity::find_by_id(&id)
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .ok_or_else(|| AppError::NotFound("Order not found".into()).to_string())?
        .into();

    if let Some(s) = input.status { order.status = Set(s); }
    if let Some(t) = input.total_amount { order.total_amount = Set(t); }
    if let Some(l) = input.is_locked { order.is_locked = Set(if l { 1 } else { 0 }); }
    
    order.updated_at = Set(Some(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string()));
    
    order.update(&state.db).await.map_err(|e| AppError::Database(e).to_string())?;
    fetch_order_full(&state.db, &id).await
}

#[tauri::command]
#[specta::specta]
pub async fn delete_order(state: State<'_, AppState>, id: String) -> Result<(), String> {
    // Delete items first? Cascade should handle but explicit safety is good
    item_entity::Entity::delete_many()
        .filter(item_entity::Column::OrderId.eq(&id))
        .exec(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    order_entity::Entity::delete_by_id(id)
        .exec(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;
        
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn add_order_item(state: State<'_, AppState>, order_id: String, product_id: String, quantity: i32, _notes: Option<String>) -> Result<OrderResponse, String> {
    // Check if locked?
    let order = order_entity::Entity::find_by_id(&order_id)
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .ok_or_else(|| AppError::NotFound("Order not found".into()).to_string())?;

    if order.is_locked != 0 {
        return Err("Cannot add items to locked order".into());
    }

    let product = prod_entity::Entity::find_by_id(&product_id)
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .ok_or_else(|| AppError::NotFound("Product not found".into()).to_string())?;

    // Check if item exists to merge? Usually POS merges same product lines
    let existing_item = item_entity::Entity::find()
        .filter(item_entity::Column::OrderId.eq(&order_id))
        .filter(item_entity::Column::ProductId.eq(&product_id))
        .filter(item_entity::Column::IsPaid.eq(0)) // Only merge unpaid items
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    if let Some(item) = existing_item {
        let mut active: item_entity::ActiveModel = item.into();
        active.quantity = Set(active.quantity.unwrap() + quantity);
        active.update(&state.db).await.map_err(|e| AppError::Database(e).to_string())?;
    } else {
        let id = Uuid::now_v7().to_string();
        let item = item_entity::ActiveModel {
            id: Set(id),
            order_id: Set(order_id.clone()),
            product_id: Set(product_id),
            quantity: Set(quantity),
            unit_price: Set(product.price),
            is_paid: Set(0),
        };
        item.insert(&state.db).await.map_err(|e| AppError::Database(e).to_string())?;
    }
    
    recalculate_order_total(&state.db, &order_id).await?;
    fetch_order_full(&state.db, &order_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn update_order_item(state: State<'_, AppState>, item_id: String, quantity: i32, _notes: Option<String>) -> Result<OrderResponse, String> {
    let item = item_entity::Entity::find_by_id(&item_id)
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .ok_or_else(|| AppError::NotFound("Item not found".into()).to_string())?;

    let order_id = item.order_id.clone();
    
    if quantity <= 0 {
        item.delete(&state.db).await.map_err(|e| AppError::Database(e).to_string())?;
    } else {
        let mut active: item_entity::ActiveModel = item.into();
        active.quantity = Set(quantity);
        active.update(&state.db).await.map_err(|e| AppError::Database(e).to_string())?;
    }

    recalculate_order_total(&state.db, &order_id).await?;
    fetch_order_full(&state.db, &order_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn remove_order_item(state: State<'_, AppState>, item_id: String) -> Result<OrderResponse, String> {
    let item = item_entity::Entity::find_by_id(&item_id)
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .ok_or_else(|| AppError::NotFound("Item not found".into()).to_string())?;

    let order_id = item.order_id.clone();
    item.delete(&state.db).await.map_err(|e| AppError::Database(e).to_string())?;

    recalculate_order_total(&state.db, &order_id).await?;
    fetch_order_full(&state.db, &order_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn transfer_order(state: State<'_, AppState>, id: String, to_table_id: String) -> Result<OrderResponse, String> {
    // Check if target table has open order?
    let target_order = order_entity::Entity::find()
        .filter(order_entity::Column::TableId.eq(&to_table_id))
        .filter(order_entity::Column::Status.eq("OPEN"))
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    if target_order.is_some() {
        return Err("Target table is occupied".into());
    }

    let mut order: order_entity::ActiveModel = order_entity::Entity::find_by_id(&id)
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .ok_or_else(|| AppError::NotFound("Order not found".into()).to_string())?
        .into();

    order.table_id = Set(to_table_id);
    order.update(&state.db).await.map_err(|e| AppError::Database(e).to_string())?;

    fetch_order_full(&state.db, &id).await
}

#[tauri::command]
#[specta::specta]
pub async fn merge_orders(state: State<'_, AppState>, source_order_id: String, target_order_id: String) -> Result<OrderResponse, String> {
    // specific implementation: move items from source to target
    item_entity::Entity::update_many()
        .col_expr(item_entity::Column::OrderId, Expr::value(target_order_id.clone()))
        .filter(item_entity::Column::OrderId.eq(&source_order_id))
        .exec(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;
        
    // Move payments too?
    txn_entity::Entity::update_many()
        .col_expr(txn_entity::Column::OrderId, Expr::value(target_order_id.clone()))
        .filter(txn_entity::Column::OrderId.eq(&source_order_id))
        .exec(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    // Delete source order
    order_entity::Entity::delete_by_id(source_order_id)
        .exec(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    recalculate_order_total(&state.db, &target_order_id).await?;
    fetch_order_full(&state.db, &target_order_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn mark_items_paid(state: State<'_, AppState>, items: Vec<MarkItemPaidInput>) -> Result<(), String> {
    for item_input in items {
        // Find item
        let item = item_entity::Entity::find_by_id(&item_input.id)
            .one(&state.db)
            .await
            .map_err(|e| AppError::Database(e).to_string())?
            .ok_or_else(|| AppError::NotFound("Item not found".into()).to_string())?;

        // If quantity matches, mark fully paid. If partial, split?
        // Simplifying: mark as paid (is_paid = 1)
        let mut active: item_entity::ActiveModel = item.into();
        active.is_paid = Set(1);
        active.update(&state.db).await.map_err(|e| AppError::Database(e).to_string())?;
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_order_history(
    state: State<'_, AppState>,
    date: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
) -> Result<OrderHistoryResult, String> {
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);

    let mut query = order_entity::Entity::find()
        .filter(order_entity::Column::Status.ne("OPEN")); // Closed or Cancelled

    if let Some(d) = &date {
        query = query.filter(
            Expr::col(order_entity::Column::CreatedAt).like(format!("{}%", d))
        );
    }

    // Count total
    let total_count = query.clone().count(&state.db).await.map_err(|e| AppError::Database(e).to_string())? as i64;

    let orders = query
        .order_by_desc(order_entity::Column::CreatedAt)
        .limit(limit)
        .offset(offset)
        .all(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    let mut results = Vec::with_capacity(orders.len());
    for o in orders {
        results.push(fetch_order_full(&state.db, &o.id).await?);
    }

    Ok(OrderHistoryResult {
        has_more: (offset + limit) < total_count as u64,
        total_count,
        orders: results,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn get_order_details(
    state: State<'_, AppState>,
    order_id: String,
) -> Result<OrderResponse, String> {
    fetch_order_full(&state.db, &order_id).await
}
