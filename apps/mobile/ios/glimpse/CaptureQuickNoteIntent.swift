import Foundation
import AppIntents

/**
 * Shortcuts 캡처 — 텍스트를 공유 확장과 같은 App Group 수용 레코드에 써서
 * 앱 기동/포그라운드 시 기존 흡수 파이프라인(processPendingBatch)으로 저장한다.
 * 앱이 죽어 있어도 백그라운드 실행되므로 "잠금화면→3초 캡처"가 된다.
 */
@available(iOS 16.0, *)
struct CaptureQuickNoteIntent: AppIntent {
    static var title: LocalizedStringResource = "빠른 노트 캡처"
    static var description = IntentDescription("텍스트를 Glimpse 지식 라이브러리에 빠르게 저장합니다.")

    @Parameter(title: "노트")
    var text: String

    @MainActor
    func perform() async throws -> some IntentResult {
        guard let defaults = UserDefaults(suiteName: AppGroupModule.appGroupIdentifier) else {
            return .result()
        }
        let key = AppGroupModule.sharedKey
        var existing = defaults.stringArray(forKey: key) ?? []
        existing.append(text)
        defaults.set(existing, forKey: key)
        defaults.set(true, forKey: "\(key)_directSave")
        defaults.synchronize()
        return .result()
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
