import { View, Text, ScrollView, Pressable, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Zap, ArrowRight, Bell, Menu, Grid, Smartphone, Layout as LayoutIcon, Cpu, ChevronRight, Globe, Layers, Users, Heart, Star, Sparkles, MapPin, Activity, User } from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, FadeIn, Layout, SlideInRight } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const NEWS = [
  { id: "1", title: "AI War Global Launch", date: "2026.03.29", tag: "Release", color: "#39FF14" },
  { id: "2", title: "RunnersConnect Beta Open", date: "2026.03.25", tag: "Beta", color: "#3b82f6" },
  { id: "3", title: "Mission & Quest v2.0", date: "2026.03.20", tag: "Update", color: "#f59e0b" },
];

const PORTFOLIO = [
  { id: "1", name: "FanEasy", desc: "Influencer Management Hub", status: "Live", icon: Globe, color: "#3b82f6" },
  { id: "2", name: "AI War", desc: "AI Powered Battle Card Game", status: "Live", icon: Cpu, color: "#39FF14" },
  { id: "3", name: "Mission 7", desc: "Gamified Productivity System", status: "Dev", icon: LayoutIcon, color: "#8b5cf6" },
  { id: "4", name: "NusuCheck", desc: "Utility Inspection Service", status: "Live", icon: Layers, color: "#10b981" },
  { id: "5", name: "DUS", desc: "Creative Studio Portfolio", status: "Live", icon: Grid, color: "#f59e0b" },
  { id: "6", name: "Honsul", desc: "Drinking Buddy Matching", status: "Dev", icon: Users, color: "#ec4899" },
  { id: "7", name: "RunnersConnect", desc: "Running Social Platform", status: "Live", icon: MapPin, color: "#f97316" },
  { id: "8", name: "Gabojago", desc: "Travel Grouping Service", status: "Live", icon: Globe, color: "#06b6d4" },
  { id: "9", name: "MateCheck", desc: "Shared Living Care", status: "Live", icon: Heart, color: "#10b981" },
  { id: "10", name: "MyRatingIs", desc: "Project Insight Ratings", status: "Live", icon: Star, color: "#6366f1" },
  { id: "11", name: "PremiumPage", desc: "Business Showcase", status: "Live", icon: Sparkles, color: "#f59e0b" },
  { id: "12", name: "Nanobanana", desc: "AI Guidebook Engine", status: "Live", icon: Zap, color: "#ef4444" },
  { id: "13", name: "Goodzz", desc: "Creator Commerce Shop", status: "Dev", icon: Sparkles, color: "#8b5cf6" },
  { id: "14", name: "Vibers Portal", desc: "Ecosystem Hub", status: "Live", icon: Grid, color: "#39FF14" },
];

export default function HomeScreen() {
  const router = useRouter();

  const handleLoginPress = () => {
    router.push("/(auth)/login");
  };

  return (
    <View className="flex-1 bg-[#050505]">
      <StatusBar style="light" />
      
      {/* 커스텀 헤더 */}
      <View className="px-6 pt-14 pb-4 flex-row items-center justify-between border-b border-white/5">
        <View className="flex-row items-center gap-2">
           <View className="w-10 h-10 bg-[#39FF14] rounded-xl items-center justify-center">
             <Zap size={20} color="#000" fill="#000" />
           </View>
           <Text className="text-white text-2xl font-black tracking-tight uppercase">Vibers</Text>
        </View>
        <View className="flex-row items-center gap-4">
           <Pressable 
             onPress={handleLoginPress}
             className="w-10 h-10 bg-[#39FF14]/10 rounded-xl items-center justify-center border border-[#39FF14]/20"
           >
              <User size={20} color="#39FF14" />
           </Pressable>
           <Pressable className="w-10 h-10 bg-white/5 rounded-xl items-center justify-center border border-white/5">
              <Menu size={20} color="#fff" />
           </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-6 pb-20">
          
          {/* 히어로 배너 */}
          <Animated.View entering={FadeInDown.duration(800)}>
            <LinearGradient
              colors={['#111', '#000']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-[40px] p-8 border border-white/10 shadow-2xl relative overflow-hidden"
            >
              <View className="flex-row items-center mb-6">
                <View className="bg-[#39FF14]/10 px-3 py-1 rounded-full border border-[#39FF14]/20">
                  <Text className="text-[#39FF14] text-[10px] font-black uppercase tracking-widest">Master Portal v4.0</Text>
                </View>
              </View>
              
              <Text className="text-white text-3xl font-black leading-tight mb-2">
                Ecosystem{"\n"}
                <Text className="text-[#39FF14]">Orchestration</Text>
              </Text>
              
              <Text className="text-white/50 text-sm font-bold mb-8">
                Managing 14 production grade{"\n"}applications in real-time.
              </Text>

              <View className="flex-row gap-4">
                 <Pressable className="bg-[#39FF14] rounded-2xl py-4 px-6 flex-row items-center">
                   <Grid size={18} color="#000" />
                   <Text className="text-black font-black ml-2">Console</Text>
                 </Pressable>
                 <Pressable className="bg-white/10 rounded-2xl py-4 px-6 flex-row items-center border border-white/5">
                   <Smartphone size={18} color="#fff" />
                   <Text className="text-white font-black ml-2">Devices</Text>
                 </Pressable>
              </View>

              {/* 데코 엘리먼트 */}
              <View className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#39FF14]/5 rounded-full blur-3xl" />
            </LinearGradient>
          </Animated.View>

          {/* 소식 제목 */}
          <View className="flex-row items-center justify-between mt-12 mb-6">
             <Text className="text-white text-xl font-black">System Pulse</Text>
             <Pressable className="flex-row items-center gap-1">
               <Text className="text-[#39FF14] text-sm font-black">All Logs</Text>
             </Pressable>
          </View>

          {/* 뉴스 카드 가로 스크롤 */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 24, gap: 16 }}>
             {NEWS.map((item, idx) => (
               <Animated.View key={item.id} entering={SlideInRight.delay(idx * 100 + 400)}>
                  <Pressable className="bg-white/5 p-6 rounded-[32px] border border-white/5 w-72">
                    <View className="flex-row items-center justify-between mb-4">
                       <View className="px-3 py-1 rounded-lg" style={{ backgroundColor: `${item.color}10` }}>
                          <Text className="text-[10px] font-black uppercase tracking-tighter" style={{ color: item.color }}>{item.tag}</Text>
                       </View>
                       <Text className="text-white/20 text-[10px] font-black">{item.date}</Text>
                    </View>
                    <Text className="text-white font-bold text-lg mb-4" numberOfLines={1}>{item.title}</Text>
                    <ChevronRight size={20} color="#333" />
                  </Pressable>
               </Animated.View>
             ))}
          </ScrollView>

          {/* 포트폴리오 섹션 */}
          <View className="flex-row items-center justify-between mt-12 mb-6">
            <Text className="text-white text-xl font-black">Portfolio Ecosystem</Text>
            <ArrowRight size={20} color="#39FF14" />
          </View>

          {PORTFOLIO.map((item, idx) => (
            <Animated.View key={item.id} entering={FadeInUp.delay(idx * 100 + 600)} layout={Layout.springify()}>
              <Pressable 
                className="bg-white/5 p-6 rounded-[32px] mb-4 border border-white/5 flex-row items-center"
              >
                <View className="w-14 h-14 rounded-2xl items-center justify-center mr-5" style={{ backgroundColor: `${item.color}10` }}>
                  <item.icon size={24} color={item.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1">Vibers Protocol</Text>
                  <Text className="text-white font-bold text-[17px] mb-1">{item.name}</Text>
                  <Text className="text-white/40 text-xs font-medium" numberOfLines={1}>{item.desc}</Text>
                </View>
                <View className="items-end">
                   <View className="px-2 py-1 rounded-lg border border-white/5">
                      <Text className={`text-[10px] font-black ${item.status === 'Live' ? 'text-[#39FF14]' : 'text-blue-400'}`}>{item.status}</Text>
                   </View>
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
