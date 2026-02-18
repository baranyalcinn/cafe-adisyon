use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Veritabanı hatası: {0}")]
    Database(#[from] sea_orm::DbErr),

    #[error("{0}")]
    NotFound(String),

    #[error("{0}")]
    Validation(String),

    #[error("{0}")]
    Conflict(String),
}

// Tauri commands require `Result<T, String>`.
// This impl converts AppError → String automatically.
impl From<AppError> for String {
    fn from(err: AppError) -> Self {
        err.to_string()
    }
}



