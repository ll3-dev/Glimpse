#pragma once

#include "GlimpseCoreJSIConverters.hpp"
#include "ffi.rs.h"
#include <NitroModules/HybridObject.hpp>
#include <atomic>
#include <optional>
#include <string>
#include <vector>

namespace ll3::glimpse {

class HybridGlimpseCore final : public margelo::nitro::HybridObject {
public:
  explicit HybridGlimpseCore();

  static void setDataPath(std::string dataPath);

  double calculateTagOverlap(
    const std::optional<std::vector<std::string>>& leftTags,
    const std::optional<std::vector<std::string>>& rightTags
  );
  CalculateNextReviewResult calculateNextReview(
    std::optional<double> lastReviewedAt,
    std::optional<double> nextReviewAt,
    const std::string& feedbackType,
    double now
  );
  InitializeReviewScheduleResult initializeReviewSchedule(
    double createdAt,
    std::optional<double> intervalMs
  );
  std::string saveKnowledgeItemJson(const std::string& payloadJson);
  std::string listKnowledgeItemsJson();
  std::string listKnowledgeItemsByIdsJson(const std::string& itemIdsJson);
  std::string listWeeklyKnowledgeItemsJson(double since);
  std::string listPendingKnowledgeItemsForLabelingJson(double limit);
  std::string getKnowledgeItemByIdJson(const std::string& itemId);
  std::string getDueKnowledgeItemsJson(double now, std::optional<double> limit);
  std::string updateKnowledgeItemJson(
    const std::string& itemId,
    const std::string& patchJson
  );
  std::string createConversationJson(const std::string& payloadJson);
  std::string listConversationsJson();
  std::string updateConversationJson(
    const std::string& conversationId,
    const std::string& patchJson
  );
  void deleteConversation(const std::string& conversationId, double deletedAt);
  std::string listConversationMessagesJson(const std::string& conversationId);
  std::string addMessageJson(const std::string& payloadJson);
  std::string updateMessageJson(
    const std::string& messageId,
    const std::string& patchJson
  );
  void deleteMessage(const std::string& messageId, double deletedAt);
  void saveRecommendationsJson(const std::string& payloadJson);
  std::string listRecommendationsJson();
  std::string listPendingRecommendationsJson();
  std::string listRecentFeedbackEventsJson(double limit);
  std::string logRecommendationFeedbackJson(const std::string& payloadJson);
  void respondToRecommendationJson(
    const std::string& recommendationId,
    const std::string& status,
    const std::string& eventJson
  );

  void loadHybridMethods() override;

private:
  static rust::Str toRustStr(const std::string& value);
  static craby::glimpsecore::bridging::NullableNumber
  toNullableNumber(std::optional<double> value);
  static craby::glimpsecore::bridging::NullableStringArray
  toNullableStringArray(const std::optional<std::vector<std::string>>& value);
  static std::optional<double> toOptionalNumber(
    const craby::glimpsecore::bridging::NullableNumber& value
  );
  static std::string intoString(rust::String value);

private:
  static inline std::atomic_size_t nextInstanceId_{1};
  static inline std::string dataPath_;

  rust::Box<craby::glimpsecore::bridging::GlimpseCore> core_;

  static constexpr auto TAG = "GlimpseCore";
};

} // namespace ll3::glimpse
