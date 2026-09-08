import Foundation
import AppIntents
import UniformTypeIdentifiers

/**
 * Shortcuts 캡처 — 텍스트/이미지를 공유 확장과 같은 App Group 수용 레코드에 써서
 * 앱 기동/포그라운드 시 기존 흡수 파이프라인(processPendingBatch)으로 저장한다.
 * 앱이 죽어 있어도 백그라운드 실행되므로 "잠금화면→3초 캡처"가 된다.
 * 이미지는 App Group 컨테이너의 PendingShareImages 디렉터리에 파일로 남기고
 * 파일명만 기록한다 — 앱이 흡수할 때 OCR 텍스트를 뽑아 screenshot 항목으로 저장한다.
 */
@available(iOS 16.0, *)
struct CaptureQuickNoteIntent: AppIntent {
    static var title: LocalizedStringResource = "빠른 노트 캡처"
    static var description = IntentDescription("텍스트나 이미지를 Glimpse 지식 라이브러리에 빠르게 저장합니다.")

    @Parameter(title: "노트")
    var text: String?

    @Parameter(title: "이미지")
    var image: IntentFile?

    @MainActor
    func perform() async throws -> some IntentResult {
        guard let defaults = UserDefaults(suiteName: AppGroupModule.appGroupIdentifier) else {
            return .result()
        }
        let key = AppGroupModule.sharedKey

        if let text = text, !text.isEmpty {
            var existing = defaults.stringArray(forKey: key) ?? []
            existing.append(text)
            defaults.set(existing, forKey: key)
        }

        if let image = image {
            Self.writePendingImage(image, defaults: defaults)
        }

        defaults.set(true, forKey: "\(key)_directSave")
        defaults.synchronize()
        return .result()
    }

    private static func writePendingImage(_ image: IntentFile, defaults: UserDefaults) {
        guard
            let container = FileManager.default.containerURL(
                forSecurityApplicationGroupIdentifier: AppGroupModule.appGroupIdentifier
            )
        else { return }
        let directory = container.appendingPathComponent(
            AppGroupModule.pendingImagesDirectory,
            isDirectory: true
        )
        do {
            try FileManager.default.createDirectory(
                at: directory,
                withIntermediateDirectories: true
            )
            let ext = image.type?.preferredFilenameExtension ?? "img"
            let filename = "\(UUID().uuidString).\(ext)"
            try image.data.write(to: directory.appendingPathComponent(filename))
            var existing = defaults.stringArray(forKey: AppGroupModule.imageKey) ?? []
            existing.append(filename)
            defaults.set(existing, forKey: AppGroupModule.imageKey)
        } catch {
            // 이미지 하나의 쓰기 실패가 텍스트 캡처까지 막지 않게 조용히 건너뛴다.
        }
    }
}

@available(iOS 16.0, *)
struct GlimpseShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: CaptureQuickNoteIntent(),
            phrases: [
                "\(.applicationName)에 노트 저장",
                "Quick capture in \(.applicationName)",
            ],
            shortTitle: "노트 캡처",
            systemImageName: "square.and.pencil"
        )
    }
}
