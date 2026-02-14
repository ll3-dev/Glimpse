import { Tabs } from "expo-router";
import { ClipboardList, Library } from "lucide-react-native";

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
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
