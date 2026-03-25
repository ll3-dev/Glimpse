# packages/core Rust 연동 구현 계획

## 개요

`packages/core`의 TypeScript 구현을 Rust로 교체하여 성능 향상 및 타입 안전성 강화. Craby를 활용해 React Native에서 Rust 1급 지원을 구현하고, SQLite로 데이터 영속성 확보.

## 현재 상태 분석

### 기존 아키텍처
```
TypeScript (CoreClient interface)
    ↓
LocalCoreClient (TypeScript)
    ↓
KeyValueStorage (AsyncStorage/localStorage)
    ↓
JSON 직렬화 (glimpse-core-store-v1)
```

### 문제점
- JSON 직렬화/역직렬화 오버헤드
- 전체 데이터를 메모리에 로드
- 계산 로직이 JS에서 실행 (성능 제한)

### 주요 발견사항
- `packages/core/src/ports/core-client.ts:24-57` - CoreClient 인터페이스 (21개 메서드)
- `packages/core/src/adapters/local/local-core-client.ts:101-365` - LocalCoreClient 구현
- `packages/shared/src/index.ts` - 모든 타입이 JSON 직렬화 가능
- 3개 동기 메서드: `calculateTagOverlap`, `calculateNextReview`, `initializeReviewSchedule`
- 18개 비동기 메서드: CRUD + 비즈니스 로직

## 목표 상태

```
TypeScript (.craby.ts 스키마)
    ↓ craby codegen
Rust Core Library (CoreClient trait)
    ↓ rusqlite
SQLite Database
```

### 성공 기준

#### 자동 검증:
- [ ] Craby 모듈 빌드 성공: `bun run build:rust`
- [ ] Rust 단위 테스트 통과: `cargo test --package glimpse-core-rust`
- [ ] TypeScript 타입 생성 확인: `craby generate` 실행
- [ ] iOS 빌드 성공: `bun run ios`
- [ ] Android 빌드 성공: `bun run android`
- [ ] 기존 CoreClient 인터페이스 100% 호환

#### 수동 검증:
- [ ] 지식 항목 저장/조회 정상 동작
- [ ] 대화 생성/메시지 추가 정상 동작
- [ ] 추천 시스템 정상 동작
- [ ] 복습 스케줄 계산 정확
- [ ] 기존 데이터 없이 클린 시작 가능

## 범위 제한 (하지 않을 것)

- 기존 데이터 마이그레이션 (JSON → SQLite)
- Desktop (Tauri) Rust 연동 (Phase 2에서 별도 계획)
- 웹 플랫폼 지원
- React Native JSI 직접 구현 (Craby 사용)
- Nitro Modules 검토 (Craby로 결정됨)

## 구현 접근 방식

### 기술 스택 결정

| 영역 | 선택 | 이유 |
|------|------|------|
| **JSI 브릿지** | Craby | Rust 1급 지원, Pure C++ TurboModule |
| **스토리지** | rusqlite | 안정적, 성능 우수, 널리 사용 |
| **직렬화** | 없음 | JSI 타입 직접 변환 |
| **빌드** | cargo-ndk (Android), cargo-xcode (iOS) | 크로스 플랫폼 Rust 빌드 |

### 아키텍처

```
packages/
├── core/                    # 기존 TypeScript (삭제 예정)
├── core-rust/               # 새 Rust 라이브러리 (Mobile/Desktop 공유)
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs           # 라이브러리 진입점
│       ├── core_client.rs   # CoreClient trait 구현
│       ├── models.rs        # 데이터 모델 (serde)
│       ├── storage/
│       │   ├── mod.rs
│       │   └── sqlite.rs    # SQLite 스토리지
│       └── review/
│           ├── mod.rs
│           └── schedule.rs  # 복습 스케줄 계산
└── shared/                  # 타입 정의 (유지)

apps/
├── mobile/
│   └── src/features/core/
│       ├── mobile-core-client.ts       # 기존 유지 (어댑터만 교체)
│       └── native-core-client.craby.ts # Craby 스키마 정의
└── desktop/
    └── src-tauri/
        └── src/core_commands.rs        # Tauri 명령어 (packages/core-rust 사용)
```

---

## Phase 1: Rust Core 라이브러리 프로토타입

### 개요
플랫폼 독립적인 Rust 라이브러리 구현. Craby 없이 순수 Rust로 비즈니스 로직 및 SQLite 스토리지 구현.

### 필요한 변경사항:

#### 1. Rust 프로젝트 구조 생성
**파일**: `packages/core-rust/Cargo.toml`
**변경사항**: 새 Rust 라이브러리 프로젝트 생성 (Mobile/Desktop 공유)

```toml
[package]
name = "glimpse-core"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["staticlib", "cdylib", "rlib"]

[dependencies]
rusqlite = { version = "0.32", features = ["bundled"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
thiserror = "2.0"
uuid = { version = "1.0", features = ["v4"] }
chrono = "0.4"

[dev-dependencies]
tempfile = "3.0"
```

#### 1-1. 워크스페이스 Cargo.toml 설정
**파일**: `Cargo.toml` (루트)
**변경사항**: 워크스페이스에 core-rust 추가

```toml
[workspace]
members = [
    "packages/core-rust",
    # 향후 추가될 다른 Rust 패키지들
]
resolver = "2"
```

#### 2. 데이터 모델 정의
**파일**: `packages/core-rust/src/models.rs`
**변경사항**: TypeScript 타입을 Rust struct로 변환

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeItem {
    pub id: String,
    #[serde(rename = "type")]
    pub item_type: KnowledgeItemType,
    pub title: Option<String>,
    pub body: Option<String>,
    pub url: Option<String>,
    pub summary: Option<String>,
    pub tags: Option<Vec<String>>,
    pub labels: Option<Vec<String>>,
    pub provisional_labels: Option<Vec<String>>,
    pub label_status: Option<KnowledgeItemLabelStatus>,
    pub label_source: Option<KnowledgeItemLabelSource>,
    pub label_version: Option<String>,
    pub label_score: Option<f64>,
    pub label_requested_at: Option<i64>,
    pub label_completed_at: Option<i64>,
    pub label_error: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub stability: Option<f64>,
    pub difficulty: Option<f64>,
    pub last_reviewed_at: Option<i64>,
    pub next_review_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum KnowledgeItemType {
    Note,
    Link,
    Highlight,
    Screenshot,
    Share,
}

// ... 기타 모델들 (Conversation, Message, Recommendation, FeedbackEvent)
```

#### 3. SQLite 스토리지 구현
**파일**: `packages/core-rust/src/storage/sqlite.rs`
**변경사항**: SQLite 기반 스토리지 레이어

```rust
use rusqlite::{Connection, params};
use std::path::Path;

pub struct SqliteStorage {
    conn: Connection,
}

impl SqliteStorage {
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self, crate::Error> {
        let conn = Connection::open(path)?;
        let storage = Self { conn };
        storage.initialize_schema()?;
        Ok(storage)
    }

    fn initialize_schema(&self) -> Result<(), crate::Error> {
        self.conn.execute_batch(include_str!("schema.sql"))?;
        Ok(())
    }

    // CRUD 메서드들...
}
```

#### 4. 스키마 SQL
**파일**: `packages/core-rust/src/storage/schema.sql`
**변경사항**: SQLite 테이블 정의

```sql
CREATE TABLE IF NOT EXISTS knowledge_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT,
    body TEXT,
    url TEXT,
    summary TEXT,
    tags TEXT, -- JSON array
    labels TEXT, -- JSON array
    provisional_labels TEXT, -- JSON array
    label_status TEXT,
    label_source TEXT,
    label_version TEXT,
    label_score REAL,
    label_requested_at INTEGER,
    label_completed_at INTEGER,
    label_error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    stability REAL,
    difficulty REAL,
    last_reviewed_at INTEGER,
    next_review_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_knowledge_items_created_at ON knowledge_items(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_next_review_at ON knowledge_items(next_review_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_label_status ON knowledge_items(label_status);

-- conversations, messages, recommendations, feedback_events 테이블...
```

#### 5. CoreClient 구현
**파일**: `packages/core-rust/src/core_client.rs`
**변경사항**: CoreClient trait 및 구현체

```rust
use crate::models::*;
use crate::storage::SqliteStorage;

pub struct CoreClientImpl {
    storage: SqliteStorage,
}

impl CoreClientImpl {
    pub fn new(storage: SqliteStorage) -> Self {
        Self { storage }
    }

    // 동기 메서드들
    pub fn calculate_tag_overlap(&self, input: CalculateTagOverlapInput) -> i32 {
        let left_tags: std::collections::HashSet<_> =
            input.left.tags.unwrap_or_default().into_iter().collect();
        let right_tags: std::collections::HashSet<_> =
            input.right.tags.unwrap_or_default().into_iter().collect();
        left_tags.intersection(&right_tags).count() as i32
    }

    pub fn calculate_next_review(&self, input: CalculateNextReviewInput) -> CalculateNextReviewOutput {
        // 복습 간격 계산 로직...
    }

    pub fn initialize_review_schedule(&self, input: InitializeReviewScheduleInput) -> InitializeReviewScheduleOutput {
        // 초기 복습 스케줄 설정...
    }

    // 비동기 메서드들 (async fn)
    pub async fn save_knowledge_item(&self, item: NewKnowledgeItem) -> Result<KnowledgeItem, Error> {
        self.storage.insert_knowledge_item(item)
    }

    // ... 나머지 18개 메서드
}
```

#### 6. 단위 테스트
**파일**: `packages/core-rust/src/core_client.rs` (하단)
**변경사항**: Rust 단위 테스트

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    fn create_test_client() -> CoreClientImpl {
        let temp_file = NamedTempFile::new().unwrap();
        let storage = SqliteStorage::new(temp_file.path()).unwrap();
        CoreClientImpl::new(storage)
    }

    #[test]
    fn test_calculate_tag_overlap() {
        let client = create_test_client();
        let input = CalculateTagOverlapInput {
            left: CoreKnowledgeItemLike { tags: Some(vec!["rust".to_string(), "react".to_string()]) },
            right: CoreKnowledgeItemLike { tags: Some(vec!["rust".to_string(), "vue".to_string()]) },
        };
        assert_eq!(client.calculate_tag_overlap(input), 1);
    }

    #[test]
    fn test_calculate_next_review() {
        // ...
    }
}
```

### 성공 기준:

#### 자동 검증:
- [ ] Rust 프로젝트 컴파일: `cargo build --release`
- [ ] 단위 테스트 통과: `cargo test`
- [ ] clippy 경고 없음: `cargo clippy -- -D warnings`

#### 수동 검증:
- [ ] SQLite 파일 생성 확인
- [ ] CRUD 동작 확인 (테스트 코드로)

---

## Phase 2: Craby 통합 및 React Native 바인딩

### 개요
Craby를 사용하여 Rust 라이브러리를 React Native에 통합. TypeScript 스키마 정의 → Rust 바인딩 자동 생성.

### 필요한 변경사항:

#### 1. Craby 스키마 정의
**파일**: `apps/mobile/src/features/core/native-core-client.craby.ts`
**변경사항**: Craby TypeScript 스키마 생성

```typescript
import type {
  KnowledgeItem,
  Conversation,
  Message,
  Recommendation,
  FeedbackEvent,
  // ... 기타 타입
} from '@glimpse/shared';

export interface CoreClientSchema {
  // 동기 메서드
  calculateTagOverlap(input: CalculateTagOverlapInput): number;
  calculateNextReview(input: CalculateNextReviewInput): CalculateNextReviewOutput;
  initializeReviewSchedule(input: InitializeReviewScheduleInput): InitializeReviewScheduleOutput;

  // 비동기 메서드
  saveKnowledgeItem(item: KnowledgeItem): Promise<KnowledgeItem>;
  listKnowledgeItems(): Promise<KnowledgeItem[]>;
  listKnowledgeItemsByIds(itemIds: string[]): Promise<KnowledgeItem[]>;
  listWeeklyKnowledgeItems(since: number): Promise<KnowledgeItem[]>;
  listPendingKnowledgeItemsForLabeling(limit: number): Promise<KnowledgeItem[]>;
  getKnowledgeItemById(itemId: string): Promise<KnowledgeItem | null>;
  getDueKnowledgeItems(now: number, limit: number | null): Promise<KnowledgeItem[]>;
  updateKnowledgeItem(itemId: string, patch: KnowledgeItemPatch): Promise<KnowledgeItem>;

  createConversation(conversation: Conversation): Promise<Conversation>;
  listConversations(): Promise<Conversation[]>;
  updateConversation(conversationId: string, patch: ConversationPatch): Promise<Conversation>;
  deleteConversation(conversationId: string, deletedAt: number): Promise<void>;
  listConversationMessages(conversationId: string): Promise<Message[]>;
  addMessage(message: Message): Promise<Message>;
  updateMessage(messageId: string, patch: MessagePatch): Promise<Message>;
  deleteMessage(messageId: string, deletedAt: number): Promise<void>;

  saveRecommendations(recommendations: Recommendation[]): Promise<void>;
  listRecommendations(): Promise<Recommendation[]>;
  listPendingRecommendations(): Promise<Recommendation[]>;
  listRecentFeedbackEvents(limit: number): Promise<FeedbackEvent[]>;
  logRecommendationFeedback(event: FeedbackEvent): Promise<FeedbackEvent>;
  respondToRecommendation(
    recommendationId: string,
    status: RecommendationStatus,
    event: FeedbackEvent
  ): Promise<void>;
}
```

#### 2. Craby 설정
**파일**: `apps/mobile/craby.config.ts`
**변경사항**: Craby 설정 파일 (packages/core-rust 참조)

```typescript
import { defineConfig } from 'craby';

export default defineConfig({
  rustModule: {
    name: 'glimpse-core',
    path: '../../packages/core-rust',
  },
  schemas: [
    './src/features/core/*.craby.ts',
  ],
});
```

#### 3. Craby 의존성 추가
**파일**: `apps/mobile/package.json`
**변경사항**: Craby 패키지 추가

```json
{
  "dependencies": {
    "craby": "^0.1.0-rc.5"
  },
  "devDependencies": {
    "@craby/cli": "^0.1.0-rc.5"
  }
}
```

#### 4. Rust Craby 바인딩
**파일**: `packages/core-rust/src/lib.rs`
**변경사항**: Craby 진입점

```rust
mod core_client;
mod models;
mod storage;

pub use core_client::CoreClientImpl;
pub use models::*;
pub use storage::SqliteStorage;

// Craby가 자동 생성하는 코드와 호환되는 진입점
#[craby::module]
pub mod glimpse_core {
    use super::*;

    pub struct GlimpseCore {
        client: CoreClientImpl,
    }

    impl GlimpseCore {
        pub fn new(db_path: String) -> Result<Self, Error> {
            let storage = SqliteStorage::new(&db_path)?;
            Ok(Self {
                client: CoreClientImpl::new(storage),
            })
        }
    }

    // Craby가 스키마에서 자동 생성하는 메서드 구현...
}
```

#### 5. TypeScript 어댑터
**파일**: `apps/mobile/src/features/core/native-core-client.craby.ts` (수정)
**변경사항**: Craby 모듈 초기화

```typescript
import { NitroModules } from 'react-native-nitro-modules';
import type { CoreClientSchema } from './native-core-client.craby';

let _instance: CoreClientSchema | null = null;

export function getNativeCoreClient(): CoreClientSchema {
  if (!_instance) {
    _instance = NitroModules.createHybridObject<CoreClientSchema>('GlimpseCore');
  }
  return _instance;
}
```

#### 6. MobileCoreClient 어댑터 수정
**파일**: `apps/mobile/src/features/core/mobile-core-client.ts`
**변경사항**: 기존 래퍼를 Craby 모듈 사용으로 변경

```typescript
import { getNativeCoreClient } from './native-core-client.craby';
import type { MobileCoreClient } from './types';

export const mobileCoreClient: MobileCoreClient = {
  calculateTagOverlap: (input) => getNativeCoreClient().calculateTagOverlap(input),
  calculateNextReview: (input) => getNativeCoreClient().calculateNextReview(input),
  initializeReviewSchedule: (input) => getNativeCoreClient().initializeReviewSchedule(input),

  async saveKnowledgeItem(item) {
    return getNativeCoreClient().saveKnowledgeItem(item);
  },
  // ... 나머지 메서드들
};
```

#### 7. iOS 빌드 설정
**파일**: `apps/mobile/ios/Podfile`
**변경사항**: Craby 팟 추가 (packages/core-rust 참조)

```ruby
pod 'GlimpseCore', :path => '../../../packages/core-rust'
```

#### 8. Android 빌드 설정
**파일**: `apps/mobile/android/app/build.gradle`
**변경사항**: NDK 빌드 설정

```groovy
android {
    externalNativeBuild {
        cmake {
            path "src/main/cpp/CMakeLists.txt"
        }
    }
}
```

### 성공 기준:

#### 자동 검증:
- [ ] Craby 코드 생성: `bun run craby generate`
- [ ] iOS 빌드: `bun run ios`
- [ ] Android 빌드: `bun run android`
- [ ] TypeScript 타입 체크: `bun run typecheck`

#### 수동 검증:
- [ ] 앱 실행 후 Rust 모듈 로드 확인
- [ ] 지식 항목 저장/조회 동작
- [ ] 로그에 Rust 모듈 호출 확인

---

## Phase 3: 기존 코드 정리 및 Desktop 연동 준비

### 개요
기존 TypeScript 구현 제거 및 Desktop (Tauri) 연동을 위한 인터페이스 준비.

### 필요한 변경사항:

#### 1. 기존 LocalCoreClient 제거
**파일**: `apps/mobile/src/features/core/native-core-client.native.ts`
**변경사항**: 기존 구현 제거, Craby 모듈로 대체

```typescript
// Before: export { nativeCoreClient } from './local-core-client';
// After: Craby 모듈 사용
export { getNativeCoreClient as nativeCoreClient } from './native-core-client.craby';
```

#### 2. packages/core 어댑터 패턴 유지
**파일**: `packages/core/src/adapters/rust/rust-core-client.ts` (신규)
**변경사항**: Rust 클라이언트용 추상화 레이어

```typescript
import type { CoreClient } from '../ports/core-client';

export interface RustCoreClientConfig {
  getDbPath: () => string;
}

export function createRustCoreClient(config: RustCoreClientConfig): CoreClient {
  // 플랫폼별 구현은 apps/*에서 제공
  throw new Error('RustCoreClient must be implemented by platform-specific code');
}
```

#### 3. Desktop Tauri 명령어 준비
**파일**: `apps/desktop/src-tauri/src/core_commands.rs` (신규)
**변경사항**: Desktop용 Rust 명령어 (`packages/core-rust` 사용)

**Cargo.toml 의존성 추가**:
```toml
[dependencies]
glimpse-core = { path = "../../../packages/core-rust" }
```

```rust
use glimpse_core::{CoreClientImpl, SqliteStorage};
use tauri::State;
use std::sync::Mutex;

pub struct DesktopCoreState {
    client: Mutex<CoreClientImpl>,
}

#[tauri::command]
pub fn core_calculate_tag_overlap(
    input: CalculateTagOverlapInput,
    state: State<DesktopCoreState>,
) -> i32 {
    let client = state.client.lock().unwrap();
    client.calculate_tag_overlap(input)
}

// ... 나머지 명령어들
```

#### 4. 불필요한 파일 제거
- `packages/core/src/adapters/local/local-core-client.ts` (삭제)
- `packages/core/src/adapters/local/local-core-store.ts` (삭제)
- `apps/mobile/src/features/core/native-core-client.ts` (웹 폴백만 유지)

### 성공 기준:

#### 자동 검증:
- [ ] 린트 통과: `bun run lint`
- [ ] 타입 체크 통과: `bun run typecheck`
- [ ] 모바일 앱 빌드 성공

#### 수동 검증:
- [ ] 기존 기능 회귀 없음
- [ ] 앱 시작 시간 개선 확인
- [ ] 메모리 사용량 확인

---

## 테스트 전략

### 단위 테스트 (Rust)
- `cargo test`로 실행
- 각 CoreClient 메서드에 대한 테스트
- 엣지 케이스: null 값, 빈 배열, 경계값

### 통합 테스트 (TypeScript)
- 기존 `packages/core` 테스트 활용
- CoreClient 인터페이스 호환성 검증

### 수동 테스트 시나리오
1. **지식 항목 플로우**
   - 새 항목 저장 → 목록 조회 → 수정 → 복습 표시
2. **대화 플로우**
   - 새 대화 생성 → 메시지 추가 → 대화 목록 → 삭제
3. **추천 시스템**
   - 추천 저장 → 대기 중인 추천 조회 → 응답
4. **복습 스케줄**
   - 초기화 → 복습 완료 → 다음 복습일 계산

## 성능 고려사항

### 예상 개선점
- JSON 직렬화/역직렬화 제거 → **~50% 속도 향상**
- SQLite 인덱싱 → **대량 조회 최적화**
- Rust 계산 로직 → **동기 메서드 즉시 실행**

### 벤치마크 계획
```bash
# Phase 1 완료 후
cargo bench --package glimpse-core-rust

# Phase 2 완료 후
# 앱 내에서 프로파일링
```

## 위험 요소 및 대응

| 위험 | 가능성 | 영향 | 대응 |
|------|--------|------|------|
| Craby API 변경 | 중간 | 높음 | RC 버전 사용, 릴리즈 노트 모니터링 |
| SQLite 스키마 마이그레이션 | 낮음 | 중간 | 버전 관리, 마이그레이션 함수 작성 |
| iOS/Android 빌드 복잡도 | 높음 | 높음 | Craby 템플릿 활용, CI/CD 구축 |
| 타입 불일치 | 중간 | 중간 | `@glimpse/shared` 타입과 Rust struct 동기화 |

## 참고 자료

- 리서치 문서: `thoughts/shared/research/2026-03-25_packages-core-rust-integration.md`
- Craby 문서: https://craby.rs
- rusqlite 문서: https://docs.rs/rusqlite
- llama.rn JSI 패턴: https://github.com/mybigday/llama.rn

## 다음 단계

1. Phase 1 시작: Rust 프로젝트 생성
2. SQLite 스키마 설계
3. CoreClient trait 구현
4. 단위 테스트 작성
5. Craby 통합 (Phase 2)
