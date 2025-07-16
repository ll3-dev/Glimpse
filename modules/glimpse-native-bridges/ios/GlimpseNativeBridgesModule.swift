import ExpoModulesCore
import WidgetKit

public class GlimpseNativeBridgesModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GlimpseNativeBridges")

    Constants([:])

    Function("set") { (key: String, value: String, group: String?) in
      let userDefaults = UserDefaults(suiteName: group)
      userDefaults?.set(value, forKey: key)
    }
  }
}
