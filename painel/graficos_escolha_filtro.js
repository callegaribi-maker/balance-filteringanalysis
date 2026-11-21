/* Aba "Escolha do filtro" (importância dos fatores, ranking, mapa da nota) e cartões do Resumo.
 * Lê: fatorial.csv (440 filtros, já em ordem de posição) e importancia.csv */
(function () {
  const L = d3.formatLocale({decimal: ',', thousands: '.', grouping: [3], currency: ['R$', '']});
  const f0 = L.format('.0f'), f1 = L.format('.1f'), f2 = L.format('.2f');
  const num = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));
  const sel = (id) => document.getElementById(id);
  const val = (id, dflt) => { const e = sel(id); return e && e.value !== undefined && e.value !== null ? e.value : dflt; };
  const HP = ['nenhum', '0,05', '0,1', '0,2', '0,3', '0,5', '0,7'];
  const LP = ['0,7', '1', '1,5', '2', '3', '5', '10', 'nenhum'];
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
  function placeholder(el, d) {
    el.replaceChildren(); const p = document.createElement('p');
    p.className = d.status === 'error' ? 'fx-err' : 'fx-note'; p.textContent = d.status === 'error' ? 'Não foi possível carregar estes dados.' : '—'; el.appendChild(p);
  }
  function on(ids, names) { ids.forEach((id) => { const e = sel(id); if (e) e.addEventListener('change', () => names.forEach((n) => dash.draw(n))); }); }

  // ---------- cartões ----------
  const kpi = (pick, field, fmt) => (el) => {
    const d = dash.data('fatorial');
    if (d.status !== 'ok') { el.textContent = '—'; return; }
    const r = pick(d.data); el.textContent = r ? fmt(r[field]) : '—';
  };
  const byName = (n) => (rows) => rows.find((r) => r.nome === n);
  dash.draw('kpi_raw_nota', kpi(byName(RAWN), 'nota', (v) => f1(num(v))));
  dash.draw('kpi_raw_pos', kpi(byName(RAWN), 'posicao', (v) => f0(num(v))));
  dash.draw('kpi_top_nota', kpi((rows) => rows[0], 'nota', (v) => f1(num(v))));
  dash.draw('kpi_top_nome', kpi((rows) => rows[0], 'nome', (v) => String(v)));

  // ---------- importância ----------
  dash.draw('imp_chart', (el) => {
    const d = dash.data('importancia');
    if (d.status !== 'ok') return placeholder(el, d);
    const fac = Array.from(new Map(d.data.map((r) => [r.fator, num(r.amplitude_fator)])).entries()).sort((a, b) => b[1] - a[1]);
    el.replaceChildren();
    const W = el.clientWidth, rowH = 42, m = {t: 6, r: 90, b: 30, l: Math.min(150, W * 0.35)}, H = m.t + rowH * fac.length + m.b;
    const x = d3.scaleLinear().domain([0, d3.max(fac, (f) => f[1]) * 1.05]).range([m.l, W - m.r]);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Quanto a nota muda conforme cada fator do filtro');
    svg.append('g').attr('class', 'fx-grid').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(5).tickSize(-(H - m.b - m.t)).tickFormat('')).call((g) => g.select('.domain').remove());
    svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(5).tickFormat((v) => L.format('~g')(v)));
    const tip = tipper(el);
    fac.forEach(([f, v], i) => {
      const y = m.t + rowH * i;
      svg.append('text').attr('x', m.l - 10).attr('y', y + rowH / 2 + 4).attr('text-anchor', 'end').style('fill', 'var(--color-fg)').style('font-size', '12px').text(f);
      svg.append('rect').attr('x', m.l).attr('y', y + 8).attr('height', rowH - 16).attr('width', Math.max(2, x(v) - m.l)).attr('rx', 3)
        .style('fill', v >= 10 ? dash.colors[0] : 'var(--cds-chart-muted)')
        .on('pointermove', (ev) => tip.show([f, `muda a nota em ${f1(v)} pontos`], ev)).on('pointerleave', () => tip.hide());
      svg.append('text').attr('x', x(v) + 8).attr('y', y + rowH / 2 + 4).style('fill', 'var(--color-fg)').style('font-size', '12px').text(`${f1(v)} pontos`);
    });
  });
  dash.draw('imp_levels', (el) => {
    const d = dash.data('importancia');
    if (d.status !== 'ok') return placeholder(el, d);
    const facs = Array.from(d3.group(d.data, (r) => r.fator).entries()).sort((a, b) => num(b[1][0].amplitude_fator) - num(a[1][0].amplitude_fator));
    el.replaceChildren();
    const W = el.clientWidth, cols = W < 600 ? 2 : 5, pw = W / cols, ph = 170, rowsN = Math.ceil(facs.length / cols), H = ph * rowsN;
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Nota média em cada valor de cada fator');
    const y = d3.scaleLinear().domain([30, 75]).range([ph - 34, 26]);
    const tip = tipper(el);
    facs.forEach(([f, rows], k) => {
      const gx = (k % cols) * pw, gy = Math.floor(k / cols) * ph, g = svg.append('g').attr('transform', `translate(${gx},${gy})`);
      const x = d3.scalePoint().domain(rows.map((r) => r.nivel)).range([34, pw - 14]).padding(0.3);
      g.append('text').attr('x', 6).attr('y', 14).style('fill', 'var(--color-fg)').style('font-weight', 600).style('font-size', '12px').text(f);
      g.append('g').attr('transform', 'translate(30,0)').call(d3.axisLeft(y).ticks(3).tickFormat((v) => f0(v)));
      g.append('g').attr('transform', `translate(0,${ph - 34})`).call(d3.axisBottom(x).tickSizeOuter(0)).selectAll('text').style('font-size', '9.5px');
      const pts = rows.map((r) => ({n: r.nivel, v: num(r.nota_media)}));
      g.append('path').datum(pts).attr('d', d3.line().x((p) => x(p.n)).y((p) => y(p.v))).style('fill', 'none').style('stroke', dash.colors[0]).style('stroke-width', 2);
      const best = pts.reduce((a, p) => (p.v > a.v ? p : a), pts[0]);
      pts.forEach((p) => g.append('circle').attr('cx', x(p.n)).attr('cy', y(p.v)).attr('r', p === best ? 6 : 4).style('fill', p === best ? 'var(--cds-chart-status-critical)' : dash.colors[0])
        .on('pointermove', (ev) => tip.show([`${f}: ${p.n}`, `nota média ${f1(p.v)}`], ev)).on('pointerleave', () => tip.hide()));
    });
  });

  // ---------- ranking ----------
  dash.draw('rk_chart', (el) => {
    const d = dash.data('fatorial');
    if (d.status !== 'ok') return placeholder(el, d);
    const o = val('rk-ordem', ''), f = val('rk-fase', ''), du = val('rk-dur', ''), n = +val('rk-n', '15');
    const all = d.data.filter((r) => (!o || r.ordem === o) && (!f || r.fase === f) && (!du || r.duracao_s === du));
    let show = all.slice(0, n);
    const raw = d.data.find((x) => x.nome === RAWN); if (raw && !show.includes(raw)) show = show.concat([raw]);
    el.replaceChildren();
    const W = el.clientWidth, rowH = 24, m = {t: 6, r: 40, b: 30, l: Math.min(330, W * 0.55)}, H = m.t + rowH * show.length + m.b;
    const x = d3.scaleLinear().domain([0, 100]).range([m.l, W - m.r]);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Ranking dos filtros pela nota de 0 a 100');
    svg.append('g').attr('class', 'fx-grid').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(5).tickSize(-(H - m.b - m.t)).tickFormat('')).call((g) => g.select('.domain').remove());
    svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(5));
    const tip = tipper(el);
    show.forEach((r, i) => {
      const y = m.t + rowH * i, isBest = String(r.posicao) === '1', isRaw = r.nome === RAWN;
      const col = isBest ? 'var(--cds-chart-status-critical)' : isRaw ? 'var(--cds-chart-muted)' : dash.colors[0];
      svg.append('text').attr('x', m.l - 8).attr('y', y + rowH / 2 + 4).attr('text-anchor', 'end').style('fill', 'var(--color-fg)').style('font-size', W < 500 ? '9.5px' : '11px')
        .style('font-weight', isBest ? 600 : 400).text(`${r.posicao}º  ${r.nome}`);
      svg.append('rect').attr('x', m.l).attr('y', y + 4).attr('height', rowH - 8).attr('width', Math.max(1, x(num(r.nota)) - m.l)).attr('rx', 3).style('fill', col)
        .on('pointermove', (ev) => tip.show([`${r.posicao}º — ${r.nome}`, `Nota ${f0(num(r.nota))}`, `Concordância ${f2(num(r.concordancia))}`, `Confiabilidade ${f2(num(r.confiabilidade))}`, `Efeito dos olhos ${f2(num(r.efeito_olhos))}`, `Separação de grupos ${f2(num(r.separacao_grupos))}`], ev))
        .on('pointerleave', () => tip.hide());
      svg.append('text').attr('x', x(num(r.nota)) + 6).attr('y', y + rowH / 2 + 4).style('fill', 'var(--color-fg)').text(f0(num(r.nota)));
    });
  });
  on(['rk-ordem', 'rk-fase', 'rk-dur', 'rk-n'], ['rk_chart']);

  // ---------- mapa da nota ----------
  dash.draw('mn_chart', (el) => {
    const d = dash.data('fatorial');
    if (d.status !== 'ok') return placeholder(el, d);
    const o = val('mn-ordem', '2'), f = val('mn-fase', 'zero'), du = val('mn-dur', '30');
    const rows = d.data.filter((r) => r.ordem === o && r.fase === f && r.duracao_s === du);
    el.replaceChildren();
    const W = el.clientWidth, cw = Math.max(34, (W - 70) / LP.length), ch = W < 480 ? 34 : 44, m = {t: 8, r: 8, b: 44, l: 62}, H = m.t + ch * HP.length + m.b;
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${m.l + cw * LP.length + m.r} ${H}`).attr('role', 'img').attr('aria-label', `Nota de cada banda (${o}ª ordem, fase ${f}, ${du} s)`);
    const op = d3.scaleLinear().domain([20, 90]).range([0.06, 1]).clamp(true);
    const tip = tipper(el);
    HP.forEach((h, i) => svg.append('text').attr('x', m.l - 8).attr('y', m.t + ch * i + ch / 2 + 4).attr('text-anchor', 'end').text(h));
    LP.forEach((l, j) => svg.append('text').attr('x', m.l + cw * j + cw / 2).attr('y', m.t + ch * HP.length + 16).attr('text-anchor', 'middle').text(l));
    svg.append('text').attr('x', m.l + cw * LP.length / 2).attr('y', H - 6).attr('text-anchor', 'middle').text('Passa-baixa (Hz)');
    svg.append('text').attr('transform', `translate(12,${m.t + ch * HP.length / 2}) rotate(-90)`).attr('text-anchor', 'middle').text('Passa-alta (Hz)');
    HP.forEach((h, i) => LP.forEach((l, j) => {
      const r = rows.find((x) => x.passa_alta === h && x.passa_baixa === l); const gx = m.l + cw * j, gy = m.t + ch * i;
      if (!r) { svg.append('text').attr('x', gx + cw / 2).attr('y', gy + ch / 2 + 4).attr('text-anchor', 'middle').text('–'); return; }
      const v = num(r.nota), oo = op(v);
      svg.append('rect').attr('x', gx + 1).attr('y', gy + 1).attr('width', cw - 2).attr('height', ch - 2).attr('rx', 3).style('fill', dash.colors[0]).style('fill-opacity', oo)
        .on('pointermove', (ev) => tip.show([`${r.nome}`, `Nota ${f0(v)} (posição ${r.posicao} de 440)`, `Concordância ${f2(num(r.concordancia))} · Confiabilidade ${f2(num(r.confiabilidade))}`, `Olhos ${f2(num(r.efeito_olhos))} · Grupos ${f2(num(r.separacao_grupos))}`], ev))
        .on('pointerleave', () => tip.hide());
      svg.append('text').attr('class', 'fx-cell-text' + (oo > 0.6 ? ' fx-on-dark' : '')).attr('x', gx + cw / 2).attr('y', gy + ch / 2 + 4).attr('text-anchor', 'middle').style('pointer-events', 'none').text(f0(v));
      if (String(r.posicao) === '1') svg.append('rect').attr('x', gx + 1).attr('y', gy + 1).attr('width', cw - 2).attr('height', ch - 2).attr('rx', 3).style('fill', 'none').style('stroke', 'var(--cds-chart-status-critical)').style('stroke-width', 2.5).style('pointer-events', 'none');
    }));
  });
  on(['mn-ordem', 'mn-fase', 'mn-dur'], ['mn_chart']);
})();
