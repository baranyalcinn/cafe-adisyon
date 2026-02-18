use sea_orm::*;
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::State;
use uuid::Uuid;

use crate::db::AppState;
use crate::entities::expense as exp_entity;
use crate::error::AppError;

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseResponse {
    pub id: String,
    pub description: String,
    pub amount: i32,
    pub category: Option<String>,
    pub payment_method: Option<String>,
    pub created_at: Option<String>,
}

impl From<exp_entity::Model> for ExpenseResponse {
    fn from(e: exp_entity::Model) -> Self {
        Self {
            id: e.id,
            description: e.description,
            amount: e.amount,
            category: e.category,
            payment_method: e.payment_method,
            created_at: e.created_at,
        }
    }
}

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateExpenseInput {
    pub description: String,
    pub amount: i32,
    pub category: Option<String>,
    pub payment_method: Option<String>,
}

#[tauri::command]
#[specta::specta]
pub async fn create_expense(
    state: State<'_, AppState>,
    data: CreateExpenseInput,
) -> Result<ExpenseResponse, String> {
    let id = Uuid::now_v7().to_string();
    let model = exp_entity::ActiveModel {
        id: Set(id.clone()),
        description: Set(data.description.clone()),
        amount: Set(data.amount),
        category: Set(data.category.clone()),
        payment_method: Set(data.payment_method.clone().or(Some("CASH".to_string()))),
        created_at: Set(Some(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string())),
    };
    exp_entity::Entity::insert(model)
        .exec(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(ExpenseResponse {
        id,
        description: data.description,
        amount: data.amount,
        category: data.category,
        payment_method: data.payment_method.or(Some("CASH".to_string())),
        created_at: Some(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string()),
    })
}

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateExpenseInput {
    pub description: Option<String>,
    pub amount: Option<i32>,
    pub category: Option<String>,
    pub payment_method: Option<String>,
}

#[tauri::command]
#[specta::specta]
pub async fn update_expense(
    state: State<'_, AppState>,
    id: String,
    data: UpdateExpenseInput,
) -> Result<ExpenseResponse, String> {
    let existing = exp_entity::Entity::find_by_id(&id)
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .ok_or_else(|| AppError::NotFound("Gider bulunamadı".into()).to_string())?;

    let mut active: exp_entity::ActiveModel = existing.into();
    if let Some(desc) = data.description {
        active.description = Set(desc);
    }
    if let Some(amount) = data.amount {
        active.amount = Set(amount);
    }
    if let Some(cat) = data.category {
        active.category = Set(Some(cat));
    }
    if let Some(pm) = data.payment_method {
        active.payment_method = Set(Some(pm));
    }

    let updated = active.update(&state.db).await.map_err(|e| AppError::Database(e).to_string())?;
    Ok(ExpenseResponse::from(updated))
}

#[tauri::command]
#[specta::specta]
pub async fn get_all_expenses(state: State<'_, AppState>) -> Result<Vec<ExpenseResponse>, String> {
    let expenses = exp_entity::Entity::find()
        .order_by_desc(exp_entity::Column::CreatedAt)
        .all(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(expenses.into_iter().map(ExpenseResponse::from).collect())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_expense(state: State<'_, AppState>, id: String) -> Result<(), String> {
    exp_entity::Entity::delete_by_id(&id)
        .exec(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;
    Ok(())
}
