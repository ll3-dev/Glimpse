import { Tabs } from "expo-router";
import { ClipboardList, Library, Sparkles, RotateCcw } from "lucide-react-native";

export default function TabsLayout() {
  return (
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
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="collect"
        options={{
          title: "수집",
          tabBarIcon: ({ color }) => <ClipboardList color={color} size={18} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "라이브러리",
          tabBarIcon: ({ color }) => <Library color={color} size={18} />,
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
  );
}
