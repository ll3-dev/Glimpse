import ui from "@/components/ui";
import { useAddTagMutate } from "@/hooks/db/useTagMutate";
import { useState } from "react";

export default function AddTagDialog() {
  const [tag, setTag] = useState("");
  const { mutate: onAddTag } = useAddTagMutate();

  return (
    <ui.AlertDialog>
      <ui.AlertDialog.Trigger asChild>
        <ui.Button className="w-full" variant="outline">
          <ui.Text>추가</ui.Text>
        </ui.Button>
      </ui.AlertDialog.Trigger>
      <ui.AlertDialog.Content portalHost="new-glint" className="mx-6">
        <ui.AlertDialog.Header>
          <ui.AlertDialog.Title>새로운 태그</ui.AlertDialog.Title>
          <ui.AlertDialog.Description>
            <ui.Input
              className="w-full"
              placeholder="태그를 입력하세요"
              onChangeText={setTag}
            />
          </ui.AlertDialog.Description>
        </ui.AlertDialog.Header>
        <ui.AlertDialog.Footer className="flex-row justify-between">
          <ui.AlertDialog.Cancel className="flex-1">
            <ui.Text>취소</ui.Text>
          </ui.AlertDialog.Cancel>
          <ui.AlertDialog.Action
            className="flex-1"
            onPress={() => {
              if (tag.trim()) {
                onAddTag({ name: tag.trim() });
                setTag("");
              }
            }}
          >
            <ui.Text>추가</ui.Text>
          </ui.AlertDialog.Action>
        </ui.AlertDialog.Footer>
      </ui.AlertDialog.Content>
    </ui.AlertDialog>
  );
}
