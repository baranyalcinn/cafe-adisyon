use sea_orm::*;
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::State;
use uuid::Uuid;

use crate::db::AppState;
use crate::entities::table as table_entity;
use crate::entities::order as order_entity;
use crate::error::AppError;

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TableResponse {
    pub id: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TableStatusResponse {
    pub id: String,
    pub name: String,
    pub has_open_order: bool,
    pub is_locked: bool,
}

#[tauri::command]
#[specta::specta]
pub async fn get_all_tables(state: State<'_, AppState>) -> Result<Vec<TableResponse>, String> {
    let tables = table_entity::Entity::find()
        .order_by_asc(table_entity::Column::Name)
        .all(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(tables.into_iter().map(|t| TableResponse { id: t.id, name: t.name }).collect())
}

#[tauri::command]
#[specta::specta]
pub async fn create_table(state: State<'_, AppState>, name: String) -> Result<TableResponse, String> {
    let id = Uuid::now_v7().to_string();
    let model = table_entity::ActiveModel {
        id: Set(id.clone()),
        name: Set(name.clone()),
    };
    table_entity::Entity::insert(model)
        .exec(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(TableResponse { id, name })
}

#[tauri::command]
#[specta::specta]
pub async fn delete_table(state: State<'_, AppState>, id: String) -> Result<(), String> {
    table_entity::Entity::delete_by_id(&id)
        .exec(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_table_status(state: State<'_, AppState>) -> Result<Vec<TableStatusResponse>, String> {
    let tables = table_entity::Entity::find()
        .order_by_asc(table_entity::Column::Name)
        .all(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    let mut result = Vec::with_capacity(tables.len());
    for t in tables {
        let open_order = order_entity::Entity::find()
            .filter(order_entity::Column::TableId.eq(&t.id))
            .filter(order_entity::Column::Status.eq("OPEN"))
            .one(&state.db)
            .await
            .map_err(|e| AppError::Database(e).to_string())?;

        let has_open_order = open_order.is_some();
        let is_locked = open_order.map(|o| o.is_locked == 1).unwrap_or(false);

        result.push(TableStatusResponse {
            id: t.id,
            name: t.name,
            has_open_order,
            is_locked,
        });
    }

    Ok(result)
}
