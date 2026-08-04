"""FinanceOS 双内核浏览器：Blink（iframe）+ Gecko（服务端 Firefox UA 渲染代理）。"""
from __future__ import annotations

import html
import re
from urllib.parse import urljoin, urlparse

import requests

GECKO_UA = (
    'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0'
)
BLINK_UA = (
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
)

_ALLOWED_SCHEMES = {'http', 'https'}
_BLOCKED_HOSTS = {'localhost', '127.0.0.1', '0.0.0.0', '::1'}


def normalize_url(raw: str) -> str:
    raw = (raw or '').strip()
    if not raw:
        return 'about:home'
    if raw.startswith('about:'):
        return raw
    if '://' not in raw:
        if re.match(r'^[\w.-]+\.[a-zA-Z]{2,}(/.*)?$', raw) or raw.startswith('/'):
            if raw.startswith('/'):
                return raw
            raw = 'https://' + raw
        else:
            # 当作搜索词
            from urllib.parse import quote
            return f'https://duckduckgo.com/?q={quote(raw)}'
    return raw


def is_safe_external(url: str) -> tuple[bool, str]:
    try:
        p = urlparse(url)
    except Exception:
        return False, '无效地址'
    if p.scheme not in _ALLOWED_SCHEMES:
        return False, '仅支持 http/https'
    host = (p.hostname or '').lower()
    if not host:
        return False, '缺少主机名'
    if host in _BLOCKED_HOSTS or host.endswith('.local'):
        return False, '禁止访问本机地址'
    return True, ''


def fetch_gecko(url: str, timeout: float = 12.0) -> dict:
    """以 Gecko（Firefox）UA 抓取页面并做基础净化，供 Gecko 内核视图渲染。"""
    ok, err = is_safe_external(url)
    if not ok:
        return {'success': False, 'error': err, 'engine': 'gecko'}
    try:
        resp = requests.get(
            url,
            headers={
                'User-Agent': GECKO_UA,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            },
            timeout=timeout,
            allow_redirects=True,
        )
        ctype = (resp.headers.get('Content-Type') or '').lower()
        final = resp.url
        if 'text/html' not in ctype and 'application/xhtml' not in ctype:
            text = html.escape(resp.text[:4000])
            body = f'<pre style="white-space:pre-wrap;padding:16px">{text}</pre>'
            return {
                'success': True,
                'engine': 'gecko',
                'url': final,
                'title': final,
                'html': _wrap_doc(final, body, title=final),
                'status': resp.status_code,
            }
        page = resp.text
        title_m = re.search(r'<title[^>]*>(.*?)</title>', page, re.I | re.S)
        title = html.unescape(re.sub(r'\s+', ' ', title_m.group(1))).strip() if title_m else final
        # 改写相对资源为绝对 URL，脚本降权（沙箱视图仍禁脚本）
        page = re.sub(
            r'(?is)<script\b[^>]*>.*?</script>',
            '<!-- script stripped in Gecko sandbox -->',
            page,
        )
        page = re.sub(
            r'(?is)<(iframe|object|embed)\b[^>]*>.*?</\1>',
            '',
            page,
        )
        page = _absolutize(page, final)
        banner = (
            '<div style="position:sticky;top:0;z-index:9999;background:#20123a;color:#fff;'
            'padding:8px 14px;font:13px/1.4 Segoe UI,sans-serif">'
            f'Gecko 内核渲染 · Firefox UA · {html.escape(final)}</div>'
        )
        if re.search(r'(?is)<body[^>]*>', page):
            page = re.sub(r'(?is)<body([^>]*)>', r'<body\1>' + banner, page, count=1)
        else:
            page = banner + page
        return {
            'success': True,
            'engine': 'gecko',
            'url': final,
            'title': title,
            'html': page,
            'status': resp.status_code,
            'ua': GECKO_UA,
        }
    except requests.Timeout:
        return {'success': False, 'error': '请求超时', 'engine': 'gecko'}
    except Exception as e:
        return {'success': False, 'error': str(e), 'engine': 'gecko'}


def _absolutize(page: str, base: str) -> str:
    def repl_attr(m):
        attr, quote, val = m.group(1), m.group(2), m.group(3)
        if val.startswith(('data:', 'javascript:', '#', 'mailto:')):
            return m.group(0)
        abs_url = urljoin(base, val)
        return f'{attr}={quote}{abs_url}{quote}'

    return re.sub(
        r'''(?i)\b(href|src|action)=(["'])([^"']+)\2''',
        repl_attr,
        page,
    )


def _wrap_doc(url: str, body: str, title: str = '') -> str:
    return (
        '<!DOCTYPE html><html><head><meta charset="utf-8">'
        f'<title>{html.escape(title or url)}</title></head><body>{body}</body></html>'
    )


HOME_HTML = """<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>AI财务浏览器</title>
<style>
body{margin:0;font-family:"Segoe UI Variable","Segoe UI","PingFang SC",sans-serif;
background:linear-gradient(160deg,#1b2838,#0f172a 55%,#1e3a5f);color:#e2e8f0;min-height:100vh}
.wrap{max-width:720px;margin:12vh auto;padding:0 24px}
h1{font-weight:600;font-size:28px;margin:0 0 8px}
p{color:#94a3b8;line-height:1.6}
.engines{display:flex;gap:12px;margin:28px 0}
.card{flex:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);
border-radius:12px;padding:16px}
.card strong{display:block;margin-bottom:6px}
.card small{color:#94a3b8;font-size:12px;line-height:1.5}
.hints a{color:#60a5fa;margin-right:14px;text-decoration:none}
</style></head><body>
<div class="wrap">
  <h1>AI 财务浏览器</h1>
  <p>双内核：Blink（Chromium 系实时渲染）与 Gecko（Firefox UA 服务端渲染沙箱）。</p>
  <div class="engines">
    <div class="card"><strong>Blink</strong><small>使用宿主 Chromium / Chrome 内核 iframe 加载，适合同站应用与公开站点。</small></div>
    <div class="card"><strong>Gecko</strong><small>以 Firefox User-Agent 抓取并净化渲染，适合对照内核差异与安全浏览。</small></div>
  </div>
  <div class="hints">
    <a href="/os">返回桌面</a>
    <a href="/finance?chrome=os">财务总览</a>
    <a href="/agent?chrome=os">AI Agent</a>
    <a href="/search?q=审计&chrome=os">Meilisearch 搜索</a>
  </div>
</div>
</body></html>
"""
