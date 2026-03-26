#pragma once

#include "GlimpseCoreFfi.hpp"
#include "../nitrogen/generated/shared/c++/HybridCoreClientSpec.hpp"

#include <memory>
#include <mutex>
#include <string>
#include <vector>

namespace margelo::nitro::glimpse {

class HybridCoreClient final : public HybridCoreClientSpec {
 public:
  HybridCoreClient() : HybridObject(TAG) {}

  ~HybridCoreClient() override {
    std::lock_guard<std::mutex> lock(mutex_);
    if (handle_ != nullptr) {
      core_client_destroy(handle_);
      handle_ = nullptr;
    }
  }

  std::shared_ptr<Promise<void>> initialize(const std::string& dbPath) override {
    return Promise<void>::async([this, dbPath]() {
      std::lock_guard<std::mutex> lock(mutex_);
      if (handle_ != nullptr) {
        core_client_destroy(handle_);
        handle_ = nullptr;
      }

      handle_ = core_client_create(dbPath.c_str());
      if (handle_ == nullptr) {
        throw std::runtime_error("initialize: failed to create core client");
      }
    });
  }

  double calculateTagOverlap(
      const std::vector<std::string>& leftTags,
      const std::vector<std::string>& rightTags
  ) override {
    std::lock_guard<std::mutex> lock(mutex_);
    const auto handle = requireHandleLocked();

    std::vector<const char*> left;
    left.reserve(leftTags.size());
    for (const auto& tag : leftTags) {
      left.push_back(tag.c_str());
    }

    std::vector<const char*> right;
    right.reserve(rightTags.size());
    for (const auto& tag : rightTags) {
      right.push_back(tag.c_str());
    }

    return static_cast<double>(core_client_calculate_tag_overlap(
        handle,
        left.empty() ? nullptr : left.data(),
        static_cast<int>(left.size()),
        right.empty() ? nullptr : right.data(),
        static_cast<int>(right.size())
    ));
  }

  CalculateNextReviewOutput calculateNextReview(
      const std::optional<std::variant<nitro::NullType, double>>& lastReviewedAt,
      const std::optional<std::variant<nitro::NullType, double>>& nextReviewAt,
      double feedbackType,
      double now
  ) override {
    std::lock_guard<std::mutex> lock(mutex_);
    const auto handle = requireHandleLocked();

    FfiCalculateNextReviewOutput output{};
    ffi_bridge::throwIfError(
        core_client_calculate_next_review_typed(
            handle,
            ffi_bridge::toFfiOptionalI64(lastReviewedAt),
            ffi_bridge::toFfiOptionalI64(nextReviewAt),
            static_cast<int8_t>(feedbackType),
            static_cast<int64_t>(now),
            &output),
        "calculateNextReview");
    return ffi_bridge::fromFfiCalculateNextReviewOutput(output);
  }

  InitializeReviewScheduleOutput initializeReviewSchedule(
      double createdAt,
      const std::optional<std::variant<nitro::NullType, double>>& intervalMs
  ) override {
    std::lock_guard<std::mutex> lock(mutex_);
    const auto handle = requireHandleLocked();

    FfiInitializeReviewScheduleOutput output{};
    ffi_bridge::throwIfError(
        core_client_initialize_review_schedule_typed(
            handle,
            static_cast<int64_t>(createdAt),
            ffi_bridge::toFfiOptionalI64(intervalMs),
            &output),
        "initializeReviewSchedule");
    return ffi_bridge::fromFfiInitializeReviewScheduleOutput(output);
  }

  std::shared_ptr<Promise<KnowledgeItem>> saveKnowledgeItem(const KnowledgeItem& item) override {
    return Promise<KnowledgeItem>::async([this, item]() -> KnowledgeItem {
      std::lock_guard<std::mutex> lock(mutex_);
      const auto handle = requireHandleLocked();
      ffi_bridge::KnowledgeItemInput input(item);
      ffi_bridge::OwnedValue<FfiKnowledgeItem, ffi_knowledge_item_free> output;
      ffi_bridge::throwIfError(
          core_client_save_knowledge_item_typed(handle, &input.ffi, &output.value),
          "saveKnowledgeItem");
      return ffi_bridge::fromFfiKnowledgeItem(output.value);
    });
  }

  std::shared_ptr<Promise<std::vector<KnowledgeItem>>> listKnowledgeItems() override {
    return Promise<std::vector<KnowledgeItem>>::async([this]() -> std::vector<KnowledgeItem> {
      std::lock_guard<std::mutex> lock(mutex_);
      const auto handle = requireHandleLocked();
      ffi_bridge::OwnedArray<FfiKnowledgeItemArray, FfiKnowledgeItem, ffi_knowledge_item_array_free> output;
      ffi_bridge::throwIfError(core_client_list_knowledge_items_typed(handle, &output.value), "listKnowledgeItems");

      std::vector<KnowledgeItem> items;
      items.reserve(static_cast<size_t>(output.value.len));
      for (int index = 0; index < output.value.len; index += 1) {
        items.push_back(ffi_bridge::fromFfiKnowledgeItem(output.value.data[index]));
      }
      return items;
    });
  }

  std::shared_ptr<Promise<std::variant<nitro::NullType, KnowledgeItem>>> getKnowledgeItemById(
      const std::string& itemId
  ) override {
    return Promise<std::variant<nitro::NullType, KnowledgeItem>>::async(
        [this, itemId]() -> std::variant<nitro::NullType, KnowledgeItem> {
          std::lock_guard<std::mutex> lock(mutex_);
          const auto handle = requireHandleLocked();
          ffi_bridge::OwnedValue<FfiKnowledgeItem, ffi_knowledge_item_free> output;
          bool found = false;
          ffi_bridge::throwIfError(
              core_client_get_knowledge_item_by_id_typed(handle, itemId.c_str(), &output.value, &found),
              "getKnowledgeItemById");
          return found ? std::variant<nitro::NullType, KnowledgeItem>(ffi_bridge::fromFfiKnowledgeItem(output.value))
                       : std::variant<nitro::NullType, KnowledgeItem>(nitro::NullType());
        });
  }

  std::shared_ptr<Promise<KnowledgeItem>> updateKnowledgeItem(
      const std::string& itemId,
      const KnowledgeItemPatch& patch
  ) override {
    return Promise<KnowledgeItem>::async([this, itemId, patch]() -> KnowledgeItem {
      std::lock_guard<std::mutex> lock(mutex_);
      const auto handle = requireHandleLocked();
      ffi_bridge::KnowledgeItemPatchInput input(patch);
      ffi_bridge::OwnedValue<FfiKnowledgeItem, ffi_knowledge_item_free> output;
      ffi_bridge::throwIfError(
          core_client_update_knowledge_item_typed(handle, itemId.c_str(), &input.ffi, &output.value),
          "updateKnowledgeItem");
      return ffi_bridge::fromFfiKnowledgeItem(output.value);
    });
  }

  std::shared_ptr<Promise<Conversation>> createConversation(const Conversation& conversation) override {
    return Promise<Conversation>::async([this, conversation]() -> Conversation {
      std::lock_guard<std::mutex> lock(mutex_);
      const auto handle = requireHandleLocked();
      ffi_bridge::ConversationInput input(conversation);
      ffi_bridge::OwnedValue<FfiConversation, ffi_conversation_free> output;
      ffi_bridge::throwIfError(
          core_client_create_conversation_typed(handle, &input.ffi, &output.value),
          "createConversation");
      return ffi_bridge::fromFfiConversation(output.value);
    });
  }

  std::shared_ptr<Promise<std::vector<Conversation>>> listConversations() override {
    return Promise<std::vector<Conversation>>::async([this]() -> std::vector<Conversation> {
      std::lock_guard<std::mutex> lock(mutex_);
      const auto handle = requireHandleLocked();
      ffi_bridge::OwnedArray<FfiConversationArray, FfiConversation, ffi_conversation_array_free> output;
      ffi_bridge::throwIfError(core_client_list_conversations_typed(handle, &output.value), "listConversations");

      std::vector<Conversation> items;
      items.reserve(static_cast<size_t>(output.value.len));
      for (int index = 0; index < output.value.len; index += 1) {
        items.push_back(ffi_bridge::fromFfiConversation(output.value.data[index]));
      }
      return items;
    });
  }

  std::shared_ptr<Promise<Conversation>> updateConversation(
      const std::string& conversationId,
      const ConversationPatch& patch
  ) override {
    return Promise<Conversation>::async([this, conversationId, patch]() -> Conversation {
      std::lock_guard<std::mutex> lock(mutex_);
      const auto handle = requireHandleLocked();
      ffi_bridge::ConversationPatchInput input(patch);
      ffi_bridge::OwnedValue<FfiConversation, ffi_conversation_free> output;
      ffi_bridge::throwIfError(
          core_client_update_conversation_typed(handle, conversationId.c_str(), &input.ffi, &output.value),
          "updateConversation");
      return ffi_bridge::fromFfiConversation(output.value);
    });
  }

  std::shared_ptr<Promise<void>> deleteConversation(const std::string& conversationId, double deletedAt) override {
    return Promise<void>::async([this, conversationId, deletedAt]() {
      std::lock_guard<std::mutex> lock(mutex_);
      ffi_bridge::throwIfError(
          core_client_delete_conversation(requireHandleLocked(), conversationId.c_str(), static_cast<int64_t>(deletedAt)),
          "deleteConversation");
    });
  }

  std::shared_ptr<Promise<std::vector<Message>>> listConversationMessages(
      const std::string& conversationId
  ) override {
    return Promise<std::vector<Message>>::async([this, conversationId]() -> std::vector<Message> {
      std::lock_guard<std::mutex> lock(mutex_);
      const auto handle = requireHandleLocked();
      ffi_bridge::OwnedArray<FfiMessageArray, FfiMessage, ffi_message_array_free> output;
      ffi_bridge::throwIfError(
          core_client_list_conversation_messages_typed(handle, conversationId.c_str(), &output.value),
          "listConversationMessages");

      std::vector<Message> items;
      items.reserve(static_cast<size_t>(output.value.len));
      for (int index = 0; index < output.value.len; index += 1) {
        items.push_back(ffi_bridge::fromFfiMessage(output.value.data[index]));
      }
      return items;
    });
  }

  std::shared_ptr<Promise<Message>> addMessage(const Message& message) override {
    return Promise<Message>::async([this, message]() -> Message {
      std::lock_guard<std::mutex> lock(mutex_);
      const auto handle = requireHandleLocked();
      ffi_bridge::MessageInput input(message);
      ffi_bridge::OwnedValue<FfiMessage, ffi_message_free> output;
      ffi_bridge::throwIfError(core_client_add_message_typed(handle, &input.ffi, &output.value), "addMessage");
      return ffi_bridge::fromFfiMessage(output.value);
    });
  }

  std::shared_ptr<Promise<Message>> updateMessage(
      const std::string& messageId,
      const MessagePatch& patch
  ) override {
    return Promise<Message>::async([this, messageId, patch]() -> Message {
      std::lock_guard<std::mutex> lock(mutex_);
      const auto handle = requireHandleLocked();
      ffi_bridge::MessagePatchInput input(patch);
      ffi_bridge::OwnedValue<FfiMessage, ffi_message_free> output;
      ffi_bridge::throwIfError(
          core_client_update_message_typed(handle, messageId.c_str(), &input.ffi, &output.value),
          "updateMessage");
      return ffi_bridge::fromFfiMessage(output.value);
    });
  }

  std::shared_ptr<Promise<void>> deleteMessage(const std::string& messageId, double deletedAt) override {
    return Promise<void>::async([this, messageId, deletedAt]() {
      std::lock_guard<std::mutex> lock(mutex_);
      ffi_bridge::throwIfError(
          core_client_delete_message(requireHandleLocked(), messageId.c_str(), static_cast<int64_t>(deletedAt)),
          "deleteMessage");
    });
  }

  std::shared_ptr<Promise<void>> saveRecommendations(
      const std::vector<Recommendation>& recommendations
  ) override {
    return Promise<void>::async([this, recommendations]() {
      std::lock_guard<std::mutex> lock(mutex_);
      const auto handle = requireHandleLocked();

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

      ffi_bridge::throwIfError(
          core_client_save_recommendations_typed(
              handle,
              items.empty() ? nullptr : items.data(),
              static_cast<int>(items.size())),
          "saveRecommendations");
    });
  }

  std::shared_ptr<Promise<std::vector<Recommendation>>> listRecommendations() override {
    return Promise<std::vector<Recommendation>>::async([this]() -> std::vector<Recommendation> {
      std::lock_guard<std::mutex> lock(mutex_);
      const auto handle = requireHandleLocked();
      ffi_bridge::OwnedArray<FfiRecommendationArray, FfiRecommendation, ffi_recommendation_array_free> output;
      ffi_bridge::throwIfError(core_client_list_recommendations_typed(handle, &output.value), "listRecommendations");

      std::vector<Recommendation> items;
      items.reserve(static_cast<size_t>(output.value.len));
      for (int index = 0; index < output.value.len; index += 1) {
        items.push_back(ffi_bridge::fromFfiRecommendation(output.value.data[index]));
      }
      return items;
    });
  }

  std::shared_ptr<Promise<std::vector<Recommendation>>> listPendingRecommendations() override {
    return Promise<std::vector<Recommendation>>::async([this]() -> std::vector<Recommendation> {
      std::lock_guard<std::mutex> lock(mutex_);
      const auto handle = requireHandleLocked();
      ffi_bridge::OwnedArray<FfiRecommendationArray, FfiRecommendation, ffi_recommendation_array_free> output;
      ffi_bridge::throwIfError(
          core_client_list_pending_recommendations_typed(handle, &output.value),
          "listPendingRecommendations");

      std::vector<Recommendation> items;
      items.reserve(static_cast<size_t>(output.value.len));
      for (int index = 0; index < output.value.len; index += 1) {
        items.push_back(ffi_bridge::fromFfiRecommendation(output.value.data[index]));
      }
      return items;
    });
  }

  std::shared_ptr<Promise<void>> respondToRecommendation(
      const std::string& recommendationId,
      const std::string& status,
      const FeedbackEvent& feedbackEvent
  ) override {
    return Promise<void>::async([this, recommendationId, status, feedbackEvent]() {
      std::lock_guard<std::mutex> lock(mutex_);
      const auto handle = requireHandleLocked();
      const FfiFeedbackEvent event{
          const_cast<char*>(feedbackEvent.id.c_str()),
          const_cast<char*>(feedbackEvent.recommendationId.c_str()),
          const_cast<char*>(feedbackEvent.action.c_str()),
          static_cast<int64_t>(feedbackEvent.createdAt),
      };
      ffi_bridge::throwIfError(
          core_client_respond_to_recommendation_typed(handle, recommendationId.c_str(), status.c_str(), &event),
          "respondToRecommendation");
    });
  }

  std::shared_ptr<Promise<std::vector<FeedbackEvent>>> listRecentFeedbackEvents(double limit) override {
    return Promise<std::vector<FeedbackEvent>>::async([this, limit]() -> std::vector<FeedbackEvent> {
      std::lock_guard<std::mutex> lock(mutex_);
      const auto handle = requireHandleLocked();
      ffi_bridge::OwnedArray<FfiFeedbackEventArray, FfiFeedbackEvent, ffi_feedback_event_array_free> output;
      ffi_bridge::throwIfError(
          core_client_list_recent_feedback_events_typed(handle, static_cast<int>(limit), &output.value),
          "listRecentFeedbackEvents");

      std::vector<FeedbackEvent> items;
      items.reserve(static_cast<size_t>(output.value.len));
      for (int index = 0; index < output.value.len; index += 1) {
        items.push_back(ffi_bridge::fromFfiFeedbackEvent(output.value.data[index]));
      }
      return items;
    });
  }

  std::shared_ptr<Promise<FeedbackEvent>> logRecommendationFeedback(const FeedbackEvent& event) override {
    return Promise<FeedbackEvent>::async([this, event]() -> FeedbackEvent {
      std::lock_guard<std::mutex> lock(mutex_);
      const auto handle = requireHandleLocked();
      const FfiFeedbackEvent input{
          const_cast<char*>(event.id.c_str()),
          const_cast<char*>(event.recommendationId.c_str()),
          const_cast<char*>(event.action.c_str()),
          static_cast<int64_t>(event.createdAt),
      };
      ffi_bridge::OwnedValue<FfiFeedbackEvent, ffi_feedback_event_free> output;
      ffi_bridge::throwIfError(
          core_client_log_recommendation_feedback_typed(handle, &input, &output.value),
          "logRecommendationFeedback");
      return ffi_bridge::fromFfiFeedbackEvent(output.value);
    });
  }

 private:
  CoreClientHandle requireHandleLocked() const {
    if (handle_ == nullptr) {
      throw std::runtime_error("CoreClient is not initialized");
    }
    return handle_;
  }

  mutable std::mutex mutex_;
  CoreClientHandle handle_ = nullptr;
};

}  // namespace margelo::nitro::glimpse
