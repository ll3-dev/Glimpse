import { Tabs, useRouter } from "expo-router";
import { Library, Sparkles, RotateCcw, MessageCircle } from "lucide-react-native";
import { View, TouchableOpacity } from "react-native";
import { Plus } from "@/src/ui/icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1">
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#000000",
          tabBarInactiveTintColor: "#9ca3af",
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: "#f1f1f1",
            elevation: 0,
            shadowOpacity: 0,
            backgroundColor: "#ffffff",
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "500",
            marginBottom: 4,
          },
          tabBarIconStyle: {
            marginTop: 4,
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="library"
          options={{
            title: "보관함",
            tabBarIcon: ({ color }) => <Library color={color} size={18} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "채팅",
            tabBarIcon: ({ color }) => <MessageCircle color={color} size={18} />,
          }}
        />
        <Tabs.Screen
          name="review"
          options={{
            title: "다시 보기",
            tabBarIcon: ({ color }) => <RotateCcw color={color} size={18} />,
          }}
        />
        <Tabs.Screen
          name="digest"
          options={{
            title: "다이제스트",
            tabBarIcon: ({ color }) => <Sparkles color={color} size={18} />,
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            href: null,
          }}
        />
      </Tabs>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push("/capture")}
        className="absolute right-6 w-14 h-14 rounded-full bg-black items-center justify-center shadow-lg"
        style={{ bottom: insets.bottom + 70 }}
      >
        <Plus color="white" size={30} />
      </TouchableOpacity>
    </View>
  );
}
