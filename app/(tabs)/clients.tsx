import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { User, Crown, Clock } from "lucide-react-native";

const MOCK_CLIENTS = [
  { id: "1", name: "김사장", plan: "BASIC", status: "활성", since: "2026.01", projects: 2 },
  { id: "2", name: "이대표", plan: "PRO", status: "활성", since: "2025.11", projects: 5 },
  { id: "3", name: "박과장", plan: "MASTER", status: "활성", since: "2025.09", projects: 8 },
];

const PLAN_COLORS: Record<string, string> = {
  BASIC: "#39FF14",
  PRO: "#00D9FF",
  MASTER: "#FFD700",
};

export default function ClientsScreen() {
  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-bg">
      <ScrollView className="flex-1 px-5 pt-4">
        <Text className="text-text text-2xl font-bold mb-2">고객 관리</Text>
        <Text className="text-text-muted mb-6">CTO 구독 고객 현황</Text>

        {/* 요약 카드 */}
        <View className="flex-row mb-6 gap-3">
          <View className="flex-1 bg-card rounded-xl p-4 border border-border items-center">
            <Text className="text-primary text-2xl font-bold">3</Text>
            <Text className="text-text-muted text-sm mt-1">전체 고객</Text>
          </View>
          <View className="flex-1 bg-card rounded-xl p-4 border border-border items-center">
            <Text className="text-secondary text-2xl font-bold">15</Text>
            <Text className="text-text-muted text-sm mt-1">관리 프로젝트</Text>
          </View>
        </View>

        {MOCK_CLIENTS.map((client) => (
          <Pressable key={client.id} className="bg-card rounded-xl p-4 mb-3 border border-border">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="bg-surface p-2 rounded-full">
                  <User size={20} color="#888888" />
                </View>
                <View className="ml-3">
                  <Text className="text-text font-bold">{client.name}</Text>
                  <View className="flex-row items-center mt-1">
                    <Crown size={12} color={PLAN_COLORS[client.plan]} />
                    <Text className="text-text-muted text-xs ml-1">{client.plan}</Text>
                  </View>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-text text-sm font-semibold">{client.projects}개 프로젝트</Text>
                <View className="flex-row items-center mt-1">
                  <Clock size={10} color="#888888" />
                  <Text className="text-text-muted text-xs ml-1">{client.since}~</Text>
                </View>
              </View>
            </View>
          </Pressable>
        ))}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
