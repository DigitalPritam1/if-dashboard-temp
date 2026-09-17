/* ============================================================
   Settings — full page
   ============================================================ */

function extractSheetId(input){
  const t = (input||'').trim();
  const m = t.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(t)) return t;
  return null;
}
document.getElementById('sheet-url-save').onclick = async () => {
  const id = extractSheetId(document.getElementById('sheet-url-input').value);
  if (!id){ toast('That does not look like a Google Sheets link or ID.', false); return; }
  CFG.sheetId = id;
  saveConfig(CFG);
  document.getElementById('sheet-url-current').textContent = `Currently syncing: docs.google.com/spreadsheets/d/${id}`;
  toast('Sheet source updated, syncing now');
  await loadAll(true);
};

document.getElementById('hard-refresh-btn').onclick = async () => {
  STATE.months = {}; STATE.dayIndex = {}; STATE.celebrated = {};
  MONTHS = FALLBACK_MONTHS.slice();
  toast('Hard refresh started, re-reading every tab');
  await loadAll(true);
};

/* ---------- Rules editor ---------- */
function ruleRowHTML(r){
  return `<div class="rule-row ${r.status==='hold'?'is-hold':''}" data-id="${esc(r.id)}">
    <input type="text" data-f="type" value="${esc(r.type)}" placeholder="Content type">
    <input type="text" data-f="platforms" value="${esc(r.platforms)}" placeholder="Platforms">
    <input type="number" min="0" data-f="weekly" value="${r.weekly ?? ''}" placeholder="—">
    <input type="number" min="0" data-f="monthly" value="${r.monthly ?? 0}">
    <select data-f="status">
      <option value="active" ${r.status==='active'?'selected':''}>Active</option>
      <option value="hold" ${r.status==='hold'?'selected':''}>On hold</option>
    </select>
    <button class="rule-del" data-del="${esc(r.id)}" title="Remove rule" aria-label="Remove rule">${ic('trash')}</button>
  </div>`;
}
function renderRulesEditor(){
  const groups = ['Hindi','Marathi'];
  document.getElementById('rules-groups').innerHTML = groups.map(g => {
    const rows = CFG.rules.filter(r => r.manager === g);
    const mgr = MANAGERS.find(m => m.ruleScope === g);
    const wk = rows.filter(r=>r.status==='active').reduce((a,r)=>a+(r.weekly||0),0);
    const mo = rows.filter(r=>r.status==='active').reduce((a,r)=>a+(r.monthly||0),0);
    return `<div class="rule-group" data-group="${g}">
      <div class="rule-group-head">
        <h4>${g}${mgr ? ' · '+mgr.name : ''}</h4>
        <span class="eyebrow">${fmt(wk)}/week active · ${fmt(mo)}/month active</span>
      </div>
      <div class="rule-row-labels">
        <span>Content type</span><span>Platforms</span><span>Weekly</span><span>Monthly</span><span>Status</span><span></span>
      </div>
      <div class="rule-table">${rows.map(ruleRowHTML).join('')}</div>
      <button class="btn add-rule-here" data-group="${g}" style="margin-top:8px; font-size:11.5px; padding:6px 11px;">+ Add to ${g}</button>
    </div>`;
  }).join('');

  document.querySelectorAll('#rules-groups .rule-row').forEach(row => {
    const id = row.dataset.id;
    row.querySelectorAll('input,select').forEach(input => {
      input.addEventListener('change', () => {
        const rule = CFG.rules.find(r => r.id === id);
        if (!rule) return;
        const field = input.dataset.f;
        if (field === 'weekly' || field === 'monthly'){
          rule[field] = input.value === '' ? null : Math.max(0, parseInt(input.value,10) || 0);
        } else {
          rule[field] = input.value;
        }
        saveConfig(CFG);
        renderRulesEditor();
        renderAll();
      });
    });
  });
  document.querySelectorAll('.rule-del').forEach(btn => {
    btn.onclick = () => {
      CFG.rules = CFG.rules.filter(r => r.id !== btn.dataset.del);
      saveConfig(CFG); renderRulesEditor(); renderAll();
    };
  });
  document.querySelectorAll('.add-rule-here').forEach(btn => {
    btn.onclick = () => {
      const g = btn.dataset.group;
      CFG.rules.push({ id:'r'+Date.now(), manager:g, type:'New content type', platforms:'',
                        weekly:1, monthly:4, spread:'weekday', status:'active', note:'' });
      saveConfig(CFG); renderRulesEditor(); renderAll();
    };
  });
}

/* ---------- Backup & reset ---------- */
document.getElementById('export-btn').onclick = () => {
  const blob = new Blob([JSON.stringify(CFG, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'if-dashboard-config.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('Config downloaded');
};
document.getElementById('import-btn').onclick = () => {
  try{
    const parsed = JSON.parse(document.getElementById('import-text').value);
    if (!parsed.rules || !Array.isArray(parsed.rules)) throw new Error('missing rules array');
    CFG = { sheetId: parsed.sheetId || DEFAULT_SHEET_ID, rules: parsed.rules, visibility: { ...defaultVisibility(), ...(parsed.visibility||{}) } };
    saveConfig(CFG);
    toast('Config imported');
    document.getElementById('sheet-url-input').value = currentSheetId();
    document.getElementById('sheet-url-current').textContent = `Currently syncing: docs.google.com/spreadsheets/d/${currentSheetId()}`;
    renderRulesEditor(); renderVisibilityEditor();
    loadAll(true);
  }catch(e){ toast('That JSON did not parse as a valid config.', false); }
};
document.getElementById('reset-btn').onclick = () => {
  CFG = { sheetId: DEFAULT_SHEET_ID, rules: structuredClone(DEFAULT_RULES), visibility: defaultVisibility() };
  saveConfig(CFG);
  toast('Reset to defaults');
  document.getElementById('sheet-url-input').value = currentSheetId();
  document.getElementById('sheet-url-current').textContent = `Currently syncing: docs.google.com/spreadsheets/d/${currentSheetId()}`;
  renderRulesEditor(); renderVisibilityEditor();
  loadAll(true);
};


/* ---------- Layout: show/hide sections on the dashboard ---------- */
function renderVisibilityEditor(){
  const el = document.getElementById('visibility-groups');
  if (!el) return;
  el.innerHTML = SECTION_META.map(s => {
    const on = isVisible(s.key);
    return `<label class="vis-row">
      <span>${escText(s.label)}</span>
      <span class="switch ${on ? 'on' : ''}" data-key="${s.key}" role="switch" aria-checked="${on}" tabindex="0"></span>
    </label>`;
  }).join('');
  el.querySelectorAll('.switch').forEach(sw => {
    const toggle = () => {
      const key = sw.dataset.key;
      CFG.visibility = CFG.visibility || defaultVisibility();
      CFG.visibility[key] = !isVisible(key);
      saveConfig(CFG);
      renderVisibilityEditor();
      toast(isVisible(key) ? 'Section turned on' : 'Section turned off');
    };
    sw.onclick = toggle;
    sw.onkeydown = e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggle(); } };
  });
}
document.getElementById('visibility-reset')?.addEventListener('click', () => {
  CFG.visibility = defaultVisibility();
  saveConfig(CFG);
  renderVisibilityEditor();
  toast('Layout reset to the default view');
});

document.getElementById('sheet-url-input').value = currentSheetId();
document.getElementById('sheet-url-current').textContent = `Currently syncing: docs.google.com/spreadsheets/d/${currentSheetId()}`;
renderRulesEditor();
renderVisibilityEditor();

window.onDataLoaded = () => {};
window.onMonthChange = () => {};
initPage();
