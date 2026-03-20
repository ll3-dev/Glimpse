import { workspaceArchitecture } from '@glimpse/shared';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ScreenHeader,
  Text,
} from '@glimpse/ui/primitives';
import { View } from 'react-native';

export function App() {
  return (
    <View className="min-h-screen bg-app-bg px-6 py-8">
      <ScreenHeader
        title="Glimpse Desktop"
        subtitle={`${workspaceArchitecture.mobileBridgePackage} -> ${workspaceArchitecture.rustCore} <- ${workspaceArchitecture.desktopApp}`}
      />
      <Card className="mt-6 max-w-xl">
        <CardHeader>
          <CardTitle>Workspace check</CardTitle>
          <CardDescription>
            Desktop can consume shared UI primitives and shared workspace contracts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Text>Next step is wiring Tauri directly to packages/core-rs.</Text>
        </CardContent>
      </Card>
    </View>
  );
}
