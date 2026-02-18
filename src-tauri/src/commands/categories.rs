use sea_orm::*;
use sea_orm::sea_query::Expr;
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::State;
use uuid::Uuid;

use crate::db::AppState;
use crate::entities::category as cat_entity;
use crate::entities::product as prod_entity;
use crate::error::AppError;

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CategoryResponse {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
}

#[tauri::command]
#[specta::specta]
pub async fn get_all_categories(state: State<'_, AppState>) -> Result<Vec<CategoryResponse>, String> {
    let cats = cat_entity::Entity::find()
        .filter(cat_entity::Column::IsDeleted.eq(0))
        .order_by_asc(cat_entity::Column::Name)
        .all(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(cats.into_iter().map(|c| CategoryResponse {
        id: c.id,
        name: c.name,
        icon: c.icon,
    }).collect())
}

#[tauri::command]
#[specta::specta]
pub async fn create_category(state: State<'_, AppState>, name: String) -> Result<CategoryResponse, String> {
    let id = Uuid::now_v7().to_string();
    let model = cat_entity::ActiveModel {
        id: Set(id.clone()),
        name: Set(name.clone()),
        icon: Set(Some("utensils".to_string())),
        is_deleted: Set(0),
    };
    cat_entity::Entity::insert(model)
        .exec(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(CategoryResponse { id, name, icon: Some("utensils".to_string()) })
}

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCategoryInput {
    pub name: Option<String>,
    pub icon: Option<String>,
}

#[tauri::command]
#[specta::specta]
pub async fn update_category(
    state: State<'_, AppState>,
    id: String,
    data: UpdateCategoryInput,
) -> Result<CategoryResponse, String> {
    let existing = cat_entity::Entity::find_by_id(&id)
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .ok_or_else(|| AppError::NotFound("Kategori bulunamadı".into()).to_string())?;

    let mut active: cat_entity::ActiveModel = existing.into();
    if let Some(name) = data.name {
        active.name = Set(name);
    }
    if let Some(icon) = data.icon {
        active.icon = Set(Some(icon));
    }

    let updated = active.update(&state.db).await.map_err(|e| AppError::Database(e).to_string())?;
    Ok(CategoryResponse { id: updated.id, name: updated.name, icon: updated.icon })
}

#[tauri::command]
#[specta::specta]
pub async fn delete_category(state: State<'_, AppState>, id: String) -> Result<(), String> {
    // Soft delete category and its products
    cat_entity::Entity::update_many()
        .col_expr(cat_entity::Column::IsDeleted, Expr::value(1))
        .filter(cat_entity::Column::Id.eq(&id))
        .exec(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    prod_entity::Entity::update_many()
        .col_expr(prod_entity::Column::IsDeleted, Expr::value(1))
        .filter(prod_entity::Column::CategoryId.eq(&id))
        .exec(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(())
}
