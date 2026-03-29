import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Zap, ArrowRight } from "lucide-react-native";

const NEWS = [
  { id: "1", title: "AI War 앱 출시 임박", date: "2026.03.29", tag: "출시" },
  { id: "2", title: "러너스커넥트 베타 오픈", date: "2026.03.25", tag: "베타" },
  { id: "3", title: "미션앤퀘스트 업데이트 v2.0", date: "2026.03.20", tag: "업데이트" },
];

const PORTFOLIO = [
  { id: "1", name: "팬이지", desc: "인플루언서 웹 관리 플랫폼", status: "운영중" },
  { id: "2", name: "AI 워", desc: "AI 대전 카드 배틀 게임", status: "개발중" },
  { id: "3", name: "미션앤퀘스트", desc: "미션/퀘스트 생산성 앱", status: "개발중" },
  { id: "4", name: "누수체크", desc: "누수 점검 서비스", status: "운영중" },
];

export default function HomeScreen() {
  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-bg">
      <ScrollView className="flex-1 px-5 pt-4">
        {/* 히어로 */}
        <View className="bg-surface rounded-2xl p-6 mb-6 border border-border">
          <View className="flex-row items-center mb-3">
            <Zap size={28} color="#39FF14" />
            <Text className="text-primary text-2xl font-bold ml-2">계발자들</Text>
          </View>
          <Text className="text-text text-base leading-6">
            비즈니스를 위한 기술 파트너.{"\n"}
            웹, 앱, AI — 모든 것을 만듭니다.
          </Text>
        </View>

        {/* 최근 소식 */}
        <Text className="text-text text-lg font-bold mb-3">최근 소식</Text>
        {NEWS.map((item) => (
          <Pressable key={item.id} className="bg-card rounded-xl p-4 mb-3 border border-border">
            <View className="flex-row items-center justify-between mb-1">
              <View className="bg-primary/20 px-2 py-1 rounded">
                <Text className="text-primary text-xs font-bold">{item.tag}</Text>
              </View>
              <Text className="text-text-muted text-xs">{item.date}</Text>
            </View>
            <Text className="text-text font-semibold mt-2">{item.title}</Text>
          </Pressable>
        ))}

        {/* 포트폴리오 */}
        <View className="flex-row items-center justify-between mt-4 mb-3">
          <Text className="text-text text-lg font-bold">포트폴리오</Text>
          <ArrowRight size={18} color="#39FF14" />
        </View>
        {PORTFOLIO.map((item) => (
          <Pressable key={item.id} className="bg-card rounded-xl p-4 mb-3 border border-border flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-text font-bold">{item.name}</Text>
              <Text className="text-text-muted text-sm mt-1">{item.desc}</Text>
            </View>
            <View className={`px-2 py-1 rounded ${item.status === "운영중" ? "bg-success/20" : "bg-secondary/20"}`}>
              <Text className={`text-xs font-bold ${item.status === "운영중" ? "text-success" : "text-secondary"}`}>{item.status}</Text>
            </View>
          </Pressable>
        ))}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
