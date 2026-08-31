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
}
