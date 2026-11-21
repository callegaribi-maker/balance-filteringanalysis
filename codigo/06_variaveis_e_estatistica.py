"""Variáveis posturais por participante (plataforma e celular) com 9 filtros: sem filtro,
os 7 filtros da literatura e o melhor encontrado. Estatística entre grupos, entre condições e entre aparelhos."""
import os, sys, csv, collections, itertools; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy.signal import welch
from scipy.stats import kruskal, mannwhitneyu, wilcoxon, spearmanr, rankdata
from comum import REC, proc, SIGN, DEVKEY, area, RES

OUT = RES
GN = {'Jovens': 'Jovens', 'Idosos': 'Idosos', 'Idosos com risco de quedas': 'Risco de quedas'}
GROUPS = ['Jovens', 'Idosos', 'Risco de quedas']
_LIT = list(csv.DictReader(open(os.path.join(RES, 'literatura.csv'))))
FILT = {'Sem filtro': dict(h=None, l=None)}
for r in _LIT:
    c = dict(h=float(r['passa_alta_hz']) if r['passa_alta_hz'] else None, l=float(r['passa_baixa_hz']) if r['passa_baixa_hz'] else None, order=int(r['ordem']))
    if r['estudo_curto'] == 'Acelerômetro triaxial': c['order_h'] = 3
    FILT[r['rotulo']] = c
FILT['Melhor encontrado (0,7–1,5 Hz)'] = dict(h=.7, l=1.5, order=4)
VARS = [('area', 'Área da elipse 95%'), ('rms_ap', 'RMS AP'), ('rms_ml', 'RMS ML'), ('amp_ap', 'Amplitude AP'), ('amp_ml', 'Amplitude ML'),
        ('vel', 'Velocidade média do traçado'), ('fmed_ap', 'Frequência mediana AP'), ('fmed_ml', 'Frequência mediana ML')]
UNIT = {'plataforma': {'area': 'cm²', 'rms_ap': 'cm', 'rms_ml': 'cm', 'amp_ap': 'cm', 'amp_ml': 'cm', 'vel': 'cm/s', 'fmed_ap': 'Hz', 'fmed_ml': 'Hz'},
        'celular': {'area': '(m/s²)²', 'rms_ap': 'm/s²', 'rms_ml': 'm/s²', 'amp_ap': 'm/s²', 'amp_ml': 'm/s²', 'vel': 'm/s³', 'fmed_ap': 'Hz', 'fmed_ml': 'Hz'}}

def fmed(x):
    f, P = welch(x, 100, nperseg=1024); m = (f > 0) & (f <= 10); c = np.cumsum(P[m]); return float(f[m][np.searchsorted(c, c[-1] / 2)])

def variables(x_ml, y_ap):
    return dict(area=area(x_ml, y_ap), rms_ap=float(np.std(y_ap)), rms_ml=float(np.std(x_ml)), amp_ap=float(np.ptp(y_ap)), amp_ml=float(np.ptp(x_ml)),
                vel=float(np.sum(np.hypot(np.diff(x_ml), np.diff(y_ap))) / (len(x_ml) / 100)), fmed_ap=fmed(y_ap), fmed_ml=fmed(x_ml))

# ---------- participante: 1ª tentativa (idosos) ou sessão de teste (jovens) ----------
codes, cnt = {}, collections.Counter()
for r in sorted({(GN[r['group']], r['subj']) for r in REC}, key=lambda s: (GROUPS.index(s[0]), s[1])):
    cnt[r[0]] += 1; codes[r] = {'Jovens': 'J', 'Idosos': 'I'}.get(r[0], 'R') + f'{cnt[r[0]]:02d}'
V = {}  # (inst, filtro, grupo, cod, cond) -> dict
for r in REC:
    if r['trial'] != 1 or r['session'] not in ('teste', 'única'): continue
    g = GN[r['group']]; cod = codes[(g, r['subj'])]
    for fn, cfg in FILT.items():
        S = {f'{s}_{ax}': proc(r[f'{s}_{ax}'], **cfg) * (SIGN[(DEVKEY(r), ax)] if s == 'acc' else 1) for s in ['cop', 'acc'] for ax in ['ap', 'ml']}
        n = min(len(v) for v in S.values()); S = {k: v[:n] for k, v in S.items()}
        V[('plataforma', fn, g, cod, r['cond'])] = variables(S['cop_ml'], S['cop_ap'])
        V[('celular', fn, g, cod, r['cond'])] = variables(S['acc_ml'], S['acc_ap'])

with open(f'{OUT}/variaveis.csv', 'w', newline='') as fh:
    w = csv.writer(fh); w.writerow(['instrumento', 'filtro', 'grupo', 'participante', 'condicao', 'variavel', 'variavel_nome', 'unidade', 'valor'])
    for (inst, fn, g, cod, cond), d in sorted(V.items()):
        for k, nm in VARS: w.writerow([inst, fn, g, cod, cond, k, nm, UNIT[inst][k], f'{d[k]:.6g}'])

def get(inst, fn, g, cond, k):
    return {cod: d[k] for (i, f, gg, cod, c), d in V.items() if i == inst and f == fn and gg == g and c == cond}
def q(v): return np.percentile(v, 25), np.median(v), np.percentile(v, 75)
def holm(ps):
    o = np.argsort(ps); m = len(ps); adj = np.empty(m); run = 0
    for rank, i in enumerate(o): run = max(run, min(1, (m - rank) * ps[i])); adj[i] = run
    return adj
fp = lambda p: f'{p:.4g}'

# ---------- entre grupos ----------
PAIRS = [('Jovens', 'Idosos'), ('Idosos', 'Risco de quedas'), ('Jovens', 'Risco de quedas')]
with open(f'{OUT}/stats_grupos.csv', 'w', newline='') as fh:
    w = csv.writer(fh)
    w.writerow(['instrumento', 'filtro', 'condicao', 'variavel', 'variavel_nome', 'unidade', 'n_total', 'H', 'p', 'epsilon2']
               + [f'{s}_{g.split()[0].lower()}' for g in GROUPS for s in ('q1', 'mediana', 'q3')]
               + [f'{s}_{a[0].lower()}{b[0].lower()}' for a, b in PAIRS for s in ('p_holm', 'r')])
    for inst, fn, cond, (k, nm) in itertools.product(['plataforma', 'celular'], FILT, ['OA', 'OF'], VARS):
        data = {g: np.array(list(get(inst, fn, g, cond, k).values())) for g in GROUPS}
        H, p = kruskal(*data.values()); n = sum(len(v) for v in data.values()); eps = H / (n - 1)
        pp, rr = [], []
        for a, b in PAIRS:
            U, pv = mannwhitneyu(data[b], data[a]); pp.append(pv); rr.append(2 * U / (len(data[a]) * len(data[b])) - 1)
        ph = holm(np.array(pp))
        w.writerow([inst, fn, cond, k, nm, UNIT[inst][k], n, f'{H:.3f}', fp(p), f'{eps:.3f}'] + [f'{x:.6g}' for g in GROUPS for x in q(data[g])]
                   + [x for a in zip([fp(v) for v in ph], [f'{v:.3f}' for v in rr]) for x in a])

# ---------- entre condições (OA × OF) ----------
with open(f'{OUT}/stats_condicoes.csv', 'w', newline='') as fh:
    w = csv.writer(fh)
    w.writerow(['instrumento', 'filtro', 'grupo', 'variavel', 'variavel_nome', 'unidade', 'n', 'mediana_oa', 'mediana_of', 'razao_of_oa', 'p', 'r', 'pct_aumentou'])
    for inst, fn, g, (k, nm) in itertools.product(['plataforma', 'celular'], FILT, GROUPS + ['Todos'], VARS):
        gs = GROUPS if g == 'Todos' else [g]
        A, B = {}, {}
        for gg in gs: A.update(get(inst, fn, gg, 'OA', k)); B.update(get(inst, fn, gg, 'OF', k))
        ks = sorted(set(A) & set(B)); a = np.array([A[x] for x in ks]); b = np.array([B[x] for x in ks]); dlt = b - a
        p = wilcoxon(a, b).pvalue
        rk = rankdata(np.abs(dlt[dlt != 0])); sgn = np.sign(dlt[dlt != 0]); rbc = float((rk * sgn).sum() / rk.sum())
        w.writerow([inst, fn, g, k, nm, UNIT[inst][k], len(ks), f'{np.median(a):.6g}', f'{np.median(b):.6g}', f'{np.median(b / a):.3f}', fp(p), f'{rbc:.3f}', f'{100 * np.mean(b > a):.0f}'])

# ---------- entre dispositivos ----------
with open(f'{OUT}/stats_dispositivos.csv', 'w', newline='') as fh:
    w = csv.writer(fh)
    w.writerow(['filtro', 'condicao', 'grupo', 'variavel', 'variavel_nome', 'n', 'rho', 'p', 'vies_hz', 'loa_inf_hz', 'loa_sup_hz'])
    for fn, cond, g, (k, nm) in itertools.product(FILT, ['OA', 'OF'], GROUPS + ['Idosos (todos)'], VARS):
        gs = ['Idosos', 'Risco de quedas'] if g == 'Idosos (todos)' else [g]
        P, C = {}, {}
        for gg in gs: P.update(get('plataforma', fn, gg, cond, k)); C.update(get('celular', fn, gg, cond, k))
        ks = sorted(set(P) & set(C)); x = np.array([P[i] for i in ks]); y = np.array([C[i] for i in ks])
        rho, p = spearmanr(x, y)
        bias = lo = hi = ''
        if k.startswith('fmed'):
            dd = y - x; bias = f'{dd.mean():.3f}'; lo = f'{dd.mean() - 1.96 * dd.std(ddof=1):.3f}'; hi = f'{dd.mean() + 1.96 * dd.std(ddof=1):.3f}'
        w.writerow([fn, cond, g, k, nm, len(ks), f'{rho:.3f}', fp(p), bias, lo, hi])
print('ok', len(V))
