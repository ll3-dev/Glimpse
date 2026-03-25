// apps/mobile/modules/rust_core/rust_core.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#if __cplusplus >= 201703L
#include <optional>
#else
// Fallback for C++14
namespace std {
    template<typename T>
    class optional {
        bool has_value_ = false;
        T value_;
    public:
        optional() = default;
        optional(const T& v) : has_value_(true), value_(v) {}
        optional(T&& v) : has_value_(true), value_(std::move(v)) {}
        bool has_value() const { return has_value_; }
        T& value() { return value_; }
        const T& value() const { return value_; }
        T& operator*() { return value_; }
        const T& operator*() const { return value_; }
    };
}
#endif

namespace glimpse {

// Forward declaration of Rust FFI handle
typedef void* CoreClientHandle;

// FFI error codes matching Rust enum
enum class FfiErrorCode {
    Ok = 0,
    InvalidInput = 1,
    NotFound = 2,
    Conflict = 3,
    Database = 4,
    Timeout = 5,
    Cancelled = 6,
    Internal = 7
};

// FFI optional types matching Rust FFI layer
struct FfiOptionalI64 {
    bool has_value;
    int64_t value;
};

struct FfiOptionalF64 {
    bool has_value;
    double value;
};

// FFI output structures
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

// Rust FFI function declarations (implemented in libglimpse_core.a)
extern "C" {
    CoreClientHandle core_client_create(const char* db_path);
    void core_client_destroy(CoreClientHandle handle);

    // Sync calculation functions
    int core_client_calculate_tag_overlap(
        CoreClientHandle handle,
        const char** left_tags,
        int left_tags_len,
        const char** right_tags,
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
}

/**
 * HybridCoreClient - C++ wrapper for Rust CoreClient FFI.
 *
 * This class provides a C++ interface to the Rust core library,
 * handling type conversions and memory management.
 */
class HybridCoreClient {
public:
    explicit HybridCoreClient(const std::string& dbPath);
    ~HybridCoreClient();

    // Non-copyable, movable
    HybridCoreClient(const HybridCoreClient&) = delete;
    HybridCoreClient& operator=(const HybridCoreClient&) = delete;
    HybridCoreClient(HybridCoreClient&&) noexcept;
    HybridCoreClient& operator=(HybridCoreClient&&) noexcept;

    // Sync calculation methods (pure, no SQLite)
    int calculateTagOverlap(
        const std::vector<std::string>& leftTags,
        const std::vector<std::string>& rightTags
    );

    struct NextReviewResult {
        int64_t intervalMs;
        int64_t nextReviewAt;
    };

    std::optional<NextReviewResult> calculateNextReview(
        std::optional<int64_t> lastReviewedAt,
        std::optional<int64_t> nextReviewAt,
        bool remembered,
        int64_t now
    );

    struct InitReviewResult {
        int64_t nextReviewAt;
        std::optional<double> stability;
        std::optional<double> difficulty;
        std::optional<int64_t> lastReviewedAt;
    };

    std::optional<InitReviewResult> initializeReviewSchedule(
        int64_t createdAt,
        std::optional<int64_t> intervalMs
    );

    bool isValid() const { return handle_ != nullptr; }

private:
    CoreClientHandle handle_;

    // Helper for string vector to C array
    static std::vector<const char*> toCStringArray(const std::vector<std::string>& vec);
};

} // namespace glimpse
