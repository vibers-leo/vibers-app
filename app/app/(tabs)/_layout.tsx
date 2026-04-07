import { Tabs } from "expo-router";
import { Home, MessageCircle, Monitor, Settings } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#39FF14",
        tabBarInactiveTintColor: "#555555",
        tabBarStyle: {
          borderTopColor: "#1a1a1a",
          backgroundColor: "#0a0a0a",
        },
        headerStyle: {
          backgroundColor: "#050505",
        },
        headerTintColor: "#f0f0f0",
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 18,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "채팅",
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: "PC 연결",
          tabBarIcon: ({ color, size }) => <Monitor size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "설정",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
