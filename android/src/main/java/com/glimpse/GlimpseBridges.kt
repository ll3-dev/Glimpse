package com.glimpse

import android.content.ClipboardManager
import android.content.Context
import com.margelo.nitro.NitroModules
import com.margelo.nitro.glimpse.*

// MARK: - GlimpseBridges

class GlimpseBridges : HybridGlimpseBridgesSpec() {
    companion object {
        const val TAG = "GlimpseBridges"
    }

    private val applicationContext = NitroModules.applicationContext
    private val clipboardManager: ClipboardManager = applicationContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager

    override val memorySize: Long
        get() = 0L

    // Widget data storage
    override fun set(key: String, value: String, suite: String?) {
        val prefs = if (suite != null) {
            applicationContext.getSharedPreferences(key, Context.MODE_PRIVATE)
        } else {
            applicationContext.getSharedPreferences("glimpse_data", Context.MODE_PRIVATE)
        }
        prefs.edit().putString(key, value).apply()
    }

    // Clipboard methods
    override fun getClipboardString(): Promise<String> {
        return Promise { resolve ->
            val clipData = clipboardManager.primaryClip
            if (clipData != null && clipData.itemCount > 0) {
                resolve(clipData.getItemAt(0).text?.toString() ?: "")
            } else {
                resolve("")
            }
        }
    }

    override fun setClipboardString(content: String): Promise<Void> {
        return Promise { resolve ->
            val clipData = android.content.ClipData.newPlainText("glimpse_clip", content)
            clipboardManager.setPrimaryClip(clipData)
            resolve(null)
        }
    }

    override fun hasClipboard(): Promise<Boolean> {
        return Promise { resolve ->
            val clipData = clipboardManager.primaryClip
            resolve(clipData != null && clipData.itemCount > 0)
        }
    }
}
