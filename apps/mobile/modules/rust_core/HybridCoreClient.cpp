// apps/mobile/modules/rust_core/HybridCoreClient.cpp
#include "rust_core.h"
#include <stdexcept>

namespace glimpse {

// Helper to convert optional int64_t to FfiOptionalI64
static FfiOptionalI64 toFfiOptionalI64(const std::optional<int64_t>& opt) {
    FfiOptionalI64 result;
    result.has_value = opt.has_value();
    result.value = opt.has_value() ? *opt : 0;
    return result;
}

// Helper to convert optional double to FfiOptionalF64
static FfiOptionalF64 toFfiOptionalF64(const std::optional<double>& opt) {
    FfiOptionalF64 result;
    result.has_value = opt.has_value();
    result.value = opt.has_value() ? *opt : 0.0;
    return result;
}

// Helper to convert FfiOptionalI64 to optional int64_t
static std::optional<int64_t> fromFfiOptionalI64(const FfiOptionalI64& ffi) {
    return ffi.has_value ? std::optional<int64_t>(ffi.value) : std::nullopt;
}

// Helper to convert FfiOptionalF64 to optional double
static std::optional<double> fromFfiOptionalF64(const FfiOptionalF64& ffi) {
    return ffi.has_value ? std::optional<double>(ffi.value) : std::nullopt;
}

HybridCoreClient::HybridCoreClient(const std::string& dbPath) {
    handle_ = core_client_create(dbPath.c_str());
    if (!handle_) {
        throw std::runtime_error("Failed to create CoreClient with path: " + dbPath);
    }
}

HybridCoreClient::~HybridCoreClient() {
    if (handle_) {
        core_client_destroy(handle_);
        handle_ = nullptr;
    }
}

HybridCoreClient::HybridCoreClient(HybridCoreClient&& other) noexcept
    : handle_(other.handle_) {
    other.handle_ = nullptr;
}

HybridCoreClient& HybridCoreClient::operator=(HybridCoreClient&& other) noexcept {
    if (this != &other) {
        if (handle_) {
            core_client_destroy(handle_);
        }
        handle_ = other.handle_;
        other.handle_ = nullptr;
    }
    return *this;
}

std::vector<const char*> HybridCoreClient::toCStringArray(const std::vector<std::string>& vec) {
    std::vector<const char*> result;
    result.reserve(vec.size());
    for (const auto& s : vec) {
        result.push_back(s.c_str());
    }
    return result;
}

int HybridCoreClient::calculateTagOverlap(
    const std::vector<std::string>& leftTags,
    const std::vector<std::string>& rightTags
) {
    auto leftPtrs = toCStringArray(leftTags);
    auto rightPtrs = toCStringArray(rightTags);

    return core_client_calculate_tag_overlap(
        handle_,
        leftPtrs.data(),
        static_cast<int>(leftPtrs.size()),
        rightPtrs.data(),
        static_cast<int>(rightPtrs.size())
    );
}

std::optional<HybridCoreClient::NextReviewResult> HybridCoreClient::calculateNextReview(
    std::optional<int64_t> lastReviewedAt,
    std::optional<int64_t> nextReviewAt,
    bool remembered,
    int64_t now
) {
    FfiNextReviewOutput output;
    FfiErrorCode error = core_client_calculate_next_review(
        handle_,
        toFfiOptionalI64(lastReviewedAt),
        toFfiOptionalI64(nextReviewAt),
        remembered ? 0 : 1,  // 0 = remembered, 1 = postponed
        now,
        &output
    );

    if (error != FfiErrorCode::Ok) {
        return std::nullopt;
    }

    NextReviewResult result;
    result.intervalMs = output.interval_ms;
    result.nextReviewAt = output.next_review_at;
    return result;
}

std::optional<HybridCoreClient::InitReviewResult> HybridCoreClient::initializeReviewSchedule(
    int64_t createdAt,
    std::optional<int64_t> intervalMs
) {
    FfiInitReviewOutput output;
    FfiErrorCode error = core_client_initialize_review_schedule(
        handle_,
        createdAt,
        toFfiOptionalI64(intervalMs),
        &output
    );

    if (error != FfiErrorCode::Ok) {
        return std::nullopt;
    }

    InitReviewResult result;
    result.nextReviewAt = output.next_review_at;
    result.stability = fromFfiOptionalF64(output.stability);
    result.difficulty = fromFfiOptionalF64(output.difficulty);
    result.lastReviewedAt = fromFfiOptionalI64(output.last_reviewed_at);
    return result;
}

} // namespace glimpse
