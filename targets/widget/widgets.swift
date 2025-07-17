import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> ContentEntry {
      ContentEntry(content: "오늘의 나는?")
    }
  
  func getSnapshot(in context: Context, completion: @escaping (ContentEntry) -> Void) {
    let entry = ContentEntry(date: Date(), content: "오늘의 나는?")
    completion(entry)
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<ContentEntry>) -> Void) {
    let userDefaults = UserDefaults(suiteName: "group.glimpse.data")
    let contentJsonData = userDefaults?.string(forKey: "widgetData") ?? "Hello, Glimpse!"
    
    var contents : [String] = []
    var entries: [ContentEntry] = []
    
    do {
      let jsonData = Data(contentJsonData.utf8)
      contents = try JSONDecoder().decode([String].self, from: jsonData)
    } catch {
      print(error)
    }
    
    let currentDate = Date()
    for hourOffset in 0..<5 {
      let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
      let entry = ContentEntry(date: entryDate, content: contents[hourOffset % contents.count])
      entries.append(entry);
    }
    
    let timeline = Timeline(entries: entries, policy: .atEnd)
    completion(timeline)
  }
}

struct ContentEntry: TimelineEntry {
    var date: Date = Date()
    let content: String
}

struct widgetEntryView : View {
  var content: String

    var body: some View {
        VStack {
            Text(content)
        }
    }
}

struct widget: Widget {
    let kind: String = "widget"

    var body: some WidgetConfiguration {
      StaticConfiguration(kind: kind, provider: Provider()) { entry in
        widgetEntryView(content: entry.content)
      }.supportedFamilies([.systemSmall])
        .configurationDisplayName("Glimpse Widget")
        .description("글림스 위젯입니다.")
    }
}

struct wedgets_preview: PreviewProvider {
  static var previews: some View {
    widgetEntryView(content: "콘텐츠입니다").previewContext(WidgetPreviewContext(family: .systemSmall))
  }
}
