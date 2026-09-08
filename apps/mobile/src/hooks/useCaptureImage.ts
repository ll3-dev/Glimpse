/**
 * 갤러리/카메라에서 캡처 이미지를 가져오는 훅.
 *
 * 권한 요청, 피커 실행, 실패 토스트를 캡슐화하고 선택된 이미지 URI만
 * 돌려준다(취소·실패는 null). OCR 실행은 호출부의 몫이다.
 */

import { useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { toast } from '@/src/stores/toast.store';
import { logger } from '@/src/utils/logger';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  quality: 0.8,
};

/** 피커 결과에서 선택된 URI를 뽑는다 — 취소/빈 결과는 null. */
export function resolvePickedUri(
  result: ImagePicker.ImagePickerResult,
): string | null {
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}

export function useCaptureImage() {
  const pickFromLibrary = useCallback(async (): Promise<string | null> => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        toast.error('사진 접근 권한이 필요합니다');
        return null;
      }
      return resolvePickedUri(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
    } catch (error) {
      logger.error('Failed to pick image', error);
      toast.error('이미지를 불러오지 못했습니다');
      return null;
    }
  }, []);

  const captureWithCamera = useCallback(async (): Promise<string | null> => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        toast.error('카메라 접근 권한이 필요합니다');
        return null;
      }
      return resolvePickedUri(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
    } catch (error) {
      logger.error('Failed to capture image with camera', error);
      toast.error('사진을 촬영하지 못했습니다');
      return null;
    }
  }, []);

  return { pickFromLibrary, captureWithCamera };
}
