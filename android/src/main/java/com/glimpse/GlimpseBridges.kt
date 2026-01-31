package com.glimpse

import android.content.ClipboardManager
import android.content.Context
import android.net.Uri
import com.margelo.nitro.NitroModules
import com.margelo.nitro.glimpse.*
import java.net.URL
import java.util.concurrent.CopyOnWriteArrayList

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

// MARK: - ClipboardMonitor

class ClipboardMonitor : HybridClipboardMonitorSpec() {
    companion object {
        const val TAG = "ClipboardMonitor"
    }

    private val applicationContext = NitroModules.applicationContext
    private val clipboardManager: ClipboardManager = applicationContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager

    override val memorySize: Long
        get() = 0L

    private var isMonitoringState: Boolean = false
    private var onChangeCallback: Func_void_ClipboardItem? = null
    private var primaryChangeListener: ClipboardManager.OnPrimaryClipChangedListener? = null

    override fun startMonitoring(onChange: Func_void_ClipboardItem): Promise<Void> {
        return Promise { resolve ->
            if (isMonitoringState) {
                resolve(null)
                return@Promise
            }

            isMonitoringState = true
            onChangeCallback = onChange

            primaryChangeListener = ClipboardManager.OnPrimaryClipChangedListener {
                checkClipboardChange()
            }
            clipboardManager.addPrimaryClipChangedListener(primaryChangeListener)

            resolve(null)
        }
    }

    override fun stopMonitoring(): Promise<Void> {
        return Promise { resolve ->
            isMonitoringState = false
            primaryChangeListener?.let {
                clipboardManager.removePrimaryClipChangedListener(it)
            }
            primaryChangeListener = null
            onChangeCallback = null
            resolve(null)
        }
    }

    override fun isMonitoring(): Boolean {
        return isMonitoringState
    }

    private fun checkClipboardChange() {
        val clipData = clipboardManager.primaryClip
        if (clipData != null && clipData.itemCount > 0) {
            val content = clipData.getItemAt(0).text?.toString()
            if (!content.isNullOrEmpty()) {
                val type = detectContentType(content)
                val item = ClipboardItem(
                    type = type,
                    content = content,
                    timestamp = System.currentTimeMillis()
                )
                onChangeCallback?.invoke(item)
            }
        }
    }

    private fun detectContentType(content: String): ClipboardItemType {
        return try {
            URL(content)
            ClipboardItemType.url
        } catch (e: Exception) {
            if (content.startsWith("/")) {
                ClipboardItemType.file
            } else {
                ClipboardItemType.text
            }
        }
    }
}
