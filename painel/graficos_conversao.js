/* Aba "Conversão para deslocamento": o que acontece quando a aceleração do celular é integrada duas vezes para virar cm.
 * Lê: conversao_resumo.csv, conversao_exemplo.csv, conversao_ganho.csv (gerados por codigo/09_conversao_deslocamento.py) */
(function () {
  const L = d3.formatLocale({decimal: ',', thousands: '.', grouping: [3], currency: ['R$', '']});
  const f2 = L.format('.2f'), f1 = L.format('.1f'), g2 = L.format('.2~r');
  const num = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));
  const sel = (id) => document.getElementById(id);
  const val = (id, d) => { const e = sel(id); return e && e.value ? e.value : d; };
  const DIRETA = 'Integração direta (sem passa-alta)', SEMCONV = 'Sem converter: aceleração filtrada 0,7–1,5 Hz', CONVBANDA = 'Integração + filtro 0,7–1,5 Hz';
  const COL = {cop: () => dash.colors[0], cel: () => dash.colors[1] || dash.colors[0]};
  const ratio = (v) => (isNaN(v) ? '—' : '×' + (v >= 10 ? L.format('.0f')(v) : v >= 1 ? f1(v) : f2(v)));
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
    p.className = d && d.status === 'error' ? 'fx-err' : 'fx-note'; p.textContent = d && d.status === 'error' ? 'Não foi possível carregar estes dados.' : '—'; el.appendChild(p);
  }
  function on(ids, names) { ids.forEach((id) => { const e = sel(id); if (e) e.addEventListener('change', () => names.forEach((n) => dash.draw(n))); }); }
  function td(text, cls) { const e = document.createElement('td'); if (cls) e.className = cls; e.textContent = text; return e; }
  const resumo = (metodo, grupo) => { const d = dash.data('conversao_resumo'); return d.status === 'ok' ? d.data.find((r) => r.metodo === metodo && r.grupo === grupo) : null; };

  // ---------- cartões ----------
  const kpi = (fn) => (el) => { const d = dash.data('conversao_resumo'); if (d.status !== 'ok') { el.textContent = '—'; return; } el.textContent = fn(d.data, val('conv-grupo', 'Todos')); };
  dash.draw('conv_kpi_deriva', kpi((rows, g) => { const r = resumo(DIRETA, g); return r ? `${L.format('.0f')(num(r.excursao_ap_cm))} cm` : '—'; }));
  dash.draw('conv_kpi_cop', kpi((rows, g) => { const r = resumo(DIRETA, g); return r ? `${f1(num(r.excursao_cop_ap_cm))} cm` : '—'; }));
  dash.draw('conv_kpi_faixa', kpi((rows, g) => {
    const v = rows.filter((r) => r.grupo === g && r.unidade_celular === 'cm' && r.metodo !== CONVBANDA).map((r) => num(r.razao_rms_ap)).filter((x) => !isNaN(x));
    return v.length ? `${ratio(d3.min(v))} a ${ratio(d3.max(v))}` : '—';
  }));
  dash.draw('conv_kpi_rconv', kpi((rows, g) => { const r = resumo(CONVBANDA, g); return r ? f2(num(r.r_cop_mesma_banda_ap)) : '—'; }));
  dash.draw('conv_kpi_racc', kpi((rows, g) => { const r = resumo(SEMCONV, g); return r ? f2(num(r.r_cop_mesma_banda_ap)) : '—'; }));

  // ---------- exemplo no tempo ----------
  dash.draw('conv_metodo_opts', (s) => {
    const d = dash.data('conversao_resumo'); const prev = s.value;
    const ms = d.status === 'ok' ? Array.from(new Set(d.data.filter((r) => r.unidade_celular === 'cm').map((r) => r.metodo))) : [];
    s.replaceChildren(...ms.map((m) => new Option(m, m)));
    s.value = ms.includes(prev) ? prev : 'Integração + passa-alta 0,2 Hz';
  });
  dash.draw('conv_ex_chart', (el) => {
    const d = dash.data('conversao_exemplo'); if (d.status !== 'ok') return placeholder(el, d);
    const g0 = val('conv-grupo', 'Todos'), g = g0 === 'Todos' ? 'Idosos' : g0, m = val('conv-metodo', 'Integração + passa-alta 0,2 Hz');
    const rows = d.data.filter((r) => r.grupo === g && r.metodo === m).map((r) => ({t: num(r.tempo_s), cop: num(r.cop_bruto_cm), ref: num(r.cop_mesma_banda_cm), cel: num(r.celular)}));
    if (!rows.length) return placeholder(el, d);
    el.replaceChildren();
    const W = el.clientWidth, H = 320, mg = {t: 14, r: 16, b: 38, l: 58};
    const x = d3.scaleLinear().domain(d3.extent(rows, (r) => r.t)).range([mg.l, W - mg.r]);
    const y = d3.scaleLinear().domain(d3.extent(rows.flatMap((r) => [r.cop, r.ref, r.cel]))).nice().range([H - mg.b, mg.t]);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', `Deslocamento AP no tempo: plataforma e celular convertido (${m})`);
    svg.append('g').attr('class', 'fx-grid').attr('transform', `translate(${mg.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - mg.l - mg.r)).tickFormat('')).call((s) => s.select('.domain').remove());
    svg.append('g').attr('transform', `translate(0,${H - mg.b})`).call(d3.axisBottom(x).ticks(6));
    svg.append('g').attr('transform', `translate(${mg.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat((v) => L.format('~g')(v)));
    svg.append('text').attr('x', (mg.l + W - mg.r) / 2).attr('y', H - 6).attr('text-anchor', 'middle').text('Tempo (s)');
    svg.append('text').attr('transform', `translate(14,${(H - mg.b + mg.t) / 2}) rotate(-90)`).attr('text-anchor', 'middle').text('Deslocamento AP (cm)');
    const line = (k) => d3.line().x((r) => x(r.t)).y((r) => y(r[k]));
    svg.append('path').datum(rows).attr('d', line('cop')).style('fill', 'none').style('stroke', COL.cop()).style('stroke-width', 2);
    if (m !== DIRETA) svg.append('path').datum(rows).attr('d', line('ref')).style('fill', 'none').style('stroke', 'var(--cds-chart-reference)').style('stroke-width', 1.5).style('stroke-dasharray', '4 3');
    svg.append('path').datum(rows).attr('d', line('cel')).style('fill', 'none').style('stroke', COL.cel()).style('stroke-width', 2);
    const tip = tipper(el); const ts = rows.map((r) => r.t);
    svg.append('rect').attr('x', mg.l).attr('y', mg.t).attr('width', W - mg.l - mg.r).attr('height', H - mg.t - mg.b).style('fill', 'transparent')
      .on('pointermove', (ev) => { const [px] = d3.pointer(ev); const i = d3.bisectCenter(ts, x.invert(px)); const r = rows[i];
        tip.show([`${f1(r.t)} s`, `Plataforma: ${f2(r.cop)} cm`, ...(m !== DIRETA ? [`Plataforma na mesma banda: ${f2(r.ref)} cm`] : []), `Celular convertido: ${f2(r.cel)} cm`], ev); })
      .on('pointerleave', () => tip.hide());
  });
  dash.draw('conv_ex_key', (el) => {
    const m = val('conv-metodo', '');
    const items = [['Plataforma (COP)', COL.cop(), ''], ...(m !== DIRETA ? [['Plataforma filtrada na mesma banda', 'var(--cds-chart-reference)', '4 3']] : []), ['Celular convertido para cm', COL.cel(), '']];
    el.replaceChildren(...items.map(([n, c, dash_]) => {
      const s = document.createElement('span'); const i = document.createElement('i'); i.className = 'fx-sw'; i.style.background = c; i.style.height = '3px'; i.style.width = '18px';
      if (dash_) i.style.background = `repeating-linear-gradient(90deg, ${c} 0 4px, transparent 4px 7px)`;
      s.append(i, document.createTextNode(n)); return s;
    }));
  });

  // ---------- razão de amplitude ----------
  dash.draw('conv_razao_chart', (el) => {
    const d = dash.data('conversao_resumo'); if (d.status !== 'ok') return placeholder(el, d);
    const g = val('conv-grupo', 'Todos');
    const items = d.data.filter((r) => r.grupo === g && r.unidade_celular === 'cm').map((r) => ({m: r.metodo, v: num(r.razao_rms_ap), lo: num(r.razao_rms_ap_q1), hi: num(r.razao_rms_ap_q3)}));
    el.replaceChildren();
    const W = el.clientWidth, rowH = 40, mg = {t: 10, r: 70, b: 40, l: Math.min(250, W * 0.42)}, H = mg.t + rowH * items.length + mg.b;
    const x = d3.scaleLog().domain([0.02, 2000]).range([mg.l, W - mg.r]).clamp(true);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Amplitude do celular convertido dividida pela amplitude do COP, por método');
    svg.append('rect').attr('x', x(0.8)).attr('width', x(1.25) - x(0.8)).attr('y', mg.t).attr('height', H - mg.t - mg.b).style('fill', 'var(--color-ok)').style('opacity', 0.12);
    svg.append('line').attr('x1', x(1)).attr('x2', x(1)).attr('y1', mg.t).attr('y2', H - mg.b).style('stroke', 'var(--color-ok)').style('stroke-width', 1.5);
    svg.append('g').attr('transform', `translate(0,${H - mg.b})`).call(d3.axisBottom(x).tickValues([0.1, 1, 10, 100, 1000]).tickFormat((v) => '×' + L.format('~g')(v)));
    svg.append('text').attr('x', (mg.l + W - mg.r) / 2).attr('y', H - 6).attr('text-anchor', 'middle').text('RMS do celular convertido ÷ RMS do COP (AP, escala log; ×1 = amplitude certa)');
    const tip = tipper(el);
    items.forEach((it, i) => {
      const cy = mg.t + rowH * i + rowH / 2;
      svg.append('text').attr('x', mg.l - 10).attr('y', cy + 4).attr('text-anchor', 'end').style('fill', 'var(--color-fg)').text(it.m);
      svg.append('line').attr('x1', x(it.lo)).attr('x2', x(it.hi)).attr('y1', cy).attr('y2', cy).style('stroke', COL.cel()).style('stroke-width', 3).style('stroke-linecap', 'round');
      svg.append('circle').attr('cx', x(it.v)).attr('cy', cy).attr('r', 6).style('fill', COL.cel()).style('stroke', 'var(--color-bg)').style('stroke-width', 1.5);
      svg.append('text').attr('x', Math.min(x(it.hi) + 8, W - mg.r + 6)).attr('y', cy + 4).style('fill', 'var(--color-fg)').text(ratio(it.v));
      svg.append('rect').attr('x', mg.l).attr('y', cy - rowH / 2).attr('width', W - mg.l - mg.r).attr('height', rowH).style('fill', 'transparent')
        .on('pointermove', (ev) => tip.show([it.m, `Mediana ${ratio(it.v)} (metade dos participantes entre ${ratio(it.lo)} e ${ratio(it.hi)})`], ev)).on('pointerleave', () => tip.hide());
    });
  });

  // ---------- tabela ----------
  dash.draw('conv_tbody', (tb) => {
    const d = dash.data('conversao_resumo'); tb.replaceChildren();
    if (d.status !== 'ok') { const tr = document.createElement('tr'); tr.appendChild(td('Não foi possível carregar estes dados.')); tb.appendChild(tr); return; }
    const g = val('conv-grupo', 'Todos');
    d.data.filter((r) => r.grupo === g).forEach((r) => {
      const tr = document.createElement('tr'); if (r.metodo === SEMCONV) tr.style.fontWeight = '600';
      tr.appendChild(td(r.metodo));
      ['r_cop_bruto_ap', 'r_cop_bruto_ml', 'r_cop_mesma_banda_ap', 'r_cop_mesma_banda_ml', 'spearman_area'].forEach((k) => tr.appendChild(td(f2(num(r[k])), 'fx-num')));
      tr.appendChild(td(ratio(num(r.razao_rms_ap)), 'fx-num')); tr.appendChild(td(ratio(num(r.razao_rms_ap_mesma_banda)), 'fx-num'));
      tr.appendChild(td(r.unidade_celular === 'cm' ? `${L.format('.1f')(num(r.excursao_ap_cm))} cm` : '—', 'fx-num'));
      tb.appendChild(tr);
    });
  });

  // ---------- ganho da dupla integração ----------
  dash.draw('conv_ganho_chart', (el) => {
    const d = dash.data('conversao_ganho'); if (d.status !== 'ok') return placeholder(el, d);
    const rows = d.data.map((r) => ({f: num(r.frequencia_hz), gn: num(r.cm_por_ms2)}));
    el.replaceChildren();
    const W = el.clientWidth, H = 320, mg = {t: 14, r: 20, b: 40, l: 64};
    const x = d3.scaleLog().domain([0.02, 20]).range([mg.l, W - mg.r]), y = d3.scaleLog().domain([0.005, 10000]).range([H - mg.b, mg.t]);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Quantos cm a dupla integração produz para 1 m/s² em cada frequência');
    svg.append('rect').attr('x', x(0.1)).attr('width', x(1) - x(0.1)).attr('y', mg.t).attr('height', H - mg.t - mg.b).style('fill', 'var(--cds-chart-muted)').style('opacity', 0.25);
    svg.append('text').attr('x', (x(0.1) + x(1)) / 2).attr('y', mg.t + 14).attr('text-anchor', 'middle').text('oscilação postural');
    svg.append('g').attr('class', 'fx-grid').attr('transform', `translate(${mg.l},0)`).call(d3.axisLeft(y).tickValues([0.01, 1, 100, 10000]).tickSize(-(W - mg.l - mg.r)).tickFormat('')).call((s) => s.select('.domain').remove());
    svg.append('g').attr('transform', `translate(0,${H - mg.b})`).call(d3.axisBottom(x).tickValues([0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20]).tickFormat((v) => L.format('~g')(v)));
    svg.append('g').attr('transform', `translate(${mg.l},0)`).call(d3.axisLeft(y).tickValues([0.01, 0.1, 1, 10, 100, 1000, 10000]).tickFormat((v) => L.format('~g')(v)));
    svg.append('text').attr('x', (mg.l + W - mg.r) / 2).attr('y', H - 6).attr('text-anchor', 'middle').text('Frequência (Hz, escala log)');
    svg.append('text').attr('transform', `translate(14,${(H - mg.b + mg.t) / 2}) rotate(-90)`).attr('text-anchor', 'middle').text('cm gerados por 1 m/s² (escala log)');
    svg.append('path').datum(rows).attr('d', d3.line().x((r) => x(r.f)).y((r) => y(r.gn))).style('fill', 'none').style('stroke', COL.cel()).style('stroke-width', 2.5);
    [[0.05, ''], [0.2, ''], [1, ''], [5, '']].forEach(([f]) => {
      const gn = 100 / (2 * Math.PI * f) ** 2;
      svg.append('circle').attr('cx', x(f)).attr('cy', y(gn)).attr('r', 4.5).style('fill', COL.cel());
      svg.append('text').attr('x', x(f) + 8).attr('y', y(gn) - 6).style('fill', 'var(--color-fg)').text(`${L.format('~g')(f)} Hz → ${gn >= 10 ? L.format('.0f')(gn) : g2(gn)} cm`);
    });
  });

  on(['conv-grupo'], ['conv_kpi_deriva', 'conv_kpi_cop', 'conv_kpi_faixa', 'conv_kpi_rconv', 'conv_kpi_racc', 'conv_ex_chart', 'conv_razao_chart', 'conv_tbody']);
  on(['conv-metodo'], ['conv_ex_chart', 'conv_ex_key']);
})();
