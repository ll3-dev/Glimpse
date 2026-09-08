//! 다운로드 중 프로세스 활동 보호 — App Nap 해제 + 유휴 시스템 절전 억제.
//!
//! 창을 닫아 트레이로 숨긴 상태에서도 다운로드가 계속되게 한다: macOS 는
//! 숨겨진 앱을 App Nap 으로 제어하거나 유휴 절전에 들어갈 수 있는데,
//! 다운로드가 진행 중인 동안 `NSProcessInfo` 프로세스 활동을 잡아 이를
//! 막는다. 옵션은 `NSActivityUserInitiated`(0x00FFFFFF) — App Nap 비활성,
//! 유휴 시스템 절전 억제, 갑작스러운 종료 방지. 디스플레이 절전은 허용
//! 한다(네트워크 진행과 무관).
//!
//! 보호는 최선 노력이다 — 시작 실패가 다운로드 자체를 막지 않는다.

#[cfg(target_os = "macos")]
pub struct DownloadActivity {
    process_info: objc2::rc::Retained<objc2::runtime::AnyObject>,
    activity: objc2::rc::Retained<objc2::runtime::AnyObject>,
}

// SAFETY: NSProcessInfo 싱글턴과 beginActivity가 돌려주는 NSActivity 객체는
// Apple 문서상 스레드 안전이다 — 활동 시작/종료는 어느 스레드에서나 할 수
// 있다. 래퍼가 이 둘만 소유하므로 래퍼 자체도 Send+Sync다. AnyObject가
// 보수적으로 !Send로 마킹되어 있어 명시 구현이 필요하다.
#[cfg(target_os = "macos")]
unsafe impl Send for DownloadActivity {}
#[cfg(target_os = "macos")]
unsafe impl Sync for DownloadActivity {}

#[cfg(target_os = "macos")]
impl DownloadActivity {
    pub fn begin(reason: &str) -> Option<Self> {
        use objc2::{class, msg_send};

        // SAFETY: NSProcessInfo.processInfo 는 프로세스 어디서나 호출할 수
        // 있는 싱글턴 게터고, NSString/stringWithUTF8String: 은 인자로 받은
        // C 문자열을 복사해 불변 NSString 을 만든다. beginActivityWithOptions:
        // reason: 은 불변 객체만 다루며 앱 시작 후 런타임 클래스가 항상
        // 존재한다. 반환된 activity 객체의 소유권(Retained)이 이 구조체에
        // 있고, Drop 에서만 endActivity 로 돌려준다.
        unsafe {
            let process_info: objc2::rc::Retained<objc2::runtime::AnyObject> =
                msg_send![class!(NSProcessInfo), processInfo];
            let c_reason = std::ffi::CString::new(reason).ok()?;
            let ns_reason: objc2::rc::Retained<objc2::runtime::AnyObject> = msg_send![
                class!(NSString),
                stringWithUTF8String: c_reason.as_ptr()
            ];
            // NSActivityUserInitiated
            let options: u64 = 0x00FF_FFFF;
            let activity: Option<objc2::rc::Retained<objc2::runtime::AnyObject>> = msg_send![
                &*process_info,
                beginActivityWithOptions: options,
                reason: &*ns_reason
            ];
            Some(Self {
                process_info,
                activity: activity?,
            })
        }
    }
}

#[cfg(target_os = "macos")]
impl Drop for DownloadActivity {
    fn drop(&mut self) {
        use objc2::msg_send;

        // SAFETY: beginActivity 가 돌려준 객체와 endActivity 는 1:1 소유
        // 계약이다 — 이 Drop 이 유일한 해제 경로다.
        unsafe {
            let _: () = msg_send![&*self.process_info, endActivity: &*self.activity];
        }
    }
}

#[cfg(not(target_os = "macos"))]
pub struct DownloadActivity;

#[cfg(not(target_os = "macos"))]
impl DownloadActivity {
    pub fn begin(_reason: &str) -> Option<Self> {
        // 다른 플랫폼에는 App Nap 이 없다 — 다운로드는 그대로 진행된다.
        Some(Self)
    }
}
