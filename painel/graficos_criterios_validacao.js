/* Abas "Coerência e critérios", "Validação" e tabela da amostra.
 * Lê: grade.csv, coerencia.csv, bandas.csv, cv_escolhas.csv, cv_teste.csv, grupo_fora.csv, amostra.csv */
(function () {
  const L = d3.formatLocale({decimal: ',', thousands: '.', grouping: [3], currency: ['R$', '']});
  const f2 = L.format('.2f'), fs = L.format('+.2f');
  const GROUPS = ['Jovens', 'Idosos', 'Risco de quedas'];
  const gcol = (g) => dash.colors[GROUPS.indexOf(g)] || dash.colors[0];
  const num = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));
  const sel = (id) => document.getElementById(id);
  const val = (id, dflt) => { const e = sel(id); return e && e.value ? e.value : dflt; };
  const HP = ['nenhum', '0,05', '0,1', '0,2', '0,3', '0,5', '0,7'];
  const LP = ['0,7', '1', '1,5', '2', '3', '5', '10', 'nenhum'];
  const REC = '0,7–1,5', RAW = 'nenhum–nenhum';   // REC = banda do melhor filtro encontrado

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
    el.replaceChildren();
    const p = document.createElement('p');
    if (d.status === 'error') { p.className = 'fx-err'; p.textContent = 'Não foi possível carregar estes dados.'; }
    else { p.className = 'fx-note'; p.textContent = text || '—'; }
    el.appendChild(p);
  }
  function rerenderOn(ids, names) { ids.forEach((id) => { const e = sel(id); if (e) e.addEventListener('change', () => names.forEach((n) => dash.draw(n))); }); }

  function legend(el) {
    el.replaceChildren(...GROUPS.map((g) => {
      const s = document.createElement('span'); const sw = document.createElement('i'); sw.className = 'fx-sw'; sw.style.background = gcol(g);
      s.append(sw, document.createTextNode(g)); return s;
    }));
  }
  dash.draw('legend_groups_1', legend);

  function simpleTable(src, cols, numCols, fmt) {
    return (tb) => {
      const d = dash.data(src); tb.replaceChildren();
      if (d.status !== 'ok') {
        const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = cols.length;
        td.textContent = d.status === 'error' ? 'Não foi possível carregar estes dados.' : '—'; tr.appendChild(td); tb.appendChild(tr); return;
      }
      d.data.forEach((r) => {
        const tr = document.createElement('tr');
        cols.forEach((c) => {
          const td = document.createElement('td');
          if (numCols.includes(c)) { td.className = 'fx-num'; const v = num(r[c]); td.textContent = isNaN(v) ? '—' : (fmt ? fmt(v, c) : String(v)); }
          else td.textContent = r[c] ?? '—';
          tr.appendChild(td);
        });
        tb.appendChild(tr);
      });
    };
  }
  dash.draw('amostra_tbody', simpleTable('amostra', ['grupo', 'participantes', 'tentativas', 'protocolo', 'aparelho'], ['participantes', 'tentativas'], (v) => L.format('d')(v)));
  dash.draw('bandas_tbody', simpleTable('bandas', ['grupo', 'eixo', 'inicio_hz', 'fim_hz', 'tentativas'], ['inicio_hz', 'fim_hz', 'tentativas'], (v, c) => c === 'tentativas' ? L.format('d')(v) : f2(v)));
  dash.draw('fora_tbody', simpleTable('grupo_fora', ['grupo_teste', 'filtro_escolhido', 'criterio', 'escolhido', 'sem_filtro', 'fixo_02_2', 'melhor_possivel'], ['escolhido', 'sem_filtro', 'fixo_02_2', 'melhor_possivel'], (v) => f2(v)));

  // ---------- coerência ----------
  dash.draw('coh_chart', (el) => {
    const d = dash.data('coerencia');
    if (d.status !== 'ok') return placeholder(el, d);
    const eixo = val('coh-eixo', 'AP');
    const rows = d.data.filter((r) => r.eixo === eixo).map((r) => ({g: r.grupo, f: num(r.frequencia_hz), c: num(r.coerencia)}));
    el.replaceChildren();
    const W = el.clientWidth, H = 320, m = {t: 12, r: 16, b: 40, l: 44};
    const x = d3.scaleLog().domain([0.08, 20]).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([0, 1]).range([H - m.b, m.t]);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
      .attr('aria-label', `Coerência entre celular e plataforma por frequência, eixo ${eixo}, para cada grupo`);
    svg.append('rect').attr('x', x(0.7)).attr('width', x(1.5) - x(0.7)).attr('y', m.t).attr('height', H - m.b - m.t).style('fill', 'var(--cds-chart-muted)').style('opacity', 0.25);
    svg.append('g').attr('class', 'fx-grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.l - m.r)).tickFormat('')).call((g) => g.select('.domain').remove());
    svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(0.5)).attr('y2', y(0.5)).style('stroke', 'var(--cds-chart-reference)').style('stroke-dasharray', '3 3');
    const ticks = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20];
    svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickValues(W < 480 ? [0.1, 0.5, 2, 10] : ticks).tickFormat((v) => L.format('~g')(v)));
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat((v) => L.format('.1f')(v)));
    svg.append('text').attr('x', (m.l + W - m.r) / 2).attr('y', H - 6).attr('text-anchor', 'middle').text('Frequência (Hz, escala log)');
    const line = d3.line().x((p) => x(p.f)).y((p) => y(p.c));
    const by = d3.group(rows.filter((p) => p.f >= 0.08), (p) => p.g);
    GROUPS.forEach((g) => { const pts = by.get(g) || []; svg.append('path').datum(pts).attr('d', line).style('fill', 'none').style('stroke', gcol(g)).style('stroke-width', 2); });
    const tip = tipper(el);
    const fx = by.get(GROUPS[0]) ? by.get(GROUPS[0]).map((p) => p.f) : [];
    svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', W - m.l - m.r).attr('height', H - m.t - m.b).style('fill', 'transparent')
      .on('pointermove', (ev) => {
        const [px] = d3.pointer(ev); const f = x.invert(px); if (!fx.length) return;
        const i = d3.minIndex(fx, (v) => Math.abs(Math.log(v) - Math.log(f)));
        tip.show([`${L.format('.2f')(fx[i])} Hz`, ...GROUPS.map((g) => `${g}: ${f2((by.get(g) || [])[i]?.c ?? NaN)}`)], ev);
      }).on('pointerleave', () => tip.hide());
  });
  rerenderOn(['coh-eixo'], ['coh_chart']);

  // ---------- mapa de calor passa-alta × passa-baixa ----------
  function heat(el, cells, opts) {
    el.replaceChildren();
    const W = el.clientWidth, cw = Math.max(34, (W - 70) / LP.length), ch = W < 480 ? 34 : 44;
    const m = {t: 8, r: 8, b: 44, l: 62}, H = m.t + ch * HP.length + m.b;
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${m.l + cw * LP.length + m.r} ${H}`).attr('role', 'img').attr('aria-label', opts.aria);
    const vals = cells.map((c) => c.v).filter((v) => !isNaN(v));
    const lo = opts.lo ?? d3.min(vals), hi = opts.hi ?? d3.max(vals);
    const op = d3.scaleLinear().domain([lo, hi]).range([0.06, 1]).clamp(true);
    const best = opts.best === false ? null : cells.reduce((a, c) => (!isNaN(c.v) && (!a || c.v > a.v) ? c : a), null);
    const tip = tipper(el);
    HP.forEach((h, i) => svg.append('text').attr('x', m.l - 8).attr('y', m.t + ch * i + ch / 2 + 4).attr('text-anchor', 'end').text(h));
    LP.forEach((l, j) => svg.append('text').attr('x', m.l + cw * j + cw / 2).attr('y', m.t + ch * HP.length + 16).attr('text-anchor', 'middle').text(l));
    svg.append('text').attr('x', m.l + cw * LP.length / 2).attr('y', H - 6).attr('text-anchor', 'middle').text('Passa-baixa (Hz)');
    svg.append('text').attr('transform', `translate(12,${m.t + ch * HP.length / 2}) rotate(-90)`).attr('text-anchor', 'middle').text('Passa-alta (Hz)');
    cells.forEach((c) => {
      const gx = m.l + cw * c.j, gy = m.t + ch * c.i;
      if (isNaN(c.v)) { svg.append('text').attr('x', gx + cw / 2).attr('y', gy + ch / 2 + 4).attr('text-anchor', 'middle').text('–'); return; }
      const o = op(c.v);
      svg.append('rect').attr('x', gx + 1).attr('y', gy + 1).attr('width', cw - 2).attr('height', ch - 2).attr('rx', 3)
        .style('fill', dash.colors[0]).style('fill-opacity', o)
        .on('pointermove', (ev) => tip.show(c.tip, ev)).on('pointerleave', () => tip.hide());
      svg.append('text').attr('class', 'fx-cell-text' + (o > 0.6 ? ' fx-on-dark' : '')).attr('x', gx + cw / 2).attr('y', gy + ch / 2 + 4)
        .attr('text-anchor', 'middle').style('pointer-events', 'none').text(opts.fmt(c.v));
      if (c.filtro === REC) svg.append('rect').attr('x', gx + 1).attr('y', gy + 1).attr('width', cw - 2).attr('height', ch - 2).attr('rx', 3).style('fill', 'none').style('stroke', 'var(--cds-chart-status-critical)').style('stroke-width', 2.5).style('pointer-events', 'none');
      if (c.filtro === RAW) svg.append('rect').attr('x', gx + 1).attr('y', gy + 1).attr('width', cw - 2).attr('height', ch - 2).attr('rx', 3).style('fill', 'none').style('stroke', 'var(--color-fg)').style('stroke-dasharray', '4 3').style('stroke-width', 1.5).style('pointer-events', 'none');
      if (best && c === best) svg.append('text').attr('class', 'fx-cell-text' + (o > 0.6 ? ' fx-on-dark' : '')).attr('x', gx + cw - 8).attr('y', gy + 13).attr('text-anchor', 'middle').style('pointer-events', 'none').text('★');
    });
  }

  dash.draw('mapa_crit_options', (s) => {
    const d = dash.data('grade'); const inst = val('mapa-inst', 'celular'); const prev = s.value;
    const opts = d.status === 'ok' ? Array.from(new Map(d.data.filter((r) => r.instrumento === inst).map((r) => [r.criterio, r.criterio_nome])).entries()) : [];
    s.replaceChildren(...opts.map(([k, n]) => new Option(n, k)));
    if (opts.some(([k]) => k === prev)) s.value = prev;
  });
  dash.draw('mapa_chart', (el) => {
    const d = dash.data('grade');
    if (d.status !== 'ok') return placeholder(el, d);
    const inst = val('mapa-inst', 'celular'); const crit = val('mapa-crit', inst === 'celular' ? 'conc' : 'icc');
    const rows = d.data.filter((r) => r.instrumento === inst && r.criterio === crit);
    if (!rows.length) return placeholder(el, d, 'Critério indisponível para este instrumento.');
    const cells = [];
    HP.forEach((h, i) => LP.forEach((l, j) => {
      const r = rows.find((x) => x.passa_alta === h && x.passa_baixa === l);
      cells.push({i, j, v: r ? num(r.valor) : NaN, filtro: r ? r.filtro : null, tip: r ? [`Filtro ${r.filtro} Hz`, `${r.criterio_nome}: ${f2(num(r.valor))}`] : []});
    }));
    heat(el, cells, {fmt: f2, aria: `Mapa de ${rows[0].criterio_nome} (${inst}) por passa-alta e passa-baixa`});
  });
  rerenderOn(['mapa-inst'], ['mapa_crit_options', 'mapa_chart']); rerenderOn(['mapa-crit'], ['mapa_chart']);

  // ---------- comparar dois filtros ----------
  function filtroOptions(id, dflt) {
    return (s) => {
      const d = dash.data('grade'); const prev = s.value;
      const fs_ = d.status === 'ok' ? Array.from(new Map(d.data.map((r) => [r.filtro, [num(r.pa_ordem), num(r.pb_ordem)]])).entries()).sort((a, b) => a[1][0] - b[1][0] || a[1][1] - b[1][1]) : [];
      s.replaceChildren(...fs_.map(([k]) => new Option(k === RAW ? 'Sem filtro' : k + ' Hz', k)));
      s.value = fs_.some(([k]) => k === prev) ? prev : dflt;
    };
  }
  dash.draw('cmp_a_options', filtroOptions('cmp-a', RAW));
  dash.draw('cmp_b_options', filtroOptions('cmp-b', REC));
  dash.draw('cmp_tbody', (tb) => {
    const d = dash.data('grade'); tb.replaceChildren();
    if (d.status !== 'ok') { const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 6; td.textContent = 'Não foi possível carregar estes dados.'; tr.appendChild(td); tb.appendChild(tr); return; }
    const A = val('cmp-a', RAW), B = val('cmp-b', REC);
    const crits = Array.from(new Map(d.data.filter((r) => r.instrumento === 'celular').map((r) => [r.criterio, r.criterio_nome])).entries());
    const get = (f, inst, c) => d.data.find((r) => r.filtro === f && r.instrumento === inst && r.criterio === c);
    const cell = (r) => { const td = document.createElement('td'); td.className = 'fx-num'; td.textContent = r ? f2(num(r.valor)) : '—'; return td; };
    crits.forEach(([c, n]) => {
      const tr = document.createElement('tr'); const th = document.createElement('td'); th.textContent = n; tr.appendChild(th);
      const a = get(A, 'celular', c), b = get(B, 'celular', c);
      tr.appendChild(cell(a)); tr.appendChild(cell(b));
      const dd = document.createElement('td'); dd.className = 'fx-num';
      const diff = a && b ? num(b.valor) - num(a.valor) : NaN; dd.textContent = isNaN(diff) ? '—' : fs(diff);
      if (!isNaN(diff) && Math.abs(diff) >= 0.02) dd.style.color = diff > 0 ? 'var(--color-ok)' : 'var(--color-bad)';
      tr.appendChild(dd);
      tr.appendChild(cell(get(A, 'plataforma', c))); tr.appendChild(cell(get(B, 'plataforma', c)));
      tb.appendChild(tr);
    });
  });
  rerenderOn(['cmp-a', 'cmp-b'], ['cmp_tbody']);

  // ---------- validação cruzada ----------
  dash.draw('cv_picks_chart', (el) => {
    const d = dash.data('cv_escolhas');
    if (d.status !== 'ok') return placeholder(el, d);
    const metodo = val('cv-metodo', 'Quatro critérios');
    const rows = d.data.filter((r) => r.metodo === metodo);
    const cells = [];
    HP.forEach((h, i) => LP.forEach((l, j) => {
      const r = rows.find((x) => x.passa_alta === h && x.passa_baixa === l);
      cells.push({i, j, v: r ? num(r.pct_divisoes) : NaN, filtro: r ? r.filtro : null, tip: r ? [`Filtro ${r.filtro} Hz`, `Escolhido em ${L.format('.0f')(num(r.pct_divisoes))}% das divisões`] : []});
    }));
    heat(el, cells, {fmt: (v) => L.format('.0f')(v), lo: 0, hi: 30, best: false, aria: `Porcentagem das divisões em que cada filtro foi escolhido (${metodo})`});
  });
  rerenderOn(['cv-metodo'], ['cv_picks_chart']);

  function dotInterval(el, items, opts) {
    el.replaceChildren();
    const W = el.clientWidth, rowH = 40, m = {t: 10, r: 56, b: 36, l: Math.min(230, W * 0.42)}, H = m.t + rowH * items.length + m.b;
    const ext = d3.extent(items.flatMap((d) => [d.lo, d.hi, d.mid]).concat(opts.zero ? [0] : []));
    const pad = (ext[1] - ext[0]) * 0.08 || 0.05;
    const x = d3.scaleLinear().domain([ext[0] - pad, ext[1] + pad]).nice().range([m.l, W - m.r]);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', opts.aria);
    svg.append('g').attr('class', 'fx-grid').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(5).tickSize(-(H - m.b - m.t)).tickFormat('')).call((g) => g.select('.domain').remove());
    svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(W < 480 ? 3 : 5).tickFormat((v) => L.format('~g')(v)));
    if (opts.xlabel) svg.append('text').attr('x', (m.l + W - m.r) / 2).attr('y', H - 4).attr('text-anchor', 'middle').text(opts.xlabel);
    const tip = tipper(el);
    items.forEach((it, i) => {
      const cy = m.t + rowH * i + rowH / 2;
      svg.append('text').attr('x', m.l - 10).attr('y', cy + 4).attr('text-anchor', 'end').style('fill', 'var(--color-fg)').text(it.label);
      svg.append('line').attr('x1', x(it.lo)).attr('x2', x(it.hi)).attr('y1', cy).attr('y2', cy).style('stroke', it.color).style('stroke-width', 3).style('stroke-linecap', 'round');
      svg.append('circle').attr('cx', x(it.mid)).attr('cy', cy).attr('r', 6).style('fill', it.color).style('stroke', 'var(--color-bg)').style('stroke-width', 1.5);
      svg.append('text').attr('x', Math.min(x(it.hi) + 8, W - m.r + 4)).attr('y', cy + 4).style('fill', 'var(--color-fg)').text(opts.fmt(it.mid));
      svg.append('rect').attr('x', m.l).attr('y', cy - rowH / 2).attr('width', W - m.l - m.r).attr('height', rowH).style('fill', 'transparent')
        .on('pointermove', (ev) => tip.show([it.label, `${opts.fmt(it.mid)} [${opts.fmt(it.lo)} a ${opts.fmt(it.hi)}]`], ev)).on('pointerleave', () => tip.hide());
    });
  }
  dash.draw('cv_test_chart', (el) => {
    const d = dash.data('cv_teste');
    if (d.status !== 'ok') return placeholder(el, d);
    const crit = val('cv-crit', 'Concordância');
    const order = ['Sem filtro', 'Escolha só pela concordância', 'Escolha pelos quatro critérios', 'Fixo 0,1–2 Hz', 'Fixo 0,2–2 Hz'];
    const cols = ['var(--cds-chart-muted)', dash.colors[2], dash.colors[1], dash.colors[3], dash.colors[0]];
    const items = order.map((mname, k) => { const r = d.data.find((x) => x.metodo === mname && x.criterio === crit); return r && {label: mname, mid: num(r.mediana), lo: num(r.ic_inf), hi: num(r.ic_sup), color: cols[k]}; }).filter(Boolean);
    dotInterval(el, items, {fmt: f2, aria: `Desempenho na metade de teste — ${crit}`, xlabel: crit});
  });
  rerenderOn(['cv-crit'], ['cv_test_chart']);
})();
