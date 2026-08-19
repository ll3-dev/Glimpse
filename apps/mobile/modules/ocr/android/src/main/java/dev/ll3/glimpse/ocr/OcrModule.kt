package dev.ll3.glimpse.ocr

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * 온디바이스 OCR — ML Kit 번들형 한국어 인식기.
 * JS 계약: globalThis.__glimpseOcr.recognizeText(imageUri) → OcrResult.
 */
class OcrModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Ocr")

    OnCreate {
      val context = appContext ?: return@OnCreate
      // JS global에 설치 — rustra-jsi와 동일한 global 계약 패턴.
      context.runtime.jsiContext.evaluateVoidScript(
        """
        (function () {
          globalThis.__glimpseOcr = {
            recognizeText: function (imageUri) {
              return globalThis.ExpoModules.Ocr.recognizeText(imageUri);
            }
          };
        })();
        """.trimIndent()
      )
    }

    AsyncFunction("recognizeText") { imageUri: String, promise: Promise ->
      val context = appContext?.reactContext
      if (context == null) {
        promise.reject("FAILED", "Context를 가져올 수 없습니다", null)
        return@AsyncFunction
      }
      try {
        val inputImage = InputImage.fromFilePath(context, Uri.parse(imageUri))
        val recognizer = TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
        recognizer.process(inputImage)
          .addOnSuccessListener { visionText ->
            val text = visionText.textBlocks.joinToString("\n") { it.text }
            promise.resolve(
              mapOf(
                // ML Kit은 블록별 confidence를 제공하지 않는다 — 인식된 텍스트가
                // 있으면 신뢰로 간주 (JS 서비스 레이어의 빈 텍스트 판정과 이중 안전망)
                "text" to text,
                "confidence" to (if (text.isBlank()) 0.0 else 1.0),
                "language" to (visionText.textBlocks.firstOrNull()?.recognizedLanguage ?: "unknown"),
              )
            )
          }
          .addOnFailureListener { e ->
            promise.reject("FAILED", e.message ?: "OCR 처리에 실패했습니다", null)
          }
      } catch (e: Exception) {
        promise.reject("FAILED", e.message ?: "이미지를 불러올 수 없습니다", null)
      }
    }
  }
}
