#pragma once

#include "GlimpseCoreFfi.hpp"

#include <vector>

namespace margelo::nitro::glimpse::ffi_utils {

inline std::vector<const char*> toConstCharVector(const std::vector<std::string>& values) {
  std::vector<const char*> items;
  items.reserve(values.size());
  for (const auto& value : values) {
    items.push_back(value.c_str());
  }
  return items;
}

template <typename TOutput, typename TFfiArray, typename TFromFfi>
inline std::vector<TOutput> convertFfiArray(
    const TFfiArray& array,
    TFromFfi&& fromFfi
) {
  std::vector<TOutput> items;
  items.reserve(static_cast<size_t>(array.len));
  for (int index = 0; index < array.len; index += 1) {
    items.push_back(fromFfi(array.data[index]));
  }
  return items;
}

inline std::vector<FfiRecommendation> toFfiRecommendations(
    const std::vector<Recommendation>& recommendations
) {
  std::vector<FfiRecommendation> items;
  items.reserve(recommendations.size());
  for (const auto& recommendation : recommendations) {
    items.push_back(FfiRecommendation{
        const_cast<char*>(recommendation.id.c_str()),
        const_cast<char*>(recommendation.itemAId.c_str()),
        const_cast<char*>(recommendation.itemBId.c_str()),
        ffi_bridge::toFfiNullableString(recommendation.reason),
        const_cast<char*>(recommendation.status.c_str()),
        static_cast<int64_t>(recommendation.createdAt),
        ffi_bridge::toFfiOptionalI64(recommendation.respondedAt),
    });
  }
  return items;
}

inline FfiFeedbackEvent toFfiFeedbackEvent(const FeedbackEvent& event) {
  return FfiFeedbackEvent{
      const_cast<char*>(event.id.c_str()),
      const_cast<char*>(event.recommendationId.c_str()),
      const_cast<char*>(event.action.c_str()),
      static_cast<int64_t>(event.createdAt),
  };
}

}  // namespace margelo::nitro::glimpse::ffi_utils
