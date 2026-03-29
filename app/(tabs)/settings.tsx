import { View, Text, ScrollView, Pressable, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, Moon, Shield, Info, LogOut, ChevronRight } from "lucide-react-native";
import { useState } from "react";

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-bg">
      <ScrollView className="flex-1 px-5 pt-4">
        <Text className="text-text text-2xl font-bold mb-6">설정</Text>

        <Text className="text-text-muted text-xs font-bold uppercase mb-2 ml-1">일반</Text>
        <View className="bg-card rounded-xl border border-border mb-6">
          <View className="flex-row items-center justify-between p-4 border-b border-border">
            <View className="flex-row items-center">
              <Bell size={20} color="#39FF14" />
              <Text className="text-text ml-3">알림</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: "#2a2a2a", true: "#39FF14" }}
              thumbColor="#fff"
            />
          </View>
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <Moon size={20} color="#39FF14" />
              <Text className="text-text ml-3">다크 모드</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: "#2a2a2a", true: "#39FF14" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <Text className="text-text-muted text-xs font-bold uppercase mb-2 ml-1">정보</Text>
        <View className="bg-card rounded-xl border border-border mb-6">
          <Pressable className="flex-row items-center justify-between p-4 border-b border-border">
            <View className="flex-row items-center">
              <Shield size={20} color="#888" />
              <Text className="text-text ml-3">개인정보 처리방침</Text>
            </View>
            <ChevronRight size={18} color="#555" />
          </Pressable>
          <Pressable className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <Info size={20} color="#888" />
              <Text className="text-text ml-3">앱 정보</Text>
            </View>
            <Text className="text-text-muted text-sm">v1.0.0</Text>
          </Pressable>
        </View>

        <Pressable className="bg-error/10 rounded-xl p-4 flex-row items-center justify-center">
          <LogOut size={20} color="#ff3366" />
          <Text className="text-error font-bold ml-2">로그아웃</Text>
        </Pressable>
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
