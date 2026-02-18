use warp::{hyper::Method, self, Filter};

use crate::handlers;
use crate::models::R2U2_Request;

const MAX_CONTENT_LENGTH: u64 = 1024*32;

/// All routes
pub fn r2u2_routes() -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    let cors = warp::cors()
            .allow_any_origin()
            .allow_headers(vec![
                "Access-Control-Allow-Headers", 
                "Access-Control-Request-Method", 
                "Access-Control-Request-Headers", 
                "Access-Control-Allow-Origin",
                "Accept", 
                "X-Requested-With", 
                "Content-Type",
                "User-Agent",
                "Sec-Fetch-Mode",
                "Referer",
                "Origin",])
            .allow_methods(&[Method::GET, Method::POST])
            .build();

    (run().or(compile()).or(download_bin()).or(download_c()).or(download_rust()).or(download_c_bounds()).or(download_rust_bounds())).with(cors)
}

/// POST /run
fn run() -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path("run")
        .and(warp::post())
        .and(json_body())
        .and_then(handlers::run)
}

/// Compile /compile
fn compile() -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path("compile")
        .and(warp::post())
        .and(json_body())
        .and_then(handlers::compile)
}

/// Compile /downloadbin
fn download_bin() -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path("downloadbin")
        .and(warp::post())
        .and(json_body())
        .and_then(handlers::download_bin)
}

/// Compile /downloadc
fn download_c() -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path("downloadc")
        .and(warp::post())
        .and(json_body())
        .and_then(handlers::download_c)
}

/// Compile /downloadrust
fn download_rust() -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path("downloadrust")
        .and(warp::post())
        .and(json_body())
        .and_then(handlers::download_rust)
}

/// Compile /downloadcbounds
fn download_c_bounds() -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path("downloadcbounds")
        .and(warp::post())
        .and(json_body())
        .and_then(handlers::download_c_bounds)
}

/// Compile /downloadrustbounds
fn download_rust_bounds() -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path("downloadrustbounds")
        .and(warp::post())
        .and(json_body())
        .and_then(handlers::download_rust_bounds)
}

fn json_body() -> impl Filter<Extract = (R2U2_Request,), Error = warp::Rejection> + Clone {
    warp::body::content_length_limit(MAX_CONTENT_LENGTH).and(warp::body::json())
}