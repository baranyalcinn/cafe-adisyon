use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Type)]
#[sea_orm(table_name = "Product")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub name: String,
    pub price: i32,
    #[sea_orm(column_name = "categoryId")]
    pub category_id: String,
    #[sea_orm(column_name = "isFavorite")]
    pub is_favorite: i32,
    #[sea_orm(column_name = "isDeleted")]
    pub is_deleted: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::category::Entity",
        from = "Column::CategoryId",
        to = "super::category::Column::Id"
    )]
    Category,
    #[sea_orm(has_many = "super::order_item::Entity")]
    OrderItem,
}

impl Related<super::category::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Category.def()
    }
}

impl Related<super::order_item::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::OrderItem.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
