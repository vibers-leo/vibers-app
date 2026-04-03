import { View, Text, Pressable, ScrollView, ActivityIndicator, TextInput } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Zap, Mail, ShieldCheck, ArrowRight, ChevronLeft, Globe } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = (type: string) => {
    setLoading(true);
    // Mimic login delay
    setTimeout(() => {
      setLoading(false);
      router.replace("/(tabs)");
    }, 1500);
  };

  return (
    <View className="flex-1 bg-[#050505]">
      <LinearGradient
        colors={["#39FF14" + "10", "transparent"]}
        className="absolute top-0 left-0 right-0 h-[60%]"
      />
      
      <SafeAreaView className="flex-1">
        <View className="px-6 pt-4">
           <Pressable 
             onPress={() => router.back()} 
             className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center border border-white/5"
           >
              <ChevronLeft size={24} color="#fff" />
           </Pressable>
        </View>

        <ScrollView contentContainerClassName="px-6 pt-10 pb-20">
          <Animated.View entering={FadeInDown.delay(200)} className="items-center mb-12">
            <View className="w-20 h-20 bg-[#39FF14] rounded-[30px] items-center justify-center shadow-2xl shadow-[#39FF14]/40">
              <Zap size={40} color="#000" fill="#000" />
            </View>
            <Text className="text-white text-4xl font-black mt-8 tracking-tighter">VIBERS <Text className="text-[#39FF14]">HUB</Text></Text>
            <Text className="text-white/40 font-bold mt-2 uppercase tracking-[4px]">Elite Agency Auth</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400)} className="gap-4">
            <View className="bg-white/5 rounded-3xl p-5 border border-white/5 flex-row items-center">
               <Mail size={20} color="#39FF14" className="mr-4" />
               <TextInput 
                 placeholder="Operator ID / Email"
                 placeholderTextColor="#555"
                 className="flex-1 text-white font-bold"
               />
            </View>

            <View className="bg-white/5 rounded-3xl p-5 border border-white/5 flex-row items-center mb-4">
               <ShieldCheck size={20} color="#39FF14" className="mr-4" />
               <TextInput 
                 placeholder="Access Key"
                 placeholderTextColor="#555"
                 secureTextEntry
                 className="flex-1 text-white font-bold"
               />
            </View>

            <Pressable 
              onPress={() => handleLogin('email')}
              disabled={loading}
              className="bg-[#39FF14] py-5 rounded-3xl items-center shadow-xl shadow-[#39FF14]/20 active:scale-[0.98]"
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <View className="flex-row items-center gap-2">
                  <Text className="text-black font-black text-lg">INITIALIZE SESSION</Text>
                  <ArrowRight size={20} color="#000" strokeWidth={3} />
                </View>
              )}
            </Pressable>

            <View className="flex-row items-center my-6">
               <View className="flex-1 h-[1px] bg-white/5" />
               <Text className="text-white/20 px-4 font-black uppercase text-[10px]">Strategic Partners</Text>
               <View className="flex-1 h-[1px] bg-white/5" />
            </View>

            <View className="flex-row gap-4">
               <Pressable 
                 onPress={() => handleLogin('github')}
                 className="flex-1 bg-white/5 py-5 rounded-3xl items-center border border-white/5 active:bg-white/10"
               >
                  <Globe size={24} color="#fff" />
               </Pressable>
               <Pressable 
                 onPress={() => handleLogin('google')}
                 className="flex-1 bg-white/5 py-5 rounded-3xl items-center border border-white/5 active:bg-white/10"
               >
                  <View className="w-6 h-6 bg-[#39FF14]/20 rounded-md" />
               </Pressable>
            </View>
          </Animated.View>
          
          <Animated.View entering={FadeInUp.delay(600)} className="mt-12 items-center">
             <Text className="text-white/30 text-xs font-bold">Authorized Access Only.</Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
