/* Mini-runtime do painel independente.
 * Os gráficos foram escritos para um objeto global `dash` (dash.draw, dash.data, dash.calc, dash.colors, dash.setLink).
 * Este arquivo implementa esse objeto lendo as tabelas embutidas em window.__DADOS__ (uma lista de linhas por tabela,
 * com os valores como texto, exatamente como estão nos CSVs da pasta resultados/).
 */
window.dash = (function () {
  const DATA = window.__DADOS__ || {};
  const draws = new Map();

  function drawOne(name, fn) {
    document.querySelectorAll(`[data-draw="${name}"]`).forEach((el) => {
      if (el.closest('.fx-tab[hidden]')) return;   // desenhado quando a aba abrir
      try { fn(el); } catch (e) { console.error('Erro ao desenhar', name, e); }
    });
  }
  function redrawIn(root) {
    draws.forEach((fn, name) => {
      document.querySelectorAll(`[data-draw="${name}"]`).forEach((el) => {
        if (root && !root.contains(el)) return;
        try { fn(el); } catch (e) { console.error('Erro ao desenhar', name, e); }
      });
    });
  }

  // Abas: quando uma aba aparece, redesenha o que está nela (gráficos em aba escondida não têm largura).
  const obs = new MutationObserver((muts) => muts.forEach((m) => { if (!m.target.hidden) redrawIn(m.target); }));
  document.querySelectorAll('.fx-tab').forEach((t) => obs.observe(t, {attributes: true, attributeFilter: ['hidden']}));
  let rz = null;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => redrawIn(document.querySelector('.fx-tab:not([hidden])')), 150); });

  return {
    draw(name, fn) { if (fn) draws.set(name, fn); const f = draws.get(name); if (f) drawOne(name, f); },
    data(name) { return DATA[name] ? {status: 'ok', data: DATA[name]} : {status: 'error', data: null}; },
    calc(name, spec) {
      try { DATA[name] = spec.fn(...spec.inputs.map((i) => DATA[i] || [])); } catch (e) { console.error('Erro no cálculo', name, e); }
    },
    colors: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'],
    setLink(id) { try { history.replaceState(null, '', '#' + id); } catch (e) { /* ok */ } },
  };
})();
