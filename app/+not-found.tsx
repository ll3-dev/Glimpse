import { Link, Stack } from 'expo-router';
import { View } from "react-native";
import ui from "@/components/ui";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View>
        <ui.Text>This screen doesn&apos;t exist.</ui.Text>
        <Link href="/">
          <ui.Text>Go to home screen!</ui.Text>
        </Link>
      </View>
    </>
  );
}
