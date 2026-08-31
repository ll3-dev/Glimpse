//! Android discovery backend: Rust → JNI → NsdManager (user-confirmed spec).
//!
//! Control flows Rust→Java only. The Kotlin side owns no decisions and cannot
//! call back into Rust anyway — `librustrajsi.so` links `libglimpse_bridge.a`
//! with `--exclude-libs,ALL`, so `Java_*` exports from the staticlib are
//! invisible to dlsym. The shape:
//!
//! - `RustNsdDiscoveryBridge` (Kotlin, in the rustra-jsi module) implements
//!   `NsdManager.DiscoveryListener` — a Java interface can only be implemented
//!   in JVM code — and resolves found services with the same TXT attribute
//!   contract as `SyncDiscoveryModule.kt` (deviceId/protocol).
//! - Results accumulate in the bridge; Rust drives the whole lifecycle from
//!   `sync_discover`: `start(timeout)` → poll `takeResultsJson()` until the
//!   adapter signals completion or the deadline passes → `stop()`.
//! - `RustraJSIModule.onCreate` hands Rust the JVM + app Context once
//!   ([`jni_init`]); the bridge's static `context` field is set from there.
//!
//! Compiled only under `cfg(target_os = "android")`.
//!
//! Verification note (2026-08-30): no Android emulator in this environment —
//! `cargo check --target aarch64-linux-android` is the enforced gate and the
//! JSON wire contract is unit-tested host-side (see `sync_discovery` tests).

use std::time::{Duration, Instant};

use jni::objects::{JClass, JStaticMethodID, JValue};
use jni::{JavaVM, JNIEnv};

use super::{parse_adapter_results, DiscoveredPeer};

static VM: std::sync::OnceLock<JavaVM> = std::sync::OnceLock::new();
// Raw pointer to a global ref of `RustNsdDiscoveryBridge`'s class object —
// process-lifetime by design (the staticlib itself outlives every call).
static BRIDGE_CLASS: std::sync::atomic::AtomicIsize = std::sync::atomic::AtomicIsize::new(0);

/// C ABI called from Kotlin via the `jni.GlimpseBridgeJni` loader shim: the
/// `Java_*` trampoline lives in `rustra-jsi-jni.cpp` (visible to dlsym) and
/// forwards here, since `--exclude-libs,ALL` keeps this staticlib's own
/// symbols out of the .so's dynamic table.
///
/// # Safety
/// `vm` must be the process `JavaVM` pointer (from `JNI_OnLoad`).
#[unsafe(no_mangle)]
pub unsafe extern "C" fn glimpse_jni_init(vm: *mut jni::sys::JavaVM) {
    let Ok(vm) = JavaVM::from_raw(vm) else {
        return;
    };
    jni_init(vm);
}

/// Store the JVM for later discovery runs and pin the Kotlin bridge class.
///
/// Called once from `RustraJSIModule.onCreate`; the application Context is
/// delivered to the bridge by Kotlin directly (`setApplicationContext`), so
/// Rust only manages the VM and the class global ref.
pub fn jni_init(vm: JavaVM) {
    if VM.set(vm).is_err() {
        return; // Kotlin calls this exactly once per process
    }
    let Ok(mut guard) = VM.get().expect("JavaVM just stored above").attach_current_thread()
    else {
        return;
    };
    let env: &mut JNIEnv = &mut guard;
    let Ok(class) = env.find_class("so/glimpse/mobile/RustNsdDiscoveryBridge") else {
        return;
    };
    if let Ok(global) = env.new_global_ref(&class) {
        // GlobalRef keeps its own JVM pin; parking the raw JObject pointer
        // (a `&JObject<'static>` per AsRef impl) avoids re-lookup per run.
        BRIDGE_CLASS.store(
            global.as_obj().as_raw() as isize,
            std::sync::atomic::Ordering::Release,
        );
        std::mem::forget(global); // never freed — lives as long as the app
    }
}

/// Browse + resolve `_glimpse-sync._tcp` peers via NsdManager, orchestrated
/// from Rust. Blocking; `sync_discover` clamps the timeout to [100, 5000] ms.
pub fn discover(timeout_ms: u64) -> Vec<DiscoveredPeer> {
    let Some(vm) = VM.get() else {
        return Vec::new(); // module never initialized — nothing to attach to
    };
    let Ok(mut guard) = vm.attach_current_thread() else {
        return Vec::new();
    };
    let env: &mut JNIEnv = &mut guard;
    let class_raw = BRIDGE_CLASS.load(std::sync::atomic::Ordering::Acquire);
    if class_raw == 0 {
        return Vec::new();
    }
    // Safety: raw pointer is a global ref created in `jni_init` and valid for
    // the whole process lifetime.
    let class = unsafe { JClass::from_raw(class_raw as *mut _) };

    // 1) start(timeout) — Kotlin acquires the multicast lock, builds the
    //    NsdManager, registers its DiscoveryListener, starts resolving.
    let started = env
        .call_static_method(
            &class,
            "start",
            "(I)V",
            &[JValue::Int(timeout_ms.min(i32::MAX as u64) as i32)],
        )
        .is_ok();
    if !started {
        return Vec::new();
    }

    // 2) Poll takeResultsJson() until the adapter hands back the finished
    //    batch (a non-null JSON string) or the deadline passes. Resolutions
    //    run concurrently on the JVM side; the adapter coalesces them so one
    //    read sees every peer found in this run.
    let take_results: JStaticMethodID =
        match env.get_static_method_id(&class, "takeResultsJson", "()Ljava/lang/String;") {
            Ok(method) => method,
            Err(_) => {
                let _ = env.call_static_method(&class, "stop", "()V", &[]);
                return Vec::new();
            }
        };
    let deadline = Instant::now() + Duration::from_millis(timeout_ms);
    let mut peers = Vec::new();
    loop {
        // Safety: `take_results` was resolved against `class` with the
        // matching `()Ljava/lang/String;` signature above.
        let finished = unsafe {
            env.call_static_method_unchecked(
                &class,
                &take_results,
                jni::signature::ReturnType::Object,
                &[],
            )
        }
        .ok()
        .and_then(|value| value.l().ok());
        if let Some(string) = finished {
            let json = env
                .get_string((&string).into())
                .ok()
                .map(|java| java.to_string_lossy().into_owned());
            if let Some(json) = json {
                peers = parse_adapter_results(&json);
                break;
            }
        }
        if Instant::now() >= deadline {
            break;
        }
        std::thread::sleep(Duration::from_millis(25));
    }

    // 3) stop() — unregister the listener, release the multicast lock. The
    //    bridge tolerates repeated/idle stops.
    let _ = env.call_static_method(&class, "stop", "()V", &[]);

    peers
}
