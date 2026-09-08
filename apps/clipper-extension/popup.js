// Glimpse Web Clipper — 같은 기기의 Glimpse 데스크톱(localhost 동기화 서버)으로
// 현재 페이지를 보낸다. 요청은 루프백으로만 나가고, 커스텀 헤더
// `X-Glimpse-Clipper: 1`이 없으면 서버가 거절한다(웹페이지의 무단 전송 차단).

const DEFAULT_PORT = 34129;

const $ = (id) => document.getElementById(id);

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

async function getSelection(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => String(window.getSelection?.() ?? '').trim(),
    });
    return result?.result ?? '';
  } catch {
    // 스크립트 주입이 막힌 페이지(웹스토어 등) — 선택 없이 진행한다.
    return '';
  }
}

async function loadPort() {
  const stored = await chrome.storage.local.get('port');
  return Number(stored.port) || DEFAULT_PORT;
}

function setStatus(text, tone = '') {
  const status = $('status');
  status.textContent = text;
  status.className = tone;
}

async function save() {
  const button = $('save');
  button.disabled = true;
  setStatus('저장 중…');
  try {
    const port = await loadPort();
    await chrome.storage.local.set({ port: Number($('port').value) || DEFAULT_PORT });
    const response = await fetch(`http://127.0.0.1:${port}/v1/clipper`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Glimpse-Clipper': '1',
      },
      body: JSON.stringify({
        url: $('page-url').textContent,
        title: $('page-title').textContent,
        text: $('selection').value.trim() || undefined,
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `HTTP ${response.status}`);
    }
    const saved = await response.json();
    setStatus(`보관함에 저장했습니다 (${saved.itemId.slice(0, 8)}…)`, 'ok');
  } catch (error) {
    setStatus(
      `데스크톱에 연결할 수 없습니다. Glimpse가 실행 중인지 확인하세요. (${error.message})`,
      'error',
    );
  } finally {
    button.disabled = false;
  }
}

async function init() {
  $('port').value = String(await loadPort());
  $('save').addEventListener('click', () => void save());

  const tab = await getActiveTab();
  if (!tab?.id || !/^https?:/i.test(tab.url ?? '')) {
    $('page-title').textContent = '이 페이지는 저장할 수 없습니다';
    $('page-url').textContent = tab?.url ?? '(알 수 없음)';
    $('save').disabled = true;
    return;
  }
  $('page-title').textContent = tab.title ?? '';
  $('page-url').textContent = tab.url ?? '';
  $('selection').value = await getSelection(tab.id);
}

void init();
