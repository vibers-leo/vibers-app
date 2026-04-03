import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Globe, Smartphone, Brain, Server } from "lucide-react-native";

const SERVICES = [
  {
    id: "1",
    icon: Globe,
    title: "웹 개발",
    desc: "Next.js, Rails 기반 고성능 웹 서비스",
    price: "협의",
  },
  {
    id: "2",
    icon: Smartphone,
    title: "앱 개발",
    desc: "Expo (React Native) 크로스플랫폼 앱",
    price: "협의",
  },
  {
    id: "3",
    icon: Brain,
    title: "AI 솔루션",
    desc: "OpenAI, Claude 기반 맞춤 AI 서비스",
    price: "협의",
  },
  {
    id: "4",
    icon: Server,
    title: "CTO 구독",
    desc: "월정액 기술 책임자 서비스",
    price: "BASIC 50만원~",
  },
];

export default function ServicesScreen() {
  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-bg">
      <ScrollView className="flex-1 px-5 pt-4">
        <Text className="text-text text-2xl font-bold mb-2">서비스 소개</Text>
        <Text className="text-text-muted mb-6">계발자들이 제공하는 기술 서비스</Text>

        {SERVICES.map((svc) => {
          const Icon = svc.icon;
          return (
            <Pressable key={svc.id} className="bg-card rounded-2xl p-5 mb-4 border border-border">
              <View className="flex-row items-center mb-3">
                <View className="bg-primary/20 p-3 rounded-xl">
                  <Icon size={24} color="#39FF14" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-text font-bold text-lg">{svc.title}</Text>
                  <Text className="text-text-muted text-sm mt-1">{svc.desc}</Text>
                </View>
              </View>
              <View className="border-t border-border pt-3 mt-1">
                <Text className="text-primary font-bold">{svc.price}</Text>
              </View>
            </Pressable>
          );
        })}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
