import { useGlimpseStore } from "@/store/useGlimpseStore";
import { SafeAreaView, Text, View } from "react-native";

export default function Home() {
  const { setGlimpse } = useGlimpseStore((state) => state.actions);

  return (
    <SafeAreaView>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Welcome to Glimpse!</Text>
      </View>
      <View style={{ padding: 20 }}>
        <Text>Explore the app and discover new features.</Text>
      </View>
      <View>
        <Text
          onPress={() =>
            setGlimpse(
              JSON.stringify(["are you changed?", "are you changed? 2222"])
            )
          }
          style={{ color: "blue", textDecorationLine: "underline" }}
        >
          Enable Glimpse
        </Text>
      </View>
    </SafeAreaView>
  );
}
