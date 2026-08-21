import { Tabs } from "expo-router";
import { Library, Sparkles, RotateCcw, MessageCircle } from "lucide-react-native";
import { View } from "react-native";
import { useSemanticColor } from "@glimpse/ui";

export default function TabsLayout() {
  const appText = useSemanticColor("appText");
  const appMuted = useSemanticColor("appMuted");
  const appBorder = useSemanticColor("appBorder");
  const appSurface = useSemanticColor("appSurface");

  return (
    <View className="flex-1">
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: appText,
          tabBarInactiveTintColor: appMuted,
          freezeOnBlur: true,
          lazy: false,
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: appBorder,
            elevation: 0,
            shadowOpacity: 0,
            backgroundColor: appSurface,
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
    </View>
  );
}
