const $ = (id) => document.getElementById(id);
let cookies = [];

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('nav button').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  $('refresh').addEventListener('click', fetchCookies);
  $('copyAll').addEventListener('click', copyAllCookies);
  $('cookieFilter').addEventListener('input', renderCookies);
  $('savePort').addEventListener('click', savePort);
  $('saveProfileLabel').addEventListener('click', saveProfileLabel);
  $('clearProfileLabel').addEventListener('click', clearProfileLabel);
  $('openExtPage').addEventListener('click', () => {
    chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
  });
  for (const id of ['profileId', 'browserId']) {
    $(id).addEventListener('click', (e) => {
      const text = e.currentTarget.title;
      if (text) copy(text, `已复制 ${id}`);
    });
  }
  let lastTab = 'status';
  try { lastTab = localStorage.getItem('popupTab') || 'status'; } catch {}
  switchTab(lastTab);
  refreshBridgeStatus();
  fetchCookies();
});

function switchTab(name) {
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== `view-${name}`; });
  try { localStorage.setItem('popupTab', name); } catch {}
}

function setPill(el, cls, text) {
  el.className = `pill ${cls}`;
  el.textContent = text;
}

function setMsg(el, ok, text) {
  el.className = `msg ${ok ? 'ok' : 'bad'}`;
  el.textContent = text;
}

function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 1400);
}

async function copy(text, okText) {
  try {
    await navigator.clipboard.writeText(text);
    toast(okText);
  } catch (e) {
    toast('复制失败: ' + e.message);
  }
}

async function refreshBridgeStatus() {
  try {
    const resp = await chrome.runtime.sendMessage({ cmd: 'status' });
    if (!resp?.ok) throw new Error(resp?.error || 'unknown');
    const data = resp.data || {};
    $('port').value = data.wsPort || 18765;
    setPill($('connPill'), data.wsConnected ? 'ok' : 'bad', data.wsConnected ? '已连接' : '未连接');
    $('wsUrl').textContent = data.wsUrl || '-';
    $('wsUrl').title = data.wsUrl || '';
    setPill($('filePill'), data.fileSchemeAccess ? 'ok' : 'warn', data.fileSchemeAccess ? '已启用' : '未启用');
    $('fileNotice').hidden = !!data.fileSchemeAccess;
    renderProfileStatus(data);
  } catch (e) {
    setPill($('connPill'), 'bad', '读取失败');
    $('wsUrl').textContent = e.message;
    setPill($('filePill'), 'bad', '读取失败');
    $('labelView').textContent = 'Profile 读取失败: ' + e.message;
  }
}

function renderProfileStatus(data) {
  const label = data.profileLabel || '';
  $('profileLabel').value = label;
  $('labelView').textContent = label || '(未设置)';
  for (const [id, value] of [['profileId', data.profileId], ['browserId', data.browserId]]) {
    $(id).textContent = value || '-';
    $(id).title = value || '';
  }
}

async function saveProfileLabel() {
  await setProfileLabel($('profileLabel').value);
}

async function clearProfileLabel() {
  $('profileLabel').value = '';
  await setProfileLabel(null);
}

async function setProfileLabel(label) {
  const profileMsg = $('profileMsg');
  try {
    const resp = await chrome.runtime.sendMessage({ cmd: 'setProfileLabel', label });
    if (!resp?.ok) throw new Error(resp?.error || 'unknown');
    setMsg(profileMsg, true, resp.data?.profileLabel ? `已保存 Label: ${resp.data.profileLabel}` : 'Label 已清空');
    await refreshBridgeStatus();
  } catch (e) {
    setMsg(profileMsg, false, '保存失败: ' + e.message);
  }
}

async function savePort() {
  const portMsg = $('portMsg');
  try {
    const port = Number($('port').value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('端口必须是 1-65535');
    }
    if (port === 18767) {
      throw new Error('18767 是 agent-browser-cli API 端口，请换一个插件端口');
    }
    const resp = await chrome.runtime.sendMessage({ cmd: 'setPort', port });
    if (!resp?.ok) throw new Error(resp?.error || 'unknown');
    setMsg(portMsg, true, `已保存端口 ${port}，正在使用新端口重连`);
    await refreshBridgeStatus();
  } catch (e) {
    setMsg(portMsg, false, '保存失败: ' + e.message);
  }
}

function showCookieMessage(text) {
  const out = $('out');
  out.replaceChildren();
  const div = document.createElement('div');
  div.className = 'empty';
  div.textContent = text;
  out.appendChild(div);
}

async function fetchCookies() {
  cookies = [];
  $('cookieCount').textContent = '';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) { $('cookieSite').textContent = '-'; showCookieMessage('没有活动标签页'); return; }
    let host = tab.url;
    try { host = new URL(tab.url).host || tab.url; } catch {}
    $('cookieSite').textContent = host;
    $('cookieSite').title = tab.url;
    if (!/^https?:\/\//.test(tab.url)) { showCookieMessage('当前页面不是网页（http/https），没有可读取的 Cookie'); return; }
    const resp = await chrome.runtime.sendMessage({ cmd: 'cookies', url: tab.url });
    if (!resp?.ok) { showCookieMessage('读取失败: ' + (resp?.error || 'unknown')); return; }
    cookies = resp.data || [];
    $('cookieCount').textContent = cookies.length || '';
    renderCookies();
  } catch (e) {
    showCookieMessage('读取失败: ' + e.message);
  }
}

function visibleCookies() {
  const q = $('cookieFilter').value.trim().toLowerCase();
  if (!q) return cookies;
  return cookies.filter(c => c.name.toLowerCase().includes(q) || String(c.value).toLowerCase().includes(q));
}

function renderCookies() {
  if (!cookies.length) { showCookieMessage('当前页面没有 Cookie'); return; }
  const list = visibleCookies();
  if (!list.length) { showCookieMessage('没有匹配的 Cookie'); return; }
  const frag = document.createDocumentFragment();
  for (const c of list) {
    const item = document.createElement('div');
    item.className = 'cookie';
    item.title = `${c.name}=${c.value}`;
    const name = document.createElement('div');
    name.className = 'name';
    const nameText = document.createElement('span');
    nameText.textContent = c.name;
    name.appendChild(nameText);
    for (const [flag, tag] of [[c.httpOnly, 'H'], [c.secure, 'S'], [c.partitionKey, 'P']]) {
      if (!flag) continue;
      const t = document.createElement('span');
      t.className = 'tag';
      t.textContent = tag;
      name.appendChild(t);
    }
    const val = document.createElement('div');
    val.className = 'val';
    val.textContent = c.value || '(空)';
    item.append(name, val);
    item.addEventListener('click', () => copy(`${c.name}=${c.value}`, `已复制 ${c.name}`));
    frag.appendChild(item);
  }
  $('out').replaceChildren(frag);
}

function copyAllCookies() {
  const list = visibleCookies();
  if (!list.length) { toast('没有可复制的 Cookie'); return; }
  copy(list.map(c => `${c.name}=${c.value}`).join('; '), `已复制 ${list.length} 条 Cookie`);
}
