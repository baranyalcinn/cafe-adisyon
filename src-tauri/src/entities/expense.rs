use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Type)]
#[sea_orm(table_name = "Expense")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub description: String,
    pub amount: i32,
    pub category: Option<String>,
    #[sea_orm(column_name = "paymentMethod")]
    pub payment_method: Option<String>,
    #[sea_orm(column_name = "createdAt")]
    pub created_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
