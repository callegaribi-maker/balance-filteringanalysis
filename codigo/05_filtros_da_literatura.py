"""Filtros usados na literatura aplicados aos dados; nota na mesma escala dos 440 filtros."""
import os, sys, json, csv; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from comum import trial_table, agg, crit, RES
F = json.load(open(os.path.join(RES, 'intermediarios', 'fatorial.json')))
LIT = [
 ('Mancini et al. 2012 (ISway)', 'Passa-baixa 3,5 Hz, fase zero', dict(h=None, l=3.5, order=4), 'https://jneuroengrehab.biomedcentral.com/articles/10.1186/1743-0003-9-59'),
 ('Revisão sistemática de filtros em celulares', 'Passa-baixa 4 Hz, 4ª ordem (o mais usado)', dict(h=None, l=4, order=4), 'https://www.researchgate.net/publication/362975117_Use_of_Filters_to_Smooth_Out_Signals_Collected_through_Mobile_Devices_in_the_Static_and_Dynamic_Balance_Assessment_A_Systematic_Review'),
 ('Validação de celular em posições arbitrárias (2025)', 'Passa-banda 0,12–2 Hz, 4ª ordem, fase zero', dict(h=.12, l=2, order=4), 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12073742/'),
 ('App de equilíbrio Kinesis', 'Passa-banda 0,1–5 Hz', dict(h=.1, l=5, order=4), 'https://cdn.clinicaltrials.gov/large-docs/20/NCT06977620/Prot_000.pdf'),
 ('App de celular para instabilidade postural (Sensors 2025)', 'Passa-baixa 10 Hz, 4ª ordem', dict(h=None, l=10, order=4), 'https://doi.org/10.3390/s25051505'),
 ('Celular na lombar, risco de quedas (Applied Sciences 2026)', 'Passa-baixa 6 Hz, 2ª ordem, fase zero', dict(h=None, l=6, order=2), 'https://www.mdpi.com/2076-3417/16/22/11247'),
 ('Acelerômetro triaxial, idosos × jovens', 'Passa-alta 0,3 Hz (3ª ordem) + passa-baixa 20 Hz (4ª ordem)', dict(h=.3, l=20, order=4, order_h=3), 'https://www.researchgate.net/publication/51103306_Postural_sway_parameters_using_a_triaxial_accelerometer_Comparing_elderly_and_young_healthy_adults'),
]
CR = ['conc', 'icc', 'eyes', 'auc']
lohi = {k: (min(r['cel'][k] for r in F), max(r['cel'][k] for r in F)) for k in CR}
notas440 = sorted([np.mean([100 * (r['cel'][k] - lohi[k][0]) / (lohi[k][1] - lohi[k][0]) for k in CR]) for r in F], reverse=True)
rows = []
for name, desc, cfg, url in LIT:
    full = dict(zero_phase=True, det='linear', dur=30, **cfg)
    c = crit(agg(trial_table(full)))
    nota = np.mean([100 * (c[k] - lohi[k][0]) / (lohi[k][1] - lohi[k][0]) for k in CR])
    pos = 1 + sum(n > nota for n in notas440)
    rows.append([cfg, name, desc, url, f'{nota:.1f}', pos, f"{c['conc']:.4f}", f"{c['icc']:.4f}", f"{c['eyes']:.4f}", f"{c['auc']:.4f}",
                 f"{c['r_ap']:.4f}", f"{c['r_ml']:.4f}", f"{c['auc_Jovens|Idosos']:.4f}", f"{c['auc_Idosos|Idosos com risco de quedas']:.4f}", f"{c['auc_Jovens|Idosos com risco de quedas']:.4f}"])
    print(f'{nota:5.1f} pos~{pos:3d}  {name} | {desc}', {k: round(c[k], 2) for k in CR})
CURTO = {'Mancini et al. 2012 (ISway)': 'Mancini 2012', 'Revisão sistemática de filtros em celulares': 'Revisão sistemática', 'Validação de celular em posições arbitrárias (2025)': 'Validação 2025',
         'App de equilíbrio Kinesis': 'Kinesis', 'App de celular para instabilidade postural (Sensors 2025)': 'Sensors 2025', 'Celular na lombar, risco de quedas (Applied Sciences 2026)': 'Applied Sciences 2026',
         'Acelerômetro triaxial, idosos × jovens': 'Acelerômetro triaxial'}
def banda(c):
    h, l = c.get('h'), c.get('l'); f = lambda v: ('%g' % v).replace('.', ',')
    return f'{f(h)}–{f(l)} Hz' if h and l else f'passa-baixa {f(l)} Hz' if l else f'passa-alta {f(h)} Hz'
rows.sort(key=lambda r: -float(r[4]))
out = []
for i, r in enumerate(rows, 1):
    cfg = r.pop(0)
    out.append([i, f'[{i}] {CURTO[r[0]]} ({banda(cfg)})', CURTO[r[0]], banda(cfg), cfg.get('h') or '', cfg.get('l') or '', cfg.get('order', 2)] + r)
rows = out
with open(os.path.join(RES, 'literatura.csv'), 'w', newline='') as fh:
    w = csv.writer(fh); w.writerow(['numero', 'rotulo', 'estudo_curto', 'banda', 'passa_alta_hz', 'passa_baixa_hz', 'ordem', 'estudo', 'filtro', 'link', 'nota', 'posicao_equivalente', 'concordancia', 'confiabilidade', 'efeito_olhos', 'separacao_grupos', 'r_ap', 'r_ml', 'auc_jovens_idosos', 'auc_idosos_risco', 'auc_jovens_risco'])
    w.writerows(rows)
