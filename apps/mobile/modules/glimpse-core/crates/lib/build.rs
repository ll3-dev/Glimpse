fn main() {
    println!("cargo:rerun-if-changed=src/ffi.rs");
    println!("cargo:rerun-if-changed=src/glimpse_core_impl.rs");
}
