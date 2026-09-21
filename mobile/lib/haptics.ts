import * as Haptics from "expo-haptics";

// Haptics can throw on unsupported hardware/simulators — every call here is
// fire-and-forget so a missing Taptic Engine never breaks an interaction.
export const haptics = {
  tap() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  success() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warning() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
  selection() {
    Haptics.selectionAsync().catch(() => {});
  },
};
