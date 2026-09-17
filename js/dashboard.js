/* The real weekly/monthly plan, straight from the admin panel's rules. Shown
   on its own, not measured against the checklist: the sheet only records
   which platform got touched each day, never which of these content types
   it was, so the two are different units and should not be forced together. */

function renderKPIs(stats){
  const agg = aggregate(stats);
  const now = new Date();
  const todayIso = isoOf(now);
  let todayPosted = 0;
  Object.values(STATE.dayIndex).forEach(idx => { if (idx[todayIso]) todayPosted += idx[todayIso].posted; });

  const isCurrent = MONTHS[STATE.monthIndex].num === now.getMonth()+1
                   && MONTHS[STATE.monthIndex].year === now.getFullYear();
  const stillToCome = agg.dueToday + agg.upcoming;

  const tiles = [
    { k:'Published this month', v:agg.posted, icon:'layers', theme:'blue',
      sub:`of ${fmt(agg.planned)} planned for the full month` },
    { k:'Missed', v:agg.missed, icon:'alert', theme:'coral',
      sub: isCurrent ? 'closed working days only, weekends excluded'
                     : 'working days only, weekends excluded' },
    { k: isCurrent ? 'Still to come' : 'Weekend extras', v: isCurrent ? stillToCome : agg.weekendDone,
      icon: isCurrent ? 'clock' : 'spark', theme:'amber',
      sub: isCurrent ? `${fmt(agg.dueToday)} due today · ${fmt(agg.upcoming)} later this month`
                     : 'published outside the working week' },
    { k:'Published today', v:todayPosted, icon:'check', theme:'green',
      sub: isCurrent
        ? (agg.dueToday ? `${fmt(agg.dueToday)} still open today` : 'nothing left open today')
        : now.toLocaleDateString('en-IN',{ weekday:'long', day:'numeric', month:'short' }) },
  ];
  document.getElementById('kpis').innerHTML = tiles.map((t,i) => `
    <div class="card kpi hoverable fade-up" style="animation-delay:${i*60}ms">
      <div class="kpi-top">
        <span class="eyebrow">${t.k}</span>
        <span class="kpi-ic" style="background:${THEME_SOFT[t.theme]}; color:${THEME_COLOR[t.theme]};">${ic(t.icon)}</span>
      </div>
      <div class="kpi-val num" data-count="${t.v}">0</div>
      <div class="kpi-sub">${t.sub}</div>
    </div>`).join('');
  document.querySelectorAll('#kpis [data-count]').forEach(el => countUp(el, +el.dataset.count));
}

function renderHarvest(stats){
  const agg = aggregate(stats);
  const cells = [
    { key:'__org', title:'All channels', theme:'blue', pct:agg.monthProgress, posted:agg.posted, planned:agg.planned, who:'Whole team', missed:agg.missed, left:agg.dueToday+agg.upcoming,
      pace: agg.planned ? (agg.planned - agg.upcoming) / agg.planned * 100 : null },
    ...stats.map(s => {
      const meta = CHANNEL_META[s.brandName] || { short:s.brandName, theme:'green' };
      const owner = MANAGERS.find(m => m.channels.includes(s.brandName));
      return { key:s.brandName, title:meta.short, theme:meta.theme, pct:s.monthProgress,
               posted:s.posted, planned:s.planned, who:owner ? owner.name : 'Unassigned',
               missed:s.missed, left:s.dueToday + s.upcoming,
               pace: s.planned ? (s.planned - s.upcoming) / s.planned * 100 : null };
    })
  ];
  document.getElementById('harvest').innerHTML = cells.map(c => {
    const tip = `<div class="tip-t">${c.title}</div>
      <div class="tip-s">${c.who}</div>
      <div class="tip-hr"></div>
      <div class="tip-row"><span>Published</span><span>${fmt(c.posted)}</span></div>
      <div class="tip-row"><span>Full month target</span><span>${fmt(c.planned)}</span></div>
      <div class="tip-row"><span>Missed so far</span><span>${fmt(c.missed)}</span></div>
      <div class="tip-row"><span>Still to come</span><span>${fmt(c.left)}</span></div>
      ${c.pace != null ? `<div class="tip-row"><span>Expected by now</span><span>${Math.round(c.pace)}% of target</span></div>` : ''}
      <div class="tip-row"><span>Actually at</span><span>${Math.round(c.pct)}% of target</span></div>
      <div class="tip-bar"><i style="width:${Math.min(c.pct,100)}%"></i></div>`;
    return `<div class="harvest-cell" data-tip="${esc(tip)}" data-key="${esc(c.key)}">
      ${vessel(c.pct, c.theme, { w: c.key === '__org' ? 108 : 92, pace: c.pace })}
      <h4 style="margin-top:8px;">${c.title}</h4>
      <div class="eyebrow">${fmt(c.posted)} of ${fmt(c.planned)} this month</div>
      ${c.pace != null ? (() => {
        const done = c.pace >= 99.5;                       // the month has closed
        const ok = c.pct >= c.pace;
        return `<div class="eyebrow" style="margin-top:3px; color:${ok ? 'var(--green)' : 'var(--coral)'};">
          ${done ? (ok ? 'target cleared' : 'under target') : (ok ? 'on pace' : 'behind pace')}</div>`;
      })() : ''}
    </div>`;
  }).join('');

  // fill the glasses once they are on screen
  requestAnimationFrame(() => {
    document.querySelectorAll('#harvest .vessel').forEach((v,i) =>
      setTimeout(() => v.classList.add('filled'), 90 + i*130));
  });
}

/* Empty every glass, then refill. Used on a real target hit and by the preview. */
function drainVessels(){
  const vs = [...document.querySelectorAll('#harvest .vessel')];
  vs.forEach(v => { v.classList.add('draining'); v.classList.remove('filled'); });
  setTimeout(() => {
    vs.forEach((v,i) => setTimeout(() => { v.classList.remove('draining'); v.classList.add('filled'); }, i*120));
  }, 1250);
}

function renderManagers(stats){
  const byName = Object.fromEntries(stats.map(s => [s.brandName, s]));
  document.getElementById('managers').innerHTML = MANAGERS.map((m,i) => {
    const mine = m.channels.map(c => byName[c]).filter(Boolean);
    if (!mine.length) return '';
    const agg = aggregate(mine);
    const held = heldRules(m.ruleScope);
    const planWeekly = weeklyRuleTarget(m.ruleScope);
    const planMonthly = monthlyRuleTarget(m.ruleScope, MONTHS[STATE.monthIndex]).monthly;
    const xp = xpOf(agg), lvl = levelFor(xp);
    const color = THEME_COLOR[m.theme];
    const unlocked = ACHIEVEMENTS.filter(a => a.test(agg)).length;

    return `<div class="card card-pad hoverable fade-up" style="animation-delay:${i*80}ms">
      <div class="chan-strip" style="background:linear-gradient(90deg,${color},transparent);"></div>
      <div class="mgr-head">
        ${avatarEl(m, agg)}
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <h3 style="font-size:18px;">${m.name}</h3>
            <span class="tag" style="color:${color}; background:${THEME_SOFT[m.theme]}; border-color:color-mix(in srgb,${color} 35%,transparent);">
              ${ic('spark')} ${lvl.name}</span>
          </div>
          <div style="font-size:12.5px; color:var(--ink-3);">${m.role} · ${m.channels.map(c=>CHANNEL_META[c].short).join(' + ')}</div>
        </div>
        <div style="text-align:right;">
          <div class="num" style="font-size:26px; font-weight:800; letter-spacing:-0.04em; color:${color};">${agg.rate === null ? "--" : agg.rate+"%"}</div>
          <div class="eyebrow">checklist completion</div>
        </div>
      </div>
      <div class="eyebrow" style="margin-top:2px; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
        <span data-tip="${esc('<div class=\'tip-t\'>Editorial plan, for reference</div><div class=\'tip-s\'>Set in the admin panel. This is the agreed volume of content pieces, not measured against the checklist above since the sheet tracks platforms touched per day, not content types.</div>')}" tabindex="0" style="border-bottom:1px dotted var(--ink-4); cursor:help;">
          editorial plan: ${fmt(planWeekly)}/week &middot; ${fmt(planMonthly)}/month</span>
        ${held.length ? `<span class="tag" style="color:var(--ink-3); background:var(--card-2);">${ic('clock')} ${held.length} on hold</span>` : ''}
      </div>

      <div style="margin:16px 0 6px; display:flex; justify-content:space-between; align-items:baseline;">
        <span class="eyebrow">${fmt(xp)} XP</span>
        <span class="eyebrow">${lvl.next ? fmt(lvl.toNext)+' XP to '+lvl.next.name : 'Max level reached'}</span>
      </div>
      <div class="xpbar"><div class="xpfill" style="width:0; background:linear-gradient(90deg,${color}, color-mix(in srgb,${color} 45%, var(--green-hot)));" data-w="${lvl.pct}"></div></div>

      <div class="grid" style="grid-template-columns:repeat(4,1fr); margin-top:16px; gap:7px;">
        <div class="statbox"><b class="num">${fmt(agg.posted)}</b><span>Posted</span></div>
        <div class="statbox"><b class="num" style="color:${agg.missed>0?'var(--coral)':'var(--green)'}">${fmt(agg.missed)}</b><span>Missed</span></div>
        <div class="statbox"><b class="num">${fmt(agg.dueToday + agg.upcoming)}</b><span>To come</span></div>
        <div class="statbox"><b class="num" style="color:var(--amber)">${agg.streak}</b><span>Streak</span></div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin:16px 0 8px;">
        <span class="eyebrow">Achievements</span>
        <span class="eyebrow">${unlocked} of ${ACHIEVEMENTS.length} unlocked</span>
      </div>
      <div class="ach">
        ${ACHIEVEMENTS.map(a => {
          const on = a.test(agg);
          const [cur, goal] = a.prog(agg);
          const pctA = goal ? Math.min(cur/goal*100, 100) : 0;
          const tip = `<div class="tip-t">${on ? '' : 'Locked · '}${escText(a.name)}</div>
            <div class="tip-s">${escText(a.desc)}</div>
            <div class="tip-row"><span>Progress</span><span>${a.fmtProg(cur, goal)}</span></div>
            <div class="tip-bar"><i style="width:${pctA}%"></i></div>`;
          return `<div class="ach-i ${on?'on':''}" data-tip="${esc(tip)}" tabindex="0">
            ${ic(on ? a.icon : 'lock')}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');

  document.querySelectorAll('.xpfill[data-w]').forEach(el => {
    requestAnimationFrame(() => { el.style.width = el.dataset.w + '%'; });
  });
  animateRings(document.getElementById('managers'));
}

function renderChannels(stats){
  document.getElementById('channels').innerHTML = stats.map((s,i) => {
    const meta = CHANNEL_META[s.brandName] || { short:s.brandName, theme:'green', label:s.brandName };
    const color = THEME_COLOR[meta.theme];
    const owner = MANAGERS.find(m => m.channels.includes(s.brandName));
    const pct = s.rate ?? 0;

    const tags = [];
    if (s.rate !== null && s.rate >= 100) tags.push(['trophy','Fully on plan','var(--green)','var(--green-soft)']);
    else if (s.rate !== null && s.rate >= 90) tags.push(['flame','Almost there','var(--amber)','var(--amber-soft)']);
    if (s.dueToday) tags.push(['clock',`${fmt(s.dueToday)} due today`,'var(--blue)','var(--blue-soft)']);
    if (s.streak >= 3) tags.push(['flame',`${s.streak} day streak`,'var(--amber)','var(--amber-soft)']);
    if (s.flags > 0) tags.push(['alert',`${s.flags} flagged`,'var(--coral)','var(--coral-soft)']);
    if (!tags.length) tags.push(['spark','Building momentum','var(--ink-2)','var(--card-2)']);

    return `<div class="card card-pad hoverable fade-up" style="animation-delay:${i*70}ms">
      <div class="chan-strip" style="background:linear-gradient(90deg,${color},transparent);"></div>
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
        <div>
          <div class="eyebrow" style="color:${color}; margin-bottom:3px;">${meta.short}</div>
          <h3 style="font-size:16.5px;">${meta.label}</h3>
          ${owner ? `<div style="font-size:11.5px; color:var(--ink-3); margin-top:3px; display:flex; align-items:center; gap:5px;">
            ${ic('users')} ${owner.name}</div>` : ''}
        </div>
        ${ring(pct, 74, 8, THEME_GRAD[meta.theme], (s.rate === null ? '--' : Math.round(s.rate)+'%'), 'on plan')}
      </div>

      <div class="grid" style="grid-template-columns:repeat(3,1fr); margin-top:16px; gap:7px;">
        <div class="statbox"><b class="num">${fmt(s.posted)}</b><span>Posted</span></div>
        <div class="statbox"><b class="num" style="color:${s.missed>0?'var(--coral)':'var(--green)'}">${fmt(s.missed)}</b><span>Missed</span></div>
        <div class="statbox"><b class="num" style="color:var(--ink-3)">${fmt(s.dueToday + s.upcoming)}</b><span>To come</span></div>
      </div>

      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:13px;">
        ${tags.map(([i2,t,c,bg]) => `<span class="tag" style="color:${c}; background:${bg}; border-color:color-mix(in srgb,${c} 32%,transparent);">${ic(i2)} ${t}</span>`).join('')}
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin:16px 0 7px;">
        <span class="eyebrow">Daily completion</span>
        <span class="eyebrow">Mon to Fri ${s.workdayRate}%${s.weekendRate !== null ? ` · Weekend ${s.weekendRate}%` : ''}</span>
      </div>
      <div class="heat">
        ${s.days.length ? s.days.map(d =>
          `<div class="hcell${d.weekend?' wknd':''}${d.when==='today'?' today':''}${d.when==='future'?' future':''}" style="background:${heatColor(d)}" data-tip="${esc(dayTip(d, s))}" tabindex="0"></div>`
        ).join('') : `<span style="font-size:12px; color:var(--ink-4); grid-column:1/-1;">No daily entries yet</span>`}
      </div>
      <div class="eyebrow" style="margin-top:7px; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
        <span style="display:flex; align-items:center; gap:5px;"><span style="width:9px; height:9px; border-radius:3px; border:1.5px dashed var(--ink-4); display:inline-block;"></span>weekend, optional</span>
        <span style="display:flex; align-items:center; gap:5px;"><span style="width:9px; height:9px; border-radius:3px; background:var(--paper-2); outline:1.5px solid var(--blue); display:inline-block;"></span>today</span>
        <span style="display:flex; align-items:center; gap:5px;"><span style="width:9px; height:9px; border-radius:3px; background:var(--paper-2); display:inline-block;"></span>not due yet</span>
      </div>

      ${s.notes.length ? `<details class="notes">
        <summary><span class="eyebrow">${s.notes.length} note${s.notes.length>1?'s':''} from the sheet</span></summary>
        ${s.notes.map(n => `<div class="note-row"><b>${n.label}</b><span>${n.text.replace(/</g,'&lt;')}</span></div>`).join('')}
      </details>` : ''}

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding-top:12px; border-top:1px solid var(--line);">
        <span class="eyebrow">${s.manual ? 'Team reported totals' : 'Auto calculated from checklist'}</span>
        <span class="eyebrow" style="color:${color};">${s.platformsCovered}/${s.platformsTotal} platforms live</span>
      </div>
      ${s.manual ? `<div class="note-warn">
        ${ic('alert')}<span>The sheet summary says <b>${fmt(s.sheetPosted)}/${fmt(s.sheetPlanned)}</b>. The checklist ticks add up to <b>${fmt(s.posted)}/${fmt(s.planned)}</b>. Everything here is counted from the ticks. Worth reconciling.</span>
      </div>` : ''}
    </div>`;
  }).join('');
  animateRings(document.getElementById('channels'));
}

function renderPlatforms(stats){
  const combined = {};
  stats.forEach(s => Object.entries(s.platformCounts).forEach(([k,v]) => { combined[k] = (combined[k]||0)+v; }));
  const rows = Object.entries(combined).sort((a,b) => b[1]-a[1]);
  const max = Math.max(...rows.map(r => r[1]), 1);
  const total = rows.reduce((a,b) => a+b[1], 0);

  document.getElementById('platforms').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:14px;">
      <h3 style="font-size:16px;">Content published per platform</h3>
      <span class="eyebrow">${fmt(total)} total pieces</span>
    </div>
    ${rows.length ? rows.map(([name,count]) => `
      <div class="bar-row" data-tip="${esc(platformTip(name, count, total, stats))}" tabindex="0">
        <span style="color:var(--ink-2); display:grid; place-items:center;">${ic(PLATFORM_ICON[name]||'globe')}</span>
        <div>
          <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <span style="font-size:13px; font-weight:550;">${name}</span>
            <span class="eyebrow">${Math.round(count/max*100)}%</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:0; background:linear-gradient(90deg,var(--blue),var(--green-hot));" data-w="${count/max*100}"></div>
          </div>
        </div>
        <span class="num" style="font-size:15px; font-weight:750; min-width:38px; text-align:right;">${fmt(count)}</span>
      </div>`).join('')
    : `<span style="font-size:13px; color:var(--ink-4);">Nothing published yet for this period.</span>`}`;
  document.querySelectorAll('#platforms .bar-fill[data-w]').forEach(el => {
    requestAnimationFrame(() => { el.style.width = el.dataset.w + '%'; });
  });
}

function renderLeaderboard(stats){
  const ranked = [...stats].sort((a,b) => (b.rate ?? -1) - (a.rate ?? -1));
  const rankStyle = ['background:var(--amber); color:#fff;', 'background:var(--ink-3); color:var(--paper);', 'background:var(--coral); color:#fff;'];
  document.getElementById('leaderboard').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:14px;">
      <h3 style="font-size:16px;">Channel ranking</h3>
      <span style="color:var(--amber);">${ic('trophy')}</span>
    </div>
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${ranked.map((s,i) => {
        const meta = CHANNEL_META[s.brandName] || { short:s.brandName, theme:'green' };
        const owner = MANAGERS.find(m => m.channels.includes(s.brandName));
        return `<div class="lb-row">
          <span class="rank" style="${rankStyle[i]||'background:var(--card); color:var(--ink-3);'}">${i+1}</span>
          <div style="flex:1; min-width:0;">
            <div style="font-size:13.5px; font-weight:650;">${meta.short}</div>
            <div class="eyebrow">${owner ? owner.name+' · ' : ''}${fmt(s.posted)} shipped · ${fmt(s.missed)} missed</div>
          </div>
          <div class="num" style="font-size:17px; font-weight:800; letter-spacing:-0.03em; color:${THEME_COLOR[meta.theme]};">${s.rate === null ? "--" : s.rate+"%"}</div>
        </div>`;
      }).join('')}
    </div>`;
}

function renderTrend(){
  const shown = MONTHS.slice(-6);                    // keep the strip readable
  const offset = MONTHS.length - shown.length;
  document.getElementById('trend').innerHTML = Object.keys(CHANNEL_META).map(brand => {
    const meta = CHANNEL_META[brand];
    return `<div style="margin-bottom:16px;">
      <div style="display:flex; align-items:center; gap:7px; margin-bottom:8px;">
        <span style="width:9px; height:9px; border-radius:3px; background:${THEME_COLOR[meta.theme]};"></span>
        <span style="font-size:13px; font-weight:650;">${meta.label}</span>
      </div>
      <div class="grid" style="grid-template-columns:repeat(${shown.length},1fr); gap:8px;">
        ${shown.map((m,si) => {
          const i = si + offset;
          const md = STATE.months[m.name];
          const b = md && md.find(x => x.brandName === brand);
          const v = b && b.rate !== null ? b.rate : null;
          return `<div class="tcell ${i===STATE.monthIndex?'now':''}">
            <div class="eyebrow" style="margin-bottom:4px;">${m.name.slice(0,3)}</div>
            <div class="num" style="font-size:16px; font-weight:750; color:${v===null?'var(--ink-4)':THEME_COLOR[meta.theme]};">${v===null?'--':v+'%'}</div>
            <div class="bar-track" style="height:4px; margin-top:6px;">
              <div class="bar-fill" style="width:${v||0}%; background:${THEME_COLOR[meta.theme]};"></div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}


function confetti(count=90){
  const colors = ['#1437BE','#00E551','#5B3DF5','#FFC24D','#3E62F0','#00A63B'];
  for (let i=0;i<count;i++){
    const p = document.createElement('div');
    p.className = 'confetti';
    p.style.left = Math.random()*100 + 'vw';
    p.style.background = colors[Math.floor(Math.random()*colors.length)];
    p.style.setProperty('--rot', (Math.random()*900-450)+'deg');
    p.style.borderRadius = Math.random() > .6 ? '50%' : '1px';
    p.style.animation = `fall ${1.6+Math.random()*1.3}s cubic-bezier(.25,.6,.4,1) ${Math.random()*.5}s forwards`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 3600);
  }
}
function celebrate(title, body, iconName){
  document.getElementById('cel-icon').innerHTML = ic(iconName||'trophy');
  document.getElementById('cel-icon').querySelector('svg').style.width = '30px';
  document.getElementById('cel-icon').querySelector('svg').style.height = '30px';
  document.getElementById('cel-title').textContent = title;
  document.getElementById('cel-body').textContent = body;
  document.getElementById('celebration').hidden = false;
  confetti(120);
  drainVessels();
}
document.getElementById('cel-close').onclick = () => { document.getElementById('celebration').hidden = true; };
document.getElementById('celebration').onclick = e => { if (e.target.id === 'celebration') e.target.hidden = true; };

function maybeCelebrate(stats){
  const m = MONTHS[STATE.monthIndex].name;
  if (STATE.celebrated[m]) return;
  const agg = aggregate(stats);
  const winner = stats.find(s => s.rate !== null && s.rate >= 100 && s.committed > 0);
  if (winner){
    STATE.celebrated[m] = true;
    const owner = MANAGERS.find(x => x.channels.includes(winner.brandName));
    celebrate('Target achieved',
      `${CHANNEL_META[winner.brandName].label} cleared every working day slot in ${m}${owner?'. Well played, '+owner.name:''}.`, 'trophy');
  } else if (agg.rate !== null && agg.rate >= 95 && agg.committed > 0){
    STATE.celebrated[m] = true;
    celebrate('Outstanding month', `The team is running at ${agg.rate}% execution across every channel in ${m}.`, 'medal');
  }
}

/* ============================================================
   9. Theme, chrome, boot
   ============================================================ */

function runDemo(){
  const vs = [...document.querySelectorAll('#harvest .vessel')];
  vs.forEach(v => { v.classList.remove('draining'); v.classList.remove('filled'); });
  setTimeout(() => vs.forEach((v,i) => setTimeout(() => v.classList.add('filled'), i*150)), 60);
  setTimeout(() => celebrate('Target achieved',
    'Preview only. This is what the room sees when a channel clears its monthly target.', 'trophy'), 1900);
}
document.getElementById('demo-btn').onclick = runDemo;
if (new URLSearchParams(location.search).has('demo')) setTimeout(runDemo, 1200);

/* Shows/hides a whole section by its wrapping <section id="sec-KEY"> and
   applies isVisible() from core.js. Nothing here is ever skipped in the
   underlying data — a hidden section's render function still runs so its
   numbers (streaks, XP, celebration triggers) stay correct even while off
   screen; only the DOM block is hidden. */
function applySectionVisibility(){
  SECTION_META.forEach(s => {
    const wrap = document.getElementById('sec-' + s.key);
    if (wrap) wrap.hidden = !isVisible(s.key);
  });
}

function renderAll(){
  renderMonthTabs(); renderChrome(); applySectionVisibility();
  const stats = STATE.months[MONTHS[STATE.monthIndex].name] || [];
  if (!stats.length){
    document.getElementById('kpis').innerHTML =
      `<div class="card card-pad" style="grid-column:1/-1; text-align:center; color:var(--ink-3);">No entries found for this month yet.</div>`;
    document.getElementById('managers').innerHTML = '';
    document.getElementById('channels').innerHTML = '';
    document.getElementById('harvest').innerHTML = '';
    renderTrend();
    return;
  }
  renderOverviewHero(); renderKPIs(stats); renderHarvest(stats); renderManagers(stats);
  renderChannels(stats); renderPlatforms(stats); renderLeaderboard(stats); renderTrend();
  maybeCelebrate(stats);
}

window.onDataLoaded = renderAll;
window.onMonthChange = renderAll;
initPage();
