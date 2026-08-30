//! iOS discovery backend over the system `dnssd` C API (Bonjour).
//!
//! Entitlement-free by design — plain browse/resolve of the sync service
//! type needs no special permission (the desktop sync flow already proved
//! this with the Swift NetServiceBrowser implementation this module
//! replaces). Compiled only under `cfg(target_os = "ios")`.
#![allow(unsafe_op_in_unsafe_fn)]

use std::ffi::{c_char, c_void, CStr, CString};
use std::sync::mpsc;
use std::time::{Duration, Instant};

use super::{DiscoveredPeer, SERVICE_TYPE_SHORT};

// ── dnssd C API (minimal surface, bound by hand) ────────────

type DNSServiceRef = *mut c_void;
type DNSServiceFlags = u32;
type DNSServiceErrorType = i32;
type DNSServiceBrowseReply = unsafe extern "C" fn(
    sd_ref: DNSServiceRef,
    flags: DNSServiceFlags,
    interface_index: u32,
    error_code: DNSServiceErrorType,
    service_name: *const c_char,
    regtype: *const c_char,
    reply_domain: *const c_char,
    context: *mut c_void,
);
type DNSServiceResolveReply = unsafe extern "C" fn(
    sd_ref: DNSServiceRef,
    flags: DNSServiceFlags,
    interface_index: u32,
    error_code: DNSServiceErrorType,
    fullname: *const c_char,
    hosttarget: *const c_char,
    port: u16, // network byte order
    txt_len: u16,
    txt_record: *const c_char,
    context: *mut c_void,
);

const FLAGS_ADD: DNSServiceFlags = 0x2;
const ERR_NO_ERROR: DNSServiceErrorType = 0;

#[link(name = "dnssd")]
extern "C" {
    fn DNSServiceBrowse(
        sd_ref: *mut DNSServiceRef,
        flags: DNSServiceFlags,
        interface_index: u32,
        regtype: *const c_char,
        domain: *const c_char,
        callback: DNSServiceBrowseReply,
        context: *mut c_void,
    ) -> DNSServiceErrorType;
    fn DNSServiceResolve(
        sd_ref: *mut DNSServiceRef,
        flags: DNSServiceFlags,
        interface_index: u32,
        name: *const c_char,
        regtype: *const c_char,
        domain: *const c_char,
        callback: DNSServiceResolveReply,
        context: *mut c_void,
    ) -> DNSServiceErrorType;
    fn DNSServiceRefDeallocate(sd_ref: DNSServiceRef);
    fn DNSServiceProcessResult(sd_ref: DNSServiceRef) -> DNSServiceErrorType;
}

/// Browse + resolve `_glimpse-sync._tcp` peers within the deadline.
///
/// Two-phase like the Swift original: browse collects instance names, then
/// each is resolved (hostname/port/TXT) on its own service ref. Blocking;
/// `sync_discover` clamps the timeout to [100, 5000] ms.
pub fn discover(timeout_ms: u64) -> Vec<DiscoveredPeer> {
    let deadline = Instant::now() + Duration::from_millis(timeout_ms);
    let names = match browse_names(deadline) {
        Ok(names) => names,
        Err(_) => return Vec::new(),
    };
    let c_service = CString::new(SERVICE_TYPE_SHORT).expect("static service type");
    let c_domain = CString::new("local.").expect("static domain");
    let mut peers = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for (interface_index, name) in names {
        if !seen.insert(name.clone()) {
            continue;
        }
        if let Some(resolved) = resolve_instance(&name, interface_index, &c_service, &c_domain, deadline)
        {
            peers.push(DiscoveredPeer {
                name: resolved.name,
                host: resolved.host,
                port: resolved.port,
                // getaddrinfo for the host happens client-side; discovery
                // only needs the mDNS hostname.
                addresses: Vec::new(),
                device_id: resolved.device_id,
                protocol_version: resolved.protocol_version,
            });
        }
    }
    peers
}

struct BrowseState {
    tx: mpsc::Sender<(u32, String)>,
}

/// Phase 2's per-instance resolve channel payload state.
struct ResolveState {
    tx: mpsc::Sender<ResolvedInstance>,
}

/// Phase 1: browse until the deadline, returning found (interface, name)
/// pairs (ADD events only).
fn browse_names(deadline: Instant) -> Result<Vec<(u32, String)>, ()> {
    let (tx, rx) = mpsc::channel();
    let state = Box::into_raw(Box::new(BrowseState { tx }));
    let mut browse_ref: DNSServiceRef = std::ptr::null_mut();
    let c_service = CString::new(SERVICE_TYPE_SHORT).map_err(|_| ())?;
    let c_domain = CString::new("local.").map_err(|_| ())?;

    let status = unsafe {
        DNSServiceBrowse(
            &mut browse_ref,
            0,
            0,
            c_service.as_ptr(),
            c_domain.as_ptr(),
            browse_reply,
            state.cast(),
        )
    };
    if status != ERR_NO_ERROR || browse_ref.is_null() {
        unsafe { drop(Box::from_raw(state)) };
        return Err(());
    }

    let mut found = Vec::new();
    loop {
        if Instant::now() >= deadline || unsafe { DNSServiceProcessResult(browse_ref) } != ERR_NO_ERROR {
            break;
        }
        while let Ok(pair) = rx.try_recv() {
            found.push(pair);
        }
        std::thread::sleep(Duration::from_millis(10));
    }
    // Final drain for events delivered just before the loop exit.
    while let Ok(pair) = rx.try_recv() {
        found.push(pair);
    }
    unsafe {
        DNSServiceRefDeallocate(browse_ref);
        drop(Box::from_raw(state));
    }
    Ok(found)
}

struct ResolvedInstance {
    name: String,
    host: String,
    port: u16,
    device_id: String,
    protocol_version: i64,
}

/// Phase 2: resolve one instance (hostname, port, TXT) on its own ref.
fn resolve_instance(
    name: &str,
    interface_index: u32,
    c_service: &CString,
    c_domain: &CString,
    deadline: Instant,
) -> Option<ResolvedInstance> {
    let (tx, rx) = mpsc::channel();
    let state = Box::into_raw(Box::new(ResolveState { tx }));
    let mut resolve_ref: DNSServiceRef = std::ptr::null_mut();
    let c_name = CString::new(name).ok()?;

    let status = unsafe {
        DNSServiceResolve(
            &mut resolve_ref,
            0,
            interface_index,
            c_name.as_ptr(),
            c_service.as_ptr(),
            c_domain.as_ptr(),
            resolve_reply,
            state.cast(),
        )
    };
    if status != ERR_NO_ERROR || resolve_ref.is_null() {
        unsafe { drop(Box::from_raw(state)) };
        return None;
    }

    let mut resolved = None;
    while resolved.is_none() && Instant::now() < deadline {
        if unsafe { DNSServiceProcessResult(resolve_ref) } != ERR_NO_ERROR {
            break;
        }
        if let Ok(instance) = rx.try_recv() {
            resolved = Some(instance);
        } else {
            std::thread::sleep(Duration::from_millis(5));
        }
    }
    unsafe {
        DNSServiceRefDeallocate(resolve_ref);
        drop(Box::from_raw(state));
    }
    resolved
}

// ── C callbacks ─────────────────────────────────────────────

unsafe extern "C" fn browse_reply(
    _sd_ref: DNSServiceRef,
    flags: DNSServiceFlags,
    interface_index: u32,
    error_code: DNSServiceErrorType,
    service_name: *const c_char,
    _regtype: *const c_char,
    _reply_domain: *const c_char,
    context: *mut c_void,
) {
    if error_code != ERR_NO_ERROR || flags & FLAGS_ADD == 0 {
        return; // removals and failures are not interesting here
    }
    let name = CStr::from_ptr(service_name).to_string_lossy().into_owned();
    if let Some(state) = (context as *mut BrowseState).as_ref() {
        let _ = state.tx.send((interface_index, name));
    }
}

unsafe extern "C" fn resolve_reply(
    _sd_ref: DNSServiceRef,
    _flags: DNSServiceFlags,
    _interface_index: u32,
    error_code: DNSServiceErrorType,
    fullname: *const c_char,
    hosttarget: *const c_char,
    port: u16,
    txt_len: u16,
    txt_record: *const c_char,
    context: *mut c_void,
) {
    if error_code != ERR_NO_ERROR {
        return;
    }
    let Some(state) = (context as *mut ResolveState).as_ref() else {
        return;
    };
    let fullname = CStr::from_ptr(fullname).to_string_lossy().into_owned();
    let host = CStr::from_ptr(hosttarget).to_string_lossy().into_owned();
    let txt = parse_txt(txt_record, txt_len);
    // Instance name = fullname minus the trailing `._glimpse-sync._tcp.local.`
    let name = match fullname.rsplit_once('.') {
        Some((instance, _)) => instance.to_string(),
        None => fullname,
    };
    let _ = state.tx.send(ResolvedInstance {
        name,
        host,
        port: u16::from_be(port),
        device_id: txt.get("deviceId").cloned().unwrap_or_default(),
        protocol_version: txt
            .get("protocol")
            .and_then(|value| value.parse::<i64>().ok())
            .unwrap_or(0),
    });
}

/// Decode a TXT record: length-prefixed `key=value` chunks.
fn parse_txt(record: *const c_char, len: u16) -> std::collections::HashMap<String, String> {
    let mut map = std::collections::HashMap::new();
    if record.is_null() || len == 0 {
        return map;
    }
    let bytes = unsafe { std::slice::from_raw_parts(record.cast::<u8>(), len as usize) };
    let mut offset = 0usize;
    while offset < bytes.len() {
        let chunk_len = bytes[offset] as usize;
        offset += 1;
        if chunk_len == 0 || offset + chunk_len > bytes.len() {
            break;
        }
        if let Ok(pair) = std::str::from_utf8(&bytes[offset..offset + chunk_len]) {
            if let Some((key, value)) = pair.split_once('=') {
                map.insert(key.to_string(), value.to_string());
            }
        }
        offset += chunk_len;
    }
    map
}
