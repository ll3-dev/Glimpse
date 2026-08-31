use glimpse_desktop::shell::{
    ShellAction, ShellNavigationTarget, MENU_CAPTURE_ID, MENU_GRAPH_ID, MENU_QUIT_ID,
    MENU_SHOW_ID, QUICK_CAPTURE_SHORTCUT,
};

#[test]
fn tray_menu_ids_map_to_bounded_shell_actions() {
    assert_eq!(
        ShellAction::from_menu_id(MENU_CAPTURE_ID),
        Some(ShellAction::Navigate(ShellNavigationTarget::Capture))
    );
    assert_eq!(
        ShellAction::from_menu_id(MENU_GRAPH_ID),
        Some(ShellAction::Navigate(ShellNavigationTarget::Graph))
    );
    assert_eq!(
        ShellAction::from_menu_id(MENU_SHOW_ID),
        Some(ShellAction::Show)
    );
    assert_eq!(
        ShellAction::from_menu_id(MENU_QUIT_ID),
        Some(ShellAction::Quit)
    );
    assert_eq!(ShellAction::from_menu_id("unknown"), None);
}

#[test]
fn shell_targets_and_shortcut_keep_the_cross_platform_contract() {
    assert_eq!(ShellNavigationTarget::Capture.payload(), "capture");
    assert_eq!(ShellNavigationTarget::Graph.payload(), "graph");
    assert_eq!(QUICK_CAPTURE_SHORTCUT, "CommandOrControl+Shift+K");
}

#[test]
fn closing_the_main_window_hides_it_instead_of_exiting() {
    let main_source = include_str!("../src/main.rs");

    assert!(main_source.contains("WindowEvent::CloseRequested"));
    assert!(main_source.contains("api.prevent_close()"));
    assert!(main_source.contains("shell::hide_main_window(app_handle)"));
    assert!(main_source.contains("RunEvent::Reopen"));
    assert!(main_source.contains("shell::show_main_window(app_handle)"));
}

#[test]
fn macos_bundle_keeps_an_icon_and_an_ad_hoc_signature_contract() {
    let config: serde_json::Value = serde_json::from_str(include_str!("../tauri.conf.json"))
        .expect("tauri.conf.json must remain valid JSON");

    let icons = config["bundle"]["icon"]
        .as_array()
        .expect("bundle.icon must be configured");
    assert!(
        icons.iter().any(|icon| icon == "icons/icon.icns"),
        "the macOS app and tray need the checked-in ICNS asset"
    );
    assert_eq!(
        config["bundle"]["macOS"]["signingIdentity"], "-",
        "local Apple Silicon bundles need an explicit ad-hoc signature"
    );
}
