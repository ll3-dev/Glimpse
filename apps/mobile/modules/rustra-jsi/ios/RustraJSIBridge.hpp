#pragma once

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <unordered_map>

namespace rustra {

extern "C" {
// ── Generic rustra FFI (exported by libglimpse_bridge.a) ──
uint8_t* rustra_ffi_invoke(
    const uint8_t* payload, size_t payload_len, size_t* out_len);
uint8_t* rustra_ffi_invoke_json(
    const uint8_t* payload, size_t payload_len, size_t* out_len);
uint8_t* rustra_ffi_invoke_postcard(
    const uint8_t* payload, size_t payload_len, size_t* out_len);
uint8_t* rustra_ffi_get_schema(size_t* out_len);
uint8_t* rustra_ffi_contract_hash(size_t* out_len);
void rustra_ffi_free(uint8_t* ptr, size_t len);

// ── glimpse-bridge deterministic init ──
// Registers the `glimpse.core` package with the rustra FFI globals. Must run
// before any `rustra_ffi_*` call; the Apple `__mod_init_func` constructor is
// only a fallback (it can be dead-stripped in debug static-lib builds).
void glimpse_ffi_init();
}

/// Cached function entry — stores PropNameID + pre-created JS Function.
struct CachedFunction {
  facebook::jsi::PropNameID propNameId;
  facebook::jsi::Function function;
};

/// HostObject that caches all JSI functions on first access.
/// Avoids per-call string comparison and Function::createFromHostFunction
/// allocation on the hot path.
class RustraHostObject : public facebook::jsi::HostObject {
 public:
  explicit RustraHostObject(facebook::jsi::Runtime& rt);

  facebook::jsi::Value get(
      facebook::jsi::Runtime& rt,
      const facebook::jsi::PropNameID& name) override;

  void set(
      facebook::jsi::Runtime& rt,
      const facebook::jsi::PropNameID& name,
      const facebook::jsi::Value& value) override {}

  std::vector<facebook::jsi::PropNameID> getPropertyNames(
      facebook::jsi::Runtime& rt) override;

 private:
  /// Cache of function name → {PropNameID, Function}.
  /// Populated once in the constructor.
  std::unordered_map<std::string, std::unique_ptr<CachedFunction>> cache_;
};

void installRustraJSI(facebook::jsi::Runtime& rt);

} // namespace rustra
