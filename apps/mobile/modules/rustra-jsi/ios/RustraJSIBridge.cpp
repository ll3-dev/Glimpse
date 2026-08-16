#include "RustraJSIBridge.hpp"

#include <cstring>
#include <jsi/jsi.h>
#include <utility>

namespace rustra {

using namespace facebook::jsi;

// ── ArrayBuffer helpers ────────────────────────────────────

static Value createArrayBuffer(Runtime& rt, const uint8_t* data, size_t size) {
  Function arrayBufferCtor =
      rt.global().getPropertyAsFunction(rt, "ArrayBuffer");
  Object ab = arrayBufferCtor.callAsConstructor(rt, static_cast<double>(size))
                  .getObject(rt);
  ArrayBuffer buf = ab.getArrayBuffer(rt);
  std::memcpy(buf.data(rt), data, size);
  return ab;
}

static std::pair<const uint8_t*, size_t> extractBytes(
    Runtime& rt, const Value& value) {
  auto obj = value.asObject(rt);

  if (obj.isArrayBuffer(rt)) {
    auto buf = obj.getArrayBuffer(rt);
    return {buf.data(rt), buf.size(rt)};
  }

  auto bufferProp = obj.getProperty(rt, "buffer");
  if (bufferProp.isObject() && bufferProp.asObject(rt).isArrayBuffer(rt)) {
    auto buf = bufferProp.asObject(rt).getArrayBuffer(rt);
    auto byteOffset =
        static_cast<size_t>(obj.getProperty(rt, "byteOffset").asNumber());
    auto byteLength =
        static_cast<size_t>(obj.getProperty(rt, "byteLength").asNumber());
    return {buf.data(rt) + byteOffset, byteLength};
  }

  throw JSError(rt, "RustraJSI: expected ArrayBuffer or TypedArray");
}

// ── HostObject with cached functions ───────────────────────

using InvokeFn = uint8_t* (*)(const uint8_t*, size_t, size_t*);
using QueryFn = uint8_t* (*)(size_t*);

RustraHostObject::RustraHostObject(Runtime& rt) {
  auto makeInvoke = [&](const char* name, InvokeFn fn, const char* err) {
    auto propNameId = PropNameID::forAscii(rt, name);
    auto hostFn = Function::createFromHostFunction(
        rt, propNameId, 1,
        [fn, err](Runtime& rt, const Value&, const Value* args,
                  size_t count) -> Value {
          if (count < 1) {
            throw JSError(rt, std::string("RustraJSI: requires 1 argument — ") +
                              err);
          }
          auto [data, size] = extractBytes(rt, args[0]);
          size_t outLen = 0;
          uint8_t* result = fn(data, size, &outLen);
          if (!result) {
            throw JSError(rt, std::string("RustraJSI: ") + err);
          }
          auto returnValue = createArrayBuffer(rt, result, outLen);
          rustra_ffi_free(result, outLen);
          return returnValue;
        });
    cache_[name] = std::make_unique<CachedFunction>(
        CachedFunction{std::move(propNameId), std::move(hostFn)});
  };

  auto makeQuery = [&](const char* name, QueryFn fn, const char* err) {
    auto propNameId = PropNameID::forAscii(rt, name);
    auto hostFn = Function::createFromHostFunction(
        rt, propNameId, 0,
        [fn, err](Runtime& rt, const Value&, const Value*, size_t) -> Value {
          size_t outLen = 0;
          uint8_t* data = fn(&outLen);
          if (!data) {
            throw JSError(rt, std::string("RustraJSI: ") + err);
          }
          auto returnValue = createArrayBuffer(rt, data, outLen);
          rustra_ffi_free(data, outLen);
          return returnValue;
        });
    cache_[name] = std::make_unique<CachedFunction>(
        CachedFunction{std::move(propNameId), std::move(hostFn)});
  };

  // ── Generic FFI paths (default=json on glimpse-bridge) ──
  // `invoke` matches createReactNativeEngine()'s JSON wire format:
  // request {command,args} → response {ok,result,error}.
  makeInvoke("invoke", rustra_ffi_invoke, "Rust returned null");
  makeInvoke("invokeJson", rustra_ffi_invoke_json, "Rust json returned null");
  makeInvoke("invokePostcardFFI", rustra_ffi_invoke_postcard,
             "Rust postcard FFI returned null");

  // ── Live schema / contract hash (F5 drift detection) ──
  makeQuery("getSchema", rustra_ffi_get_schema,
            "getSchema returned null");
  makeQuery("getContractHash", rustra_ffi_contract_hash,
            "contract hash returned null");
}

Value RustraHostObject::get(Runtime& rt, const PropNameID& name) {
  // Fast path: compare PropNameID against cached entries.
  // This avoids string allocation from name.utf8(rt).
  for (auto& [key, cached] : cache_) {
    if (PropNameID::compare(rt, name, cached->propNameId)) {
      return Value(rt, cached->function);
    }
  }
  return Value::undefined();
}

std::vector<PropNameID> RustraHostObject::getPropertyNames(Runtime& rt) {
  std::vector<PropNameID> names;
  names.reserve(cache_.size());
  for (auto& [key, cached] : cache_) {
    names.push_back(PropNameID::forUtf8(rt, key));
  }
  return names;
}

// ── Install ────────────────────────────────────────────────

void installRustraJSI(Runtime& rt) {
  // Deterministic registration of the `glimpse.core` package with the rustra
  // FFI globals before the first invoke. Without this, Android (no loader-run
  // constructor) and stripped iOS debug builds would dispatch into an empty
  // registry.
  glimpse_ffi_init();

  auto hostObject = std::make_shared<RustraHostObject>(rt);
  auto obj = Object::createFromHostObject(rt, hostObject);
  rt.global().setProperty(rt, "__rustraNative", Value(rt, obj));
}

} // namespace rustra
