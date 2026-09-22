import React from "react";
import { ScrollView, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

// A crash anywhere in the screen tree used to mean a frozen or blank
// screen in a release build, with nothing for the user to relay back —
// this catches it and shows the actual error instead, with a way to
// recover without force-quitting the app.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={{ flex: 1, backgroundColor: "#f5f7fa", paddingTop: 60 }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <Text variant="display" weight="semibold" size={20}>
            エラーが発生しました
          </Text>
          <Text color="inkSoft">
            予期しない問題が発生しました。お手数ですが、下の内容をサポートまでお伝えいただけると助かります。
          </Text>
          <View style={{ borderWidth: 1, borderColor: "#e5b8b8", borderRadius: 8, padding: 12 }}>
            <Text size={12} color="rose">
              {error.name}: {error.message}
            </Text>
          </View>
          <Button label="やり直す" onPress={this.reset} />
        </ScrollView>
      </View>
    );
  }
}
