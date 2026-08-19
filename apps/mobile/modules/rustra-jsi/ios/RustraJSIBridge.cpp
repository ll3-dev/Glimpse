#include "RustraJSIBridge.hpp"

#include <cstdio>
#include <cstring>
#include <jsi/jsi.h>
#include <utility>

// CallInvoker는 순수 C++ 헤더(ReactCommon/callinvoker)다 — iOS/Android 모두
// 동일 경로로 제공된다. 플랫폼 글루(.mm / jni.cpp)가 invoker를 얻어
// type-erase해 전달하므로 이 파일은 플랫폼 헤더에 의존하지 않는다.
#if defined(__APPLE__) || defined(__ANDROID__)
#include <ReactCommon/CallInvoker.h>
#endif

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

// ── EventDispatcher: Rust → JS push delivery ───────────────
//
// 스레드 마샬링 설계:
//   emitting 스레드(FFI 콜백)          JS 런타임 스레드
//   ────────────────────────────      ─────────────────────────────
//   onRustEvent()                       CallInvoker::invokeAsync
//     lock → queue.push_back             → drain(rt)
//     (drop-oldest if full)                lock → swap queue out
//     invokeAsync(drain) 예약              for each event:
//   ── never touches JS objects ─           listeners_[name].call(payload)
//
// CallInvoker가 없으면(Expo Go/폴백) JS가 drainEvents()를 폴링 호출해
// 동일한 drain을 수동으로 실행한다. 두 경로는 같은 drain_scheduled_ 플래그로
// 중복 실행을 막는다.

/// 전역 디스패처 — installRustraJSI가 생성, 프로세스당 하나.
/// HostObject와 별개로 살아있어야 FFI 콜백(HostObject 생명주기 밖)이
/// 안전하게 참조할 수 있다.
static std::shared_ptr<EventDispatcher> g_eventDispatcher = nullptr;
static std::mutex g_dispatcherMutex;

static std::shared_ptr<EventDispatcher> getEventDispatcher() {
  std::lock_guard<std::mutex> lock(g_dispatcherMutex);
  if (!g_eventDispatcher) {
    g_eventDispatcher = std::make_shared<EventDispatcher>();
  }
  return g_eventDispatcher;
}

void EventDispatcher::setCallInvoker(std::shared_ptr<void> invoker) {
  std::lock_guard<std::mutex> lock(mutex_);
  callInvoker_ = std::move(invoker);
  // RN 리로드 대응: install은 새 Runtime의 JS 스레드에서 매번 실행되므로
  // 이전 Runtime 소유의 jsi::Function 리스너를 여기서 비운다(방치 시 UAF).
  // 큐의 잔여 이벤트도 이전 런타임 대상이므로 함께 폐기한다.
  // 단, mutex_를 잡은 채 FFI unregister를 호출하면 onRustEvent가 같은
  // 락을 잡으려 해 교착할 수 있으므로 해제는 락 밖에서.
  const bool hadListeners = !listeners_.empty();
  listeners_.clear();
  queue_.clear();
  if (hadListeners) {
    // 리스너가 있던 상태로 리로드된 경우 싱크를 해제해 둔다 — 새 번들이
    // setListener로 다시 등록하면 그때 재설치된다.
    rustra_ffi_event_sink_unregister();
  }
}

void EventDispatcher::setListener(facebook::jsi::Runtime& rt,
                                   const std::string& name,
                                   facebook::jsi::Function callback) {
  // JS 스레드에서만 호출됨(HostFunction 경유) — listeners_ 락 없이 접근.
  // jsi::Function은 default-constructible하지 않으므로 insert_or_assign 사용
  // (operator[]는 기본 생성을 요구한다).
  bool wasEmpty = listeners_.empty();
  listeners_.insert_or_assign(name, std::move(callback));
  // 첫 리스너 등록 시 FFI 싱크를 설치한다(폴링 경로 → 푸시 전환).
  if (wasEmpty) {
    rustra_ffi_event_sink_register(&EventDispatcher::onRustEvent, this);
  }
}

void EventDispatcher::removeListener(const std::string& name) {
  listeners_.erase(name);
  // 마지막 리스너 제거 시 FFI 싱크 해제(푸시 → 폴링 복귀).
  if (listeners_.empty()) {
    rustra_ffi_event_sink_unregister();
  }
}

void EventDispatcher::onRustEvent(void* user_data, const char* name,
                                   const char* payload) {
  auto* self = static_cast<EventDispatcher*>(user_data);
  if (!self || !name || !payload) return;

  std::lock_guard<std::mutex> lock(self->mutex_);
  if (self->queue_.size() >= self->capacity_) {
    self->queue_.pop_front();
    ++self->dropped_;
  }
  self->queue_.emplace_back(name, payload);
  self->scheduleDrainLocked();
}

void EventDispatcher::scheduleDrainLocked() {
  // 락을 잡은 상태에서 호출됨. CallInvoker가 있으면 drain을 JS 스레드로
  // 예약한다 — invokeAsync 자체는 스레드 안전하다.
  if (drainScheduled_ || !callInvoker_) return;
  drainScheduled_ = true;

  auto self = shared_from_this();
  std::shared_ptr<void> invoker = callInvoker_;
  auto weak = std::weak_ptr<EventDispatcher>(self);
#if defined(__APPLE__) || defined(__ANDROID__)
  auto* nativeInvoker = static_cast<facebook::react::CallInvoker*>(invoker.get());
  nativeInvoker->invokeAsync([weak](facebook::jsi::Runtime& rt) {
    if (auto dispatcher = weak.lock()) {
      dispatcher->drain(rt);
    }
  });
#endif
}

void EventDispatcher::drain(facebook::jsi::Runtime& rt) {
  // JS 런타임 스레드에서만 호출된다(CallInvoker 콜백 또는 drainEvents()).
  std::deque<std::pair<std::string, std::string>> events;
  {
    std::lock_guard<std::mutex> lock(mutex_);
    drainScheduled_ = false;
    events.swap(queue_);
  }

  for (auto& [name, payload] : events) {
    auto it = listeners_.find(name);
    if (it == listeners_.end()) continue;
    try {
      // 페이로드는 JSON 문자열 그대로 JS로 — 파싱은 TS 래퍼에서 1회.
      // (JSI 경계를 넘기는 비용 < C++에서 JSON 파서를 두는 비용)
      it->second.call(rt, facebook::jsi::String::createFromUtf8(
          rt, reinterpret_cast<const uint8_t*>(payload.data()), payload.size()));
    } catch (const facebook::jsi::JSError& e) {
      // JS 콜백이 throw해도 drain은 계속한다 — 나머지 이벤트가 유실되지
      // 않게 한다(Rust 싱크의 패닉 격리 정책과 대칭).
      fprintf(stderr, "RustraJSI: event listener for '%s' threw: %s\n",
              name.c_str(), e.getMessage().c_str());
    }
  }
}

size_t EventDispatcher::pendingCount() {
  std::lock_guard<std::mutex> lock(mutex_);
  return queue_.size();
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

  // ── Event push: onEvent(name, cb) / offEvent(name) / drainEvents() ──
  // JS 콜백 등록은 HostFunction에서 즉시 EventDispatcher에 반영된다.
  // 등록 시점에 FFI 싱크가 설치되고, 이후 emit은 큐 → CallInvoker → drain
  // 경로로 이 콜백에 도달한다. 페이로드는 JSON 문자열 — TS 래퍼가
  // JSON.parse 1회.
  {
    auto dispatcher = getEventDispatcher();
    auto propNameId = PropNameID::forAscii(rt, "onEvent");
    auto hostFn = Function::createFromHostFunction(
        rt, propNameId, 2,
        [dispatcher](Runtime& rt, const Value&, const Value* args,
                     size_t count) -> Value {
          if (count < 2) {
            throw JSError(rt, "RustraJSI: onEvent requires (name, callback)");
          }
          std::string name = args[0].asString(rt).utf8(rt);
          if (!args[1].isObject() || !args[1].asObject(rt).isFunction(rt)) {
            throw JSError(rt, "RustraJSI: onEvent callback must be a function");
          }
          Function cb = args[1].asObject(rt).getFunction(rt);
          dispatcher->setListener(rt, name, std::move(cb));
          return Value::undefined();
        });
    cache_["onEvent"] = std::make_unique<CachedFunction>(
        CachedFunction{std::move(propNameId), std::move(hostFn)});
  }
  {
    auto dispatcher = getEventDispatcher();
    auto propNameId = PropNameID::forAscii(rt, "offEvent");
    auto hostFn = Function::createFromHostFunction(
        rt, propNameId, 1,
        [dispatcher](Runtime& rt, const Value&, const Value* args,
                     size_t count) -> Value {
          if (count < 1) {
            throw JSError(rt, "RustraJSI: offEvent requires (name)");
          }
          std::string name = args[0].asString(rt).utf8(rt);
          dispatcher->removeListener(name);
          return Value::undefined();
        });
    cache_["offEvent"] = std::make_unique<CachedFunction>(
        CachedFunction{std::move(propNameId), std::move(hostFn)});
  }
  // drainEvents(): CallInvoker 없는 호스트의 JS 폴링 drain. 반환값 = 처리된
  // 이벤트 수. CallInvoker 경로가 켜져 있으면 보통 비어 있다(자동 drain됨).
  {
    auto dispatcher = getEventDispatcher();
    auto propNameId = PropNameID::forAscii(rt, "drainEvents");
    auto hostFn = Function::createFromHostFunction(
        rt, propNameId, 0,
        [dispatcher](Runtime& rt, const Value&, const Value*,
                     size_t) -> Value {
          size_t before = dispatcher->pendingCount();
          dispatcher->drain(rt);
          return Value(static_cast<double>(before));
        });
    cache_["drainEvents"] = std::make_unique<CachedFunction>(
        CachedFunction{std::move(propNameId), std::move(hostFn)});
  }
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

void installRustraJSIWithInvoker(Runtime& rt,
                                  std::shared_ptr<void> typeErasedCallInvoker) {
  // Deterministic registration of the `glimpse.core` package with the rustra
  // FFI globals before the first invoke. Without this, Android (no loader-run
  // constructor) and stripped iOS debug builds would dispatch into an empty
  // registry.
  glimpse_ffi_init();
  // RN 리로드로 새 Runtime이 설치되는 시점 — dispatcher는 이전 Runtime 소유의
  // 리스너를 정리하고 큐를 폐기한다(setCallInvoker 참조).
  auto dispatcher = getEventDispatcher();
  dispatcher->setCallInvoker(std::move(typeErasedCallInvoker));

  auto hostObject = std::make_shared<RustraHostObject>(rt);
  auto obj = Object::createFromHostObject(rt, hostObject);
  rt.global().setProperty(rt, "__rustraNative", Value(rt, obj));
}

void installRustraJSI(Runtime& rt) {
  // CallInvoker 없는 설치(레거시 경로) — 이벤트 푸시는 JS가 drainEvents()로
  // 폴링해야 한다. 프로덕션 플랫폼 글루는 installRustraJSIWithInvoker 사용.
  installRustraJSIWithInvoker(rt, nullptr);
}

} // namespace rustra
