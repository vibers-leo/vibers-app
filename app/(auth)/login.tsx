import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Zap } from "lucide-react-native";

export default function LoginScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="flex-1 items-center justify-center px-6">
        <Zap size={64} color="#39FF14" />
        <Text className="text-3xl font-bold text-text mt-6 mb-2">계발자들</Text>
        <Text className="text-text-muted text-center mb-10">
          에이전시 소개 & CTO 고객 관리
        </Text>

        <Pressable className="w-full bg-primary py-4 rounded-xl items-center mb-4">
          <Text className="text-bg font-bold text-lg">Google로 로그인</Text>
        </Pressable>

        <Pressable className="w-full border border-border py-4 rounded-xl items-center">
          <Text className="text-text font-bold text-lg">이메일로 로그인</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
