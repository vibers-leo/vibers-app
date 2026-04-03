import { View, Text, ScrollView, TextInput, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, Mail, Phone, MapPin } from "lucide-react-native";

export default function ContactScreen() {
  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-bg">
      <ScrollView className="flex-1 px-5 pt-4">
        <Text className="text-text text-2xl font-bold mb-2">문의하기</Text>
        <Text className="text-text-muted mb-6">프로젝트 상담을 원하시면 연락 주세요</Text>

        {/* 연락처 정보 */}
        <View className="bg-card rounded-xl p-4 mb-6 border border-border">
          <View className="flex-row items-center mb-3">
            <Mail size={18} color="#39FF14" />
            <Text className="text-text ml-3">contact@vibers.co.kr</Text>
          </View>
          <View className="flex-row items-center mb-3">
            <Phone size={18} color="#39FF14" />
            <Text className="text-text ml-3">010-0000-0000</Text>
          </View>
          <View className="flex-row items-center">
            <MapPin size={18} color="#39FF14" />
            <Text className="text-text ml-3">서울특별시</Text>
          </View>
        </View>

        {/* 문의 폼 */}
        <Text className="text-text font-bold mb-3">문의 내용</Text>
        <TextInput
          placeholder="이름"
          placeholderTextColor="#555"
          className="bg-card border border-border rounded-xl px-4 py-3 text-text mb-3"
        />
        <TextInput
          placeholder="이메일"
          placeholderTextColor="#555"
          className="bg-card border border-border rounded-xl px-4 py-3 text-text mb-3"
          keyboardType="email-address"
        />
        <TextInput
          placeholder="문의 내용을 입력해주세요"
          placeholderTextColor="#555"
          className="bg-card border border-border rounded-xl px-4 py-3 text-text mb-4 min-h-[120px]"
          multiline
          textAlignVertical="top"
        />

        <Pressable className="bg-primary py-4 rounded-xl flex-row items-center justify-center mb-8">
          <Send size={18} color="#050505" />
          <Text className="text-bg font-bold text-lg ml-2">전송하기</Text>
        </Pressable>
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
