import ExpoModulesCore
import WidgetKit

public class GlimpseNativeBridgesModule: Module {
    public func definition() -> ModuleDefinition {
        Name("GlimpseNativeBridges")
        
        Constants([:])
        
        Function("set") { (key: String, value: Int, group: String?) in
            let userDefaults = UserDefaults(suiteName: group)
            userDefaults?.set(value, forKey: key)
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }
        }
    }
}
