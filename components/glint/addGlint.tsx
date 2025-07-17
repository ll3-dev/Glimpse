import { useAddGlimpseMutate } from "@/hooks/db/useGlintMutate";
import { useState } from "react";
import { Button, TextInput, View } from "react-native";

export default function AddGlint() {
  const [content, setContent] = useState("");
  const { mutate: addGlint } = useAddGlimpseMutate();

  const onNewGlint = () => {
    if (content.trim()) {
      addGlint(content);
      setContent("");
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Add a new onNewGlint..."
        value={content}
        onChangeText={setContent}
      />
      <Button title="Submit" onPress={onNewGlint} />
    </View>
  );
}
