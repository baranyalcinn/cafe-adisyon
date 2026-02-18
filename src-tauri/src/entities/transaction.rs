use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Type)]
#[sea_orm(table_name = "Transaction")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    #[sea_orm(column_name = "orderId")]
    pub order_id: String,
    pub amount: i32,
    #[sea_orm(column_name = "paymentMethod")]
    pub payment_method: String,
    #[sea_orm(column_name = "createdAt")]
    pub created_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::order::Entity",
        from = "Column::OrderId",
        to = "super::order::Column::Id"
    )]
    Order,
}

impl Related<super::order::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Order.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
