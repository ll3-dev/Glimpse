#pragma once

#include <NitroModules/JSIConverter.hpp>
#include <NitroModules/JSIHelpers.hpp>
#include <NitroModules/PropNameIDCache.hpp>
#include <optional>

namespace ll3::glimpse {

struct CalculateNextReviewResult final {
  double intervalMs;
  double nextReviewAt;
};

struct InitializeReviewScheduleResult final {
  double nextReviewAt;
  std::optional<double> stability;
  std::optional<double> difficulty;
  std::optional<double> lastReviewedAt;
};

} // namespace ll3::glimpse

namespace margelo::nitro {

template <>
struct JSIConverter<ll3::glimpse::CalculateNextReviewResult> final {
  static inline ll3::glimpse::CalculateNextReviewResult
  fromJSI(jsi::Runtime& runtime, const jsi::Value& value) {
    jsi::Object object = value.asObject(runtime);
    return ll3::glimpse::CalculateNextReviewResult{
      .intervalMs = JSIConverter<double>::fromJSI(
        runtime,
        object.getProperty(runtime, PropNameIDCache::get(runtime, "intervalMs"))
      ),
      .nextReviewAt = JSIConverter<double>::fromJSI(
        runtime,
        object.getProperty(runtime, PropNameIDCache::get(runtime, "nextReviewAt"))
      ),
    };
  }

  static inline jsi::Value
  toJSI(jsi::Runtime& runtime, const ll3::glimpse::CalculateNextReviewResult& value) {
    jsi::Object object(runtime);
    object.setProperty(
      runtime,
      PropNameIDCache::get(runtime, "intervalMs"),
      JSIConverter<double>::toJSI(runtime, value.intervalMs)
    );
    object.setProperty(
      runtime,
      PropNameIDCache::get(runtime, "nextReviewAt"),
      JSIConverter<double>::toJSI(runtime, value.nextReviewAt)
    );
    return object;
  }

  static inline bool canConvert(jsi::Runtime& runtime, const jsi::Value& value) {
    if (!value.isObject()) {
      return false;
    }

    jsi::Object object = value.asObject(runtime);
    if (!nitro::isPlainObject(runtime, object)) {
      return false;
    }

    return JSIConverter<double>::canConvert(
             runtime,
             object.getProperty(runtime, PropNameIDCache::get(runtime, "intervalMs"))
           ) &&
           JSIConverter<double>::canConvert(
             runtime,
             object.getProperty(runtime, PropNameIDCache::get(runtime, "nextReviewAt"))
           );
  }
};

template <>
struct JSIConverter<ll3::glimpse::InitializeReviewScheduleResult> final {
  static inline ll3::glimpse::InitializeReviewScheduleResult
  fromJSI(jsi::Runtime& runtime, const jsi::Value& value) {
    jsi::Object object = value.asObject(runtime);
    return ll3::glimpse::InitializeReviewScheduleResult{
      .nextReviewAt = JSIConverter<double>::fromJSI(
        runtime,
        object.getProperty(runtime, PropNameIDCache::get(runtime, "nextReviewAt"))
      ),
      .stability = JSIConverter<std::optional<double>>::fromJSI(
        runtime,
        object.getProperty(runtime, PropNameIDCache::get(runtime, "stability"))
      ),
      .difficulty = JSIConverter<std::optional<double>>::fromJSI(
        runtime,
        object.getProperty(runtime, PropNameIDCache::get(runtime, "difficulty"))
      ),
      .lastReviewedAt = JSIConverter<std::optional<double>>::fromJSI(
        runtime,
        object.getProperty(runtime, PropNameIDCache::get(runtime, "lastReviewedAt"))
      ),
    };
  }

  static inline jsi::Value
  toJSI(jsi::Runtime& runtime, const ll3::glimpse::InitializeReviewScheduleResult& value) {
    jsi::Object object(runtime);
    object.setProperty(
      runtime,
      PropNameIDCache::get(runtime, "nextReviewAt"),
      JSIConverter<double>::toJSI(runtime, value.nextReviewAt)
    );
    object.setProperty(
      runtime,
      PropNameIDCache::get(runtime, "stability"),
      JSIConverter<std::optional<double>>::toJSI(runtime, value.stability)
    );
    object.setProperty(
      runtime,
      PropNameIDCache::get(runtime, "difficulty"),
      JSIConverter<std::optional<double>>::toJSI(runtime, value.difficulty)
    );
    object.setProperty(
      runtime,
      PropNameIDCache::get(runtime, "lastReviewedAt"),
      JSIConverter<std::optional<double>>::toJSI(runtime, value.lastReviewedAt)
    );
    return object;
  }

  static inline bool canConvert(jsi::Runtime& runtime, const jsi::Value& value) {
    if (!value.isObject()) {
      return false;
    }

    jsi::Object object = value.asObject(runtime);
    if (!nitro::isPlainObject(runtime, object)) {
      return false;
    }

    return JSIConverter<double>::canConvert(
             runtime,
             object.getProperty(runtime, PropNameIDCache::get(runtime, "nextReviewAt"))
           ) &&
           JSIConverter<std::optional<double>>::canConvert(
             runtime,
             object.getProperty(runtime, PropNameIDCache::get(runtime, "stability"))
           ) &&
           JSIConverter<std::optional<double>>::canConvert(
             runtime,
             object.getProperty(runtime, PropNameIDCache::get(runtime, "difficulty"))
           ) &&
           JSIConverter<std::optional<double>>::canConvert(
             runtime,
             object.getProperty(runtime, PropNameIDCache::get(runtime, "lastReviewedAt"))
           );
  }
};

} // namespace margelo::nitro
