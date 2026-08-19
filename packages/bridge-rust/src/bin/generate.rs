//! Generates the TypeScript client for the `glimpse.core` package.
//!
//! Run via `bun run bridge:generate` (or `cargo run -p glimpse-bridge --bin
//! generate`); output lands in `packages/bridge-rust/generated/`.

use glimpse_bridge::glimpse_package;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut generated = glimpse_package().generate_typescript()?;

    // Consumers must configure the same @rustra/types module instance used by
    // the generated invoke helpers. Re-exporting it here keeps that invariant
    // even when a package manager installs more than one physical copy.
    generated.commands_ts.push_str(
        "export { configure as configureRustraEngine } from '@rustra/types';\n",
    );

    generated.write_to_dir(concat!(env!("CARGO_MANIFEST_DIR"), "/generated"))?;
    println!("Generated TS client in packages/bridge-rust/generated/");
    Ok(())
}
