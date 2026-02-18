use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Type)]
#[sea_orm(table_name = "Order")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    #[sea_orm(column_name = "tableId")]
    pub table_id: String,
    pub status: String,
    #[sea_orm(column_name = "totalAmount")]
    pub total_amount: i32,
    #[sea_orm(column_name = "isLocked")]
    pub is_locked: i32,
    #[sea_orm(column_name = "createdAt")]
    pub created_at: Option<String>,
    #[sea_orm(column_name = "updatedAt")]
    pub updated_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::table::Entity",
        from = "Column::TableId",
        to = "super::table::Column::Id"
    )]
    Table,
    #[sea_orm(has_many = "super::order_item::Entity")]
    OrderItem,
    #[sea_orm(has_many = "super::transaction::Entity")]
    Transaction,
}

impl Related<super::table::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Table.def()
    }
}

impl Related<super::order_item::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::OrderItem.def()
    }
}

impl Related<super::transaction::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Transaction.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
