"""Ensaios de conversão da aceleração do celular em deslocamento (cm) por dupla integração, comparados ao COP.

Pergunta: dá para transformar o sinal do celular na mesma grandeza da plataforma (cm) e comparar direto?
Métodos testados (tentativa 1 ou sessão de teste, 30 s, eixos AP e ML):
  - integração direta: só a média da aceleração removida, depois duas integrais (trapézio);
  - integração com passa-alta (Butterworth 4ª ordem, fase zero) de 0,05, 0,1, 0,2 e 0,5 Hz aplicado à aceleração,
    à velocidade e ao deslocamento (procedimento padrão para conter a deriva);
  - integração seguida do melhor filtro encontrado (0,7–1,5 Hz);
  - e, para comparação, a abordagem usada no resto do painel: aceleração filtrada em 0,7–1,5 Hz, sem converter.
Cada resultado é comparado ao COP bruto (o que se queria recuperar) e ao COP filtrado na mesma banda.
Saídas: resultados/conversao_resumo.csv, conversao_exemplo.csv, conversao_ganho.csv."""
import os, sys, csv, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy.signal import butter, sosfiltfilt, detrend
from scipy.integrate import cumulative_trapezoid
from scipy.stats import spearmanr
from comum import REC, SIGN, DEVKEY, area, RES, FS, EDGE

GN = {'Jovens': 'Jovens', 'Idosos': 'Idosos', 'Idosos com risco de quedas': 'Risco de quedas'}
GROUPS = ['Jovens', 'Idosos', 'Risco de quedas']
N = 30 * FS
hp = lambda x, fc: sosfiltfilt(butter(4, fc / (FS / 2), 'high', output='sos'), x)
bp = lambda x, lo, hi: sosfiltfilt(butter(4, [lo / (FS / 2), hi / (FS / 2)], 'band', output='sos'), x)
integ = lambda x: cumulative_trapezoid(x, dx=1 / FS, initial=0)
cut = lambda x: x[EDGE:-EDGE]

def converter(a, fc=None):
    """Aceleração (m/s²) -> deslocamento (cm). fc = passa-alta aplicado em cada etapa (None = integração direta).
    O sentido dos eixos do celular em relação à plataforma não é conhecido; a dupla integração inverte o sinal de uma senoide
    (x = −a/ω²), então o resultado é multiplicado por −1 para que a conversão fique com o sentido que mais favorece a concordância."""
    if fc is None:
        return -integ(integ(a - a.mean())) * 100
    return -hp(integ(hp(integ(hp(a, fc)), fc)), fc) * 100

METODOS = [  # (nome, função que gera o sinal do celular, função que gera o COP de referência "mesma banda", unidade do celular)
    ('Integração direta (sem passa-alta)', lambda a: converter(a), lambda c: c, 'cm'),
    ('Integração + passa-alta 0,05 Hz', lambda a: converter(a, .05), lambda c: hp(c, .05), 'cm'),
    ('Integração + passa-alta 0,1 Hz', lambda a: converter(a, .1), lambda c: hp(c, .1), 'cm'),
    ('Integração + passa-alta 0,2 Hz', lambda a: converter(a, .2), lambda c: hp(c, .2), 'cm'),
    ('Integração + passa-alta 0,5 Hz', lambda a: converter(a, .5), lambda c: hp(c, .5), 'cm'),
    ('Integração + filtro 0,7–1,5 Hz', lambda a: bp(converter(a, .5), .7, 1.5), lambda c: bp(c, .7, 1.5), 'cm'),
    ('Sem converter: aceleração filtrada 0,7–1,5 Hz', lambda a: bp(a - a.mean(), .7, 1.5), lambda c: bp(c, .7, 1.5), 'm/s²'),
]

# ---------- por tentativa ----------
rows = []
EX = {'Jovens': 'J20', 'Idosos': 'I16', 'Risco de quedas': 'R12'}   # participante típico (mesmo da figura de antes/depois)
exemplo = []
for r in REC:
    if r['trial'] != 1 or r['session'] not in ('teste', 'única'): continue
    g = GN[r['group']]
    cop = {ax: detrend(r['cop_' + ax][:N]) for ax in ('ap', 'ml')}
    acc = {ax: r['acc_' + ax][:N] * SIGN[(DEVKEY(r), ax)] for ax in ('ap', 'ml')}
    for nome, fconv, fref, un in METODOS:
        cel = {ax: cut(fconv(acc[ax])) for ax in acc}
        ref = {ax: cut(fref(cop[ax])) for ax in cop}
        bruto = {ax: cut(cop[ax]) for ax in cop}
        d = dict(grupo=g, participante=r['subj'], condicao=r['cond'], metodo=nome, unidade=un)
        for ax in ('ap', 'ml'):
            d[f'r_bruto_{ax}'] = np.corrcoef(cel[ax], bruto[ax])[0, 1]
            d[f'r_banda_{ax}'] = np.corrcoef(cel[ax], ref[ax])[0, 1]
            d[f'razao_rms_{ax}'] = np.std(cel[ax]) / np.std(bruto[ax]) if un == 'cm' else np.nan
            d[f'razao_rms_banda_{ax}'] = np.std(cel[ax]) / np.std(ref[ax]) if un == 'cm' else np.nan
            d[f'excursao_{ax}'] = np.ptp(cel[ax]) if un == 'cm' else np.nan
            d[f'excursao_cop_{ax}'] = np.ptp(bruto[ax])
        d['area_cel'] = area(cel['ml'], cel['ap']); d['area_cop'] = area(bruto['ml'], bruto['ap'])
        rows.append(d)
        if r['cond'] == 'OA' and r['subj'] == EX[g]:
            t = np.arange(len(cel['ap'])) / FS + EDGE / FS
            for k in range(0, len(t), 10):   # 10 Hz basta para o gráfico
                exemplo.append([g, r['subj'], nome, f'{t[k]:.1f}', f"{bruto['ap'][k]:.5g}", f"{ref['ap'][k]:.5g}", f"{cel['ap'][k]:.5g}", un])

# ---------- resumo por método e grupo (olhos abertos) ----------
med = lambda v: float(np.nanmedian(v)) if np.isfinite(v).any() else np.nan
q = lambda v, p: float(np.nanpercentile(v, p)) if np.isfinite(v).any() else np.nan
out = []
for nome, _, _, un in METODOS:
    for g in GROUPS + ['Todos']:
        R = [x for x in rows if x['metodo'] == nome and x['condicao'] == 'OA' and (g == 'Todos' or x['grupo'] == g)]
        rho = []
        for gg in (GROUPS if g == 'Todos' else [g]):
            Rg = [x for x in R if x['grupo'] == gg]
            rho.append(spearmanr([x['area_cel'] for x in Rg], [x['area_cop'] for x in Rg])[0])
        ra = [x['area_cel'] / x['area_cop'] for x in R] if un == 'cm' else [np.nan]
        rr = [x['razao_rms_ap'] for x in R]; rb = [x['razao_rms_banda_ap'] for x in R]
        exc_cop = med([x['excursao_cop_ap'] for x in R])
        out.append([nome, g, len(R), un] + [f'{v:.4f}' for v in (
            med([x['r_bruto_ap'] for x in R]), med([x['r_bruto_ml'] for x in R]),
            med([x['r_banda_ap'] for x in R]), med([x['r_banda_ml'] for x in R]),
            np.mean(rho))] + ['' if un != 'cm' else f'{v:.4g}' for v in (
            med(rr), q(rr, 25), q(rr, 75), med(rb), med(ra), med([x['excursao_ap'] for x in R]))] + [f'{exc_cop:.4g}'])
with open(os.path.join(RES, 'conversao_resumo.csv'), 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh)
    w.writerow(['metodo', 'grupo', 'n', 'unidade_celular', 'r_cop_bruto_ap', 'r_cop_bruto_ml', 'r_cop_mesma_banda_ap', 'r_cop_mesma_banda_ml',
                'spearman_area', 'razao_rms_ap', 'razao_rms_ap_q1', 'razao_rms_ap_q3', 'razao_rms_ap_mesma_banda', 'razao_area', 'excursao_ap_cm', 'excursao_cop_ap_cm'])
    w.writerows(out)
with open(os.path.join(RES, 'conversao_exemplo.csv'), 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh); w.writerow(['grupo', 'participante', 'metodo', 'tempo_s', 'cop_bruto_cm', 'cop_mesma_banda_cm', 'celular', 'unidade_celular']); w.writerows(exemplo)
# ganho da dupla integração: 1 m/s² numa frequência f vira 100/(2πf)² cm
with open(os.path.join(RES, 'conversao_ganho.csv'), 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh); w.writerow(['frequencia_hz', 'cm_por_ms2'])
    for f in np.logspace(np.log10(.02), np.log10(20), 120): w.writerow([f'{f:.4g}', f'{100 / (2 * np.pi * f) ** 2:.5g}'])

for o in out:
    if o[1] == 'Todos': print(o)
