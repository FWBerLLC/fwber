use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use dashmap::DashMap;
use h3o::{LatLng, Resolution};
use std::sync::Arc;

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

#[derive(serde::Deserialize, Debug)]
pub struct IndexRequest {
    pub user_id: u64,
    pub lat: f64,
    pub lng: f64,
}

#[derive(serde::Serialize)]
pub struct IndexResponse {
    pub status: String,
    pub h3_index: String,
}

#[derive(serde::Deserialize, Debug)]
pub struct NearbyRequest {
    pub lat: f64,
    pub lng: f64,
    pub radius_m: f64,
}

#[derive(serde::Serialize)]
pub struct NearbyResponse {
    pub users: Vec<u64>,
    pub cells_searched: usize,
}

// -----------------------------------------------------------------------------
// State
// -----------------------------------------------------------------------------

/// Our in-memory spatial index.
/// Maps an H3 CellIndex (u64 representation) to a list of User IDs.
type SpatialIndex = Arc<DashMap<u64, Vec<u64>>>;

struct AppState {
    index: SpatialIndex,
    /// We use resolution 10 for fine-grained proximity (~66m edge length)
    /// Adjust based on density requirements.
    resolution: Resolution,
}

// -----------------------------------------------------------------------------
// Handlers
// -----------------------------------------------------------------------------

/// POST /index
/// Accepts user location, converts to H3 cell, and tracks the user in that cell.
async fn index_location(
    data: web::Json<IndexRequest>,
    state: web::Data<AppState>,
) -> impl Responder {
    let req = data.into_inner();

    let ll = match LatLng::new(req.lat, req.lng) {
        Ok(ll) => ll,
        Err(_) => return HttpResponse::BadRequest().body("Invalid coordinates"),
    };

    let cell = ll.to_cell(state.resolution);
    let cell_u64 = u64::from(cell);

    // Update the index
    state.index.entry(cell_u64).or_insert_with(Vec::new).push(req.user_id);

    // Dedup (quick and dirty for scaling proxy)
    if let Some(mut users) = state.index.get_mut(&cell_u64) {
        users.sort_unstable();
        users.dedup();
    }

    HttpResponse::Ok().json(IndexResponse {
        status: "indexed".to_string(),
        h3_index: cell.to_string(),
    })
}

/// GET /nearby
/// Accepts a point and radius, calculates the H3 k-ring, and returns all users 
/// within those cells. O(1) grid traversal.
async fn get_nearby(
    q: web::Query<NearbyRequest>,
    state: web::Data<AppState>,
) -> impl Responder {
    let req = q.into_inner();

    let ll = match LatLng::new(req.lat, req.lng) {
        Ok(ll) => ll,
        Err(_) => return HttpResponse::BadRequest().body("Invalid coordinates"),
    };

    let center_cell = ll.to_cell(state.resolution);
    
    // Roughly approximate k-ring distance based on radius
    let k = if req.radius_m <= 150.0 {
        1
    } else if req.radius_m <= 500.0 {
        3
    } else if req.radius_m <= 2000.0 {
        10
    } else {
        25 // Max cap for this demo
    };

    let mut nearby_users = Vec::new();
    let mut cells_searched = 0;

    for cell in center_cell.grid_disk::<Vec<_>>(k) {
        cells_searched += 1;
        let cell_u64 = u64::from(cell);
        if let Some(users_in_cell) = state.index.get(&cell_u64) {
            nearby_users.extend(users_in_cell.iter().copied());
        }
    }

    nearby_users.sort_unstable();
    nearby_users.dedup();

    HttpResponse::Ok().json(NearbyResponse {
        users: nearby_users,
        cells_searched,
    })
}

/// GET /health
/// Lightweight readiness probe used by the Windows System Tray controller,
/// Docker/PM2 health checks, and operator diagnostics.
async fn health_check(state: web::Data<AppState>) -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "service": "fwber-geo",
        "version": env!("CARGO_PKG_VERSION"),
        "indexed_cells": state.index.len(),
    }))
}

// -----------------------------------------------------------------------------
// Server Entry
// -----------------------------------------------------------------------------

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize shared state
    let state = web::Data::new(AppState {
        index: Arc::new(DashMap::new()),
        resolution: Resolution::Ten,
    });

    println!("🚀 Starting Rust Geo-Screener v{} (Uber H3 Indexing)", env!("CARGO_PKG_VERSION"));
    println!("📡 Listening on 127.0.0.1:8081");

    HttpServer::new(move || {
        App::new()
            .app_data(state.clone())
            .route("/health", web::get().to(health_check))
            .route("/index", web::post().to(index_location))
            .route("/nearby", web::get().to(get_nearby))
    })
    .bind(("127.0.0.1", 8081))?
    .run()
    .await
}
