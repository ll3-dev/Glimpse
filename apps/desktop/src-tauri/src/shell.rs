use std::str::FromStr;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    plugin::TauriPlugin,
    tray::TrayIconBuilder,
    App, AppHandle, Emitter, Manager, Runtime,
};
use tauri_plugin_global_shortcut::{
    GlobalShortcutExt, Shortcut, ShortcutState,
};

pub const QUICK_CAPTURE_SHORTCUT: &str = "CommandOrControl+Shift+K";
pub const SHELL_NAVIGATION_EVENT: &str = "glimpse://shell-navigate";
pub const MENU_SHOW_ID: &str = "show";
pub const MENU_CAPTURE_ID: &str = "capture";
pub const MENU_GRAPH_ID: &str = "graph";
pub const MENU_QUIT_ID: &str = "quit";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ShellNavigationTarget {
    Capture,
    Graph,
}

impl ShellNavigationTarget {
    pub fn payload(self) -> &'static str {
        match self {
            Self::Capture => "capture",
            Self::Graph => "graph",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ShellAction {
    Show,
    Navigate(ShellNavigationTarget),
    Quit,
}

impl ShellAction {
    pub fn from_menu_id(id: &str) -> Option<Self> {
        match id {
            MENU_SHOW_ID => Some(Self::Show),
            MENU_CAPTURE_ID => Some(Self::Navigate(ShellNavigationTarget::Capture)),
            MENU_GRAPH_ID => Some(Self::Navigate(ShellNavigationTarget::Graph)),
            MENU_QUIT_ID => Some(Self::Quit),
            _ => None,
        }
    }
}

pub fn global_shortcut_plugin<R: Runtime>() -> TauriPlugin<R> {
    let expected = Shortcut::from_str(QUICK_CAPTURE_SHORTCUT)
        .expect("quick capture shortcut constant must parse");
    tauri_plugin_global_shortcut::Builder::new()
        .with_handler(move |app, shortcut, event| {
            if event.state == ShortcutState::Pressed && shortcut == &expected {
                let _ = navigate(app, ShellNavigationTarget::Capture);
            }
        })
        .build()
}

pub fn setup(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let shortcut = Shortcut::from_str(QUICK_CAPTURE_SHORTCUT)?;
    if let Err(error) = app.global_shortcut().register(shortcut) {
        eprintln!("[shell] failed to register {QUICK_CAPTURE_SHORTCUT}: {error}");
    }

    let show = MenuItem::with_id(app, MENU_SHOW_ID, "Glimpse 열기", true, None::<&str>)?;
    let capture = MenuItem::with_id(app, MENU_CAPTURE_ID, "빠른 캡처", true, None::<&str>)?;
    let graph = MenuItem::with_id(app, MENU_GRAPH_ID, "지식 그래프", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, MENU_QUIT_ID, "Glimpse 종료", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &capture, &graph, &separator, &quit])?;
    let mut tray = TrayIconBuilder::new()
        .tooltip("Glimpse")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            if let Some(action) = ShellAction::from_menu_id(event.id.as_ref()) {
                if let Err(error) = handle_action(app, action) {
                    eprintln!("[shell] tray action failed: {error}");
                }
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

pub fn hide_main_window<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide()?;
    }
    Ok(())
}

pub fn show_main_window<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_minimized()? {
            window.unminimize()?;
        }
        window.show()?;
        window.set_focus()?;
    }
    Ok(())
}

fn navigate<R: Runtime>(
    app: &AppHandle<R>,
    target: ShellNavigationTarget,
) -> tauri::Result<()> {
    show_main_window(app)?;
    app.emit(SHELL_NAVIGATION_EVENT, target.payload())?;
    Ok(())
}

fn handle_action<R: Runtime>(app: &AppHandle<R>, action: ShellAction) -> tauri::Result<()> {
    match action {
        ShellAction::Show => show_main_window(app),
        ShellAction::Navigate(target) => navigate(app, target),
        ShellAction::Quit => {
            app.exit(0);
            Ok(())
        }
    }
}
