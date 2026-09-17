/* ============================================================
   Command Deck — dynamic Weekly / Monthly hero
   The shared renderWeekly() in dashboard.js always shows "today's" week,
   no matter which month tab is selected — that's the gap being fixed here.
   This version re-anchors to whichever month is selected, and adds a
   Monthly mode alongside it, in the same visual language.
   ============================================================ */
let HERO_MODE = 'weekly';

/* For the current month: anchor on today, exactly like before. For a past
   month: anchor on that month's last day, so "last complete week" means
   the last full Mon–Sun week that actually falls inside that month. */
function weekAnchorForMonth(monthMeta){
  const now = new Date();
  const isCurrent = monthMeta.num === now.getMonth()+1 && yearFor(monthMeta.num) === now.getFullYear();
  if (isCurrent) return now;
  const y = yearFor(monthMeta.num);
  return new Date(y, monthMeta.num, 0, 23, 59, 59);
}

function renderWeeklyDynamic(){
  const monthMeta = MONTHS[STATE.monthIndex];
  const anchor = weekAnchorForMonth(monthMeta);
  const { start, end } = lastCompleteWeek(anchor);
  const prevStart = new Date(start); prevStart.setDate(prevStart.getDate()-7);
  const prevEnd = new Date(end); prevEnd.setDate(prevEnd.getDate()-7);
  const brands = Object.keys(CHANNEL_META);
  const wk = rangeStats(start, end, brands);
  const pv = rangeStats(prevStart, prevEnd, brands);
  const delta = pv.posted ? Math.round((wk.posted - pv.posted)/pv.posted*1000)/10 : null;

  const now = new Date();
  /* "current" here means the selected MONTH is the real current month.
     The last complete week is, by definition, never the week containing
     today, so checking against today directly would always read as past. */
  const isCurrentMonth = monthMeta.num === now.getMonth()+1 && yearFor(monthMeta.num) === now.getFullYear();
  const meet = nextMeeting(now);
  const diff = meet - now;
  const dd = Math.floor(diff/864e5), hh = Math.floor(diff%864e5/36e5), mm = Math.floor(diff%36e5/6e4);
  const isMeetingDay = isCurrentMonth && now.getDay() === 2;
  const dfmt = d => d.toLocaleDateString('en-IN',{ day:'numeric', month:'short' });

  const up = delta !== null && delta >= 0;
  const chip = delta === null ? '' :
    `<span class="trendchip" style="background:${up?'var(--green-soft)':'var(--coral-soft)'}; color:${up?'var(--green)':'var(--coral)'};">
      ${ic(up?'up':'down')} ${Math.abs(delta)}% vs previous week</span>`;

  document.getElementById('weekly').innerHTML = `
    <div class="card weekhero fade-up">
      <div>
        <div style="display:flex; align-items:center; gap:9px; margin-bottom:14px; flex-wrap:wrap;">
          <span class="tag" style="color:var(--blue); border-color:color-mix(in srgb,var(--blue) 40%,transparent); background:var(--blue-soft);">
            ${ic('calendar')} Weekly review · ${escText(monthMeta.name)}</span>
          ${isMeetingDay ? `<span class="tag" style="color:var(--green); background:var(--green-soft); border-color:color-mix(in srgb,var(--green) 40%,transparent);">${ic('users')} Meeting day</span>` : ''}
          ${!isCurrentMonth ? `<span class="tag" style="color:var(--ink-3);">${ic('clock')} Past month</span>` : ''}
        </div>
        <div class="eyebrow" style="margin-bottom:8px;">Monday ${dfmt(start)} to Sunday ${dfmt(end)} · the last complete week in ${escText(monthMeta.name)}</div>
        <div class="week-headline">
          <div class="bignum num" id="week-big">0</div>
          <div class="week-headline-txt">
            <div style="font-size:14px; font-weight:650; margin-bottom:6px;">content pieces published</div>
            <div class="eyebrow" style="margin-bottom:7px;">${wk.missed ? fmt(wk.missed)+' missed on working days' : 'no working day misses'}${wk.weekendDone ? ' · '+fmt(wk.weekendDone)+' weekend extras' : ''}</div>
            ${chip}
          </div>
        </div>
        <div style="display:flex; gap:20px; margin-top:20px; flex-wrap:wrap;">
          ${brands.map(b => {
            const m = CHANNEL_META[b], s = wk.perBrand[b];
            return `<div style="min-width:118px;">
              <div class="eyebrow" style="color:${THEME_COLOR[m.theme]}; margin-bottom:5px;">${m.short}</div>
              <div style="display:flex; align-items:baseline; gap:6px;">
                <span class="num" style="font-size:22px; font-weight:800; letter-spacing:-0.04em;">${fmt(s.posted)}</span>
                <span style="font-size:11.5px; color:var(--ink-3);">${s.missed ? fmt(s.missed)+" missed" : "on plan"}</span>
              </div>
              <div class="bar-track" style="margin-top:6px; height:5px;">
                <div class="bar-fill" style="width:${s.committed ? (s.done/s.committed*100) : 0}%; background:${THEME_COLOR[m.theme]};"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
        <div style="display:flex; gap:8px; margin-top:16px; flex-wrap:wrap;">
          ${MANAGERS.map(m => {
            const target = weeklyRuleTarget(m.ruleScope);
            if (!target) return '';
            return `<span class="tag" style="color:var(--ink-2); background:var(--card-2);" data-tip="${esc('<div class=\'tip-t\'>Editorial plan, for reference</div><div class=\'tip-s\'>The agreed weekly volume of content pieces from the admin panel. Not compared against the count on the left, that counts platforms touched per day, a different unit.</div>')}" tabindex="0">
              ${ic('target')} ${m.name}'s plan: ${fmt(target)}/week</span>`;
          }).join('')}
        </div>
      </div>
      <div>
        ${ring(wk.rate ?? 0, 128, 11, 'url(#gr-brand)', (wk.rate === null ? '--' : wk.rate + '%'), 'week rate')}
        ${isCurrentMonth ? `<div class="meeting" style="margin-top:18px;">
          <div style="display:flex; align-items:center; gap:7px; font-size:12.5px; font-weight:650;">
            ${ic('clock')} Next review meeting
          </div>
          <div style="font-size:12px; color:var(--ink-3); margin-top:3px;">
            ${meet.toLocaleDateString('en-IN',{ weekday:'long', day:'numeric', month:'long' })} at 10:00 AM
          </div>
          <div class="cdgrid">
            <div class="cd"><b class="num">${dd}</b><span>days</span></div>
            <div class="cd"><b class="num">${hh}</b><span>hrs</span></div>
            <div class="cd"><b class="num">${mm}</b><span>min</span></div>
          </div>
        </div>` : `<div class="meeting" style="margin-top:18px; text-align:center;">
          <div class="eyebrow">Viewing a past month</div>
          <div style="font-size:12.5px; color:var(--ink-2); margin-top:4px;">The next meeting countdown only shows for the current month.</div>
        </div>`}
      </div>
    </div>`;
  countUp(document.getElementById('week-big'), wk.posted, 1200);
  animateRings(document.getElementById('weekly'));
}

/* Same visual language as the weekly card, aggregated for the whole
   selected month instead of one week. Pulls straight from STATE, already
   computed by computeStats() when the sheet was fetched. */
function renderMonthlyHero(){
  const monthMeta = MONTHS[STATE.monthIndex];
  const stats = STATE.months[monthMeta.name] || [];
  const agg = aggregate(stats);
  const brands = Object.keys(CHANNEL_META);
  const byBrand = Object.fromEntries(stats.map(s => [s.brandName, s]));

  // previous month, for the delta chip
  const idx = MONTHS.findIndex(m => m.name === monthMeta.name);
  const prevStats = idx > 0 ? (STATE.months[MONTHS[idx-1].name] || []) : [];
  const prevAgg = prevStats.length ? aggregate(prevStats) : null;
  const delta = prevAgg && prevAgg.posted ? Math.round((agg.posted - prevAgg.posted)/prevAgg.posted*1000)/10 : null;
  const up = delta !== null && delta >= 0;
  const chip = delta === null ? '' :
    `<span class="trendchip" style="background:${up?'var(--green-soft)':'var(--coral-soft)'}; color:${up?'var(--green)':'var(--coral)'};">
      ${ic(up?'up':'down')} ${Math.abs(delta)}% vs ${escText(MONTHS[idx-1].name)}</span>`;

  const now = new Date();
  const isCurrent = monthMeta.num === now.getMonth()+1 && yearFor(monthMeta.num) === now.getFullYear();
  const daysLeft = (() => {
    if (!isCurrent) return null;
    const lastDay = new Date(yearFor(monthMeta.num), monthMeta.num, 0).getDate();
    return lastDay - now.getDate();
  })();

  document.getElementById('weekly').innerHTML = `
    <div class="card weekhero fade-up">
      <div>
        <div style="display:flex; align-items:center; gap:9px; margin-bottom:14px; flex-wrap:wrap;">
          <span class="tag" style="color:var(--violet); border-color:color-mix(in srgb,var(--violet) 40%,transparent); background:var(--violet-soft);">
            ${ic('layers')} Monthly review · ${escText(monthMeta.name)} ${yearFor(monthMeta.num)}</span>
          ${isCurrent ? `<span class="tag" style="color:var(--green); background:var(--green-soft); border-color:color-mix(in srgb,var(--green) 40%,transparent);">${ic('clock')} In progress</span>` : `<span class="tag" style="color:var(--ink-3);">${ic('check')} Completed month</span>`}
        </div>
        <div class="eyebrow" style="margin-bottom:8px;">Full calendar month, working days and weekends both counted in the total</div>
        <div class="week-headline">
          <div class="bignum num" id="week-big">0</div>
          <div class="week-headline-txt">
            <div style="font-size:14px; font-weight:650; margin-bottom:6px;">content pieces published</div>
            <div class="eyebrow" style="margin-bottom:7px;">${agg.missed ? fmt(agg.missed)+' missed on closed working days' : 'no working day misses'}${agg.weekendDone ? ' · '+fmt(agg.weekendDone)+' weekend extras' : ''}</div>
            ${chip}
          </div>
        </div>
        <div style="display:flex; gap:20px; margin-top:20px; flex-wrap:wrap;">
          ${brands.map(b => {
            const m = CHANNEL_META[b], s = byBrand[b];
            if (!s) return '';
            return `<div style="min-width:118px;">
              <div class="eyebrow" style="color:${THEME_COLOR[m.theme]}; margin-bottom:5px;">${m.short}</div>
              <div style="display:flex; align-items:baseline; gap:6px;">
                <span class="num" style="font-size:22px; font-weight:800; letter-spacing:-0.04em;">${fmt(s.posted)}</span>
                <span style="font-size:11.5px; color:var(--ink-3);">${s.missed ? fmt(s.missed)+" missed" : "on plan"}</span>
              </div>
              <div class="bar-track" style="margin-top:6px; height:5px;">
                <div class="bar-fill" style="width:${s.committed ? (Math.max(s.committed-s.missed,0)/s.committed*100) : 0}%; background:${THEME_COLOR[m.theme]};"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
        <div style="display:flex; gap:8px; margin-top:16px; flex-wrap:wrap;">
          ${MANAGERS.map(m => {
            const target = monthlyRuleTarget(m.ruleScope, monthMeta).monthly;
            if (!target) return '';
            return `<span class="tag" style="color:var(--ink-2); background:var(--card-2);" data-tip="${esc('<div class=\'tip-t\'>Editorial plan, for reference</div><div class=\'tip-s\'>The agreed monthly volume of content pieces from the admin panel. Not compared against the count on the left, that counts platforms touched per day, a different unit.</div>')}" tabindex="0">
              ${ic('target')} ${m.name}'s plan: ${fmt(target)}/month</span>`;
          }).join('')}
        </div>
      </div>
      <div>
        ${ring(agg.rate ?? 0, 128, 11, 'url(#gr-brand)', (agg.rate === null ? '--' : agg.rate + '%'), 'month rate')}
        <div class="meeting" style="margin-top:18px; text-align:center;">
          <div style="display:flex; align-items:center; gap:7px; font-size:12.5px; font-weight:650; justify-content:center;">
            ${ic(isCurrent ? 'clock' : 'check')} ${isCurrent ? 'Days remaining' : 'Month closed'}
          </div>
          ${isCurrent
            ? `<div class="cdgrid" style="justify-content:center;"><div class="cd"><b class="num">${daysLeft}</b><span>days left</span></div></div>`
            : `<div style="font-size:12.5px; color:var(--ink-2); margin-top:4px;">${fmt(agg.posted)} of ${fmt(agg.planned)} planned pieces shipped.</div>`}
        </div>
      </div>
    </div>`;
  countUp(document.getElementById('week-big'), agg.posted, 1200);
  animateRings(document.getElementById('weekly'));
}

function renderOverviewHero(){
  if (HERO_MODE === 'monthly') renderMonthlyHero();
  else renderWeeklyDynamic();
}

document.querySelectorAll('#hero-mode .seg').forEach(btn => {
  btn.onclick = () => {
    HERO_MODE = btn.dataset.mode;
    document.querySelectorAll('#hero-mode .seg').forEach(b => b.setAttribute('aria-selected', b===btn ? 'true':'false'));
    renderOverviewHero();
  };
});
