import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> GlintContentEntry {
      GlintContentEntry(content: "-")
    }
  
  func getSnapshot(in context: Context, completion: @escaping (GlintContentEntry) -> Void) {
    let entry = GlintContentEntry(date: Date(), content: "-")
    completion(entry)
  }
  
  func getTimeline(in context: Context, completion: @escaping (Timeline<GlintContentEntry>) -> Void) {
    let userDefaults = UserDefaults(suiteName: "group.glimpse.data")
    let contentJsonData = userDefaults?.string(forKey: "widgetData") ?? "[]"
    
    var contents : [String] = []
    var entries: [GlintContentEntry] = []
    
    do {
      let jsonData = Data(contentJsonData.utf8)
      contents = try JSONDecoder().decode([String].self, from: jsonData)
    } catch {
      print(error)
    }
    
    let currentDate = Date()
    for hourOffset in 0..<5 {
      let entryDate = Calendar.current.date(byAdding: .minute, value: hourOffset * 15, to: currentDate)!
      let entry = GlintContentEntry(date: entryDate, content: contents[hourOffset % contents.count])
      entries.append(entry);
    }
    
    let timeline = Timeline(entries: entries, policy: .atEnd)
    completion(timeline)
  }
}

struct GlintContentEntry: TimelineEntry {
    var date: Date = Date()
    let content: String
}

struct WidgetEntryView : View {
  var content: String

    var body: some View {
        VStack {
            Text(content)
        }
    }
}

struct widget: Widget {
  let kind: String = "kr.ll3.glimpse"

  var body: some WidgetConfiguration {
      StaticConfiguration(kind: kind, provider: Provider()) { entry in
        WidgetEntryView(content: entry.content)
          .containerBackground(.fill.tertiary, for: .widget)
      }.supportedFamilies([.systemSmall])
        .configurationDisplayName("Glimpse Widget")
        .description("글림스 위젯입니다.")
    }
}

#Preview(as: .systemSmall) {
  widget()
} timeline: {
    let date = Date()
  GlintContentEntry(date: date, content: "asdf")
  GlintContentEntry(date: date.addingTimeInterval(60), content: "asdfasdf")
}
