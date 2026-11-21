/* Abas, Resumo (filtros da literatura), ranking com a literatura e as abas Grupos, Olhos abertos × fechados e Celular × plataforma.
 * Lê: fatorial.csv, literatura.csv, variaveis.csv, stats_grupos.csv, stats_condicoes.csv, stats_dispositivos.csv */
(function () {
  // ---------- abas ----------
  const tabs = Array.from(document.querySelectorAll('.fx-tab'));
  const btns = Array.from(document.querySelectorAll('.fx-tabbtn'));
  function openTab(id, push) {
    if (!tabs.some((t) => t.id === id)) id = tabs.length ? tabs[0].id : id;
    tabs.forEach((t) => { t.hidden = t.id !== id; });
    btns.forEach((b) => { const on = b.getAttribute('aria-controls') === id; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.classList.toggle('fx-tabbtn-on', on); });
    if (push !== false) dash.setLink(id);
  }
  btns.forEach((b) => b.addEventListener('click', () => openTab(b.getAttribute('aria-controls'))));
  let printOpen = null;
  window.addEventListener('beforeprint', () => { if (printOpen === null) printOpen = (tabs.find((t) => !t.hidden) || {}).id || null; tabs.forEach((t) => { t.hidden = false; }); });
  window.addEventListener('afterprint', () => { if (printOpen) openTab(printOpen, false); printOpen = null; });

  // ---------- utilidades ----------
  const L = d3.formatLocale({decimal: ',', thousands: '.', grouping: [3], currency: ['R$', '']});
  const f2 = L.format('.2f'), f3 = L.format('.3~g'), fp = (p) => (p < 0.001 ? '< 0,001' : L.format('.3f')(p));
  const fmt1 = (v) => L.format('.1f')(v);
  const num = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));
  const sel = (id) => document.getElementById(id);
  const val = (id, d) => { const e = sel(id); return e && e.value ? e.value : d; };
  const GROUPS = ['Jovens', 'Idosos', 'Risco de quedas'];
  const gcol = (g) => dash.colors[GROUPS.indexOf(g)] || dash.colors[0];
  const ICOL = {plataforma: () => dash.colors[0], celular: () => dash.colors[1] || dash.colors[0]};
  const VARS = [['area', 'Área da elipse 95%'], ['rms_ap', 'RMS AP'], ['rms_ml', 'RMS ML'], ['amp_ap', 'Amplitude AP'], ['amp_ml', 'Amplitude ML'], ['vel', 'Velocidade média do traçado'], ['fmed_ap', 'Frequência mediana AP'], ['fmed_ml', 'Frequência mediana ML']];
  const isFreq = (k) => k.startsWith('fmed');
  const BEST = 'Melhor encontrado (0,7–1,5 Hz)';
  const RAWN = 'Sem filtro · 2ª ordem · fase zero · 30 s';

  function tipper(el) {
    const t = document.createElement('div'); t.className = 'fx-tip'; t.hidden = true; el.appendChild(t);
    return {
      show(lines, ev) {
        t.replaceChildren(...lines.map((s) => { const d = document.createElement('div'); d.textContent = s; return d; }));
        t.hidden = false;
        const r = el.getBoundingClientRect(); let x = ev.clientX - r.left + 12, y = ev.clientY - r.top + 12;
        if (x + t.offsetWidth > el.clientWidth) x = Math.max(0, ev.clientX - r.left - t.offsetWidth - 12);
        if (y + t.offsetHeight > el.clientHeight) y = Math.max(0, ev.clientY - r.top - t.offsetHeight - 12);
        t.style.left = x + 'px'; t.style.top = y + 'px';
      },
      hide() { t.hidden = true; }
    };
  }
  function placeholder(el, d, text) {
    el.replaceChildren(); const p = document.createElement('p');
    p.className = d && d.status === 'error' ? 'fx-err' : 'fx-note'; p.textContent = d && d.status === 'error' ? 'Não foi possível carregar estes dados.' : (text || '—'); el.appendChild(p);
  }
  function on(ids, names) { ids.forEach((id) => { const e = sel(id); if (e) e.addEventListener('change', () => names.forEach((n) => dash.draw(n))); }); }
  function td(text, cls) { const e = document.createElement('td'); if (cls) e.className = cls; e.textContent = text; return e; }
  function sigStyle(e, p) { if (p < 0.05) e.style.fontWeight = '600'; return e; }
  function varOptions(s) { const prev = s.value; s.replaceChildren(...VARS.map(([k, n]) => new Option(n, k))); s.value = prev && VARS.some(([k]) => k === prev) ? prev : 'area'; }
  function instKey(el) {
    el.replaceChildren(...[['plataforma', 'Plataforma'], ['celular', 'Celular']].map(([k, n]) => {
      const s = document.createElement('span'); const i = document.createElement('i'); i.className = 'fx-dot'; i.style.borderColor = ICOL[k](); i.style.background = ICOL[k]();
      s.append(i, document.createTextNode(n)); return s;
    }));
  }
  dash.draw('inst_key_g', instKey); dash.draw('inst_key_c', instKey);

  // ---------- filtros: melhor encontrado, 7 estudos numerados, sem filtro ----------
  function filtList() {
    const d = dash.data('literatura');
    const lit = d.status === 'ok' ? d.data.slice().sort((a, b) => num(a.numero) - num(b.numero)).map((r) => ({k: r.rotulo, short: `[${r.numero}]`, nome: r.rotulo})) : [];
    return [{k: BEST, short: '★ Melhor', nome: BEST}].concat(lit, [{k: 'Sem filtro', short: 'Sem filtro', nome: 'Sem filtro'}]);
  }
  function filtOptions(s) {
    const prev = s.value, fl = filtList();
    s.replaceChildren(...fl.map((f) => new Option(f.k === BEST || f.k === 'Sem filtro' ? f.nome : 'Literatura ' + f.nome, f.k)));
    s.value = fl.some((f) => f.k === prev) ? prev : BEST;
  }
  ['filt_opts_g', 'filt_opts_c', 'filt_opts_d'].forEach((n) => dash.draw(n, filtOptions));
  function litKey(el) {
    const d = dash.data('literatura');
    if (d.status !== 'ok') { el.textContent = '—'; return; }
    el.textContent = 'Estudos: ' + d.data.slice().sort((a, b) => num(a.numero) - num(b.numero)).map((r) => r.rotulo).join(' · ') + ' · ★ = melhor filtro encontrado (0,7–1,5 Hz).';
  }
  ['lit_key_1', 'lit_key_2', 'lit_key_3', 'lit_key_4'].forEach((n) => dash.draw(n, litKey));

  // ---------- RESUMO: filtros da literatura ----------
  dash.calc('lit_faixa', {inputs: ['literatura'], fn: (lit) => [{minimo: d3.min(lit, (r) => Number(r.nota)), maximo: d3.max(lit, (r) => Number(r.nota))}]});
  dash.calc('lit_melhor', {inputs: ['literatura'], fn: (lit) => lit.slice().sort((a, b) => Number(b.nota) - Number(a.nota)).slice(0, 1)
    .map((r) => ({estudo: `[${r.numero}] ${r.estudo}`, nota: Number(r.nota), posicao_equivalente: Number(r.posicao_equivalente)}))});
  const fromSrc = (src, pick, field, fmt) => (el) => {
    const d = dash.data(src);
    if (d.status !== 'ok' || !d.data) { el.textContent = '—'; return; }
    const r = pick(d.data); el.textContent = r ? fmt(r[field]) : '—';
  };
  const first = (rows) => rows[0];
  dash.draw('lead_raw', fromSrc('fatorial', (rows) => rows.find((r) => r.nome === RAWN), 'nota', (v) => fmt1(num(v))));
  dash.draw('lead_lit_min', fromSrc('lit_faixa', first, 'minimo', (v) => fmt1(num(v))));
  dash.draw('lead_lit_max', fromSrc('lit_faixa', first, 'maximo', (v) => fmt1(num(v))));
  dash.draw('lead_best', fromSrc('fatorial', first, 'nota', (v) => fmt1(num(v))));
  dash.draw('lead_best_nome', fromSrc('fatorial', first, 'nome', (v) => String(v)));
  dash.draw('kpi_lit_nota', fromSrc('lit_melhor', first, 'nota', (v) => fmt1(num(v))));
  dash.draw('kpi_lit_nome', fromSrc('lit_melhor', first, 'estudo', (v) => String(v)));
  dash.draw('kpi_lit_pos', fromSrc('lit_melhor', first, 'posicao_equivalente', (v) => L.format('d')(num(v))));

  dash.draw('lit_chart', (el) => {
    const lit = dash.data('literatura'), fat = dash.data('fatorial');
    if (lit.status !== 'ok' || fat.status !== 'ok') return placeholder(el, lit.status === 'error' ? lit : fat);
    const best = fat.data[0], raw = fat.data.find((r) => r.nome === RAWN);
    const crit4 = (r) => [r.concordancia, r.confiabilidade, r.efeito_olhos, r.separacao_grupos];
    const items = [{nome: '★ Melhor encontrado — 0,7–1,5 Hz', pos: num(best.posicao), nota: num(best.nota), c: crit4(best), tipo: 'best'}]
      .concat(lit.data.map((r) => ({nome: `[${r.numero}] ${r.estudo_curto} — ${r.banda}`, pos: num(r.posicao_equivalente), nota: num(r.nota), c: crit4(r), tipo: 'lit'})).sort((a, b) => b.nota - a.nota))
      .concat(raw ? [{nome: 'Sem filtro', pos: num(raw.posicao), nota: num(raw.nota), c: crit4(raw), tipo: 'raw'}] : []);
    el.replaceChildren();
    const W = el.clientWidth, rowH = 30, m = {t: 6, r: 110, b: 30, l: Math.min(300, W * 0.45)}, H = m.t + rowH * items.length + m.b;
    const x = d3.scaleLinear().domain([0, 100]).range([m.l, W - m.r]);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Nota dos filtros da literatura comparada ao melhor filtro encontrado e a não filtrar');
    svg.append('g').attr('class', 'fx-grid').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(5).tickSize(-(H - m.b - m.t)).tickFormat('')).call((g) => g.select('.domain').remove());
    svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(5));
    const tip = tipper(el);
    items.forEach((it, i) => {
      const y = m.t + rowH * i, col = it.tipo === 'best' ? 'var(--cds-chart-status-critical)' : it.tipo === 'raw' ? 'var(--cds-chart-muted)' : dash.colors[0];
      svg.append('text').attr('x', m.l - 8).attr('y', y + rowH / 2 + 4).attr('text-anchor', 'end').style('fill', 'var(--color-fg)').style('font-size', W < 500 ? '9px' : '11px').style('font-weight', it.tipo === 'best' ? 600 : 400).text(it.nome);
      svg.append('rect').attr('x', m.l).attr('y', y + 5).attr('height', rowH - 10).attr('width', Math.max(1, x(it.nota) - m.l)).attr('rx', 3).style('fill', col)
        .on('pointermove', (ev) => tip.show([it.nome, `Nota ${fmt1(it.nota)} · ${it.pos}º de 440`, `Concordância ${f2(num(it.c[0]))} · Confiabilidade ${f2(num(it.c[1]))}`, `Olhos ${f2(num(it.c[2]))} · Grupos ${f2(num(it.c[3]))}`], ev))
        .on('pointerleave', () => tip.hide());
      svg.append('text').attr('x', x(it.nota) + 6).attr('y', y + rowH / 2 + 4).style('fill', 'var(--color-fg)').text(`${fmt1(it.nota)} · ${L.format('d')(it.pos)}º de 440`);
    });
  });
  dash.draw('lit_tbody', (tb) => {
    const d = dash.data('literatura'), fat = dash.data('fatorial'); tb.replaceChildren();
    if (d.status !== 'ok' || fat.status !== 'ok') { const tr = document.createElement('tr'); tr.appendChild(td('Não foi possível carregar estes dados.')); tb.appendChild(tr); return; }
    const C4 = ['concordancia', 'confiabilidade', 'efeito_olhos', 'separacao_grupos'];
    const row = (nr, estudo, link, filtro, nota, pos, r, bold) => {
      const tr = document.createElement('tr'); if (bold) tr.style.fontWeight = '600';
      tr.appendChild(td(nr)); const c0 = document.createElement('td');
      if (/^https?:\/\//.test(link || '')) { const a = document.createElement('a'); a.href = link; a.target = '_blank'; a.rel = 'noopener'; a.textContent = estudo; c0.appendChild(a); } else c0.textContent = estudo;
      tr.appendChild(c0); tr.appendChild(td(filtro)); tr.appendChild(td(fmt1(num(nota)), 'fx-num')); tr.appendChild(td(L.format('d')(num(pos)) + 'º', 'fx-num'));
      C4.forEach((k) => tr.appendChild(td(f2(num(r[k])), 'fx-num'))); tb.appendChild(tr);
    };
    const best = fat.data[0], raw = fat.data.find((r) => r.nome === RAWN);
    row('★', 'Melhor encontrado aqui', '', best.nome, best.nota, best.posicao, best, true);
    d.data.slice().sort((a, b) => num(a.numero) - num(b.numero)).forEach((r) => row(`[${r.numero}]`, r.estudo, r.link, r.filtro, r.nota, r.posicao_equivalente, r));
    if (raw) row('—', 'Sem filtro', '', 'Sinal bruto (só tendência removida)', raw.nota, raw.posicao, raw);
  });

  // ---------- ESCOLHA DO FILTRO: onde cada filtro da literatura cairia no ranking ----------
  dash.draw('rk_lit_chart', (el) => {
    const fat = dash.data('fatorial'), lit = dash.data('literatura');
    if (fat.status !== 'ok' || lit.status !== 'ok') return placeholder(el, fat.status === 'error' ? fat : lit);
    const all = fat.data.map((r) => ({p: num(r.posicao), n: num(r.nota)}));
    const raw = fat.data.find((r) => r.nome === RAWN), best = fat.data[0];
    const mk = [{lab: '★', nome: `Melhor encontrado — ${best.nome}`, p: num(best.posicao), n: num(best.nota), col: 'var(--cds-chart-status-critical)'}]
      .concat(lit.data.map((r) => ({lab: `[${r.numero}]`, nome: `${r.rotulo} — ${r.estudo}`, p: num(r.posicao_equivalente), n: num(r.nota), col: dash.colors[0]})))
      .concat(raw ? [{lab: 'Sem filtro', nome: 'Sem filtro', p: num(raw.posicao), n: num(raw.nota), col: 'var(--color-fg-muted)'}] : []).sort((a, b) => a.p - b.p);
    el.replaceChildren();
    const W = el.clientWidth, H = 360, m = {t: 20, r: 24, b: 42, l: 46};
    const x = d3.scaleLinear().domain([0, 445]).range([m.l, W - m.r]), y = d3.scaleLinear().domain([30, 90]).range([H - m.b, m.t]);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Nota dos 440 filtros em ordem, com a posição de cada filtro da literatura');
    svg.append('g').attr('class', 'fx-grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickSize(-(W - m.l - m.r)).tickFormat('')).call((g) => g.select('.domain').remove());
    svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickValues([1, 100, 200, 300, 400, 440]).tickFormat((v) => v + 'º'));
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6));
    svg.append('text').attr('x', (m.l + W - m.r) / 2).attr('y', H - 6).attr('text-anchor', 'middle').text('Posição no ranking dos 440 filtros (1º = melhor)');
    svg.append('text').attr('transform', `translate(12,${(H - m.b + m.t) / 2}) rotate(-90)`).attr('text-anchor', 'middle').text('Nota (0–100)');
    svg.append('path').datum(all).attr('d', d3.line().x((d) => x(d.p)).y((d) => y(d.n))).style('fill', 'none').style('stroke', 'var(--cds-chart-muted)').style('stroke-width', 2);
    const tip = tipper(el); let lastP = -99, k = 0;
    mk.forEach((d) => {
      k = d.p - lastP < 22 ? k + 1 : 0; lastP = d.p;      // rótulos de pontos próximos sobem em degraus
      const cx = x(d.p), cy = y(d.n), ly = cy - 16 - k * 15;
      if (k) svg.append('line').attr('x1', cx).attr('x2', cx).attr('y1', cy - 7).attr('y2', ly + 3).style('stroke', 'var(--cds-chart-axis)');
      svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 6.5).style('fill', d.col).style('stroke', 'var(--color-bg)').style('stroke-width', 2)
        .on('pointermove', (ev) => tip.show([d.nome, `Nota ${fmt1(d.n)} · ${L.format('d')(d.p)}º de 440`], ev)).on('pointerleave', () => tip.hide());
      svg.append('text').attr('x', cx).attr('y', ly).attr('text-anchor', d.p > 420 ? 'end' : 'middle').style('fill', 'var(--color-fg)').style('font-weight', 600).style('font-size', '11px').text(d.lab);
    });
  });

  // ---------- mapa de calor: variáveis × filtros ----------
  function heatF(el, rowsL, cols, cell, opts) {
    el.replaceChildren(); el.style.overflowX = 'auto';
    // em telas estreitas a tabela mantém colunas legíveis e rola para o lado
    const W = Math.max(el.clientWidth, 150 + cols.length * 52), m = {t: 30, r: 6, b: 8, l: Math.min(190, Math.max(140, W * 0.3))}, cw = (W - m.l - m.r) / cols.length, ch = 32, H = m.t + ch * rowsL.length + m.b;
    const svg = d3.select(el).append('svg').attr('width', W > el.clientWidth ? W : '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', opts.aria);
    const vals = []; rowsL.forEach((r) => cols.forEach((c) => { const z = cell(r.k, c); if (z && !isNaN(z.v)) vals.push(Math.abs(z.v)); }));
    const op = d3.scaleLinear().domain([0, opts.max ?? (d3.max(vals) || 1)]).range([0.05, 1]).clamp(true);
    const tip = tipper(el);
    cols.forEach((c, j) => svg.append('text').attr('x', m.l + cw * j + cw / 2).attr('y', m.t - 10).attr('text-anchor', 'middle')
      .style('fill', c.k === BEST ? 'var(--cds-chart-status-critical)' : 'var(--color-fg)').style('font-weight', c.k === BEST ? 600 : 400).style('font-size', cw < 64 ? '9.5px' : '11px').text(c.short));
    rowsL.forEach((r, i) => {
      const y = m.t + ch * i;
      svg.append('text').attr('x', m.l - 8).attr('y', y + ch / 2 + 4).attr('text-anchor', 'end').style('fill', 'var(--color-fg)').text(r.label);
      cols.forEach((c, j) => {
        const z = cell(r.k, c), x = m.l + cw * j;
        if (!z || isNaN(z.v)) { svg.append('text').attr('x', x + cw / 2).attr('y', y + ch / 2 + 4).attr('text-anchor', 'middle').text('–'); return; }
        const o = op(Math.abs(z.v)), sig = z.p < 0.05;
        svg.append('rect').attr('x', x + 1).attr('y', y + 1).attr('width', cw - 2).attr('height', ch - 2).attr('rx', 3)
          .style('fill', z.v < 0 ? (dash.colors[1] || dash.colors[0]) : dash.colors[0]).style('fill-opacity', o)
          .on('pointermove', (ev) => tip.show([`${r.label} — ${c.nome}`, `${opts.name} = ${f2(z.v)}`].concat(isNaN(z.p) ? [] : [`p = ${fp(z.p)}`]), ev)).on('pointerleave', () => tip.hide());
        svg.append('text').attr('class', 'fx-cell-text' + (o > 0.6 ? ' fx-on-dark' : '')).attr('x', x + cw / 2).attr('y', y + ch / 2 + 4).attr('text-anchor', 'middle')
          .style('pointer-events', 'none').style('font-weight', sig ? 700 : 400).style('font-size', cw < 64 ? '10px' : '11px').text(f2(z.v) + (sig ? '*' : ''));
      });
    });
    cols.forEach((c, j) => {
      if (c.k !== BEST && !c.ref) return;
      svg.append('rect').attr('x', m.l + cw * j + 0.5).attr('y', m.t - 26).attr('width', cw - 1).attr('height', ch * rowsL.length + 26).attr('rx', 4).style('fill', 'none').style('pointer-events', 'none')
        .style('stroke', c.k === BEST ? 'var(--cds-chart-status-critical)' : 'var(--color-fg)').style('stroke-width', c.k === BEST ? 2 : 1.2).style('stroke-dasharray', c.ref ? '4 3' : null);
    });
  }
  const PLAT = {k: '__plataforma', short: 'Plataforma', nome: 'Plataforma sem filtro (referência)', ref: true};
  const ROWS = VARS.map(([k, n]) => ({k, label: n}));

  // gráfico de halteres: plataforma (a) × celular (b)
  function dumbbell(el, items, opts) {
    el.replaceChildren(); if (!items.length) return placeholder(el, null);
    const W = el.clientWidth, rowH = 34, m = {t: 8, r: 24, b: 40, l: Math.min(210, W * 0.4)}, H = m.t + rowH * items.length + m.b;
    const ext = d3.extent(items.flatMap((i) => [i.a, i.b]).concat(opts.lo !== undefined ? [opts.lo] : []).concat(opts.hi !== undefined ? [opts.hi] : []));
    const x = d3.scaleLinear().domain(ext).nice().range([m.l, W - m.r]);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', opts.aria);
    svg.append('g').attr('class', 'fx-grid').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(5).tickSize(-(H - m.b - m.t)).tickFormat('')).call((g) => g.select('.domain').remove());
    svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(W < 480 ? 3 : 5).tickFormat((v) => L.format('~g')(v)));
    if (ext[0] < 0 && ext[1] > 0) svg.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', m.t).attr('y2', H - m.b).style('stroke', 'var(--color-fg)');
    svg.append('text').attr('x', (m.l + W - m.r) / 2).attr('y', H - 4).attr('text-anchor', 'middle').text(opts.xlabel);
    const tip = tipper(el);
    items.forEach((it, i) => {
      const cy = m.t + rowH * i + rowH / 2;
      svg.append('text').attr('x', m.l - 10).attr('y', cy + 4).attr('text-anchor', 'end').style('fill', 'var(--color-fg)').text(it.label);
      svg.append('line').attr('x1', x(it.a)).attr('x2', x(it.b)).attr('y1', cy).attr('y2', cy).style('stroke', 'var(--cds-chart-muted)').style('stroke-width', 3);
      [['a', 'plataforma', it.pa], ['b', 'celular', it.pb]].forEach(([key, inst, p]) => {
        svg.append('circle').attr('cx', x(it[key])).attr('cy', cy).attr('r', 7).style('fill', p < 0.05 ? ICOL[inst]() : 'var(--color-bg)').style('stroke', ICOL[inst]()).style('stroke-width', 2.5)
          .on('pointermove', (ev) => tip.show([`${it.label} — ${inst}`, `${f2(it[key])}${isNaN(p) ? '' : ` · p ${fp(p)}`}`], ev)).on('pointerleave', () => tip.hide());
      });
    });
  }

  // ---------- GRUPOS ----------
  dash.draw('grp_var_options', varOptions);
  dash.draw('g_strip', (el) => {
    const d = dash.data('variaveis'); if (d.status !== 'ok') return placeholder(el, d);
    const inst = val('g-inst', 'celular'), filtro = val('g-filtro', BEST), cond = val('g-cond', 'OA'), k = val('g-var', 'area');
    const rows = d.data.filter((r) => r.instrumento === inst && r.filtro === filtro && r.condicao === cond && r.variavel === k).map((r) => ({g: r.grupo, p: r.participante, v: num(r.valor), u: r.unidade}));
    if (!rows.length) return placeholder(el, d);
    el.replaceChildren();
    const W = el.clientWidth, H = 300, m = {t: 12, r: 16, b: 34, l: 62}, log = !isFreq(k) && rows.every((r) => r.v > 0);
    const x = d3.scaleBand().domain(GROUPS).range([m.l, W - m.r]).padding(0.3);
    const y = (log ? d3.scaleLog() : d3.scaleLinear()).domain(d3.extent(rows, (r) => r.v)).nice().range([H - m.b, m.t]);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', `${k} por grupo (${inst}, ${filtro}, ${cond})`);
    svg.append('g').attr('class', 'fx-grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(W - m.l - m.r)).tickFormat('')).call((g) => g.select('.domain').remove());
    svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x));
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4, (v) => f3(v)));
    svg.append('text').attr('transform', `translate(12,${(H - m.b + m.t) / 2}) rotate(-90)`).attr('text-anchor', 'middle').text(rows[0].u);
    const tip = tipper(el);
    GROUPS.forEach((g) => {
      const pts = rows.filter((r) => r.g === g), bw = x.bandwidth();
      const qs = [0.25, 0.5, 0.75].map((q) => d3.quantile(pts.map((p) => p.v).sort(d3.ascending), q));
      if (pts.length) {
        svg.append('rect').attr('x', x(g) + bw * 0.2).attr('width', bw * 0.6).attr('y', y(qs[2])).attr('height', Math.max(1, y(qs[0]) - y(qs[2]))).attr('rx', 3).style('fill', gcol(g)).style('fill-opacity', 0.12).style('stroke', gcol(g));
        svg.append('line').attr('x1', x(g) + bw * 0.2).attr('x2', x(g) + bw * 0.8).attr('y1', y(qs[1])).attr('y2', y(qs[1])).style('stroke', 'var(--color-fg)').style('stroke-width', 2.5);
      }
      pts.forEach((p, i) => svg.append('circle').attr('cx', x(g) + bw / 2 + (((i * 37) % 100) / 100 - 0.5) * bw * 0.5).attr('cy', y(p.v)).attr('r', 4.5).style('fill', gcol(g)).style('fill-opacity', 0.8).style('stroke', 'var(--color-bg)')
        .on('pointermove', (ev) => tip.show([`${p.p} (${g})`, `${f3(p.v)} ${p.u}`], ev)).on('pointerleave', () => tip.hide()));
    });
  });
  dash.draw('g_stats', (el) => {
    const d = dash.data('stats_grupos'); if (d.status !== 'ok') return placeholder(el, d);
    const inst = val('g-inst', 'celular'), filtro = val('g-filtro', BEST), cond = val('g-cond', 'OA'), k = val('g-var', 'area');
    const r = d.data.find((x) => x.instrumento === inst && x.filtro === filtro && x.condicao === cond && x.variavel === k);
    if (!r) return placeholder(el, d);
    el.replaceChildren();
    const head = document.createElement('p'); head.className = 'fx-statline';
    const add = (t) => head.appendChild(document.createTextNode(t));
    const b = (field, fmt) => { const e = document.createElement('b'); e.textContent = fmt(num(r[field])); return e; };
    add('Kruskal-Wallis: H = '); head.appendChild(b('H', f2)); add(', p = '); head.appendChild(b('p', fp)); add(', ε² = '); head.appendChild(b('epsilon2', f2)); add(` (n = ${r.n_total}).`);
    el.appendChild(head);
    const tbl = document.createElement('table'); tbl.className = 'fx-table';
    const th = document.createElement('tr'); ['Comparação', 'p (Holm)', 'Tamanho do efeito r', 'Leitura'].forEach((t, i) => { const h = document.createElement('th'); h.textContent = t; if (i && i < 3) h.className = 'fx-num'; th.appendChild(h); });
    const thead = document.createElement('thead'); thead.appendChild(th); tbl.appendChild(thead);
    const tb = document.createElement('tbody');
    [['ji', 'Jovens × Idosos', 'Idosos', 'Jovens'], ['ir', 'Idosos × Risco de quedas', 'Risco de quedas', 'Idosos'], ['jr', 'Jovens × Risco de quedas', 'Risco de quedas', 'Jovens']].forEach(([s, n, hi, lo]) => {
      const tr = document.createElement('tr'); const p = num(r['p_holm_' + s]), rr = num(r['r_' + s]);
      tr.appendChild(td(n)); tr.appendChild(sigStyle(td(fp(p), 'fx-num'), p)); tr.appendChild(td(f2(rr), 'fx-num'));
      tr.appendChild(td(p >= 0.05 ? 'sem diferença' : (rr > 0 ? `${hi} maior` : `${lo} maior`) + (Math.abs(rr) >= 0.5 ? ' (efeito grande)' : Math.abs(rr) >= 0.3 ? ' (efeito médio)' : ' (efeito pequeno)')));
      tb.appendChild(tr);
    });
    tbl.appendChild(tb); const wrap = document.createElement('div'); wrap.className = 'fx-wrap'; wrap.appendChild(tbl); el.appendChild(wrap);
  });
  dash.draw('g_effects', (el) => {
    const d = dash.data('stats_grupos'); if (d.status !== 'ok') return placeholder(el, d);
    const filtro = val('g-filtro', BEST), cond = val('g-cond', 'OA');
    dumbbell(el, VARS.map(([k, n]) => {
      const P = d.data.find((x) => x.instrumento === 'plataforma' && x.filtro === filtro && x.condicao === cond && x.variavel === k);
      const C = d.data.find((x) => x.instrumento === 'celular' && x.filtro === filtro && x.condicao === cond && x.variavel === k);
      return P && C && {label: n, a: num(P.epsilon2), b: num(C.epsilon2), pa: num(P.p), pb: num(C.p)};
    }).filter(Boolean), {xlabel: 'ε² do Kruskal-Wallis (quanto os grupos diferem)', lo: 0, aria: 'Tamanho do efeito entre grupos na plataforma e no celular, por variável'});
  });
  dash.draw('g_filtros', (el) => {
    const d = dash.data('stats_grupos'); if (d.status !== 'ok') return placeholder(el, d);
    const cond = val('g-cond', 'OA');
    heatF(el, ROWS, [PLAT].concat(filtList()), (k, c) => {
      const r = d.data.find((x) => x.instrumento === (c.ref ? 'plataforma' : 'celular') && x.filtro === (c.ref ? 'Sem filtro' : c.k) && x.condicao === cond && x.variavel === k);
      return r && {v: num(r.epsilon2), p: num(r.p)};
    }, {name: 'ε²', aria: 'Diferença entre grupos (ε²) no celular com cada filtro, ao lado da plataforma'});
  });
  on(['g-inst', 'g-filtro', 'g-cond', 'g-var'], ['g_strip', 'g_stats', 'g_effects']); on(['g-cond'], ['g_filtros']);

  // ---------- OLHOS ABERTOS × FECHADOS ----------
  dash.draw('cond_var_options', varOptions);
  dash.draw('c_table', (tb) => {
    const d = dash.data('stats_condicoes'); tb.replaceChildren();
    if (d.status !== 'ok') { const tr = document.createElement('tr'); tr.appendChild(td('Não foi possível carregar estes dados.')); tb.appendChild(tr); return; }
    const inst = val('c-inst', 'celular'), filtro = val('c-filtro', BEST), grupo = val('c-grupo', 'Todos');
    VARS.forEach(([k, n]) => {
      const r = d.data.find((x) => x.instrumento === inst && x.filtro === filtro && x.grupo === grupo && x.variavel === k); if (!r) return;
      const tr = document.createElement('tr'); const p = num(r.p), rr = num(r.r);
      tr.appendChild(td(`${n} (${r.unidade})`)); tr.appendChild(td(f3(num(r.mediana_oa)), 'fx-num')); tr.appendChild(td(f3(num(r.mediana_of)), 'fx-num'));
      tr.appendChild(td('×' + f2(num(r.razao_of_oa)), 'fx-num')); tr.appendChild(sigStyle(td(fp(p), 'fx-num'), p)); tr.appendChild(td(f2(rr), 'fx-num')); tr.appendChild(td(r.pct_aumentou + '%', 'fx-num'));
      tr.appendChild(td(p >= 0.05 ? 'sem diferença' : (rr > 0 ? 'maior de olhos fechados' : 'maior de olhos abertos')));
      tb.appendChild(tr);
    });
  });
  dash.draw('c_effects', (el) => {
    const d = dash.data('stats_condicoes'); if (d.status !== 'ok') return placeholder(el, d);
    const filtro = val('c-filtro', BEST), grupo = val('c-grupo', 'Todos');
    dumbbell(el, VARS.map(([k, n]) => {
      const P = d.data.find((x) => x.instrumento === 'plataforma' && x.filtro === filtro && x.grupo === grupo && x.variavel === k);
      const C = d.data.find((x) => x.instrumento === 'celular' && x.filtro === filtro && x.grupo === grupo && x.variavel === k);
      return P && C && {label: n, a: num(P.r), b: num(C.r), pa: num(P.p), pb: num(C.p)};
    }).filter(Boolean), {xlabel: 'Efeito de fechar os olhos (r; positivo = maior de olhos fechados)', lo: -1, hi: 1, aria: 'Efeito de fechar os olhos na plataforma e no celular, por variável'});
  });
  dash.draw('c_filtros', (el) => {
    const d = dash.data('stats_condicoes'); if (d.status !== 'ok') return placeholder(el, d);
    const grupo = val('c-grupo', 'Todos');
    heatF(el, ROWS, [PLAT].concat(filtList()), (k, c) => {
      const r = d.data.find((x) => x.instrumento === (c.ref ? 'plataforma' : 'celular') && x.filtro === (c.ref ? 'Sem filtro' : c.k) && x.grupo === grupo && x.variavel === k);
      return r && {v: num(r.r), p: num(r.p)};
    }, {max: 1, name: 'r', aria: 'Efeito de fechar os olhos (r) no celular com cada filtro, ao lado da plataforma'});
  });
  dash.draw('c_paired', (el) => {
    const d = dash.data('variaveis'); if (d.status !== 'ok') return placeholder(el, d);
    const inst = val('c-inst', 'celular'), filtro = val('c-filtro', BEST), grupo = val('c-grupo', 'Todos'), k = val('c-var', 'area');
    const rows = d.data.filter((r) => r.instrumento === inst && r.filtro === filtro && r.variavel === k && (grupo === 'Todos' || r.grupo === grupo));
    const by = d3.group(rows, (r) => r.participante); const pairs = [];
    by.forEach((rs, p) => { const a = rs.find((r) => r.condicao === 'OA'), b = rs.find((r) => r.condicao === 'OF'); if (a && b) pairs.push({p, g: a.grupo, a: num(a.valor), b: num(b.valor), u: a.unidade}); });
    if (!pairs.length) return placeholder(el, d);
    el.replaceChildren();
    const W = el.clientWidth, H = 320, m = {t: 14, r: 30, b: 30, l: 62}, log = !isFreq(k) && pairs.every((p) => p.a > 0 && p.b > 0);
    const x = d3.scalePoint().domain(['Olhos abertos', 'Olhos fechados']).range([m.l + 40, W - m.r - 40]);
    const y = (log ? d3.scaleLog() : d3.scaleLinear()).domain(d3.extent(pairs.flatMap((p) => [p.a, p.b]))).nice().range([H - m.b, m.t]);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', `${k} de olhos abertos para fechados, por participante`);
    svg.append('g').attr('class', 'fx-grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(W - m.l - m.r)).tickFormat('')).call((g) => g.select('.domain').remove());
    svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x));
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4, (v) => f3(v)));
    svg.append('text').attr('transform', `translate(12,${(H - m.b + m.t) / 2}) rotate(-90)`).attr('text-anchor', 'middle').text(pairs[0].u);
    const tip = tipper(el);
    pairs.forEach((p) => {
      const up = p.b > p.a;
      svg.append('line').attr('x1', x('Olhos abertos')).attr('x2', x('Olhos fechados')).attr('y1', y(p.a)).attr('y2', y(p.b)).style('stroke', gcol(p.g)).style('stroke-opacity', up ? 0.75 : 0.3).style('stroke-width', 1.5)
        .on('pointermove', (ev) => tip.show([`${p.p} (${p.g})`, `OA ${f3(p.a)} → OF ${f3(p.b)} ${p.u}`], ev)).on('pointerleave', () => tip.hide());
    });
    const ma = d3.median(pairs, (p) => p.a), mb = d3.median(pairs, (p) => p.b);
    svg.append('line').attr('x1', x('Olhos abertos')).attr('x2', x('Olhos fechados')).attr('y1', y(ma)).attr('y2', y(mb)).style('stroke', 'var(--color-fg)').style('stroke-width', 4);
  });
  on(['c-inst', 'c-filtro', 'c-grupo'], ['c_table', 'c_effects', 'c_paired']); on(['c-grupo'], ['c_filtros']); on(['c-var'], ['c_paired']);

  // ---------- CELULAR × PLATAFORMA ----------
  dash.draw('dev_var_options', varOptions);
  dash.draw('d_rho', (el) => {
    const d = dash.data('stats_dispositivos'); if (d.status !== 'ok') return placeholder(el, d);
    const cond = val('d-cond', 'OA'), grupo = val('d-grupo', 'Idosos (todos)');
    heatF(el, ROWS, filtList(), (k, c) => { const r = d.data.find((x) => x.filtro === c.k && x.condicao === cond && x.grupo === grupo && x.variavel === k); return r && {v: num(r.rho), p: num(r.p)}; },
      {max: 1, name: 'ρ', aria: 'Correlação de Spearman entre celular e plataforma por variável e por filtro'});
  });
  dash.draw('d_scatter', (el) => {
    const d = dash.data('variaveis'); if (d.status !== 'ok') return placeholder(el, d);
    const cond = val('d-cond', 'OA'), grupo = val('d-grupo', 'Idosos (todos)'), k = val('d-var', 'area'), filtro = val('d-filtro', BEST);
    const ok = (g) => grupo === 'Idosos (todos)' ? g !== 'Jovens' : g === grupo;
    const rows = d.data.filter((r) => r.filtro === filtro && r.condicao === cond && r.variavel === k && ok(r.grupo));
    const by = d3.group(rows, (r) => r.participante); const pts = [];
    by.forEach((rs, p) => { const a = rs.find((r) => r.instrumento === 'plataforma'), b = rs.find((r) => r.instrumento === 'celular'); if (a && b) pts.push({p, g: a.grupo, x: num(a.valor), y: num(b.valor), ux: a.unidade, uy: b.unidade}); });
    if (!pts.length) return placeholder(el, d);
    el.replaceChildren();
    const W = el.clientWidth, H = Math.min(380, Math.max(280, W * 0.55)), m = {t: 12, r: 16, b: 42, l: 64}, log = !isFreq(k) && pts.every((p) => p.x > 0 && p.y > 0);
    const x = (log ? d3.scaleLog() : d3.scaleLinear()).domain(d3.extent(pts, (p) => p.x)).nice().range([m.l, W - m.r]);
    const y = (log ? d3.scaleLog() : d3.scaleLinear()).domain(d3.extent(pts, (p) => p.y)).nice().range([H - m.b, m.t]);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', `${k}: celular contra plataforma por participante`);
    if (isFreq(k)) { const lo = Math.max(x.domain()[0], y.domain()[0]), hi = Math.min(x.domain()[1], y.domain()[1]); svg.append('line').attr('x1', x(lo)).attr('y1', y(lo)).attr('x2', x(hi)).attr('y2', y(hi)).style('stroke', 'var(--cds-chart-reference)').style('stroke-dasharray', '4 3'); }
    svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(4, (v) => f3(v)));
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4, (v) => f3(v)));
    svg.append('text').attr('x', (m.l + W - m.r) / 2).attr('y', H - 6).attr('text-anchor', 'middle').text(`Plataforma (${pts[0].ux})`);
    svg.append('text').attr('transform', `translate(14,${(H - m.b + m.t) / 2}) rotate(-90)`).attr('text-anchor', 'middle').text(`Celular (${pts[0].uy})`);
    const tip = tipper(el);
    pts.forEach((p) => svg.append('circle').attr('cx', x(p.x)).attr('cy', y(p.y)).attr('r', 5).style('fill', gcol(p.g)).style('fill-opacity', 0.8).style('stroke', 'var(--color-bg)')
      .on('pointermove', (ev) => tip.show([`${p.p} (${p.g})`, `Plataforma ${f3(p.x)} ${p.ux}`, `Celular ${f3(p.y)} ${p.uy}`], ev)).on('pointerleave', () => tip.hide()));
  });
  dash.draw('d_ba', (tb) => {
    const d = dash.data('stats_dispositivos'); tb.replaceChildren();
    if (d.status !== 'ok') { const tr = document.createElement('tr'); tr.appendChild(td('—')); tb.appendChild(tr); return; }
    const cond = val('d-cond', 'OA'), filtro = val('d-filtro', BEST);
    d.data.filter((r) => r.condicao === cond && r.filtro === filtro && r.vies_hz !== '' && r.vies_hz !== null && r.vies_hz !== undefined).forEach((r) => {
      const tr = document.createElement('tr');
      tr.appendChild(td(r.filtro)); tr.appendChild(td(r.grupo)); tr.appendChild(td(r.variavel_nome));
      tr.appendChild(td(f2(num(r.vies_hz)), 'fx-num')); tr.appendChild(td(f2(num(r.loa_inf_hz)), 'fx-num')); tr.appendChild(td(f2(num(r.loa_sup_hz)), 'fx-num')); tr.appendChild(td(f2(num(r.rho)), 'fx-num'));
      tb.appendChild(tr);
    });
  });
  on(['d-cond', 'd-grupo'], ['d_rho', 'd_scatter']); on(['d-var', 'd-filtro'], ['d_scatter']); on(['d-cond', 'd-filtro'], ['d_ba']);

  // abre a aba do endereço (#tab-...) ou a primeira
  const start = (location.hash || '').replace('#', '');
  openTab(tabs.some((t) => t.id === start) ? start : (tabs[0] && tabs[0].id), false);
})();
