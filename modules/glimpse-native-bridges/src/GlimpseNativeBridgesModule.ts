import { requireNativeModule } from "expo";
import { GlimpseNativeBridgesModuleEvents } from "./GlimpseNativeBridges.types";

export default requireNativeModule<GlimpseNativeBridgesModuleEvents>(
  "GlimpseNativeBridges"
);
