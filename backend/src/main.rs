mod routes;
mod models;
mod handlers;
mod compile;

#[tokio::main]
async fn main() {
    warp::serve(routes::r2u2_routes())
        .run(([0, 0, 0, 0], 443))
        .await;
}