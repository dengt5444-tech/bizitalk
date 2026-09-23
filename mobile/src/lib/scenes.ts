import type { ImageSourcePropType } from "react-native";

// Same stock photos as the web app (../../public/images/scenes), bundled so
// list screens render instantly and offline.
export type SceneKey =
  | "meeting"
  | "desk-call"
  | "interview"
  | "negotiation"
  | "presentation"
  | "report"
  | "support"
  | "networking"
  | "casual";

export const SCENE_IMAGES: Record<SceneKey, ImageSourcePropType> = {
  meeting: require("../../assets/scenes/meeting.jpg"),
  "desk-call": require("../../assets/scenes/desk-call.jpg"),
  interview: require("../../assets/scenes/interview.jpg"),
  negotiation: require("../../assets/scenes/negotiation.jpg"),
  presentation: require("../../assets/scenes/presentation.jpg"),
  report: require("../../assets/scenes/report.jpg"),
  support: require("../../assets/scenes/support.jpg"),
  networking: require("../../assets/scenes/networking.jpg"),
  casual: require("../../assets/scenes/casual.jpg"),
};
