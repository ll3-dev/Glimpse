#include "HybridGlimpseCore.hpp"

namespace ll3::glimpse {

using ll3::glimpse::bridging::GlimpseCalculateNextReviewOutput;
using ll3::glimpse::bridging::GlimpseInitializeReviewScheduleOutput;
using ll3::glimpse::bridging::NullableNumber;
using ll3::glimpse::bridging::NullableStringArray;
using margelo::nitro::HybridObject;

HybridGlimpseCore::HybridGlimpseCore()
  : HybridObject(TAG),
    core_(ll3::glimpse::bridging::createGlimpseCore(
      nextInstanceId_.fetch_add(1),
      rust::Str(dataPath_.data(), dataPath_.size())
    )) {}

void HybridGlimpseCore::setDataPath(std::string dataPath) {
  dataPath_ = std::move(dataPath);
}

double HybridGlimpseCore::calculateTagOverlap(
  const std::optional<std::vector<std::string>>& leftTags,
  const std::optional<std::vector<std::string>>& rightTags
) {
  return ll3::glimpse::bridging::calculateTagOverlap(
    *core_,
    toNullableStringArray(leftTags),
    toNullableStringArray(rightTags)
  );
}

CalculateNextReviewResult HybridGlimpseCore::calculateNextReview(
  std::optional<double> lastReviewedAt,
  std::optional<double> nextReviewAt,
  const std::string& feedbackType,
  double now
) {
  GlimpseCalculateNextReviewOutput result =
    ll3::glimpse::bridging::calculateNextReview(
      *core_,
      toNullableNumber(lastReviewedAt),
      toNullableNumber(nextReviewAt),
      toRustStr(feedbackType),
      now
    );

  return CalculateNextReviewResult{
    .intervalMs = result.interval_ms,
    .nextReviewAt = result.next_review_at,
  };
}

InitializeReviewScheduleResult HybridGlimpseCore::initializeReviewSchedule(
  double createdAt,
  std::optional<double> intervalMs
) {
  GlimpseInitializeReviewScheduleOutput result =
    ll3::glimpse::bridging::initializeReviewSchedule(
      *core_,
      createdAt,
      toNullableNumber(intervalMs)
    );

  return InitializeReviewScheduleResult{
    .nextReviewAt = result.next_review_at,
    .stability = toOptionalNumber(result.stability),
    .difficulty = toOptionalNumber(result.difficulty),
    .lastReviewedAt = toOptionalNumber(result.last_reviewed_at),
  };
}

std::string HybridGlimpseCore::saveKnowledgeItemJson(const std::string& payloadJson) {
  return intoString(
    ll3::glimpse::bridging::saveKnowledgeItemJson(*core_, toRustStr(payloadJson))
  );
}

std::string HybridGlimpseCore::listKnowledgeItemsJson() {
  return intoString(ll3::glimpse::bridging::listKnowledgeItemsJson(*core_));
}

std::string HybridGlimpseCore::listKnowledgeItemsByIdsJson(const std::string& itemIdsJson) {
  return intoString(
    ll3::glimpse::bridging::listKnowledgeItemsByIdsJson(*core_, toRustStr(itemIdsJson))
  );
}

std::string HybridGlimpseCore::listWeeklyKnowledgeItemsJson(double since) {
  return intoString(ll3::glimpse::bridging::listWeeklyKnowledgeItemsJson(*core_, since));
}

std::string HybridGlimpseCore::listPendingKnowledgeItemsForLabelingJson(double limit) {
  return intoString(
    ll3::glimpse::bridging::listPendingKnowledgeItemsForLabelingJson(*core_, limit)
  );
}

std::string HybridGlimpseCore::getKnowledgeItemByIdJson(const std::string& itemId) {
  return intoString(
    ll3::glimpse::bridging::getKnowledgeItemByIdJson(*core_, toRustStr(itemId))
  );
}

std::string HybridGlimpseCore::getDueKnowledgeItemsJson(
  double now,
  std::optional<double> limit
) {
  return intoString(
    ll3::glimpse::bridging::getDueKnowledgeItemsJson(
      *core_,
      now,
      toNullableNumber(limit)
    )
  );
}

std::string HybridGlimpseCore::updateKnowledgeItemJson(
  const std::string& itemId,
  const std::string& patchJson
) {
  return intoString(
    ll3::glimpse::bridging::updateKnowledgeItemJson(
      *core_,
      toRustStr(itemId),
      toRustStr(patchJson)
    )
  );
}

std::string HybridGlimpseCore::createConversationJson(const std::string& payloadJson) {
  return intoString(
    ll3::glimpse::bridging::createConversationJson(*core_, toRustStr(payloadJson))
  );
}

std::string HybridGlimpseCore::listConversationsJson() {
  return intoString(ll3::glimpse::bridging::listConversationsJson(*core_));
}

std::string HybridGlimpseCore::updateConversationJson(
  const std::string& conversationId,
  const std::string& patchJson
) {
  return intoString(
    ll3::glimpse::bridging::updateConversationJson(
      *core_,
      toRustStr(conversationId),
      toRustStr(patchJson)
    )
  );
}

void HybridGlimpseCore::deleteConversation(
  const std::string& conversationId,
  double deletedAt
) {
  ll3::glimpse::bridging::deleteConversation(
    *core_,
    toRustStr(conversationId),
    deletedAt
  );
}

std::string HybridGlimpseCore::listConversationMessagesJson(
  const std::string& conversationId
) {
  return intoString(
    ll3::glimpse::bridging::listConversationMessagesJson(
      *core_,
      toRustStr(conversationId)
    )
  );
}

std::string HybridGlimpseCore::addMessageJson(const std::string& payloadJson) {
  return intoString(
    ll3::glimpse::bridging::addMessageJson(*core_, toRustStr(payloadJson))
  );
}

std::string HybridGlimpseCore::updateMessageJson(
  const std::string& messageId,
  const std::string& patchJson
) {
  return intoString(
    ll3::glimpse::bridging::updateMessageJson(
      *core_,
      toRustStr(messageId),
      toRustStr(patchJson)
    )
  );
}

void HybridGlimpseCore::deleteMessage(const std::string& messageId, double deletedAt) {
  ll3::glimpse::bridging::deleteMessage(*core_, toRustStr(messageId), deletedAt);
}

void HybridGlimpseCore::saveRecommendationsJson(const std::string& payloadJson) {
  ll3::glimpse::bridging::saveRecommendationsJson(*core_, toRustStr(payloadJson));
}

std::string HybridGlimpseCore::listRecommendationsJson() {
  return intoString(ll3::glimpse::bridging::listRecommendationsJson(*core_));
}

std::string HybridGlimpseCore::listPendingRecommendationsJson() {
  return intoString(
    ll3::glimpse::bridging::listPendingRecommendationsJson(*core_)
  );
}

std::string HybridGlimpseCore::listRecentFeedbackEventsJson(double limit) {
  return intoString(
    ll3::glimpse::bridging::listRecentFeedbackEventsJson(*core_, limit)
  );
}

std::string HybridGlimpseCore::logRecommendationFeedbackJson(const std::string& payloadJson) {
  return intoString(
    ll3::glimpse::bridging::logRecommendationFeedbackJson(*core_, toRustStr(payloadJson))
  );
}

void HybridGlimpseCore::respondToRecommendationJson(
  const std::string& recommendationId,
  const std::string& status,
  const std::string& eventJson
) {
  ll3::glimpse::bridging::respondToRecommendationJson(
    *core_,
    toRustStr(recommendationId),
    toRustStr(status),
    toRustStr(eventJson)
  );
}

void HybridGlimpseCore::loadHybridMethods() {
  HybridObject::loadHybridMethods();
  registerHybrids(this, [](margelo::nitro::Prototype& prototype) {
    prototype.registerHybridMethod("calculateTagOverlap", &HybridGlimpseCore::calculateTagOverlap);
    prototype.registerHybridMethod("calculateNextReview", &HybridGlimpseCore::calculateNextReview);
    prototype.registerHybridMethod("initializeReviewSchedule", &HybridGlimpseCore::initializeReviewSchedule);
    prototype.registerHybridMethod("saveKnowledgeItemJson", &HybridGlimpseCore::saveKnowledgeItemJson);
    prototype.registerHybridMethod("listKnowledgeItemsJson", &HybridGlimpseCore::listKnowledgeItemsJson);
    prototype.registerHybridMethod("listKnowledgeItemsByIdsJson", &HybridGlimpseCore::listKnowledgeItemsByIdsJson);
    prototype.registerHybridMethod("listWeeklyKnowledgeItemsJson", &HybridGlimpseCore::listWeeklyKnowledgeItemsJson);
    prototype.registerHybridMethod("listPendingKnowledgeItemsForLabelingJson", &HybridGlimpseCore::listPendingKnowledgeItemsForLabelingJson);
    prototype.registerHybridMethod("getKnowledgeItemByIdJson", &HybridGlimpseCore::getKnowledgeItemByIdJson);
    prototype.registerHybridMethod("getDueKnowledgeItemsJson", &HybridGlimpseCore::getDueKnowledgeItemsJson);
    prototype.registerHybridMethod("updateKnowledgeItemJson", &HybridGlimpseCore::updateKnowledgeItemJson);
    prototype.registerHybridMethod("createConversationJson", &HybridGlimpseCore::createConversationJson);
    prototype.registerHybridMethod("listConversationsJson", &HybridGlimpseCore::listConversationsJson);
    prototype.registerHybridMethod("updateConversationJson", &HybridGlimpseCore::updateConversationJson);
    prototype.registerHybridMethod("deleteConversation", &HybridGlimpseCore::deleteConversation);
    prototype.registerHybridMethod("listConversationMessagesJson", &HybridGlimpseCore::listConversationMessagesJson);
    prototype.registerHybridMethod("addMessageJson", &HybridGlimpseCore::addMessageJson);
    prototype.registerHybridMethod("updateMessageJson", &HybridGlimpseCore::updateMessageJson);
    prototype.registerHybridMethod("deleteMessage", &HybridGlimpseCore::deleteMessage);
    prototype.registerHybridMethod("saveRecommendationsJson", &HybridGlimpseCore::saveRecommendationsJson);
    prototype.registerHybridMethod("listRecommendationsJson", &HybridGlimpseCore::listRecommendationsJson);
    prototype.registerHybridMethod("listPendingRecommendationsJson", &HybridGlimpseCore::listPendingRecommendationsJson);
    prototype.registerHybridMethod("listRecentFeedbackEventsJson", &HybridGlimpseCore::listRecentFeedbackEventsJson);
    prototype.registerHybridMethod("logRecommendationFeedbackJson", &HybridGlimpseCore::logRecommendationFeedbackJson);
    prototype.registerHybridMethod("respondToRecommendationJson", &HybridGlimpseCore::respondToRecommendationJson);
  });
}

rust::Str HybridGlimpseCore::toRustStr(const std::string& value) {
  return rust::Str(value.data(), value.size());
}

NullableNumber HybridGlimpseCore::toNullableNumber(std::optional<double> value) {
  return NullableNumber{
    .null = !value.has_value(),
    .val = value.value_or(0),
  };
}

NullableStringArray HybridGlimpseCore::toNullableStringArray(
  const std::optional<std::vector<std::string>>& value
) {
  rust::Vec<rust::String> strings;
  if (value.has_value()) {
    strings.reserve(value->size());
    for (const auto& entry : *value) {
      strings.push_back(rust::String(entry));
    }
  }

  return NullableStringArray{
    .null = !value.has_value(),
    .val = std::move(strings),
  };
}

std::optional<double> HybridGlimpseCore::toOptionalNumber(const NullableNumber& value) {
  if (value.null) {
    return std::nullopt;
  }

  return value.val;
}

std::string HybridGlimpseCore::intoString(rust::String value) {
  return static_cast<std::string>(value);
}

} // namespace ll3::glimpse
