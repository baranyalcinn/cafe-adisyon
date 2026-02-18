use sea_orm::*;
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::State;

use crate::db::AppState;
use crate::entities::app_settings as settings_entity;
use crate::error::AppError;

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PinCheckResult {
    pub valid: bool,
    pub required: bool,
}

#[derive(Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StatusResult {
    pub required: bool,
}

#[tauri::command]
#[specta::specta]
pub async fn verify_pin(state: State<'_, AppState>, pin: String) -> Result<PinCheckResult, String> {
    let settings = settings_entity::Entity::find_by_id("app-settings")
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    match settings {
        Some(s) => {
            let valid = s.admin_pin.as_deref() == Some(pin.as_str());
            Ok(PinCheckResult { valid, required: true })
        }
        None => Ok(PinCheckResult { valid: true, required: false }),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn check_admin_status(state: State<'_, AppState>) -> Result<StatusResult, String> {
    let settings = settings_entity::Entity::find_by_id("app-settings")
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(StatusResult {
        required: settings.and_then(|s| s.admin_pin).is_some(),
    })
}

#[tauri::command]
#[specta::specta]
pub async fn change_pin(
    state: State<'_, AppState>,
    current_pin: String,
    new_pin: String,
) -> Result<(), String> {
    let settings = settings_entity::Entity::find_by_id("app-settings")
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .ok_or_else(|| AppError::NotFound("Ayarlar bulunamadı".into()).to_string())?;

    if settings.admin_pin.as_deref() != Some(current_pin.as_str()) {
        return Err(AppError::Validation("Mevcut PIN yanlış".into()).to_string());
    }

    let mut active: settings_entity::ActiveModel = settings.into();
    active.admin_pin = Set(Some(new_pin));
    active.update(&state.db).await.map_err(|e| AppError::Database(e).to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn set_recovery(
    state: State<'_, AppState>,
    current_pin: String,
    question: String,
    answer: String,
) -> Result<(), String> {
    let settings = settings_entity::Entity::find_by_id("app-settings")
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .ok_or_else(|| AppError::NotFound("Ayarlar bulunamadı".into()).to_string())?;

    if settings.admin_pin.as_deref() != Some(current_pin.as_str()) {
        return Err(AppError::Validation("Mevcut PIN yanlış".into()).to_string());
    }

    let mut active: settings_entity::ActiveModel = settings.into();
    active.security_question = Set(Some(question));
    active.security_answer = Set(Some(answer));
    active.update(&state.db).await.map_err(|e| AppError::Database(e).to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_recovery_question(state: State<'_, AppState>) -> Result<Option<String>, String> {
    let settings = settings_entity::Entity::find_by_id("app-settings")
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    Ok(settings.and_then(|s| s.security_question))
}

#[tauri::command]
#[specta::specta]
pub async fn reset_pin(state: State<'_, AppState>, answer: String) -> Result<(), String> {
    let settings = settings_entity::Entity::find_by_id("app-settings")
        .one(&state.db)
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .ok_or_else(|| AppError::NotFound("Ayarlar bulunamadı".into()).to_string())?;

    if settings.security_answer.as_deref() != Some(answer.as_str()) {
        return Err(AppError::Validation("Güvenlik cevabı yanlış".into()).to_string());
    }

    let mut active: settings_entity::ActiveModel = settings.into();
    active.admin_pin = Set(Some("1234".to_string()));
    active.update(&state.db).await.map_err(|e| AppError::Database(e).to_string())?;
    Ok(())
}
