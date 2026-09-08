// Glimpse Web Clipper — 같은 기기의 Glimpse 데스크톱(localhost 동기화 서버)으로
// 현재 페이지를 보낸다. 요청은 루프백으로만 나가고, 커스텀 헤더
// `X-Glimpse-Clipper: 1`이 없으면 서버가 거절한다(웹페이지의 무단 전송 차단).

const DEFAULT_PORT = 34129;
// 서버 CLIPPER_MAX_CONTENT와 같은 값 — 본문 발췌 상한(문자).
const EXTRACT_MAX_CHARS = 200000;

const $ = (id) => document.getElementById(id);

let pageContent = '';

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

// readability-lite: 문단·제목 블록만 골라 본문 전문을 발췌한다. 로그인·JS
// 렌더 페이지는 외부 크롤러가 못 읽으므로 열려 있는 브라우저가 대신 읽어 주는
// 것이 이 확장의 존재 이유다. executeScript로 페이지 안에서 직렬화 실행되므로
// 이 함수는 바깥 값을 참조하지 않아야 한다.
function extractPageContent() {
  const SKIP = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'NAV', 'HEADER', 'FOOTER',
    'ASIDE', 'FORM', 'BUTTON', 'SELECT', 'TEXTAREA', 'SVG', 'IFRAME',
    'DIALOG', 'CANVAS',
  ]);
  const BLOCKS = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, dd, dt, figcaption';
  // 내비게이션 링크 따위의 파편을 걷는 임계값 — 본문 컨테이너 안에서는
  // 짧은 문단(대사·캡션)도 살려야 하므로 무작정 크게 잡지 않는다.
  const MIN_BLOCK_CHARS = 25;

  const visible = (el) =>
    typeof el.checkVisibility === 'function' ? el.checkVisibility() : el.offsetParent !== null;

  // 본문 컨테이너 후보: article/main/[role=main] 중 눈에 보이고 텍스트가 가장
  // 많은 것. 어느 쪽도 실질 텍스트가 없으면 문서 전체에서 발췌한다.
  const root =
    [...document.querySelectorAll('article, main, [role="main"]')]
      .filter((el) => visible(el) && (el.textContent || '').trim().length >= 300)
      .sort((a, b) => (b.textContent || '').length - (a.textContent || '').length)[0] ||
    document.body;
  if (!root) return '';

  // 중첩 블록(li 안의 p 등)은 가장 바깥 블록에서만 한 번 가져온다.
  const hasBlockAncestor = (el) => {
    for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
      if (p.matches(BLOCKS)) return true;
    }
    return false;
  };

  const blocks = [];
  for (const el of root.querySelectorAll(BLOCKS)) {
    if (SKIP.has(el.tagName) || hasBlockAncestor(el) || !visible(el)) continue;
    const heading = /^H[1-6]$/.test(el.tagName);
    // pre는 줄바꿈이 곧 내용이므로 그대로 두고, 나머지는 한 줄로 접는다.
    const text = (
      el.tagName === 'PRE' ? (el.textContent || '') : (el.textContent || '').replace(/\s+/g, ' ')
    ).trim();
    if (text.length < (heading ? 2 : MIN_BLOCK_CHARS)) continue;
    blocks.push(heading ? `## ${text}` : text);
  }
  return blocks.join('\n\n');
}

async function getPageContent(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractPageContent,
    });
    return String(result?.result ?? '').slice(0, EXTRACT_MAX_CHARS);
  } catch {
    // 스크립트 주입이 막힌 페이지 — 본문 없이 진행한다.
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
        content: pageContent && $('page-body').checked ? pageContent : undefined,
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
    $('body-size').textContent = '';
    return;
  }
  $('page-title').textContent = tab.title ?? '';
  $('page-url').textContent = tab.url ?? '';
  $('selection').value = await getSelection(tab.id);

  $('body-size').textContent = '본문 추출 중…';
  pageContent = await getPageContent(tab.id);
  const toggle = $('page-body');
  if (pageContent) {
    $('body-size').textContent = `${pageContent.length.toLocaleString()}자`;
  } else {
    toggle.checked = false;
    toggle.disabled = true;
    $('body-size').textContent = '본문을 찾지 못했습니다';
  }
}

void init();
