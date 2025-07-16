import ActivityKit
import SwiftUI
import ExpoModulesCore

final class UnavailableException: GenericException<Void> {
    override var reason: String {
        "Live activities are not available on this system."
    }
}

struct WidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct StartActivityReturnType: Record {
    @Field
    var id: String?
    
    @Field
    var message: String?
    
    @Field
    var isSuccess: Bool
}

struct StopActivityReturnType: Record {
    @Field
    var id: String?
    
    @Field
    var message: String?
    
    @Field
    var isSuccess: Bool
}

// MARK: Module definition

public class ExpoLiveControllerModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ExpoLiveController")
        
        AsyncFunction("start") {
            (
                data: String,
                promise: Promise
            ) in
            guard #available(iOS 16.2, *) else {
                throw UnavailableException(())
            }
            
            let info = ActivityAuthorizationInfo()
            guard info.areActivitiesEnabled else {
                throw UnavailableException(())
            }
            
            let initialContentState = WidgetAttributes.ContentState(emoji: data)
            let activityAttributes = WidgetAttributes(name: "")
            
            let activityContent = ActivityContent(state: initialContentState, staleDate: nil)
            
            do {
                let activity = try Activity.request(attributes: activityAttributes, content: activityContent)
                if let id = activity.id as String? {
                    return promise.resolve(StartActivityReturnType(id: Field(wrappedValue: id), isSuccess: Field(wrappedValue: true)))
                } else {
                    return promise.resolve(StartActivityReturnType(message: Field(wrappedValue: "Failed to create an activity based on params: \(initialContentState.emoji)"), isSuccess: Field(wrappedValue: false)))
                }
            } catch {
                return promise.resolve(StartActivityReturnType(message: Field(wrappedValue: "Error requesting Live Activity \(error.localizedDescription)."), isSuccess: Field(wrappedValue: false)))
            }
        }
        
        AsyncFunction("stop") { (id: String, promise: Promise) in
            guard #available(iOS 16.2, *) else {
                throw UnavailableException(())
            }
            
            log.debug("Stopping activity \(id)")
            
            Task {
                if let activity = Activity<WidgetAttributes>.activities.first(where: { $0.id == id }) {
                    await activity.end(dismissalPolicy: .immediate)
                    return promise.resolve(StopActivityReturnType(id: Field(wrappedValue: id), isSuccess: Field(wrappedValue: true)))
                } else {
                    return promise.resolve(StopActivityReturnType(message: Field(wrappedValue: "Activity with ID \(id) not found"), isSuccess: Field(wrappedValue: false)))
                }
            }
        }
    }
}
