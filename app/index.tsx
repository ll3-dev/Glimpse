import { Text, View } from "react-native";

export default function Home() {
  return (
    <View>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Welcome to Glimpse!</Text>
      </View>
      <View style={{ padding: 20 }}>
        <Text>Explore the app and discover new features.</Text>
      </View>
    </View>
  );
}
