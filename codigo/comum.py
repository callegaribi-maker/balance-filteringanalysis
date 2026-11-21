"""Funções comuns: leitura dos dados, filtragem, área da elipse, critérios de avaliação de um filtro.

Grupos: Jovens, Idosos, Idosos com risco de quedas. Todos os sinais já estão sincronizados a 100 Hz
(plataforma = COP em cm; celular = aceleração em m/s², eixos AP e ML)."""
import os, csv, collections, numpy as np
from scipy.signal import butter, sosfiltfilt, sosfilt, detrend
from scipy.stats import rankdata, mannwhitneyu

FS, EDGE = 100, 100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DADOS, RES, FIGS = (os.path.join(ROOT, p) for p in ('dados', 'resultados', 'figuras'))
os.makedirs(RES, exist_ok=True); os.makedirs(FIGS, exist_ok=True)

def carregar():
    """Lê dados/tentativas.csv e cada arquivo de dados/sinais/. Uma entrada por tentativa."""
    recs = []
    for t in csv.DictReader(open(os.path.join(DADOS, 'tentativas.csv'), encoding='utf-8')):
        M = np.loadtxt(os.path.join(DADOS, 'sinais', t['arquivo']), delimiter=',', skiprows=1)
        recs.append(dict(group=t['grupo'], subj=t['participante'], session=t['sessao'], cond=t['condicao'], trial=int(t['tentativa']),
                         device=t['celular'], cop_ap=M[:, 1], cop_ml=M[:, 2], acc_ap=M[:, 3], acc_ml=M[:, 4]))
    return recs

REC = carregar()
GROUPS = ['Jovens', 'Idosos', 'Idosos com risco de quedas']
# Jovens e idosos usaram celulares diferentes; o sinal de cada um é alinhado ao COP separadamente
DEVKEY = lambda r: 'J' if r['group'] == 'Jovens' else 'I'

def proc(x, h, l, order=2, zero_phase=True, det='linear', dur=30, order_h=None):
    x = x[:int(dur * FS)]; y = detrend(x, type=det)
    for kind, fc in (('high', h), ('low', l)):
        if fc is None: continue
        sos = butter(order_h if (kind == 'high' and order_h) else order, fc / (FS / 2), kind, output='sos')
        y = sosfiltfilt(sos, y) if zero_phase else sosfilt(sos, y)
    return y[EDGE:-EDGE]

def area(x, y):
    w = np.linalg.eigvalsh(np.cov(x, y)); return float(np.pi * 2.4478 ** 2 * np.sqrt(abs(w[0] * w[1])))

# Sinal (+1/−1) que alinha a aceleração ao COP em cada eixo e aparelho (mediana da correlação em 0,1–2 Hz)
SIGN = {(dk, ax): float(np.sign(np.median([np.corrcoef(proc(r['cop_' + ax], .1, 2), proc(r['acc_' + ax], .1, 2))[0, 1]
                                           for r in REC if DEVKEY(r) == dk]))) for dk in 'JI' for ax in ['ap', 'ml']}

def trial_table(cfg_ap, cfg_ml=None, records=REC):
    cfg_ml = cfg_ml or cfg_ap; out = []
    for r in records:
        S = {}
        for ax, cfg in (('ap', cfg_ap), ('ml', cfg_ml)):
            S['cop_' + ax] = proc(r['cop_' + ax], **cfg); S['acc_' + ax] = proc(r['acc_' + ax], **cfg) * SIGN[(DEVKEY(r), ax)]
        n = min(len(v) for v in S.values()); S = {k: v[:n] for k, v in S.items()}
        out.append(dict(group=r['group'], subj=r['subj'], session=r['session'], cond=r['cond'], trial=r['trial'],
                        r_ap=float(np.corrcoef(S['cop_ap'], S['acc_ap'])[0, 1]), r_ml=float(np.corrcoef(S['cop_ml'], S['acc_ml'])[0, 1]),
                        cop_area=area(S['cop_ml'], S['cop_ap']), acc_area=area(S['acc_ml'], S['acc_ap']),
                        cop_rms_ap=float(np.std(S['cop_ap'])), acc_rms_ap=float(np.std(S['acc_ap']))))
    return out

# ---------- agregação por participante ----------
SUBJ = sorted({(r['group'], r['subj']) for r in REC}); SI = {s: i for i, s in enumerate(SUBJ)}; NS = len(SUBJ)
GRP = np.array([s[0] for s in SUBJ])

def agg(tab):
    """Arrays por participante × condição (0=OA, 1=OF). 'main' = média das tentativas (idosos) ou sessão de teste (jovens);
    'first' = 1ª tentativa / sessão de teste; 'rep' = repetições para ICC (idosos: 3 tentativas; jovens: teste, reteste)."""
    A = {k: np.full((NS, 2), np.nan) for k in ['r_ap', 'r_ml', 'cop_area', 'acc_area', 'cop_first', 'acc_first']}
    REP = {s: np.full((NS, 2, 3), np.nan) for s in ['acc', 'cop']}
    tmp = collections.defaultdict(list)
    for x in tab:
        i, c = SI[(x['group'], x['subj'])], 0 if x['cond'] == 'OA' else 1
        if x['group'] == 'Jovens':
            j = 0 if x['session'] == 'teste' else 1
            REP['acc'][i, c, j] = x['acc_area']; REP['cop'][i, c, j] = x['cop_area']
            if x['session'] != 'teste': continue
        else:
            REP['acc'][i, c, x['trial'] - 1] = x['acc_area']; REP['cop'][i, c, x['trial'] - 1] = x['cop_area']
        tmp[(i, c)].append(x)
        if x['trial'] == 1: A['cop_first'][i, c] = x['cop_area']; A['acc_first'][i, c] = x['acc_area']
    for (i, c), xs in tmp.items():
        for k in ['r_ap', 'r_ml', 'cop_area', 'acc_area']: A[k][i, c] = np.mean([x[k] for x in xs])
    A['rep_acc'] = REP['acc']; A['rep_cop'] = REP['cop']; return A

def spearman(a, b):
    m = ~np.isnan(a) & ~np.isnan(b); return float(np.corrcoef(rankdata(a[m]), rankdata(b[m]))[0, 1])

def icc31(Y):
    Y = np.asarray(Y); n, k = Y.shape; gm = Y.mean()
    msr = k * np.sum((Y.mean(1) - gm) ** 2) / (n - 1)
    mse = np.sum((Y - Y.mean(1, keepdims=True) - Y.mean(0, keepdims=True) + gm) ** 2) / ((n - 1) * (k - 1))
    return float((msr - mse) / (msr + (k - 1) * mse))

def auc_dir(lo, hi):  # P(grupo esperado maior > grupo esperado menor)
    lo, hi = lo[~np.isnan(lo)], hi[~np.isnan(hi)]
    if len(lo) < 3 or len(hi) < 3: return np.nan
    return float(mannwhitneyu(hi, lo).statistic / (len(lo) * len(hi)))

PAIRS = [('Jovens', 'Idosos'), ('Idosos', 'Idosos com risco de quedas'), ('Jovens', 'Idosos com risco de quedas')]

def crit(A, idx=None, inst='acc'):
    idx = np.arange(NS) if idx is None else np.asarray(idx); g = GRP[idx]; out = {}
    # 1. concordância (só faz sentido para o celular)
    if inst == 'acc':
        rap = np.nanmedian(A['r_ap'][idx]); rml = np.nanmedian(A['r_ml'][idx])
        rhos = [spearman(A['cop_area'][idx][g == G, c], A['acc_area'][idx][g == G, c]) for G in GROUPS for c in (0, 1) if (g == G).sum() > 4]
        out.update(conc=float((rap + rml + np.mean(rhos)) / 3), r_ap=float(rap), r_ml=float(rml), rho=float(np.mean(rhos)))
    # 2. confiabilidade
    R = A['rep_' + inst][idx]
    YJ = R[g == 'Jovens'][:, :, :2].reshape(-1, 2); YJ = YJ[~np.isnan(YJ).any(1)]
    YI = R[g != 'Jovens'].reshape(-1, 3); YI = YI[~np.isnan(YI).any(1)]
    out['icc_j'] = icc31(np.log(YJ)) if len(YJ) > 3 else np.nan; out['icc_i'] = icc31(np.log(YI)) if len(YI) > 3 else np.nan
    out['icc'] = float(np.nanmean([out['icc_j'], out['icc_i']]))
    # 3. efeito de fechar os olhos (d pareado do log OF/OA), por grupo
    key = f'{inst}_area'
    for G in GROUPS:
        lr = np.log(A[key][idx][g == G, 1] / A[key][idx][g == G, 0]); lr = lr[~np.isnan(lr)]
        out[f'eyes_{G}'] = float(lr.mean() / lr.std(ddof=1)) if len(lr) > 3 else np.nan
    out['eyes'] = float(np.nanmean([out[f'eyes_{G}'] for G in GROUPS]))
    # 4. discriminação entre grupos (1ª tentativa / sessão de teste, olhos abertos)
    F = A[f'{inst}_first'][idx][:, 0]
    for a, b in PAIRS: out[f'auc_{a}|{b}'] = auc_dir(F[g == a], F[g == b])
    out['auc'] = float(np.nanmean([out[f'auc_{a}|{b}'] for a, b in PAIRS])) if any(not np.isnan(out[f'auc_{a}|{b}']) for a, b in PAIRS) else np.nan
    return out
