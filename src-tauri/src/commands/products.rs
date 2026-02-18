use sea_orm::*;
use sea_orm::sea_query::Expr;
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::State;
use uuid::Uuid;

use crate::db::AppState;
use crate::entities::product::{self as prod_entity};
use crate::error::AppError;

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ProductResponse {
    pub id: String,
    pub name: String,
    pub price: i32,
    pub category_id: String,
    pub is_favorite: bool,
    pub is_deleted: bool,
}

impl From<prod_entity::Model> for ProductResponse {
    fn from(p: prod_entity::Model) -> Self {
        Self {
            id: p.id,
            name: p.name,
            price: p.price,
            category_id: p.category_id,
            is_favorite: p.is_favorite == 1,
            is_deleted: p.is_deleted == 1,
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn get_all_products(state: State<'_, AppState>) -> Result<Vec<ProductResponse>, String> {
    let products = prod_entity::Entity::find()
        .filter(prod_entity::Column::IsDeleted.eq(0))
        .order_by_asc(prod_entity::Column::Name)
        .all(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(products.into_iter().map(ProductResponse::from).collect())
}

#[tauri::command]
#[specta::specta]
pub async fn get_products_by_category(
    state: State<'_, AppState>,
    category_id: String,
) -> Result<Vec<ProductResponse>, String> {
    let products = prod_entity::Entity::find()
        .filter(prod_entity::Column::CategoryId.eq(&category_id))
        .filter(prod_entity::Column::IsDeleted.eq(0))
        .order_by_asc(prod_entity::Column::Name)
        .all(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(products.into_iter().map(ProductResponse::from).collect())
}

#[tauri::command]
#[specta::specta]
pub async fn get_favorite_products(state: State<'_, AppState>) -> Result<Vec<ProductResponse>, String> {
    let products = prod_entity::Entity::find()
        .filter(prod_entity::Column::IsFavorite.eq(1))
        .filter(prod_entity::Column::IsDeleted.eq(0))
        .order_by_asc(prod_entity::Column::Name)
        .all(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(products.into_iter().map(ProductResponse::from).collect())
}

#[tauri::command]
#[specta::specta]
pub async fn search_products(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<ProductResponse>, String> {
    let products = prod_entity::Entity::find()
        .filter(prod_entity::Column::Name.contains(&query))
        .filter(prod_entity::Column::IsDeleted.eq(0))
        .order_by_asc(prod_entity::Column::Name)
        .all(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(products.into_iter().map(ProductResponse::from).collect())
}

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateProductInput {
    pub name: String,
    pub price: i32,
    pub category_id: String,
    pub is_favorite: bool,
}

#[tauri::command]
#[specta::specta]
pub async fn create_product(
    state: State<'_, AppState>,
    data: CreateProductInput,
) -> Result<ProductResponse, String> {
    let id = Uuid::now_v7().to_string();
    let model = prod_entity::ActiveModel {
        id: Set(id.clone()),
        name: Set(data.name.clone()),
        price: Set(data.price),
        category_id: Set(data.category_id.clone()),
        is_favorite: Set(if data.is_favorite { 1 } else { 0 }),
        is_deleted: Set(0),
    };
    prod_entity::Entity::insert(model)
        .exec(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(ProductResponse {
        id,
        name: data.name,
        price: data.price,
        category_id: data.category_id,
        is_favorite: data.is_favorite,
        is_deleted: false,
    })
}

#[derive(Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProductInput {
    pub name: Option<String>,
    pub price: Option<i32>,
    pub is_favorite: Option<bool>,
}

#[tauri::command]
#[specta::specta]
pub async fn update_product(
    state: State<'_, AppState>,
    id: String,
    data: UpdateProductInput,
) -> Result<ProductResponse, String> {
    let existing = prod_entity::Entity::find_by_id(&id)
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .ok_or_else(|| AppError::NotFound("Ürün bulunamadı".into()).to_string())?;

    let mut active: prod_entity::ActiveModel = existing.into();
    if let Some(name) = data.name {
        active.name = Set(name);
    }
    if let Some(price) = data.price {
        active.price = Set(price);
    }
    if let Some(fav) = data.is_favorite {
        active.is_favorite = Set(if fav { 1 } else { 0 });
    }

    let res = active.update(&state.db).await;
    let updated = res.map_err(|e| AppError::Database(e).to_string())?;
    Ok(ProductResponse::from(updated))
}

#[tauri::command]
#[specta::specta]
pub async fn delete_product(state: State<'_, AppState>, id: String) -> Result<(), String> {
    prod_entity::Entity::update_many()
        .col_expr(prod_entity::Column::IsDeleted, Expr::value(1))
        .filter(prod_entity::Column::Id.eq(&id))
        .exec(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;
    Ok(())
}
