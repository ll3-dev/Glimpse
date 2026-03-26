#pragma once

#include "generated/glimpse_core.h"

#include "../nitrogen/generated/shared/c++/CalculateNextReviewOutput.hpp"
#include "../nitrogen/generated/shared/c++/Conversation.hpp"
#include "../nitrogen/generated/shared/c++/ConversationPatch.hpp"
#include "../nitrogen/generated/shared/c++/FeedbackEvent.hpp"
#include "../nitrogen/generated/shared/c++/InitializeReviewScheduleOutput.hpp"
#include "../nitrogen/generated/shared/c++/KnowledgeItem.hpp"
#include "../nitrogen/generated/shared/c++/KnowledgeItemPatch.hpp"
#include "../nitrogen/generated/shared/c++/Message.hpp"
#include "../nitrogen/generated/shared/c++/MessagePatch.hpp"
#include "../nitrogen/generated/shared/c++/Recommendation.hpp"

#include <NitroModules/Null.hpp>

#include <cstdint>
#include <optional>
#include <stdexcept>
#include <string>
#include <utility>
#include <variant>
#include <vector>

namespace margelo::nitro::glimpse::ffi_bridge {

template <typename T>
using Nullable = std::optional<std::variant<nitro::NullType, T>>;

template <typename T>
inline Nullable<T> makeNull() {
  return std::variant<nitro::NullType, T>(nitro::NullType());
}

template <typename T>
inline Nullable<T> makeValue(T value) {
  return std::variant<nitro::NullType, T>(std::move(value));
}

inline std::string messageForError(FfiErrorCode code) {
  switch (code) {
    case FfiErrorCode::FfiErrorCode_Ok:
      return "ok";
    case FfiErrorCode::FfiErrorCode_InvalidInput:
      return "invalid input";
    case FfiErrorCode::FfiErrorCode_NotFound:
      return "not found";
    case FfiErrorCode::FfiErrorCode_Conflict:
      return "conflict";
    case FfiErrorCode::FfiErrorCode_Database:
      return "database error";
    case FfiErrorCode::FfiErrorCode_Timeout:
      return "timeout";
    case FfiErrorCode::FfiErrorCode_Cancelled:
      return "cancelled";
    case FfiErrorCode::FfiErrorCode_Internal:
      return "internal error";
  }

  return "unknown error";
}

inline void throwIfError(FfiErrorCode code, const char* operation) {
  if (code == FfiErrorCode::FfiErrorCode_Ok) {
    return;
  }

  char buffer[512] = {};
  const auto length = core_client_get_last_error(buffer, static_cast<int>(sizeof(buffer)));
  const std::string detail =
      length > 0 ? std::string(buffer, static_cast<size_t>(length)) : messageForError(code);
  throw std::runtime_error(std::string(operation) + ": " + detail);
}

inline Nullable<std::string> toNitroNullableString(const FfiNullableString& value) {
  if (value.value == nullptr) {
    return makeNull<std::string>();
  }
  return makeValue<std::string>(value.value);
}

inline Nullable<double> toNitroNullableNumber(FfiOptionalI64 value) {
  if (!value.has_value) {
    return makeNull<double>();
  }
  return makeValue<double>(static_cast<double>(value.value));
}

inline Nullable<std::vector<std::string>> toNitroNullableStringArray(const FfiNullableStringArray& value) {
  if (value.is_null) {
    return makeNull<std::vector<std::string>>();
  }

  std::vector<std::string> items;
  items.reserve(static_cast<size_t>(value.len));
  for (int index = 0; index < value.len; index += 1) {
    items.emplace_back(value.data[index] == nullptr ? "" : value.data[index]);
  }
  return makeValue<std::vector<std::string>>(std::move(items));
}

inline FfiOptionalI64 toFfiOptionalI64(const Nullable<double>& value) {
  if (!value.has_value() || std::holds_alternative<nitro::NullType>(*value)) {
    return FfiOptionalI64{false, 0};
  }
  return FfiOptionalI64{true, static_cast<int64_t>(std::get<double>(*value))};
}

inline FfiNullableString toFfiNullableString(const Nullable<std::string>& value) {
  if (!value.has_value() || std::holds_alternative<nitro::NullType>(*value)) {
    return FfiNullableString{nullptr};
  }
  return FfiNullableString{const_cast<char*>(std::get<std::string>(*value).c_str())};
}

struct NullableStringArrayInput final {
  FfiNullableStringArray ffi{};
  std::vector<char*> data{};

  explicit NullableStringArrayInput(const Nullable<std::vector<std::string>>& value) {
    if (!value.has_value() || std::holds_alternative<nitro::NullType>(*value)) {
      ffi = FfiNullableStringArray{true, nullptr, 0};
      return;
    }

    const auto& items = std::get<std::vector<std::string>>(*value);
    data.reserve(items.size());
    for (const auto& item : items) {
      data.push_back(const_cast<char*>(item.c_str()));
    }

    ffi = FfiNullableStringArray{
        false,
        data.empty() ? nullptr : data.data(),
        static_cast<int>(data.size()),
    };
  }
};

struct NullableStringArrayPatchInput final {
  FfiNullableStringArrayPatchField ffi{};
  std::vector<const char*> data{};

  explicit NullableStringArrayPatchInput(const NullableStringArrayPatchField& value) {
    if (!value.hasValue) {
      ffi = FfiNullableStringArrayPatchField{false, false, nullptr, 0};
      return;
    }
    if (value.isNull) {
      ffi = FfiNullableStringArrayPatchField{true, true, nullptr, 0};
      return;
    }

    data.reserve(value.value.size());
    for (const auto& item : value.value) {
      data.push_back(item.c_str());
    }

    ffi = FfiNullableStringArrayPatchField{
        true,
        false,
        data.empty() ? nullptr : data.data(),
        static_cast<int>(data.size()),
    };
  }
};

inline FfiStringPatchField toFfiStringPatchField(const StringPatchField& value) {
  return FfiStringPatchField{value.hasValue, value.value.c_str()};
}

inline FfiNullableStringPatchField toFfiNullableStringPatchField(const NullableStringPatchField& value) {
  return FfiNullableStringPatchField{value.hasValue, value.isNull, value.value.c_str()};
}

inline FfiNumberPatchField toFfiNumberPatchField(const NumberPatchField& value) {
  return FfiNumberPatchField{value.hasValue, value.value};
}

inline FfiNullableNumberPatchField toFfiNullableNumberPatchField(const NullableNumberPatchField& value) {
  return FfiNullableNumberPatchField{value.hasValue, value.isNull, value.value};
}

struct KnowledgeItemInput final {
  NullableStringArrayInput tags;
  NullableStringArrayInput labels;
  NullableStringArrayInput provisionalLabels;
  FfiKnowledgeItem ffi{};

  explicit KnowledgeItemInput(const KnowledgeItem& item)
      : tags(item.tags), labels(item.labels), provisionalLabels(item.provisionalLabels) {
    ffi = FfiKnowledgeItem{
        const_cast<char*>(item.id.c_str()),
        const_cast<char*>(item.type.c_str()),
        toFfiNullableString(item.title),
        toFfiNullableString(item.body),
        toFfiNullableString(item.url),
        toFfiNullableString(item.summary),
        tags.ffi,
        labels.ffi,
        provisionalLabels.ffi,
        toFfiNullableString(item.labelStatus),
        toFfiNullableString(item.labelSource),
        toFfiNullableString(item.labelVersion),
        item.labelScore.has_value() && !std::holds_alternative<nitro::NullType>(*item.labelScore)
            ? FfiOptionalF64{true, std::get<double>(*item.labelScore)}
            : FfiOptionalF64{false, 0.0},
        toFfiOptionalI64(item.labelRequestedAt),
        toFfiOptionalI64(item.labelCompletedAt),
        toFfiNullableString(item.labelError),
        static_cast<int64_t>(item.createdAt),
        static_cast<int64_t>(item.updatedAt),
        item.stability.has_value() && !std::holds_alternative<nitro::NullType>(*item.stability)
            ? FfiOptionalF64{true, std::get<double>(*item.stability)}
            : FfiOptionalF64{false, 0.0},
        item.difficulty.has_value() && !std::holds_alternative<nitro::NullType>(*item.difficulty)
            ? FfiOptionalF64{true, std::get<double>(*item.difficulty)}
            : FfiOptionalF64{false, 0.0},
        toFfiOptionalI64(item.lastReviewedAt),
        toFfiOptionalI64(item.nextReviewAt),
    };
  }
};

struct KnowledgeItemPatchInput final {
  NullableStringArrayPatchInput tags;
  NullableStringArrayPatchInput labels;
  NullableStringArrayPatchInput provisionalLabels;
  FfiKnowledgeItemPatch ffi{};

  explicit KnowledgeItemPatchInput(const KnowledgeItemPatch& patch)
      : tags(patch.tags), labels(patch.labels), provisionalLabels(patch.provisionalLabels) {
    ffi = FfiKnowledgeItemPatch{
        toFfiStringPatchField(patch.type),
        toFfiNullableStringPatchField(patch.title),
        toFfiNullableStringPatchField(patch.body),
        toFfiNullableStringPatchField(patch.url),
        toFfiNullableStringPatchField(patch.summary),
        tags.ffi,
        labels.ffi,
        provisionalLabels.ffi,
        toFfiNullableStringPatchField(patch.labelStatus),
        toFfiNullableStringPatchField(patch.labelSource),
        toFfiNullableStringPatchField(patch.labelVersion),
        toFfiNullableNumberPatchField(patch.labelScore),
        toFfiNullableNumberPatchField(patch.labelRequestedAt),
        toFfiNullableNumberPatchField(patch.labelCompletedAt),
        toFfiNullableStringPatchField(patch.labelError),
        toFfiNumberPatchField(patch.updatedAt),
        toFfiNullableNumberPatchField(patch.stability),
        toFfiNullableNumberPatchField(patch.difficulty),
        toFfiNullableNumberPatchField(patch.lastReviewedAt),
        toFfiNullableNumberPatchField(patch.nextReviewAt),
    };
  }
};

struct ConversationInput final {
  FfiConversation ffi{};

  explicit ConversationInput(const Conversation& conversation) {
    ffi = FfiConversation{
        const_cast<char*>(conversation.id.c_str()),
        toFfiNullableString(conversation.title),
        toFfiNullableString(conversation.icon),
        toFfiNullableString(conversation.contextItemId),
        static_cast<int64_t>(conversation.createdAt),
        static_cast<int64_t>(conversation.updatedAt),
        toFfiOptionalI64(conversation.deletedAt),
    };
  }
};

struct ConversationPatchInput final {
  FfiConversationPatch ffi{};

  explicit ConversationPatchInput(const ConversationPatch& patch) {
    ffi = FfiConversationPatch{
        toFfiNullableStringPatchField(patch.title),
        toFfiNullableStringPatchField(patch.icon),
        toFfiNullableStringPatchField(patch.contextItemId),
        toFfiNumberPatchField(patch.updatedAt),
        toFfiNullableNumberPatchField(patch.deletedAt),
    };
  }
};

struct MessageInput final {
  FfiMessage ffi{};

  explicit MessageInput(const Message& message) {
    ffi = FfiMessage{
        const_cast<char*>(message.id.c_str()),
        const_cast<char*>(message.conversationId.c_str()),
        const_cast<char*>(message.role.c_str()),
        const_cast<char*>(message.content.c_str()),
        static_cast<int64_t>(message.createdAt),
        toFfiOptionalI64(message.updatedAt),
        toFfiOptionalI64(message.deletedAt),
    };
  }
};

struct MessagePatchInput final {
  FfiMessagePatch ffi{};

  explicit MessagePatchInput(const MessagePatch& patch) {
    ffi = FfiMessagePatch{
        toFfiStringPatchField(patch.content),
        toFfiNullableNumberPatchField(patch.updatedAt),
        toFfiNullableNumberPatchField(patch.deletedAt),
    };
  }
};

inline KnowledgeItem fromFfiKnowledgeItem(const FfiKnowledgeItem& item) {
  return KnowledgeItem{
      item.id == nullptr ? "" : item.id,
      item.item_type == nullptr ? "" : item.item_type,
      toNitroNullableString(item.title),
      toNitroNullableString(item.body),
      toNitroNullableString(item.url),
      toNitroNullableString(item.summary),
      toNitroNullableStringArray(item.tags),
      toNitroNullableStringArray(item.labels),
      toNitroNullableStringArray(item.provisional_labels),
      toNitroNullableString(item.label_status),
      toNitroNullableString(item.label_source),
      toNitroNullableString(item.label_version),
      item.label_score.has_value ? makeValue<double>(item.label_score.value) : makeNull<double>(),
      toNitroNullableNumber(item.label_requested_at),
      toNitroNullableNumber(item.label_completed_at),
      toNitroNullableString(item.label_error),
      static_cast<double>(item.created_at),
      static_cast<double>(item.updated_at),
      item.stability.has_value ? makeValue<double>(item.stability.value) : makeNull<double>(),
      item.difficulty.has_value ? makeValue<double>(item.difficulty.value) : makeNull<double>(),
      toNitroNullableNumber(item.last_reviewed_at),
      toNitroNullableNumber(item.next_review_at),
  };
}

inline Conversation fromFfiConversation(const FfiConversation& conversation) {
  return Conversation{
      conversation.id == nullptr ? "" : conversation.id,
      toNitroNullableString(conversation.title),
      toNitroNullableString(conversation.icon),
      toNitroNullableString(conversation.context_item_id),
      static_cast<double>(conversation.created_at),
      static_cast<double>(conversation.updated_at),
      toNitroNullableNumber(conversation.deleted_at),
  };
}

inline Message fromFfiMessage(const FfiMessage& message) {
  return Message{
      message.id == nullptr ? "" : message.id,
      message.conversation_id == nullptr ? "" : message.conversation_id,
      message.role == nullptr ? "" : message.role,
      message.content == nullptr ? "" : message.content,
      static_cast<double>(message.created_at),
      toNitroNullableNumber(message.updated_at),
      toNitroNullableNumber(message.deleted_at),
  };
}

inline Recommendation fromFfiRecommendation(const FfiRecommendation& recommendation) {
  return Recommendation{
      recommendation.id == nullptr ? "" : recommendation.id,
      recommendation.item_a_id == nullptr ? "" : recommendation.item_a_id,
      recommendation.item_b_id == nullptr ? "" : recommendation.item_b_id,
      toNitroNullableString(recommendation.reason),
      recommendation.status == nullptr ? "" : recommendation.status,
      static_cast<double>(recommendation.created_at),
      toNitroNullableNumber(recommendation.responded_at),
  };
}

inline FeedbackEvent fromFfiFeedbackEvent(const FfiFeedbackEvent& event) {
  return FeedbackEvent{
      event.id == nullptr ? "" : event.id,
      event.recommendation_id == nullptr ? "" : event.recommendation_id,
      event.action == nullptr ? "" : event.action,
      static_cast<double>(event.created_at),
  };
}

inline CalculateNextReviewOutput fromFfiCalculateNextReviewOutput(const FfiCalculateNextReviewOutput& output) {
  return CalculateNextReviewOutput{
      static_cast<double>(output.interval_ms),
      static_cast<double>(output.next_review_at),
  };
}

inline InitializeReviewScheduleOutput fromFfiInitializeReviewScheduleOutput(
    const FfiInitializeReviewScheduleOutput& output
) {
  return InitializeReviewScheduleOutput{
      static_cast<double>(output.next_review_at),
      output.stability.has_value ? makeValue<double>(output.stability.value) : makeNull<double>(),
      output.difficulty.has_value ? makeValue<double>(output.difficulty.value) : makeNull<double>(),
      toNitroNullableNumber(output.last_reviewed_at),
  };
}

template <typename T, void (*FreeFn)(T*)>
class OwnedValue final {
 public:
  T value{};

  ~OwnedValue() {
    FreeFn(&value);
  }
};

template <typename ArrayType, typename ItemType, void (*FreeFn)(ItemType*, int)>
class OwnedArray final {
 public:
  ArrayType value{};

  ~OwnedArray() {
    FreeFn(value.data, value.len);
  }
};

}  // namespace margelo::nitro::glimpse::ffi_bridge
