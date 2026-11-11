/* AgentPreflight reference web UI. All uploaded workflow analysis is performed by the local API. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const state = { workflow: null, scan: null, filter: 'all', selected: null, rules: [], history: [], currentPage: 'analyzer' };
  const MAX_FILE_BYTES = 2 * 1024 * 1024;
  const html = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const short = (value, length = 70) => String(value ?? '').slice(0, length);
  const message = (text) => { const el = $('toast'); el.textContent = text; el.classList.add('visible'); clearTimeout(message.timeout); message.timeout = setTimeout(() => el.classList.remove('visible'), 3800); };
  const api = async (path, options) => { const res = await fetch(path, options); const body = await res.json(); if (!res.ok) throw new Error(body?.error?.message || `HTTP ${res.status}`); return body; };
  const setStatus = (value) => { $('input-status').textContent = value; };
  const linkDownload = (blob, filename) => { const a = document.createElement('a'); const url = URL.createObjectURL(blob); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); };

  function page(name) {
    state.currentPage = name;
    for (const p of ['analyzer','rules','history','docs']) $('page-' + p).classList.toggle('hidden', p !== name);
    document.querySelectorAll('[data-page]').forEach(btn => { const selected = btn.dataset.page === name; btn.classList.toggle('active', selected); if (selected) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current'); });
    $('page-crumb').textContent = ({ analyzer: 'Overview & analyzer', rules: 'Rules explorer', history: 'Scan history', docs: 'Quick start' })[name];
    if (name === 'rules') void loadRules();
    if (name === 'history') void loadHistory();
    if (name === 'analyzer') requestAnimationFrame(renderGraph);
  }

  function setInputMode(mode) {
    for (const el of document.querySelectorAll('[data-input]')) el.classList.toggle('active', el.dataset.input === mode);
    $('editor-pane').classList.toggle('hidden', mode !== 'editor');
    $('upload-pane').classList.toggle('hidden', mode !== 'upload');
  }

  async function scan() {
    let workflow;
    try { workflow = JSON.parse($('workflow-editor').value); }
    catch { message('Enter valid JSON or load the sample workflow first.'); $('workflow-editor').focus(); return; }
    if (!workflow || typeof workflow !== 'object' || !Array.isArray(workflow.nodes)) { message('Expected an n8n export with a nodes array.'); return; }
    const scanButton = $('run-scan');
    scanButton.disabled = true;
    setStatus('Analyzing workflow…');
    try {
      const { scan: result } = await api('/api/scans', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workflow }) });
      state.workflow = workflow; state.scan = result; state.filter = 'all'; state.selected = null;
      document.querySelectorAll('[data-filter]').forEach(el => el.classList.toggle('active', el.dataset.filter === 'all'));
      updateMetrics(); renderFindings(); renderGraph();
      $('export-report').disabled = false;
      setStatus(`Scan completed · ${result.summary.durationMs.toFixed(1)}ms`);
      message(`${result.issues.length} findings in ${result.summary.nodes} nodes · scan saved locally`);
    } catch(err) { setStatus('Scan failed'); message(`Scan error: ${err.message}`); }
    finally { scanButton.disabled = false; }
  }

  function updateMetrics() {
    const s = state.scan?.summary;
    $('metric-nodes').textContent = s?.nodes ?? '—';
    $('metric-errors').textContent = s?.errors ?? '—';
    $('metric-warnings').textContent = s?.warnings ?? '—';
    $('metric-rules').textContent = s?.rulesEvaluated ?? 16;
    $('issue-count').textContent = state.scan?.issues.length ?? 0;
    $('last-scan-label').textContent = state.scan ? `Last analyzed ${new Date(state.scan.createdAt).toLocaleString()}` : 'Awaiting first scan';
    $('findings-subtitle').textContent = state.scan ? `${s.connections} connections checked · ${s.cleanRules} of ${s.rulesEvaluated} rules without findings` : 'Actionable diagnostics will appear after scanning.';
  }

  function renderFindings() {
    const target = $('findings-list');
    if (!state.scan) { target.innerHTML = '<div class="findings-empty"><span>⌁</span><strong>No scan results yet</strong><p>Use the example workflow to see how diagnostics are identified and explained.</p></div>'; return; }
    const issues = state.scan.issues.filter(issue => state.filter === 'all' || issue.severity === state.filter);
    if (!issues.length) { target.innerHTML = '<div class="findings-empty"><span>✓</span><strong>No findings for this filter</strong><p>The selected category has no issues in this scan.</p></div>'; return; }
    target.innerHTML = issues.map((issue, idx) => `<div class="finding ${html(issue.severity)}" role="button" tabindex="0" data-issue="${idx}" aria-label="Inspect ${html(issue.ruleId)} ${html(issue.title)}"><span class="finding-indicator">${issue.severity === 'error' ? '×' : issue.severity === 'warning' ? '!' : 'i'}</span><div class="finding-content"><div class="finding-toprow"><strong>${html(issue.title)}</strong><code>${html(issue.ruleId)}</code>${issue.nodeName ? `<span class="affected">⌁ ${html(short(issue.nodeName))}</span>` : ''}</div><p>${html(issue.message)}</p><div class="fix"><b>↳ FIX:</b> ${html(issue.suggestion)}</div></div><span class="finding-severity">${html(issue.severity)}</span></div>`).join('');
    const items = issues;
    target.querySelectorAll('[data-issue]').forEach(el => {
      const choose = () => { const issue = items[Number(el.dataset.issue)]; state.selected = issue.nodeName ?? issue.nodeId ?? null; renderGraph(); if (!state.selected) message(`${issue.ruleId} is a workflow-level finding.`); };
      el.addEventListener('click', choose);
      el.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); } });
    });
  }

  function graphEdges(workflow) {
    const edges = [];
    for (const [source, ports] of Object.entries(workflow.connections ?? {})) {
      if (!ports || typeof ports !== 'object') continue;
      for (const branches of Object.values(ports)) {
        if (!Array.isArray(branches)) continue;
        for (const targets of branches) {
          if (!Array.isArray(targets)) continue;
          for (const t of targets) { if (t && typeof t.node === 'string') edges.push({ source, target: t.node }); }
        }
      }
    }
    return edges;
  }

  function renderGraph() {
    const surface = $('graph-surface'); const container = $('graph-nodes'); const svg = $('graph-lines');
    const workflow = state.workflow;
    if (!workflow || !Array.isArray(workflow.nodes) || !workflow.nodes.length || state.currentPage !== 'analyzer') {
      container.replaceChildren(); svg.innerHTML = ''; svg.classList.add('hidden'); $('graph-empty').classList.remove('hidden');
      $('graph-caption').textContent = state.scan && !workflow ? 'Workflow JSON not stored' : 'Awaiting input'; return;
    }
    const nodes = workflow.nodes.filter(n => n && typeof n === 'object' && typeof n.name === 'string').slice(0, 400);
    if (!nodes.length) { $('graph-empty').classList.remove('hidden'); return; }
    $('graph-empty').classList.add('hidden'); svg.classList.remove('hidden');
    $('graph-caption').textContent = `${nodes.length} visible nodes` + (workflow.nodes.length > 400 ? ' (first 400)' : '');
    const w = surface.clientWidth; const h = surface.clientHeight;
    const validXY = nodes.map((n, i) => Array.isArray(n.position) && Number.isFinite(n.position[0]) && Number.isFinite(n.position[1]) ? [n.position[0], n.position[1]] : [(i % 4)*250, Math.floor(i / 4)*160]);
    const minX = Math.min(...validXY.map(x => x[0])); const maxX = Math.max(...validXY.map(x => x[0]));
    const minY = Math.min(...validXY.map(x => x[1])); const maxY = Math.max(...validXY.map(x => x[1]));
    const nodeW = 138, nodeH = 58, margin = 22;
    const mobile = w < 500;
    const xSpan = Math.max(0, w - nodeW - margin*2); const ySpan = Math.max(0,h - nodeH - margin*2);
    const sx = maxX === minX ? 0 : xSpan / (maxX - minX); const sy = maxY === minY ? 0 : ySpan / (maxY - minY);
    const loc = new Map();
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]; const [nx,ny] = validXY[i];
      const x = mobile ? Math.max(6, (w-nodeW)/2) : maxX === minX ? margin + xSpan/2 : margin + (nx - minX) * sx;
      const y = mobile ? margin + i * 91 : maxY === minY ? margin + ySpan/2 : margin + (ny - minY) * sy;
      loc.set(n.name, { x, y, node: n });
    }
    container.replaceChildren();
    for (const { x,y,node } of loc.values()) {
      const issues = state.scan?.issues.filter(issue => issue.nodeName === node.name || (issue.nodeId && issue.nodeId === node.id)) ?? [];
      const severity = issues.some(issue => issue.severity === 'error') ? 'error' : issues.some(issue => issue.severity === 'warning') ? 'warning' : '';
      const el = document.createElement('button'); el.className = `graph-node ${severity}`; el.type = 'button';
      if (node.name === state.selected || node.id === state.selected) el.classList.add('selected');
      el.style.left = `${x}px`; el.style.top = `${y}px`; el.title = `${node.name} — ${node.type || 'unknown type'}`;
      el.innerHTML = `<span class="port left"></span><span class="graph-symbol">${/webhook/i.test(node.type) ? '⌁' : /http/i.test(node.type) ? '⇢' : /slack/i.test(node.type) ? '↗' : /if$/i.test(node.type) ? '◇' : '◈'}</span><span class="graph-text"><strong>${html(short(node.name,60))}</strong><small>${html(short(String(node.type || '').split('.').pop(),24))}</small></span><span class="node-state"></span><span class="port right"></span>`;
      el.addEventListener('click', () => { state.selected = node.name; container.querySelectorAll('.graph-node').forEach(n => n.classList.toggle('selected', n === el)); if (issues.length) message(`${node.name}: ${issues.length} finding(s)`); else message(`${node.name}: no node-specific findings`); });
      container.appendChild(el);
    }
    const paths = [];
    for (const edge of graphEdges(workflow)) {
      const from = loc.get(edge.source), to = loc.get(edge.target); if (!from) continue;
      const x1 = from.x + nodeW, y1 = from.y + nodeH/2;
      const x2 = to ? to.x : Math.min(w-8,x1+42), y2 = to ? to.y + nodeH/2 : y1+14;
      const malformed = !to; const curve = Math.max(20,Math.abs(x2-x1)*.4);
      paths.push(`<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} C${(x1+curve).toFixed(1)} ${y1.toFixed(1)},${(x2-curve).toFixed(1)} ${y2.toFixed(1)},${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${malformed ? '#f86d81':'#696d9c'}" stroke-width="2" ${malformed ? 'stroke-dasharray="5 4"':''} opacity=".95"/>`);
      if (!malformed) paths.push(`<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="2.5" fill="#9d8ff8"/>`);
      else paths.push(`<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="5" fill="#392232" stroke="#f86d81" stroke-width="2"/>`);
    }
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.innerHTML = paths.join('');
  }

  async function loadSample() {
    try { const res = await fetch('/fixtures/demo-workflow.json'); if (!res.ok) throw new Error('Sample file not found'); const raw = await res.text(); $('workflow-editor').value = JSON.stringify(JSON.parse(raw), null, 2); setInputMode('editor'); page('analyzer'); setStatus('Example workflow loaded'); await scan(); }
    catch(err) { message(`Could not load example: ${err.message}`); }
  }

  async function handleFile(file) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) { message('File too large. Maximum 2 MiB.'); return; }
    try { const raw = await file.text(); JSON.parse(raw); $('workflow-editor').value = raw; setInputMode('editor'); page('analyzer'); setStatus(`Loaded ${file.name}`); message('Workflow imported. Click Run scan.'); }
    catch { message('The file is not valid JSON.'); }
  }

  async function loadRules() {
    const root = $('rules-list');
    try { const { rules } = await api('/api/rules'); state.rules = rules; root.innerHTML = rules.map(r => `<div class="rule-row"><span class="rule-id">${html(r.id)}</span><div class="rule-info"><strong>${html(r.title)}</strong><p>${html(r.description)}</p></div><span class="sev ${html(r.severity)}">${html(r.severity)}</span></div>`).join(''); }
    catch(err) { root.textContent = `Could not load rules: ${err.message}`; }
  }

  async function loadHistory() {
    const root = $('history-list');
    try {
      const { scans } = await api('/api/scans?limit=100'); state.history = scans;
      $('history-count').textContent = `${scans.length} stored scan(s)`;
      if (!scans.length) { root.innerHTML = '<div class="empty-history">No scans saved yet. Analyze a workflow to create your first report.</div>'; return; }
      root.innerHTML = scans.map(s => `<div class="history-row"><div class="details"><strong>n8n workflow scan</strong><p>${html(new Date(s.createdAt).toLocaleString())} · ${html(s.id.slice(0,8))} · ${s.summary.nodes} nodes</p></div><div class="counts"><span class="redtxt">${s.summary.errors} errors</span><span class="ambertxt">${s.summary.warnings} warnings</span></div><div class="buttons"><button data-open="${html(s.id)}">Open report</button><button class="danger" data-delete="${html(s.id)}">Delete</button></div></div>`).join('');
      root.querySelectorAll('[data-open]').forEach(btn => btn.addEventListener('click', () => { const s = scans.find(x => x.id === btn.dataset.open); if (!s) return; state.scan = s; state.workflow = null; state.filter = 'all'; updateMetrics(); renderFindings(); $('export-report').disabled = false; page('analyzer'); setStatus('Saved report loaded · original workflow JSON is not retained'); message('Loaded saved diagnostics. Reimport JSON to view its topology.'); }));
      root.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', async () => { if (!window.confirm('Delete this stored scan report?')) return; try { await api(`/api/scans/${encodeURIComponent(btn.dataset.delete)}`,{method:'DELETE'}); await loadHistory(); } catch(err){ message(`Delete failed: ${err.message}`); } }));
    } catch(err) { root.textContent = `Could not load history: ${err.message}`; }
  }

  function exportReport() {
    if (!state.scan) return;
    const file = `agentpreflight-${state.scan.id}.json`;
    linkDownload(new Blob([JSON.stringify(state.scan, null, 2)], { type: 'application/json' }), file);
  }

  document.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => page(btn.dataset.page)));
  $('top-docs').addEventListener('click', () => page('docs'));
  $('footer-docs').addEventListener('click', () => page('docs'));
  document.querySelectorAll('[data-input]').forEach(btn => btn.addEventListener('click', () => setInputMode(btn.dataset.input)));
  $('load-sample').addEventListener('click', () => void loadSample());
  $('hero-import').addEventListener('click', () => $('file-input').click());
  $('upload-pane').addEventListener('click', () => $('file-input').click());
  $('upload-pane').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('file-input').click(); } });
  $('file-input').addEventListener('change', e => { void handleFile(e.target.files[0]); e.target.value=''; });
  $('upload-pane').addEventListener('dragover', e => { e.preventDefault(); e.currentTarget.classList.add('dragging'); });
  $('upload-pane').addEventListener('dragleave', e => e.currentTarget.classList.remove('dragging'));
  $('upload-pane').addEventListener('drop', e => { e.preventDefault(); e.currentTarget.classList.remove('dragging'); void handleFile(e.dataTransfer.files[0]); });
  $('format-json').addEventListener('click', () => { try { $('workflow-editor').value = JSON.stringify(JSON.parse($('workflow-editor').value), null, 2); setStatus('Formatted JSON'); } catch { message('Cannot format invalid JSON.'); } });
  $('run-scan').addEventListener('click', () => void scan());
  $('run-scan-secondary').addEventListener('click', () => void scan());
  document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => { state.filter = btn.dataset.filter; document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === btn)); renderFindings(); }));
  $('export-report').addEventListener('click', exportReport);
  $('refresh-history').addEventListener('click', () => void loadHistory());
  $('fit-graph').addEventListener('click', renderGraph);
  window.addEventListener('resize', () => { if (state.workflow) renderGraph(); });
  void api('/api/health').then(() => { $('server-dot').classList.add('connected'); $('server-status').textContent='API connected'; }).catch(() => { $('server-dot').classList.remove('connected'); $('server-status').textContent='API offline'; message('Backend is unavailable. Check the local server.'); });
  void loadRules();
})();
