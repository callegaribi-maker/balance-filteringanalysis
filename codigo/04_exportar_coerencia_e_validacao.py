"""Exporta os resultados do artigo de filtragem para CSVs do painel."""
import os, sys, json, pickle, csv, collections, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from comum import SUBJ, GRP, GROUPS, REC, RES
OUT = RES; os.makedirs(OUT, exist_ok=True)
R = json.load(open(os.path.join(RES, 'intermediarios', 'validacao.json'))); AGP = pickle.load(open(os.path.join(RES, 'intermediarios', 'grade_agregada.pkl'), 'rb'))
AG = AGP['AG']
lab = lambda x: 'nenhum' if x in (None, 'None') else f'{float(x):g}'.replace('.', ',')
HPS = [None, .05, .1, .2, .3, .5, .7]; LPS = [.7, 1, 1.5, 2, 3, 5, 10, None]
GS = {'Jovens': 'Jovens', 'Idosos': 'Idosos', 'Idosos com risco de quedas': 'Risco de quedas'}
CRIT = [('conc', 'Concordância com a plataforma (média)'), ('r_ap', 'Correlação ponto a ponto AP'), ('r_ml', 'Correlação ponto a ponto ML'),
        ('rho', 'Spearman da área entre participantes'), ('icc', 'Confiabilidade (média)'), ('icc_j', 'Confiabilidade jovens (teste × reteste)'),
        ('icc_i', 'Confiabilidade idosos (3 tentativas)'), ('eyes', 'Efeito de fechar os olhos (média dos grupos)'),
        ('eyes_Jovens', 'Efeito de fechar os olhos — Jovens'), ('eyes_Idosos', 'Efeito de fechar os olhos — Idosos'),
        ('eyes_Idosos com risco de quedas', 'Efeito de fechar os olhos — Risco de quedas'), ('auc', 'Separação entre grupos (AUC média)'),
        ('auc_Jovens|Idosos', 'AUC Jovens × Idosos'), ('auc_Idosos|Idosos com risco de quedas', 'AUC Idosos × Risco de quedas'),
        ('auc_Jovens|Idosos com risco de quedas', 'AUC Jovens × Risco de quedas')]
CODE = {'conc': 'conc', 'r_ap': 'r_ap', 'r_ml': 'r_ml', 'rho': 'rho', 'icc': 'icc', 'icc_j': 'icc_j', 'icc_i': 'icc_i', 'eyes': 'olhos',
        'eyes_Jovens': 'olhos_j', 'eyes_Idosos': 'olhos_i', 'eyes_Idosos com risco de quedas': 'olhos_r', 'auc': 'auc',
        'auc_Jovens|Idosos': 'auc_ji', 'auc_Idosos|Idosos com risco de quedas': 'auc_ir', 'auc_Jovens|Idosos com risco de quedas': 'auc_jr'}

def w(name, header, rows):
    with open(f'{OUT}/{name}.csv', 'w', newline='') as f:
        wr = csv.writer(f); wr.writerow(header); wr.writerows(rows)
    print(name, len(rows))

fmt = lambda v: '' if v is None or (isinstance(v, float) and np.isnan(v)) else f'{v:.4f}'
# 1. grade
rows = []
for i, h in enumerate(HPS):
    for j, l in enumerate(LPS):
        k = f'{h}|{l}'
        if k not in R['full']: continue
        for inst, D in (('celular', R['full'][k]), ('plataforma', R['full_cop'][k])):
            for c, name in CRIT:
                if c in D: rows.append([f'{lab(h)}–{lab(l)}', lab(h), lab(l), i, j, inst, CODE[c], name, fmt(D[c])])
w('grade', ['filtro', 'passa_alta', 'passa_baixa', 'pa_ordem', 'pb_ordem', 'instrumento', 'criterio', 'criterio_nome', 'valor'], rows)
# 2. coerência
rows, brows = [], []
for key, v in R['coh'].items():
    G, ax = key.split('|')
    for f_, m in zip(v['f'], v['m']):
        if 0.05 <= f_ <= 20: rows.append([GS[G], ax.upper(), f'{f_:.4f}', f'{m:.4f}'])
    b = v['band']; brows.append([GS[G], ax.upper(), f'{b[0]:.2f}', f'{b[1]:.2f}', v['n']])
w('coerencia', ['grupo', 'eixo', 'frequencia_hz', 'coerencia'], rows)
w('bandas', ['grupo', 'eixo', 'inicio_hz', 'fim_hz', 'tentativas'], brows)
# 3. validação cruzada
MN = {'raw': 'Sem filtro', 'conc_only': 'Escolha só pela concordância', 'multi': 'Escolha pelos quatro critérios', 'rec': 'Fixo 0,2–2 Hz', 'rec01': 'Fixo 0,1–2 Hz'}
CN = {'conc': 'Concordância', 'icc': 'Confiabilidade', 'eyes': 'Efeito de fechar os olhos', 'auc': 'Separação entre grupos'}
rows = []
for k, v in R['cv']['test'].items():
    m, c = k.split('|'); v = np.array(v, float); v = v[~np.isnan(v)]
    rows.append([MN[m], CN[c], f'{np.median(v):.4f}', f'{np.percentile(v, 2.5):.4f}', f'{np.percentile(v, 97.5):.4f}'])
w('cv_teste', ['metodo', 'criterio', 'mediana', 'ic_inf', 'ic_sup'], rows)
rows = []
for src, name in (('picks', 'Quatro critérios'), ('picks_conc', 'Só concordância')):
    for i, h in enumerate(HPS):
        for j, l in enumerate(LPS):
            k = f'{h}|{l}'
            if k in R['full']: rows.append([name, f'{lab(h)}–{lab(l)}', lab(h), lab(l), i, j, f"{100 * R['cv'][src].get(k, 0) / R['cv']['nrep']:.1f}"])
w('cv_escolhas', ['metodo', 'filtro', 'passa_alta', 'passa_baixa', 'pa_ordem', 'pb_ordem', 'pct_divisoes'], rows)
# 4. deixar um grupo de fora
rows = []
for G, v in R['logo'].items():
    h, l = v['chosen'].split('|')
    for c in ['conc', 'icc', 'eyes']:
        rows.append([GS[G], f'{lab(h)}–{lab(l)}', CN[c], fmt(v['test'][c]), fmt(v['raw'][c]), fmt(v['rec'][c]), fmt(v['best'][c])])
w('grupo_fora', ['grupo_teste', 'filtro_escolhido', 'criterio', 'escolhido', 'sem_filtro', 'fixo_02_2', 'melhor_possivel'], rows)
# 7. amostra
cnt = collections.defaultdict(lambda: [set(), 0, set()])
for r in REC:
    c = cnt[r['group']]; c[0].add(r['subj']); c[1] += 1; c[2].add(r['session'])
rows = []
for G in GROUPS:
    c = cnt[G]
    desc = '1 tentativa por condição, 30 s; teste e reteste (14 com as duas sessões)' if G == 'Jovens' else '3 tentativas por condição, 45 s (analisados 30 s)'
    disp = 'Celular, 50 Hz (aceleração com gravidade)' if G == 'Jovens' else 'Celular, 100 Hz (aceleração linear)'
    rows.append([GS[G], len(c[0]), c[1], desc, disp])
w('amostra', ['grupo', 'participantes', 'tentativas', 'protocolo', 'aparelho'], rows)
