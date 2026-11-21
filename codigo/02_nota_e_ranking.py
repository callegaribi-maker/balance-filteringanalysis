"""Nota 0–100, importância dos fatores, ranking e mapas da nota (fatorial 440 filtros)."""
import os, json, csv, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES, FIGS = os.path.join(ROOT, 'resultados'), os.path.join(ROOT, 'figuras')
import numpy as np
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter

F = json.load(open(os.path.join(RES, 'intermediarios', 'fatorial.json')))
FIG = FIGS; DASH = RES
INK, MUTED, GRID = '#1f1f1e', '#6b6a63', '#e4e3dc'
BLUE, ORANGE, GREEN, PINK, PURPLE = '#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#9a6bd1'
plt.rcParams.update({'font.size': 9.5, 'axes.edgecolor': MUTED, 'axes.labelcolor': INK, 'xtick.color': MUTED, 'ytick.color': MUTED,
                     'axes.spines.top': False, 'axes.spines.right': False, 'axes.grid': True, 'grid.color': GRID, 'grid.linewidth': .6})
cm = lambda v, f='{:.0f}': f.format(v).replace('.', ',')
lab = lambda x: 'nenhum' if x is None else f'{x:g}'.replace('.', ',')
CR = [('conc', 'Concordância', BLUE), ('icc', 'Confiabilidade', GREEN), ('eyes', 'Efeito dos olhos', ORANGE), ('auc', 'Separação de grupos', PURPLE)]

rows = []
for r in F:
    c = r['cfg']; v = r['cel']
    rows.append(dict(h=c['h'], l=c['l'], ordem=c['order'], fase='zero' if c['zero_phase'] else 'causal', dur=c['dur'],
                     **{k: v[k] for k, _, _ in CR}, plat_icc=r['plat']['icc'], plat_eyes=r['plat']['eyes'], plat_auc=r['plat']['auc'],
                     r_ap=v['r_ap'], r_ml=v['r_ml'], rho=v['rho'], icc_j=v['icc_j'], icc_i=v['icc_i'],
                     auc_ji=v['auc_Jovens|Idosos'], auc_ir=v['auc_Idosos|Idosos com risco de quedas'], auc_jr=v['auc_Jovens|Idosos com risco de quedas']))
for k, _, _ in CR:
    a = np.array([r[k] for r in rows]); lo, hi = a.min(), a.max()
    for r in rows: r['n_' + k] = 100 * (r[k] - lo) / (hi - lo)
for r in rows:
    r['nota'] = np.mean([r['n_' + k] for k, _, _ in CR])
    r['filtro'] = f"{lab(r['h'])}–{lab(r['l'])}"
    r['nome'] = ('Sem filtro' if r['h'] is None and r['l'] is None else r['filtro'] + ' Hz') + f" · {r['ordem']}ª ordem · fase {r['fase']} · {r['dur']} s"
rows.sort(key=lambda r: -r['nota'])
for i, r in enumerate(rows): r['posicao'] = i + 1
ref = rows[0]  # melhor filtro encontrado (1º lugar)
raw = next(r for r in rows if r['h'] is None and r['l'] is None and r['ordem'] == 2 and r['fase'] == 'zero' and r['dur'] == 30)
print('melhor', ref['posicao'], round(ref['nota'], 1), '| sem filtro', raw['posicao'], round(raw['nota'], 1))
print('top 10:'); [print(r['posicao'], r['nome'], round(r['nota'], 1), {k: round(r[k], 2) for k, _, _ in CR}) for r in rows[:10]]

# ---------- importância dos fatores ----------
HPS = [None, .05, .1, .2, .3, .5, .7]; LPS = [.7, 1, 1.5, 2, 3, 5, 10, None]
FACT = [('h', 'Passa-alta (Hz)', HPS), ('l', 'Passa-baixa (Hz)', LPS), ('dur', 'Duração (s)', [20, 30]), ('fase', 'Fase', ['zero', 'causal']), ('ordem', 'Ordem', [2, 4])]
imp = {}
for key, name, levels in FACT:
    means = [np.mean([r['nota'] for r in rows if r[key] == lv]) for lv in levels]
    imp[key] = dict(name=name, levels=levels, means=means, rng=max(means) - min(means))
order = sorted(imp, key=lambda k: -imp[k]['rng'])
for k in order: print('importância', imp[k]['name'], round(imp[k]['rng'], 1), [round(m, 1) for m in imp[k]['means']])

fig = plt.figure(figsize=(15, 8.6)); gs = fig.add_gridspec(2, 5, height_ratios=[1, 1.15])
a = fig.add_subplot(gs[0, :])
ys = np.arange(len(order))
a.barh(ys, [imp[k]['rng'] for k in order], color=[BLUE if imp[k]['rng'] > 10 else '#b9b8b0' for k in order], height=.6)
for y, k in zip(ys, order): a.text(imp[k]['rng'] + .6, y, f"{cm(imp[k]['rng'], '{:.1f}')} pontos", va='center', fontsize=10, color=INK)
a.set_yticks(ys); a.set_yticklabels([imp[k]['name'] for k in order], fontsize=10.5); a.invert_yaxis()
a.set_xlabel('Quanto a nota média muda entre o pior e o melhor valor do fator (pontos, de 0 a 100)')
a.set_title('A. O que mais pesa na escolha do filtro', loc='left', fontweight='bold', fontsize=11.5); a.grid(axis='y', visible=False)
for j, (key, name, levels) in enumerate(FACT):
    b = fig.add_subplot(gs[1, j]); m = imp[key]['means']; x = np.arange(len(levels))
    b.plot(x, m, color=BLUE, lw=2, marker='o', ms=6)
    bi = int(np.argmax(m)); b.plot(x[bi], m[bi], 'o', ms=11, mfc='none', mec=ORANGE, mew=2)
    b.set_xticks(x); b.set_xticklabels([lab(v) if key in ('h', 'l') else (f'{v}ª' if key == 'ordem' else str(v)) for v in levels], fontsize=8.5, rotation=0)
    b.set_ylim(20, 80); b.set_title(name, loc='left', fontweight='bold', fontsize=10); b.set_ylabel('Nota média' if j == 0 else '')
    if j: b.set_yticklabels([])
fig.suptitle('Figura — Nota de 0 a 100 dos 440 filtros e o peso de cada escolha', x=.01, y=.995, ha='left', fontsize=13, fontweight='bold', color=INK)
fig.text(.01, .955, 'Nota = média dos quatro critérios (concordância, confiabilidade, efeito dos olhos, separação de grupos), cada um reescalado de 0 (pior filtro) a 100 (melhor). Embaixo: nota média em cada valor do fator; círculo laranja = melhor.', fontsize=9, color=MUTED)
fig.tight_layout(rect=(0, 0, 1, .945)); fig.savefig(f'{FIG}/fig_importancia.png', dpi=140); plt.close(fig)

# ---------- ranking ----------
top = rows[:15]; show = top + ([ref] if ref not in top else []) + [raw]
fig, axs = plt.subplots(1, 5, figsize=(16, 7.8), sharey=True, gridspec_kw=dict(width_ratios=[1.5, 1, 1, 1, 1]))
ys = np.arange(len(show))
labels = [f"{r['posicao']}º  {r['nome']}" for r in show]
a = axs[0]; a.barh(ys, [r['nota'] for r in show], color=[ORANGE if r is ref else '#b9b8b0' if r is raw else BLUE for r in show], height=.65)
for y, r in zip(ys, show): a.text(r['nota'] + 1, y, cm(r['nota']), va='center', fontsize=9, color=INK)
a.set_yticks(ys); a.set_yticklabels(labels, fontsize=8.8); a.invert_yaxis(); a.set_xlim(0, 105); a.set_title('Nota (0–100)', loc='left', fontweight='bold'); a.grid(axis='y', visible=False)
for j, (k, name, col) in enumerate(CR):
    b = axs[j + 1]; v = [r[k] for r in show]
    b.hlines(ys, min(v) - .02, v, color=GRID, lw=1); b.plot(v, ys, 'o', color=col, ms=7)
    for y, val in zip(ys, v): b.text(val + .01 * (max(v) - min(v) + .1), y - .28, cm(val, '{:.2f}'), fontsize=7.5, color=MUTED)
    b.set_title(name, loc='left', fontweight='bold', fontsize=10); b.grid(axis='y', visible=False)
    b.xaxis.set_major_formatter(FuncFormatter(lambda x_, _: f'{x_:.2f}'.replace('.', ',')))
if len(show) > len(top) + 1: axs[0].axhline(len(top) - .5, color=MUTED, lw=.8, ls=':')
axs[0].axhline(len(show) - 1.5, color=MUTED, lw=.8, ls=':')
fig.suptitle('Figura — Os 15 melhores filtros entre 440 e o sem filtro', x=.01, y=.995, ha='left', fontsize=13, fontweight='bold', color=INK)
fig.text(.01, .955, 'Laranja = melhor filtro encontrado (1º lugar). Cinza = sem filtro. Valores brutos de cada critério nas quatro colunas da direita.', fontsize=9, color=MUTED)
fig.tight_layout(rect=(0, 0, 1, .945)); fig.savefig(f'{FIG}/fig_ranking.png', dpi=140); plt.close(fig)

# ---------- mapas da nota: 8 combinações de ordem × fase × duração ----------
fig, axs = plt.subplots(2, 4, figsize=(17, 8.6))
combos = [(o, f, d) for d in (30, 20) for f in ('zero', 'causal') for o in (2, 4)]
for a, (o, f, d) in zip(axs.ravel(), combos):
    M = np.full((len(HPS), len(LPS)), np.nan)
    for r in rows:
        if r['ordem'] == o and r['fase'] == f and r['dur'] == d: M[HPS.index(r['h']), LPS.index(r['l'])] = r['nota']
    a.imshow(np.ma.masked_invalid(M), cmap='Blues', vmin=0, vmax=100, aspect='auto')
    for (yy, xx), v in np.ndenumerate(M):
        if not np.isnan(v): a.text(xx, yy, cm(v), ha='center', va='center', fontsize=7.5, color='white' if v > 62 else INK)
    a.set_xticks(range(len(LPS))); a.set_xticklabels([lab(x) for x in LPS], fontsize=7.5); a.set_yticks(range(len(HPS))); a.set_yticklabels([lab(x) for x in HPS], fontsize=7.5)
    a.grid(False); a.set_title(f'{o}ª ordem · fase {f} · {d} s', loc='left', fontweight='bold', fontsize=10)
    if (o, f, d) == (ref['ordem'], ref['fase'], ref['dur']): a.add_patch(plt.Rectangle((LPS.index(ref['l']) - .5, HPS.index(ref['h']) - .5), 1, 1, fill=False, ec=ORANGE, lw=2.4))
    a.set_xlabel('Passa-baixa (Hz)', fontsize=8); a.set_ylabel('Passa-alta (Hz)', fontsize=8)
fig.suptitle('Figura — Nota (0–100) de cada banda nas 8 combinações de ordem, fase e duração', x=.01, y=.995, ha='left', fontsize=13, fontweight='bold', color=INK)
fig.text(.01, .955, 'Mais escuro = melhor. O padrão é o mesmo nos oito mapas: a banda importa muito mais do que ordem, fase ou duração. Laranja = melhor filtro encontrado.', fontsize=9, color=MUTED)
fig.tight_layout(rect=(0, 0, 1, .945)); fig.savefig(f'{FIG}/fig_mapas_nota.png', dpi=140); plt.close(fig)

# ---------- CSVs do painel ----------
f6 = lambda v: '' if v is None else f'{v:.4f}'
with open(f'{DASH}/fatorial.csv', 'w', newline='') as fh:
    w = csv.writer(fh)
    w.writerow(['posicao', 'nome', 'filtro', 'passa_alta', 'passa_baixa', 'ordem', 'fase', 'duracao_s', 'nota', 'nota_concordancia', 'nota_confiabilidade', 'nota_olhos', 'nota_grupos',
                'concordancia', 'confiabilidade', 'efeito_olhos', 'separacao_grupos', 'r_ap', 'r_ml', 'spearman_area', 'icc_jovens', 'icc_idosos', 'auc_jovens_idosos', 'auc_idosos_risco', 'auc_jovens_risco',
                'plataforma_confiabilidade', 'plataforma_efeito_olhos', 'plataforma_separacao'])
    for r in rows:
        w.writerow([r['posicao'], r['nome'], r['filtro'], lab(r['h']), lab(r['l']), r['ordem'], r['fase'], r['dur'], f"{r['nota']:.1f}", f"{r['n_conc']:.1f}", f"{r['n_icc']:.1f}", f"{r['n_eyes']:.1f}", f"{r['n_auc']:.1f}",
                    f6(r['conc']), f6(r['icc']), f6(r['eyes']), f6(r['auc']), f6(r['r_ap']), f6(r['r_ml']), f6(r['rho']), f6(r['icc_j']), f6(r['icc_i']), f6(r['auc_ji']), f6(r['auc_ir']), f6(r['auc_jr']),
                    f6(r['plat_icc']), f6(r['plat_eyes']), f6(r['plat_auc'])])
with open(f'{DASH}/importancia.csv', 'w', newline='') as fh:
    w = csv.writer(fh); w.writerow(['fator', 'nivel', 'nota_media', 'amplitude_fator'])
    for k in order:
        for lv, m in zip(imp[k]['levels'], imp[k]['means']):
            w.writerow([imp[k]['name'], lab(lv) if k in ('h', 'l') else (f'{lv}ª' if k == 'ordem' else str(lv)), f'{m:.1f}', f"{imp[k]['rng']:.1f}"])
print('ok')
