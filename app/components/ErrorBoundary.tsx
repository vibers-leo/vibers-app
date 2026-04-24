import React, { Component, type ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Sentry from "@sentry/react-native";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>💥</Text>
        <Text style={styles.title}>앱 오류가 발생했습니다</Text>
        <Text style={styles.message}>{this.state.error}</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => this.setState({ hasError: false, error: "" })}
        >
          <Text style={styles.btnText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505", justifyContent: "center", alignItems: "center", padding: 32 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 8 },
  message: { color: "#666", fontSize: 14, textAlign: "center", marginBottom: 24 },
  btn: { backgroundColor: "#39FF14", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: "#000", fontSize: 15, fontWeight: "800" },
});
