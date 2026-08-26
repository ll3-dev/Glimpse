use std::path::Path;
use std::process::Command;

use serde::Serialize;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TailscaleStatus {
    pub installed: bool,
    pub connected: bool,
    pub serve_enabled: bool,
    pub dns_name: Option<String>,
    pub url: Option<String>,
    pub error: Option<String>,
}

pub fn inspect_tailscale(port: u16) -> TailscaleStatus {
    let status_output = match tailscale_command().args(["status", "--json"]).output() {
        Ok(output) => output,
        Err(error) => {
            return TailscaleStatus {
                installed: false,
                connected: false,
                serve_enabled: false,
                dns_name: None,
                url: None,
                error: Some(error.to_string()),
            }
        }
    };
    if !status_output.status.success() {
        return TailscaleStatus {
            installed: true,
            connected: false,
            serve_enabled: false,
            dns_name: None,
            url: None,
            error: Some(
                String::from_utf8_lossy(&status_output.stderr)
                    .trim()
                    .to_string(),
            ),
        };
    }
    let status_json: serde_json::Value = match serde_json::from_slice(&status_output.stdout) {
        Ok(value) => value,
        Err(error) => {
            return TailscaleStatus {
                installed: true,
                connected: false,
                serve_enabled: false,
                dns_name: None,
                url: None,
                error: Some(format!("invalid tailscale status JSON: {error}")),
            }
        }
    };
    let connected = status_json["BackendState"] == "Running";
    let dns_name = status_json["Self"]["DNSName"]
        .as_str()
        .map(|value| value.trim_end_matches('.').to_string())
        .filter(|value| !value.is_empty());

    let serve_output = tailscale_command()
        .args(["serve", "status", "--json"])
        .output();
    let backend = format!("127.0.0.1:{port}");
    let serve_json = serve_output
        .ok()
        .filter(|output| output.status.success())
        .and_then(|output| serde_json::from_slice::<serde_json::Value>(&output.stdout).ok());
    let url = if connected {
        serve_json
            .as_ref()
            .and_then(|value| find_serve_url(value, &backend, dns_name.as_deref()))
    } else {
        None
    };
    let serve_enabled = url.is_some();

    TailscaleStatus {
        installed: true,
        connected,
        serve_enabled,
        dns_name,
        url,
        error: None,
    }
}

pub fn enable_tailscale_serve(port: u16) -> Result<TailscaleStatus, String> {
    let target = format!("http://127.0.0.1:{port}");
    let backend = format!("127.0.0.1:{port}");
    if let Ok(existing) = tailscale_command()
        .args(["serve", "status", "--json"])
        .output()
    {
        let raw = String::from_utf8_lossy(&existing.stdout);
        let trimmed = raw.trim();
        let https_443_in_use = serde_json::from_str::<serde_json::Value>(trimmed)
            .ok()
            .is_some_and(|value| value["TCP"].get("443").is_some());
        if existing.status.success() && https_443_in_use && !raw.contains(&backend) {
            return Err(
                "Tailscale Serve의 HTTPS 443 포트를 다른 서비스가 사용 중이라 덮어쓰지 않았습니다. 기존 설정을 확인해 주세요."
                    .to_string(),
            );
        }
    }
    let output = tailscale_command()
        .args(["serve", "--bg", "--yes", "--https=443", &target])
        .output()
        .map_err(|error| format!("tailscale CLI를 실행할 수 없습니다: {error}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let status = inspect_tailscale(port);
    if !status.serve_enabled {
        return Err("Tailscale Serve 설정이 적용되지 않았습니다.".to_string());
    }
    Ok(status)
}

fn find_serve_url(
    status: &serde_json::Value,
    backend: &str,
    fallback_dns_name: Option<&str>,
) -> Option<String> {
    let target = format!("http://{backend}");
    if let Some(web) = status["Web"].as_object() {
        for (endpoint, config) in web {
            if config.to_string().contains(&target) {
                return Some(format!("https://{endpoint}"));
            }
        }
    }
    fallback_dns_name
        .filter(|_| status.to_string().contains(backend))
        .map(|dns| format!("https://{dns}"))
}

fn tailscale_command() -> Command {
    #[cfg(target_os = "macos")]
    {
        let app_binary = Path::new("/Applications/Tailscale.app/Contents/MacOS/Tailscale");
        if app_binary.is_file() {
            return Command::new(app_binary);
        }
    }
    Command::new("tailscale")
}

#[cfg(test)]
mod tests {
    use super::find_serve_url;

    #[test]
    fn finds_the_exact_tailscale_serve_endpoint_for_the_sync_backend() {
        let status = serde_json::json!({
            "Web": {
                "desktop.example.ts.net:8743": {
                    "Handlers": { "/": { "Proxy": "http://127.0.0.1:34129" } }
                },
                "desktop.example.ts.net:9000": {
                    "Handlers": { "/": { "Proxy": "http://127.0.0.1:9000" } }
                }
            }
        });
        assert_eq!(
            find_serve_url(&status, "127.0.0.1:34129", Some("fallback.example.ts.net")),
            Some("https://desktop.example.ts.net:8743".to_string())
        );
    }
}
