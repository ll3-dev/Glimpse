import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NewKnowledgeItem } from '@/src/db/schema';

export default function CollectScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const handleSave = () => {
    // Validation: body is required
    if (!body.trim()) {
      Alert.alert('입력 오류', '본문을 입력해주세요.');
      return;
    }

    // Create new note item (usecase will be connected later)
    const newNote: NewKnowledgeItem = {
      id: `note_${Date.now()}`, // Temporary ID generation
      type: 'note',
      title: title.trim() || null,
      body: body.trim(),
      url: null,
      summary: null,
      tags: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Log to console (usecase call will replace this)
    console.log('[CollectScreen] Note saved:', newNote);

    // Reset form
    setTitle('');
    setBody('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>메모 작성</Text>

        <View style={styles.form}>
          <Text style={styles.label}>제목 (선택)</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="제목을 입력하세요"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>
            본문 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.bodyInput}
            value={body}
            onChangeText={setBody}
            placeholder="내용을 입력하세요..."
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            activeOpacity={0.7}
          >
            <Text style={styles.saveButtonText}>저장</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  required: {
    color: '#e74c3c',
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  bodyInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    minHeight: 150,
  },
  saveButton: {
    backgroundColor: '#3498db',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
