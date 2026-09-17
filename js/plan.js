/* ============================================================
   Editorial Plan — full page
   Read-only view of the rules set in Settings → Editorial rules. Never
   measured against the checklist here (different units — see the note on
   the page itself), this is purely "what did we agree to make".
   ============================================================ */
function renderPlanPage(){
  renderChrome();
  const monthMeta = MONTHS[STATE.monthIndex];

  document.getElementById('plan-managers').innerHTML = MANAGERS.map((m,i) => {
    const rows = CFG.rules.filter(r => r.manager === m.ruleScope);
    const color = THEME_COLOR[m.theme];
    const wk = weeklyRuleTarget(m.ruleScope);
    const mo = monthlyRuleTarget(m.ruleScope, monthMeta).monthly;
    const held = rows.filter(r => r.status === 'hold');
    return `<div class="card card-pad hoverable fade-up" style="animation-delay:${i*70}ms">
      <div class="chan-strip" style="background:linear-gradient(90deg,${color},transparent);"></div>
      <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px;">
        <h3 style="font-size:17px;">${m.name}<span style="color:var(--ink-3); font-weight:500;"> &middot; ${m.role}</span></h3>
      </div>
      <div style="display:flex; gap:18px; margin-bottom:14px;">
        <div><span class="num" style="font-size:26px; font-weight:800;">${fmt(wk)}</span><span class="eyebrow"> /week</span></div>
        <div><span class="num" style="font-size:26px; font-weight:800;">${fmt(mo)}</span><span class="eyebrow"> /month</span></div>
      </div>
      <div style="display:flex; flex-direction:column; gap:5px;">
        ${rows.map(r => `<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:8px 10px; border-radius:9px; background:var(--card-2); ${r.status==='hold'?'opacity:.6;':''}">
          <div style="min-width:0;">
            <div style="font-size:13px; font-weight:600; ${r.status==='hold'?'text-decoration:line-through;':''}">${escText(r.type)}</div>
            <div style="font-size:11px; color:var(--ink-3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escText(r.platforms)}${r.note?' &middot; '+escText(r.note):''}</div>
          </div>
          <div style="text-align:right; flex:none;">
            <div class="eyebrow">${r.weekly!=null ? fmt(r.weekly)+'/wk' : '&mdash;'}</div>
            <div class="eyebrow">${fmt(r.monthly)}/mo</div>
          </div>
        </div>`).join('')}
      </div>
      ${held.length ? `<div class="eyebrow" style="margin-top:12px; display:flex; align-items:center; gap:5px;">${ic('clock')} ${held.length} item${held.length>1?'s':''} on hold, not counted in the totals above</div>` : ''}
    </div>`;
  }).join('');

  // One flat table across both managers — handy to print or screen-share as-is.
  const all = CFG.rules;
  document.getElementById('plan-table').innerHTML = `
    <div class="tablewrap">
      <table class="plan-table">
        <thead><tr><th>Manager</th><th>Content type</th><th>Platforms</th><th>Weekly</th><th>Monthly</th><th>Status</th></tr></thead>
        <tbody>
          ${all.map(r => `<tr class="${r.status==='hold'?'is-hold':''}">
            <td><span class="tag" style="color:${THEME_COLOR[MANAGERS.find(m=>m.ruleScope===r.manager)?.theme||'blue']};">${escText(r.manager)}</span></td>
            <td style="font-weight:600;">${escText(r.type)}</td>
            <td style="color:var(--ink-3); font-size:12.5px;">${escText(r.platforms)}</td>
            <td class="num" style="text-align:center;">${r.weekly ?? '&mdash;'}</td>
            <td class="num" style="text-align:center;">${fmt(r.monthly)}</td>
            <td>${r.status==='hold' ? `<span class="tag" style="color:var(--ink-3);">${ic('clock')} On hold</span>` : `<span class="tag" style="color:var(--green);">${ic('check')} Active</span>`}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

window.onDataLoaded = renderPlanPage;
window.onMonthChange = renderPlanPage;
initPage();
