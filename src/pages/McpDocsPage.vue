<script setup>
import { ref } from 'vue'

const tools = [
  { name: 'get_market_overview', desc: 'Get IHSG, forex rates, market summary' },
  { name: 'get_stock_data', desc: 'Get detailed stock data with TradingView chart' },
  { name: 'get_stock_chart', desc: 'TradingView chart embed URL' },
  { name: 'search_stocks', desc: 'Search stocks by name/symbol' },
  { name: 'get_news_feed', desc: 'Get latest financial news' },
  { name: 'get_news_by_tag', desc: 'Filter news by color tag' },
  { name: 'get_market_calendar', desc: 'Market event calendar' },
  { name: 'get_sector_analysis', desc: 'Stock sector breakdown' },
  { name: 'get_fundamental_data', desc: 'Company fundamentals' },
  { name: 'get_technical_indicators', desc: 'Technical analysis indicators' },
  { name: 'get_market_sentiment', desc: 'Market sentiment analysis' },
  { name: 'web_search', desc: 'Search the web via AROXNG' },
  { name: 'get_market_fear_greed', desc: 'Fear & Greed index' },
  { name: 'get_stock_comparison', desc: 'Compare multiple stocks' },
  { name: 'get_global_markets', desc: 'Global market data' },
  { name: 'get_economic_calendar', desc: 'Economic events' },
  { name: 'get_insider_trading', desc: 'Insider trading data' },
  { name: 'get_institutional_flow', desc: 'Smart money flow' },
  { name: 'get_margin_data', desc: 'Margin trading data' },
  { name: 'get_short_selling', desc: 'Short selling data' },
]

const copied = ref('')
function copySnippet(id) {
  const el = document.getElementById(id)
  if (!el) return
  navigator.clipboard.writeText(el.textContent).then(() => {
    copied.value = id
    setTimeout(() => (copied.value = ''), 2000)
  })
}
</script>

<template>
  <div class="mcp-docs">
    <!-- Hero -->
    <header class="mcp-hero">
      <div class="mcp-hero-icon">🐋</div>
      <h1 class="mcp-hero-title">Market Orca MCP Server</h1>
      <p class="mcp-hero-sub">Model Context Protocol server for AI-powered financial intelligence</p>
      <div class="mcp-hero-badges">
        <span class="mcp-badge mcp-badge-green">20+ Tools</span>
        <span class="mcp-badge mcp-badge-blue">MCP v2025-03-26</span>
        <span class="mcp-badge mcp-badge-amber">IDX · Crypto · Forex</span>
      </div>
    </header>

    <!-- Overview -->
    <section class="mcp-section">
      <h2 id="overview">Overview</h2>
      <div class="mcp-card">
        <p>
          The <strong>Model Context Protocol (MCP)</strong> is an open standard that lets AI assistants
          interact with external tools and data sources. Market Orca implements a full MCP server
          exposing <strong>20+ financial tools</strong> covering Indonesian stock market (IDX),
          cryptocurrency, forex, news, and more.
        </p>
        <div class="mcp-info-grid">
          <div class="mcp-info-item">
            <span class="mcp-info-label">Base URL</span>
            <code class="mcp-code-inline">https://mcp.anomali.web.id/</code>
          </div>
          <div class="mcp-info-item">
            <span class="mcp-info-label">Health Check</span>
            <code class="mcp-code-inline">https://mcp.anomali.web.id/health</code>
          </div>
          <div class="mcp-info-item">
            <span class="mcp-info-label">Protocol</span>
            <code class="mcp-code-inline">MCP v2025-03-26 (Streamable HTTP)</code>
          </div>
          <div class="mcp-info-item">
            <span class="mcp-info-label">Rate Limit</span>
            <code class="mcp-code-inline">120 req/min per IP</code>
          </div>
        </div>
      </div>
    </section>

    <!-- Authentication -->
    <section class="mcp-section">
      <h2 id="authentication">Authentication</h2>
      <div class="mcp-card">
        <p>All MCP tool calls require a <strong>Bearer token</strong> via the <code>Authorization</code> header.
          Get your token from the dashboard admin panel.</p>
        <div class="mcp-code-block">
          <div class="mcp-code-header">
            <span>HTTP Header</span>
            <button class="mcp-copy-btn" @click="copySnippet('auth-snippet')">
              {{ copied === 'auth-snippet' ? '✓ Copied' : 'Copy' }}
            </button>
          </div>
          <pre id="auth-snippet" class="mcp-code"><span class="tok-kw">Authorization</span>: <span class="tok-str">Bearer</span> &lt;your-token&gt;</pre>
        </div>
      </div>
    </section>

    <!-- Available Tools -->
    <section class="mcp-section">
      <h2 id="tools">Available Tools</h2>
      <div class="mcp-tools-grid">
        <div v-for="tool in tools" :key="tool.name" class="mcp-tool-card">
          <div class="mcp-tool-name">{{ tool.name }}</div>
          <div class="mcp-tool-desc">{{ tool.desc }}</div>
        </div>
      </div>
    </section>

    <!-- Quick Start -->
    <section class="mcp-section">
      <h2 id="quickstart">Quick Start</h2>

      <div class="mcp-card">
        <h3>Health Check</h3>
        <div class="mcp-code-block">
          <div class="mcp-code-header">
            <span>bash</span>
            <button class="mcp-copy-btn" @click="copySnippet('qs-health')">
              {{ copied === 'qs-health' ? '✓ Copied' : 'Copy' }}
            </button>
          </div>
          <pre id="qs-health" class="mcp-code"><span class="tok-cmd">curl</span> https://mcp.anomali.web.id/health</pre>
        </div>
      </div>

      <div class="mcp-card">
        <h3>Get Market Overview</h3>
        <div class="mcp-code-block">
          <div class="mcp-code-header">
            <span>bash</span>
            <button class="mcp-copy-btn" @click="copySnippet('qs-overview')">
              {{ copied === 'qs-overview' ? '✓ Copied' : 'Copy' }}
            </button>
          </div>
          <pre id="qs-overview" class="mcp-code"><span class="tok-cmd">curl</span> <span class="tok-flag">-X POST</span> https://mcp.anomali.web.id/mcp/tool/get_market_overview \
  <span class="tok-flag">-H</span> <span class="tok-str">'Authorization: Bearer YOUR_TOKEN'</span> \
  <span class="tok-flag">-H</span> <span class="tok-str">'Content-Type: application/json'</span></pre>
        </div>
      </div>

      <div class="mcp-card">
        <h3>Search Stocks</h3>
        <div class="mcp-code-block">
          <div class="mcp-code-header">
            <span>bash</span>
            <button class="mcp-copy-btn" @click="copySnippet('qs-search')">
              {{ copied === 'qs-search' ? '✓ Copied' : 'Copy' }}
            </button>
          </div>
          <pre id="qs-search" class="mcp-code"><span class="tok-cmd">curl</span> <span class="tok-flag">-X POST</span> https://mcp.anomali.web.id/mcp/tool/search_stocks \
  <span class="tok-flag">-H</span> <span class="tok-str">'Authorization: Bearer YOUR_TOKEN'</span> \
  <span class="tok-flag">-H</span> <span class="tok-str">'Content-Type: application/json'</span> \
  <span class="tok-flag">-d</span> <span class="tok-str">'{"query": "BBRI"}'</span></pre>
        </div>
      </div>

      <div class="mcp-card">
        <h3>Get News Feed</h3>
        <div class="mcp-code-block">
          <div class="mcp-code-header">
            <span>bash</span>
            <button class="mcp-copy-btn" @click="copySnippet('qs-news')">
              {{ copied === 'qs-news' ? '✓ Copied' : 'Copy' }}
            </button>
          </div>
          <pre id="qs-news" class="mcp-code"><span class="tok-cmd">curl</span> <span class="tok-flag">-X POST</span> https://mcp.anomali.web.id/mcp/tool/get_news_feed \
  <span class="tok-flag">-H</span> <span class="tok-str">'Authorization: Bearer YOUR_TOKEN'</span> \
  <span class="tok-flag">-H</span> <span class="tok-str">'Content-Type: application/json'</span></pre>
        </div>
      </div>
    </section>

    <!-- Integration Guide -->
    <section class="mcp-section">
      <h2 id="integration">Integration Guide</h2>

      <div class="mcp-card">
        <h3>Claude Desktop / Claude Code</h3>
        <p>Add the following to your <code>claude_desktop_config.json</code> or MCP config file:</p>
        <div class="mcp-code-block">
          <div class="mcp-code-header">
            <span>json — claude_desktop_config.json</span>
            <button class="mcp-copy-btn" @click="copySnippet('cfg-claude')">
              {{ copied === 'cfg-claude' ? '✓ Copied' : 'Copy' }}
            </button>
          </div>
          <pre id="cfg-claude" class="mcp-code"><span class="tok-punct">{</span>
  <span class="tok-kw">"mcpServers"</span><span class="tok-punct">:</span> <span class="tok-punct">{</span>
    <span class="tok-kw">"market-orca"</span><span class="tok-punct">:</span> <span class="tok-punct">{</span>
      <span class="tok-kw">"url"</span><span class="tok-punct">:</span> <span class="tok-str">"https://mcp.anomali.web.id/mcp"</span><span class="tok-punct">,</span>
      <span class="tok-kw">"headers"</span><span class="tok-punct">:</span> <span class="tok-punct">{</span>
        <span class="tok-kw">"Authorization"</span><span class="tok-punct">:</span> <span class="tok-str">"Bearer YOUR_TOKEN"</span>
      <span class="tok-punct">}</span>
    <span class="tok-punct">}</span>
  <span class="tok-punct">}</span>
<span class="tok-punct">}</span></pre>
        </div>
      </div>

      <div class="mcp-card">
        <h3>Cursor</h3>
        <p>In Cursor, go to <strong>Settings → AI → MCP Servers</strong> and add:</p>
        <div class="mcp-code-block">
          <div class="mcp-code-header">
            <span>json — .cursor/mcp.json</span>
            <button class="mcp-copy-btn" @click="copySnippet('cfg-cursor')">
              {{ copied === 'cfg-cursor' ? '✓ Copied' : 'Copy' }}
            </button>
          </div>
          <pre id="cfg-cursor" class="mcp-code"><span class="tok-punct">{</span>
  <span class="tok-kw">"mcpServers"</span><span class="tok-punct">:</span> <span class="tok-punct">{</span>
    <span class="tok-kw">"market-orca"</span><span class="tok-punct">:</span> <span class="tok-punct">{</span>
      <span class="tok-kw">"url"</span><span class="tok-punct">:</span> <span class="tok-str">"https://mcp.anomali.web.id/mcp"</span><span class="tok-punct">,</span>
      <span class="tok-kw">"headers"</span><span class="tok-punct">:</span> <span class="tok-punct">{</span>
        <span class="tok-kw">"Authorization"</span><span class="tok-punct">:</span> <span class="tok-str">"Bearer YOUR_TOKEN"</span>
      <span class="tok-punct">}</span>
    <span class="tok-punct">}</span>
  <span class="tok-punct">}</span>
<span class="tok-punct">}</span></pre>
        </div>
      </div>

      <div class="mcp-card">
        <h3>Any MCP Client (Streamable HTTP)</h3>
        <p>Most MCP clients support the <code>url</code> field for HTTP-based servers.
          Simply point them to:</p>
        <div class="mcp-code-block">
          <div class="mcp-code-header">
            <span>endpoint</span>
            <button class="mcp-copy-btn" @click="copySnippet('cfg-generic')">
              {{ copied === 'cfg-generic' ? '✓ Copied' : 'Copy' }}
            </button>
          </div>
          <pre id="cfg-generic" class="mcp-code"><span class="tok-str">https://mcp.anomali.web.id/mcp</span></pre>
        </div>
      </div>

      <div class="mcp-card">
        <h3>Python SDK</h3>
        <div class="mcp-code-block">
          <div class="mcp-code-header">
            <span>python</span>
            <button class="mcp-copy-btn" @click="copySnippet('cfg-python')">
              {{ copied === 'cfg-python' ? '✓ Copied' : 'Copy' }}
            </button>
          </div>
          <pre id="cfg-python" class="mcp-code"><span class="tok-kw">from</span> mcp <span class="tok-kw">import</span> ClientSession
<span class="tok-kw">from</span> mcp.client.streamable_http <span class="tok-kw">import</span> streamablehttp_client

<span class="tok-kw">async with</span> streamablehttp_client(
    <span class="tok-str">"https://mcp.anomali.web.id/mcp"</span>,
    headers={<span class="tok-str">"Authorization"</span>: <span class="tok-str">"Bearer YOUR_TOKEN"</span>}
) <span class="tok-kw">as</span> (read_stream, write_stream, _):
    <span class="tok-kw">async with</span> ClientSession(read_stream, write_stream) <span class="tok-kw">as</span> session:
        <span class="tok-kw">await</span> session.initialize()
        tools = <span class="tok-kw">await</span> session.list_tools()
        result = <span class="tok-kw">await</span> session.call_tool(<span class="tok-str">"get_market_overview"</span>)</pre>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="mcp-footer">
      <p>Market Orca MCP Server &copy; 2025 — Built for AI-powered financial intelligence</p>
      <p>
        <a href="https://mcp.anomali.web.id/health" target="_blank" rel="noopener">Health Status</a>
        &nbsp;·&nbsp;
        <a href="https://mcp.anomali.web.id/mcp/tools" target="_blank" rel="noopener">Tool Catalog</a>
        &nbsp;·&nbsp;
        <a href="https://mcp.anomali.web.id/mcp/openapi.json" target="_blank" rel="noopener">OpenAPI Spec</a>
      </p>
    </footer>
  </div>
</template>

<style scoped>
.mcp-docs {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 16px 64px;
}

/* ── Hero ─────────────────────────────────────────────────────── */
.mcp-hero {
  text-align: center;
  padding: 48px 16px 40px;
  margin-bottom: 40px;
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.08), rgba(245, 158, 11, 0.06));
  border: 2px solid var(--line-strong);
  border-radius: 16px;
}
.mcp-hero-icon { font-size: 64px; margin-bottom: 8px; }
.mcp-hero-title {
  margin: 0;
  font-size: clamp(28px, 5vw, 42px);
  line-height: 1.15;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.mcp-hero-sub {
  margin: 12px 0 20px;
  color: var(--muted);
  font-size: 17px;
}
.mcp-hero-badges {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}
.mcp-badge {
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.mcp-badge-green { background: rgba(74, 222, 128, 0.15); color: var(--green); border: 1px solid rgba(74, 222, 128, 0.3); }
.mcp-badge-blue  { background: rgba(96, 165, 250, 0.15); color: var(--accent); border: 1px solid rgba(96, 165, 250, 0.3); }
.mcp-badge-amber { background: rgba(245, 158, 11, 0.15); color: var(--accent2); border: 1px solid rgba(245, 158, 11, 0.3); }

/* ── Sections ─────────────────────────────────────────────────── */
.mcp-section { margin-bottom: 40px; }
.mcp-section h2 {
  font-size: 24px;
  margin: 0 0 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--line);
  color: var(--ink);
}

.mcp-card {
  background: var(--panel);
  border: 2px solid var(--line);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 16px;
}
.mcp-card h3 {
  margin: 0 0 10px;
  font-size: 18px;
  color: var(--ink);
}
.mcp-card p {
  margin: 0 0 14px;
  color: var(--muted);
  line-height: 1.6;
}

/* ── Info Grid ────────────────────────────────────────────────── */
.mcp-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 16px;
}
.mcp-info-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
}
.mcp-info-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  margin-bottom: 4px;
}
.mcp-code-inline {
  background: rgba(96, 165, 250, 0.1);
  color: var(--accent);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  word-break: break-all;
}

/* ── Code Blocks ──────────────────────────────────────────────── */
.mcp-code-block {
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
}
.mcp-code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid var(--line);
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}
.mcp-copy-btn {
  background: rgba(96, 165, 250, 0.12);
  color: var(--accent);
  border: 1px solid rgba(96, 165, 250, 0.25);
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.mcp-copy-btn:hover {
  background: rgba(96, 165, 250, 0.22);
}
.mcp-code {
  margin: 0;
  padding: 16px;
  background: #080c14;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.65;
  color: #c9d1d9;
  overflow-x: auto;
  white-space: pre;
}
html[data-theme='light'] .mcp-code { background: #f8f5ef; color: #24292f; }

/* syntax tokens */
.tok-kw   { color: #79c0ff; }
.tok-str  { color: #a5d6ff; }
.tok-cmd  { color: #d2a8ff; }
.tok-flag { color: #ffa657; }
.tok-punct { color: #8b949e; }
html[data-theme='light'] .tok-kw    { color: #0550ae; }
html[data-theme='light'] .tok-str   { color: #0a3069; }
html[data-theme='light'] .tok-cmd   { color: #8250df; }
html[data-theme='light'] .tok-flag  { color: #953800; }
html[data-theme='light'] .tok-punct { color: #57606a; }

/* ── Tools Grid ───────────────────────────────────────────────── */
.mcp-tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}
.mcp-tool-card {
  background: var(--panel);
  border: 2px solid var(--line);
  border-radius: 10px;
  padding: 14px 16px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.mcp-tool-card:hover {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.12);
}
.mcp-tool-name {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 14px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 4px;
}
.mcp-tool-desc {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.45;
}

/* ── Footer ───────────────────────────────────────────────────── */
.mcp-footer {
  text-align: center;
  padding: 32px 16px;
  border-top: 2px solid var(--line);
  margin-top: 40px;
}
.mcp-footer p {
  margin: 6px 0;
  font-size: 13px;
  color: var(--muted);
}
.mcp-footer a {
  color: var(--accent);
  font-weight: 600;
}
.mcp-footer a:hover { text-decoration: underline; }

/* ── Responsive ───────────────────────────────────────────────── */
@media (max-width: 640px) {
  .mcp-hero { padding: 32px 12px 28px; }
  .mcp-card { padding: 16px; }
  .mcp-code { font-size: 11.5px; padding: 12px; }
  .mcp-tools-grid { grid-template-columns: 1fr; }
}
</style>
