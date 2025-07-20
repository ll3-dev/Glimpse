import { Plus } from "@/components/icons";
import ui from "@/components/ui";
import { Link } from "expo-router";

export default function FloatingActionButton() {
  return (
    <Link href="/new-glint" asChild>
      <ui.Button
        className="absolute flex-row gap-3 bottom-8 right-8"
        variant="ghost"
      >
        <Plus className="w-12 h-12 text-foreground" />
        <ui.Text>추가하기</ui.Text>
      </ui.Button>
    </Link>
  );
}
