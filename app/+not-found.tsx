import { View, Text } from "react-native";
import { Link } from "expo-router";

export default function NotFound() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <Text className="text-2xl font-bold text-text mb-4">페이지를 찾을 수 없습니다</Text>
      <Link href="/" className="text-primary text-lg">홈으로 돌아가기</Link>
    </View>
  );
}
