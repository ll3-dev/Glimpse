//! Generates the TypeScript client for the `glimpse.core` package.
//!
//! Run via `bun run bridge:generate` (or `cargo run -p glimpse-bridge --bin
//! generate`); output lands in `packages/bridge-rust/generated/`.

use glimpse_bridge::glimpse_package;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let generated = glimpse_package().generate_typescript()?;
    generated.write_to_dir(concat!(env!("CARGO_MANIFEST_DIR"), "/generated"))?;
    println!("Generated TS client in packages/bridge-rust/generated/");
    Ok(())
}
