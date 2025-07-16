import { NativeModule, requireNativeModule } from "expo";
import { GlimpseNativeBridgesModuleEvents } from "./GlimpseNativeBridges.types";

declare class GlimpseNativeBridgesModule extends NativeModule<GlimpseNativeBridgesModuleEvents> {}

export default requireNativeModule<GlimpseNativeBridgesModule>(
  "GlimpseNativeBridges"
);
