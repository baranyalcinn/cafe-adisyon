use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, Type)]
#[sea_orm(table_name = "DailySummary")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub date: String,
    #[sea_orm(column_name = "totalCash")]
    pub total_cash: i32,
    #[sea_orm(column_name = "actualCash")]
    pub actual_cash: Option<i32>,
    #[sea_orm(column_name = "totalCard")]
    pub total_card: i32,
    #[sea_orm(column_name = "totalExpenses")]
    pub total_expenses: i32,
    #[sea_orm(column_name = "netProfit")]
    pub net_profit: i32,
    #[sea_orm(column_name = "cancelCount")]
    pub cancel_count: i32,
    #[sea_orm(column_name = "totalVat")]
    pub total_vat: i32,
    #[sea_orm(column_name = "orderCount")]
    pub order_count: i32,
    #[sea_orm(column_name = "totalRevenue")]
    pub total_revenue: i32,
    #[sea_orm(column_name = "createdAt")]
    pub created_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
