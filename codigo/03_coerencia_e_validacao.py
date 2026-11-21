"""Grade de 55 bandas (2ª ordem, fase zero, 30 s), coerência celular × plataforma, validação cruzada metade/metade
e validação deixando um grupo de fora. Os filtros fixos 0,1–2 e 0,2–2 Hz entram só como comparação (candidatos de uma análise anterior)."""
import os, sys, pickle, json, time, collections; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy.stats import rankdata
from scipy.signal import coherence
from comum import *
os.makedirs(os.path.join(RES, 'intermediarios'), exist_ok=True)

OUT = {}
HPS = [None, .05, .1, .2, .3, .5, .7]; LPS = [.7, 1, 1.5, 2, 3, 5, 10, None]
base = dict(order=2, zero_phase=True, det='linear', dur=30)
t0 = time.time(); AG = {}
for h in HPS:
    for l in LPS:
        if h is not None and l is not None and h >= l: continue
        AG[(h, l)] = agg(trial_table(dict(h=h, l=l, **base)))
KEYS = list(AG); print('grade', len(KEYS), round(time.time() - t0), 's')
k2s = lambda k: f'{k[0]}|{k[1]}'
CR = ['conc', 'icc', 'eyes', 'auc']

# ---- critérios na amostra completa (celular e plataforma) ----
FULL = {k2s(k): crit(A) for k, A in AG.items()}
FULLCOP = {k2s(k): crit(A, inst='cop') for k, A in AG.items()}
OUT['full'] = FULL; OUT['full_cop'] = FULLCOP
mr = np.mean([rankdata([FULL[k2s(k)][c] for k in KEYS]) for c in CR], 0)
OUT['mean_rank'] = {k2s(KEYS[i]): float(mr[i]) for i in range(len(KEYS))}
print('top posto médio:', [(k2s(KEYS[i]), round(mr[i], 1)) for i in np.argsort(-mr)[:8]])
for c in CR:
    v = {k: FULL[k][c] for k in FULL}; b = max(v, key=v.get)
    print(f'{c}: melhor {b} {v[b]:.3f} | bruto {v["None|None"]:.3f} | 0,1–2 {v["0.1|2"]:.3f} | 0,2–2 {v["0.2|2"]:.3f}')

# ---- regra da coerência por grupo ----
OUT['coh'] = {}
for G in GROUPS:
    for ax in ['ap', 'ml']:
        cs = []
        for r in REC:
            if r['group'] == G and r['cond'] == 'OA' and r['session'] in ('teste', 'única'):
                f, C = coherence(proc(r['cop_' + ax], None, None), proc(r['acc_' + ax], None, None), FS, nperseg=1024); cs.append(C)
        m = np.mean(cs, 0); ok = (m >= .5) & (f >= .05) & (f <= 10)
        idx = np.where(ok)[0]; runs = np.split(idx, np.where(np.diff(idx) != 1)[0] + 1); run = max(runs, key=len) if len(idx) else []
        OUT['coh'][f'{G}|{ax}'] = dict(f=f.tolist(), m=m.tolist(), band=[float(f[run[0]]), float(f[run[-1]])] if len(run) else None, n=len(cs))
        print('coerência', G, ax, OUT['coh'][f'{G}|{ax}']['band'])

# ---- validação cruzada: metade/metade repetida, estratificada ----
rng = np.random.default_rng(2026); NREP = 300
gidx = {G: np.where(GRP == G)[0] for G in GROUPS}
picks, picks_conc = collections.Counter(), collections.Counter(); TEST = collections.defaultdict(list)
for rep in range(NREP):
    tr, te = [], []
    for G, ix in gidx.items():
        p = rng.permutation(ix); h = len(p) // 2 + (rep % 2) * (len(p) % 2); tr += list(p[:h]); te += list(p[h:])
    Ctr = {k: crit(AG[k], tr) for k in KEYS}
    rk = np.mean([rankdata([Ctr[k][c] for k in KEYS]) for c in CR], 0)
    ch = KEYS[int(np.argmax(rk))]; chc = max(KEYS, key=lambda k: Ctr[k]['conc'])
    picks[k2s(ch)] += 1; picks_conc[k2s(chc)] += 1
    for name, k in [('multi', ch), ('conc_only', chc), ('raw', (None, None)), ('rec', (.2, 2)), ('rec01', (.1, 2))]:
        C = crit(AG[k], te)
        for c in CR: TEST[f'{name}|{c}'].append(C[c])
OUT['cv'] = dict(nrep=NREP, picks=dict(picks), picks_conc=dict(picks_conc), test={k: v for k, v in TEST.items()})
print('escolhas multicritério', picks.most_common(8)); print('escolhas só concordância', picks_conc.most_common(4))
for name in ['raw', 'conc_only', 'multi', 'rec', 'rec01']:
    print(name, {c: '%.2f [%.2f–%.2f]' % (np.median(TEST[f'{name}|{c}']), np.percentile(TEST[f'{name}|{c}'], 2.5), np.percentile(TEST[f'{name}|{c}'], 97.5)) for c in CR})

# ---- validação "deixa um grupo de fora": escolher em 2 grupos, testar no 3º ----
OUT['logo'] = {}
for G in GROUPS:
    tr = np.where(GRP != G)[0]; te = np.where(GRP == G)[0]
    Ctr = {k: crit(AG[k], tr) for k in KEYS}
    rk = np.mean([rankdata([np.nan_to_num(Ctr[k][c], nan=-9) for k in KEYS]) for c in CR], 0); ch = KEYS[int(np.argmax(rk))]
    T = {k: crit(AG[k], te) for k in KEYS}
    cs = ['conc', 'icc', 'eyes']
    OUT['logo'][G] = dict(chosen=k2s(ch), test={c: T[ch][c] for c in cs}, raw={c: T[(None, None)][c] for c in cs},
                          rec={c: T[(.2, 2)][c] for c in cs}, best={c: max(T[k][c] for k in KEYS) for c in cs})
    print('LOGO teste em', G, 'escolhido', k2s(ch), {c: '%.2f (bruto %.2f; 0,2–2 %.2f; melhor %.2f)' % (T[ch][c], T[(None, None)][c], T[(.2, 2)][c], max(T[k][c] for k in KEYS)) for c in cs})

OUT['sign'] = {f'{a}_{b}': v for (a, b), v in SIGN.items()}
OUT['n'] = {G: int((GRP == G).sum()) for G in GROUPS}
json.dump(OUT, open(os.path.join(RES, 'intermediarios', 'validacao.json'), 'w'), indent=1)
pickle.dump(dict(AG=AG), open(os.path.join(RES, 'intermediarios', 'grade_agregada.pkl'), 'wb'))
