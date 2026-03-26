///
/// HybridCoreClient.hpp
/// C++ implementation of CoreClient that bridges Nitro to Rust FFI.
///

#pragma once

#include "HybridCoreClientSpec.hpp"
#include <memory>
#include <string>
#include <sstream>
#include <mutex>

// Forward declarations for Rust FFI functions
extern "C" {
    // Handle type
    using CoreClientHandle = void*;

    // FFI types
    struct FfiOptionalI64 {
        bool has_value;
        int64_t value;
    };

    struct FfiOptionalF64 {
        bool has_value;
        double value;
    };

    struct FfiNextReviewOutput {
        int64_t interval_ms;
        int64_t next_review_at;
    };

    struct FfiInitReviewOutput {
        int64_t next_review_at;
        FfiOptionalF64 stability;
        FfiOptionalF64 difficulty;
        FfiOptionalI64 last_reviewed_at;
    };

    // Error codes
    enum class FfiErrorCode : int32_t {
        Ok = 0,
        InvalidInput = 1,
        NotFound = 2,
        Conflict = 3,
        Database = 4,
        Timeout = 5,
        Cancelled = 6,
        Internal = 7,
    };

    // Lifecycle
    CoreClientHandle core_client_create(const char* db_path);
    void core_client_destroy(CoreClientHandle handle);

    // Sync calculations
    int32_t core_client_calculate_tag_overlap(
        CoreClientHandle handle,
        const char* const* left_tags,
        int left_tags_len,
        const char* const* right_tags,
        int right_tags_len
    );

    FfiErrorCode core_client_calculate_next_review(
        CoreClientHandle handle,
        FfiOptionalI64 last_reviewed_at,
        FfiOptionalI64 next_review_at,
        int8_t feedback_type,
        int64_t now,
        FfiNextReviewOutput* out
    );

    FfiErrorCode core_client_initialize_review_schedule(
        CoreClientHandle handle,
        int64_t created_at,
        FfiOptionalI64 interval_ms,
        FfiInitReviewOutput* out
    );

    // Knowledge Items
    FfiErrorCode core_client_save_knowledge_item(
        CoreClientHandle handle,
        const char* item_json,
        char** out_json
    );

    FfiErrorCode core_client_list_knowledge_items(
        CoreClientHandle handle,
        char** out_json
    );

    FfiErrorCode core_client_get_knowledge_item_by_id(
        CoreClientHandle handle,
        const char* item_id,
        char** out_json,
        bool* out_found
    );

    FfiErrorCode core_client_update_knowledge_item(
        CoreClientHandle handle,
        const char* item_id,
        const char* patch_json,
        char** out_json
    );

    // Conversations
    FfiErrorCode core_client_create_conversation(
        CoreClientHandle handle,
        const char* conversation_json,
        char** out_json
    );

    FfiErrorCode core_client_list_conversations(
        CoreClientHandle handle,
        char** out_json
    );

    FfiErrorCode core_client_update_conversation(
        CoreClientHandle handle,
        const char* conversation_id,
        const char* patch_json,
        char** out_json
    );

    FfiErrorCode core_client_delete_conversation(
        CoreClientHandle handle,
        const char* conversation_id,
        int64_t deleted_at
    );

    // Messages
    FfiErrorCode core_client_list_conversation_messages(
        CoreClientHandle handle,
        const char* conversation_id,
        char** out_json
    );

    FfiErrorCode core_client_add_message(
        CoreClientHandle handle,
        const char* message_json,
        char** out_json
    );

    FfiErrorCode core_client_update_message(
        CoreClientHandle handle,
        const char* message_id,
        const char* patch_json,
        char** out_json
    );

    FfiErrorCode core_client_delete_message(
        CoreClientHandle handle,
        const char* message_id,
        int64_t deleted_at
    );

    // Recommendations
    FfiErrorCode core_client_save_recommendations(
        CoreClientHandle handle,
        const char* recommendations_json
    );

    FfiErrorCode core_client_list_recommendations(
        CoreClientHandle handle,
        char** out_json
    );

    FfiErrorCode core_client_list_pending_recommendations(
        CoreClientHandle handle,
        char** out_json
    );

    FfiErrorCode core_client_respond_to_recommendation(
        CoreClientHandle handle,
        const char* recommendation_id,
        const char* status,
        const char* feedback_event_json
    );

    // Feedback Events
    FfiErrorCode core_client_list_recent_feedback_events(
        CoreClientHandle handle,
        int32_t limit,
        char** out_json
    );

    FfiErrorCode core_client_log_recommendation_feedback(
        CoreClientHandle handle,
        const char* event_json,
        char** out_json
    );

    // Memory management
    void ffi_string_free(char* s);
}

namespace margelo::nitro::glimpse {

/**
 * HybridCoreClient implementation that bridges Nitro to Rust FFI.
 */
class HybridCoreClient: public HybridCoreClientSpec {
public:
    HybridCoreClient(): HybridObject(TAG), _handle(nullptr), _initialized(false) {}

    ~HybridCoreClient() {
        if (_handle != nullptr) {
            core_client_destroy(_handle);
            _handle = nullptr;
        }
    }

    // Lifecycle
    std::shared_ptr<Promise<void>> initialize(const std::string& dbPath) override {
        return Promise<void>::async([this, dbPath]() {
            std::lock_guard<std::mutex> lock(_mutex);

            if (_handle != nullptr) {
                core_client_destroy(_handle);
            }

            _handle = core_client_create(dbPath.c_str());
            if (_handle == nullptr) {
                throw std::runtime_error("Failed to create CoreClient with path: " + dbPath);
            }
            _initialized = true;
        });
    }

    // Sync calculations
    double calculateTagOverlap(const std::string& leftTags, const std::string& rightTags) override {
        if (!_initialized || _handle == nullptr) {
            return 0.0;
        }

        // Parse pipe-delimited tags into array
        std::vector<std::string> leftVec = splitTags(leftTags);
        std::vector<std::string> rightVec = splitTags(rightTags);

        std::vector<const char*> leftPtrs;
        for (const auto& tag : leftVec) {
            leftPtrs.push_back(tag.c_str());
        }

        std::vector<const char*> rightPtrs;
        for (const auto& tag : rightVec) {
            rightPtrs.push_back(tag.c_str());
        }

        std::lock_guard<std::mutex> lock(_mutex);
        int32_t overlap = core_client_calculate_tag_overlap(
            _handle,
            leftPtrs.data(),
            static_cast<int>(leftPtrs.size()),
            rightPtrs.data(),
            static_cast<int>(rightPtrs.size())
        );

        // Calculate Jaccard similarity
        size_t leftSize = leftVec.size();
        size_t rightSize = rightVec.size();
        if (leftSize == 0 && rightSize == 0) {
            return 0.0;
        }
        size_t unionSize = leftSize + rightSize - overlap;
        return unionSize > 0 ? static_cast<double>(overlap) / static_cast<double>(unionSize) : 0.0;
    }

    std::string calculateNextReview(
        const std::optional<std::variant<nitro::NullType, double>>& lastReviewedAt,
        const std::optional<std::variant<nitro::NullType, double>>& nextReviewAt,
        double feedbackType,
        double now
    ) override {
        FfiNextReviewOutput output;
        FfiOptionalI64 lastReviewed = toOptionalI64(lastReviewedAt);
        FfiOptionalI64 nextReview = toOptionalI64(nextReviewAt);
        int8_t fbType = static_cast<int8_t>(feedbackType); // 0 = remembered, 1 = postponed

        if (_initialized && _handle != nullptr) {
            std::lock_guard<std::mutex> lock(_mutex);
            FfiErrorCode err = core_client_calculate_next_review(
                _handle, lastReviewed, nextReview, fbType, static_cast<int64_t>(now), &output
            );
            if (err != FfiErrorCode::Ok) {
                // Fallback to defaults
                output.interval_ms = feedbackType == 0 ? 86400000 : 14400000;
                output.next_review_at = static_cast<int64_t>(now) + output.interval_ms;
            }
        } else {
            // Default values
            output.interval_ms = feedbackType == 0 ? 86400000 : 14400000;
            output.next_review_at = static_cast<int64_t>(now) + output.interval_ms;
        }

        // Return JSON
        std::ostringstream oss;
        oss << "{\"interval_ms\":" << output.interval_ms
            << ",\"next_review_at\":" << output.next_review_at << "}";
        return oss.str();
    }

    std::string initializeReviewSchedule(
        double createdAt,
        const std::optional<std::variant<nitro::NullType, double>>& intervalMs
    ) override {
        FfiInitReviewOutput output;
        FfiOptionalI64 interval = toOptionalI64(intervalMs);

        if (_initialized && _handle != nullptr) {
            std::lock_guard<std::mutex> lock(_mutex);
            FfiErrorCode err = core_client_initialize_review_schedule(
                _handle, static_cast<int64_t>(createdAt), interval, &output
            );
            if (err != FfiErrorCode::Ok) {
                // Fallback to defaults
                output.next_review_at = static_cast<int64_t>(createdAt) + 86400000;
                output.stability = {false, 0.0};
                output.difficulty = {false, 0.0};
                output.last_reviewed_at = {false, 0};
            }
        } else {
            output.next_review_at = static_cast<int64_t>(createdAt) + 86400000;
            output.stability = {false, 0.0};
            output.difficulty = {false, 0.0};
            output.last_reviewed_at = {false, 0};
        }

        // Return JSON
        std::ostringstream oss;
        oss << "{\"next_review_at\":" << output.next_review_at
            << ",\"stability\":" << (output.stability.has_value ? std::to_string(output.stability.value) : "null")
            << ",\"difficulty\":" << (output.difficulty.has_value ? std::to_string(output.difficulty.value) : "null")
            << ",\"last_reviewed_at\":" << (output.last_reviewed_at.has_value ? std::to_string(output.last_reviewed_at.value) : "null")
            << "}";
        return oss.str();
    }

    // Knowledge Items
    std::shared_ptr<Promise<std::string>> saveKnowledgeItem(const std::string& itemJson) override {
        return Promise<std::string>::async([this, itemJson]() {
            std::lock_guard<std::mutex> lock(_mutex);
            checkInitialized();

            char* outJson = nullptr;
            FfiErrorCode err = core_client_save_knowledge_item(_handle, itemJson.c_str(), &outJson);

            if (err != FfiErrorCode::Ok || outJson == nullptr) {
                throw std::runtime_error("Failed to save knowledge item");
            }

            std::string result(outJson);
            ffi_string_free(outJson);
            return result;
        });
    }

    std::shared_ptr<Promise<std::string>> listKnowledgeItems() override {
        return Promise<std::string>::async([this]() {
            std::lock_guard<std::mutex> lock(_mutex);
            checkInitialized();

            char* outJson = nullptr;
            FfiErrorCode err = core_client_list_knowledge_items(_handle, &outJson);

            if (err != FfiErrorCode::Ok || outJson == nullptr) {
                throw std::runtime_error("Failed to list knowledge items");
            }

            std::string result(outJson);
            ffi_string_free(outJson);
            return result;
        });
    }

    std::shared_ptr<Promise<std::variant<nitro::NullType, std::string>>> getKnowledgeItemById(const std::string& itemId) override {
        return Promise<std::variant<nitro::NullType, std::string>>::async([this, itemId]() {
            std::lock_guard<std::mutex> lock(_mutex);
            checkInitialized();

            char* outJson = nullptr;
            bool found = false;
            FfiErrorCode err = core_client_get_knowledge_item_by_id(_handle, itemId.c_str(), &outJson, &found);

            if (err != FfiErrorCode::Ok) {
                throw std::runtime_error("Failed to get knowledge item");
            }

            if (!found || outJson == nullptr) {
                return std::variant<nitro::NullType, std::string>(nitro::NullType{});
            }

            std::string result(outJson);
            ffi_string_free(outJson);
            return std::variant<nitro::NullType, std::string>(result);
        });
    }

    std::shared_ptr<Promise<std::string>> updateKnowledgeItem(const std::string& itemId, const std::string& patchJson) override {
        return Promise<std::string>::async([this, itemId, patchJson]() {
            std::lock_guard<std::mutex> lock(_mutex);
            checkInitialized();

            char* outJson = nullptr;
            FfiErrorCode err = core_client_update_knowledge_item(_handle, itemId.c_str(), patchJson.c_str(), &outJson);

            if (err != FfiErrorCode::Ok || outJson == nullptr) {
                throw std::runtime_error("Failed to update knowledge item");
            }

            std::string result(outJson);
            ffi_string_free(outJson);
            return result;
        });
    }

    // Conversations
    std::shared_ptr<Promise<std::string>> createConversation(const std::string& conversationJson) override {
        return Promise<std::string>::async([this, conversationJson]() {
            std::lock_guard<std::mutex> lock(_mutex);
            checkInitialized();

            char* outJson = nullptr;
            FfiErrorCode err = core_client_create_conversation(_handle, conversationJson.c_str(), &outJson);

            if (err != FfiErrorCode::Ok || outJson == nullptr) {
                throw std::runtime_error("Failed to create conversation");
            }

            std::string result(outJson);
            ffi_string_free(outJson);
            return result;
        });
    }

    std::shared_ptr<Promise<std::string>> listConversations() override {
        return Promise<std::string>::async([this]() {
            std::lock_guard<std::mutex> lock(_mutex);
            checkInitialized();

            char* outJson = nullptr;
            FfiErrorCode err = core_client_list_conversations(_handle, &outJson);

            if (err != FfiErrorCode::Ok || outJson == nullptr) {
                throw std::runtime_error("Failed to list conversations");
            }

            std::string result(outJson);
            ffi_string_free(outJson);
            return result;
        });
    }

    std::shared_ptr<Promise<std::string>> updateConversation(const std::string& conversationId, const std::string& patchJson) override {
        return Promise<std::string>::async([this, conversationId, patchJson]() {
            std::lock_guard<std::mutex> lock(_mutex);
            checkInitialized();

            char* outJson = nullptr;
            FfiErrorCode err = core_client_update_conversation(_handle, conversationId.c_str(), patchJson.c_str(), &outJson);

            if (err != FfiErrorCode::Ok || outJson == nullptr) {
                throw std::runtime_error("Failed to update conversation");
            }

            std::string result(outJson);
            ffi_string_free(outJson);
            return result;
        });
    }

    std::shared_ptr<Promise<void>> deleteConversation(const std::string& conversationId, double deletedAt) override {
        return Promise<void>::async([this, conversationId, deletedAt]() {
            std::lock_guard<std::mutex> lock(_mutex);
            checkInitialized();

            FfiErrorCode err = core_client_delete_conversation(_handle, conversationId.c_str(), static_cast<int64_t>(deletedAt));

            if (err != FfiErrorCode::Ok) {
                throw std::runtime_error("Failed to delete conversation");
            }
        });
    }

    // Messages
    std::shared_ptr<Promise<std::string>> listConversationMessages(const std::string& conversationId) override {
        return Promise<std::string>::async([this, conversationId]() {
            std::lock_guard<std::mutex> lock(_mutex);
            checkInitialized();

            char* outJson = nullptr;
            FfiErrorCode err = core_client_list_conversation_messages(_handle, conversationId.c_str(), &outJson);

            if (err != FfiErrorCode::Ok || outJson == nullptr) {
                throw std::runtime_error("Failed to list messages");
            }

            std::string result(outJson);
            ffi_string_free(outJson);
            return result;
        });
    }

    std::shared_ptr<Promise<std::string>> addMessage(const std::string& messageJson) override {
        return Promise<std::string>::async([this, messageJson]() {
            std::lock_guard<std::mutex> lock(_mutex);
            checkInitialized();

            char* outJson = nullptr;
            FfiErrorCode err = core_client_add_message(_handle, messageJson.c_str(), &outJson);

            if (err != FfiErrorCode::Ok || outJson == nullptr) {
                throw std::runtime_error("Failed to add message");
            }

            std::string result(outJson);
            ffi_string_free(outJson);
            return result;
        });
    }

    std::shared_ptr<Promise<std::string>> updateMessage(const std::string& messageId, const std::string& patchJson) override {
        return Promise<std::string>::async([this, messageId, patchJson]() {
            std::lock_guard<std::mutex> lock(_mutex);
            checkInitialized();

            char* outJson = nullptr;
            FfiErrorCode err = core_client_update_message(_handle, messageId.c_str(), patchJson.c_str(), &outJson);

            if (err != FfiErrorCode::Ok || outJson == nullptr) {
                throw std::runtime_error("Failed to update message");
            }

            std::string result(outJson);
            ffi_string_free(outJson);
            return result;
        });
    }

    std::shared_ptr<Promise<void>> deleteMessage(const std::string& messageId, double deletedAt) override {
        return Promise<void>::async([this, messageId, deletedAt]() {
            std::lock_guard<std::mutex> lock(_mutex);
            checkInitialized();

            FfiErrorCode err = core_client_delete_message(_handle, messageId.c_str(), static_cast<int64_t>(deletedAt));

            if (err != FfiErrorCode::Ok) {
                throw std::runtime_error("Failed to delete message");
            }
        });
    }

    // Recommendations
    std::shared_ptr<Promise<void>> saveRecommendations(const std::string& recommendationsJson) override {
        return Promise<void>::async([this, recommendationsJson]() {
            std::lock_guard<std::mutex> lock(_mutex);
            checkInitialized();

            FfiErrorCode err = core_client_save_recommendations(_handle, recommendationsJson.c_str());

            if (err != FfiErrorCode::Ok) {
                throw std::runtime_error("Failed to save recommendations");
            }
        });
    }

    std::shared_ptr<Promise<std::string>> listRecommendations() override {
        return Promise<std::string>::async([this]() {
            std::lock_guard<std::mutex> lock(_mutex);
            checkInitialized();

            char* outJson = nullptr;
            FfiErrorCode err = core_client_list_recommendations(_handle, &outJson);

            if (err != FfiErrorCode::Ok || outJson == nullptr) {
                throw std::runtime_error("Failed to list recommendations");
            }

            std::string result(outJson);
            ffi_string_free(outJson);
            return result;
        });
    }

    std::shared_ptr<Promise<std::string>> listPendingRecommendations() override {
        return Promise<std::string>::async([this]() {
            std::lock_guard<std::mutex> lock(_mutex);
            checkInitialized();

            char* outJson = nullptr;
            FfiErrorCode err = core_client_list_pending_recommendations(_handle, &outJson);

            if (err != FfiErrorCode::Ok || outJson == nullptr) {
                throw std::runtime_error("Failed to list pending recommendations");
            }

            std::string result(outJson);
            ffi_string_free(outJson);
            return result;
        });
    }

    std::shared_ptr<Promise<void>> respondToRecommendation(
        const std::string& recommendationId,
        const std::string& status,
        const std::string& feedbackEventJson
    ) override {
        return Promise<void>::async([this, recommendationId, status, feedbackEventJson]() {
            std::lock_guard<std::mutex> lock(_mutex);
            checkInitialized();

            FfiErrorCode err = core_client_respond_to_recommendation(
                _handle,
                recommendationId.c_str(),
                status.c_str(),
                feedbackEventJson.c_str()
            );

            if (err != FfiErrorCode::Ok) {
                throw std::runtime_error("Failed to respond to recommendation");
            }
        });
    }

    // Feedback Events
    std::shared_ptr<Promise<std::string>> listRecentFeedbackEvents(double limit) override {
        return Promise<std::string>::async([this, limit]() {
            std::lock_guard<std::mutex> lock(_mutex);
            checkInitialized();

            char* outJson = nullptr;
            FfiErrorCode err = core_client_list_recent_feedback_events(_handle, static_cast<int32_t>(limit), &outJson);

            if (err != FfiErrorCode::Ok || outJson == nullptr) {
                throw std::runtime_error("Failed to list feedback events");
            }

            std::string result(outJson);
            ffi_string_free(outJson);
            return result;
        });
    }

    std::shared_ptr<Promise<std::string>> logRecommendationFeedback(const std::string& eventJson) override {
        return Promise<std::string>::async([this, eventJson]() {
            std::lock_guard<std::mutex> lock(_mutex);
            checkInitialized();

            char* outJson = nullptr;
            FfiErrorCode err = core_client_log_recommendation_feedback(_handle, eventJson.c_str(), &outJson);

            if (err != FfiErrorCode::Ok || outJson == nullptr) {
                throw std::runtime_error("Failed to log recommendation feedback");
            }

            std::string result(outJson);
            ffi_string_free(outJson);
            return result;
        });
    }

private:
    CoreClientHandle _handle;
    bool _initialized;
    std::mutex _mutex;

    void checkInitialized() {
        if (!_initialized || _handle == nullptr) {
            throw std::runtime_error("CoreClient not initialized. Call initialize() first.");
        }
    }

    std::vector<std::string> splitTags(const std::string& tags) {
        std::vector<std::string> result;
        if (tags.empty()) return result;

        std::istringstream iss(tags);
        std::string tag;
        while (std::getline(iss, tag, '|')) {
            if (!tag.empty()) {
                result.push_back(tag);
            }
        }
        return result;
    }

    FfiOptionalI64 toOptionalI64(const std::optional<std::variant<nitro::NullType, double>>& opt) {
        FfiOptionalI64 result = {false, 0};
        if (opt.has_value()) {
            if (std::holds_alternative<double>(*opt)) {
                result.has_value = true;
                result.value = static_cast<int64_t>(std::get<double>(*opt));
            }
        }
        return result;
    }
};

} // namespace margelo::nitro::glimpse
