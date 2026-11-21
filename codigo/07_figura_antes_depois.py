"""Figura ilustrativa (em português e em inglês): trajetória do COP e do celular, sem filtro e com 0,7–1,5 Hz, um participante típico por grupo."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter
from comum import REC, GROUPS, proc, SIGN, DEVKEY, FIGS

OUT = os.path.join(FIGS, 'fig_antes_depois.png')
INK, MUTED, GRID = '#1f1f1e', '#6b6a63', '#e4e3dc'
C_COP, C_CEL = '#2a78d6', '#eb6834'
plt.rcParams.update({'font.size': 9, 'axes.edgecolor': MUTED, 'axes.labelcolor': INK, 'xtick.color': MUTED, 'ytick.color': MUTED,
                     'axes.spines.top': False, 'axes.spines.right': False, 'axes.grid': True, 'grid.color': GRID, 'grid.linewidth': .6})
cm = lambda v: f'{v:.2f}'.replace('.', ',')
GL = {'Jovens': 'Jovens', 'Idosos': 'Idosos', 'Idosos com risco de quedas': 'Idosos com risco de quedas'}

def sig(r, h, l):
    o = 4 if h else 2
    S = {f'{s}_{ax}': proc(r[f'{s}_{ax}'], h, l, order=o) * (SIGN[(DEVKEY(r), ax)] if s == 'acc' else 1) for s in ['cop', 'acc'] for ax in ['ap', 'ml']}
    n = min(len(v) for v in S.values()); return {k: v[:n] for k, v in S.items()}

# participante típico: mediana da correlação AP filtrada, olhos abertos, 1ª tentativa / teste
EX = {}
for G in GROUPS:
    c = []
    for r in REC:
        if r['group'] == G and r['cond'] == 'OA' and r['trial'] == 1 and r['session'] in ('teste', 'única'):
            S = sig(r, .7, 1.5); c.append((np.corrcoef(S['cop_ap'], S['acc_ap'])[0, 1], id(r), r))
    c.sort(key=lambda x: x[0]); EX[G] = c[len(c) // 2][2]

TXT = {
    'pt': dict(raw='Sem filtro', best='Melhor filtro encontrado (0,7–1,5 Hz)', best_long='Melhor filtro encontrado', best_short='Melhor filtro', plat='Plataforma',
               cel='Celular (escalado)', tempo='Tempo (s)', ap_tempo='AP no tempo (padronizado)', Jovens='Jovens', Idosos='Idosos',
               **{'Idosos com risco de quedas': 'Idosos com risco de quedas'},
               titulo='Antes e depois do filtro: plataforma (azul) e celular (laranja) no mesmo participante',
               sub='Participante típico de cada grupo (mediana da correlação AP), olhos abertos. Para sobrepor, o celular foi convertido para cm por regressão no próprio registro.'),
    'en': dict(raw='No filter', best='Best filter found (0.7–1.5 Hz)', best_long='Best filter found', best_short='Best filter', plat='Platform',
               cel='Phone (scaled)', tempo='Time (s)', ap_tempo='AP over time (standardised)', Jovens='Young adults', Idosos='Older adults',
               **{'Idosos com risco de quedas': 'Older adults at fall risk'},
               titulo='Before and after filtering: platform (blue) and phone (orange) in the same participant',
               sub='Typical participant of each group (median AP correlation), eyes open. To overlay, the phone signal was converted to cm by regression on the same recording.'),
}

def desenhar(lang, out):
    T = TXT[lang]; dec = (lambda t: t.replace('.', ',')) if lang == 'pt' else (lambda t: t)
    fig, axs = plt.subplots(3, 4, figsize=(15, 11.5), gridspec_kw=dict(width_ratios=[1, 1, 1.6, 1.6]))
    for i, G in enumerate(GROUPS):
        r = EX[G]
        for j, (h, l, lab) in enumerate([(None, None, T['raw']), (.7, 1.5, T['best'])]):
            S = sig(r, h, l)
            # escala o celular para cm pela regressão no próprio registro (só para sobrepor)
            k = {ax: np.polyfit(S['acc_' + ax], S['cop_' + ax], 1)[0] for ax in ['ap', 'ml']}
            cx, cy = S['cop_ml'], S['cop_ap']; ax_, ay_ = S['acc_ml'] * k['ml'], S['acc_ap'] * k['ap']
            ra, rm = np.corrcoef(S['cop_ap'], S['acc_ap'])[0, 1], np.corrcoef(S['cop_ml'], S['acc_ml'])[0, 1]
            a = axs[i, j]
            a.plot(cx - cx.mean(), cy - cy.mean(), color=C_COP, lw=.7, alpha=.85, label=T['plat'])
            a.plot(ax_ - ax_.mean(), ay_ - ay_.mean(), color=C_CEL, lw=.7, alpha=.85, label=T['cel'])
            L = np.abs(np.r_[cx - cx.mean(), cy - cy.mean()]).max() * 1.15; a.set_xlim(-L, L); a.set_ylim(-L, L); a.set_aspect('equal')
            FF = FuncFormatter(lambda v, _: dec(f'{v:g}')); a.xaxis.set_major_formatter(FF); a.yaxis.set_major_formatter(FF)
            a.set_xlabel('ML (cm)', fontsize=8); a.set_ylabel('AP (cm)', fontsize=8)
            a.text(.03, .03, f'r AP = {dec(f'{ra:.2f}')}\nr ML = {dec(f'{rm:.2f}')}', transform=a.transAxes, fontsize=8.5, color=INK, bbox=dict(fc='white', ec='none', alpha=.85))
            if i == 0: a.set_title(lab, loc='left', fontweight='bold', fontsize=10.5)
            if i == 0 and j == 0: a.legend(loc='upper left', fontsize=7.5, frameon=True, framealpha=.9, edgecolor='none')
            # série temporal AP (painéis 3 e 4)
            b = axs[i, 2 + j]; t = np.arange(len(cy)) / 100 + 1
            z = lambda v: (v - v.mean()) / v.std()
            b.plot(t, z(cy), color=C_COP, lw=.9); b.plot(t, z(S['acc_ap']), color=C_CEL, lw=.9, alpha=.85)
            b.set_yticks([]); b.set_xlim(1, 29); b.set_xlabel(T['tempo'], fontsize=8)
            b.text(.01, .92, f'AP · r = {dec(f'{ra:.2f}')}', transform=b.transAxes, fontsize=9, fontweight='bold', color=INK, bbox=dict(fc='white', ec='none', alpha=.85))
            if i == 0: b.set_title(f"{lab.replace(T['best_long'], T['best_short'])} — {T['ap_tempo']}", loc='left', fontweight='bold', fontsize=10.5)
        axs[i, 0].text(-.42, .5, T[G], transform=axs[i, 0].transAxes, rotation=90, va='center', ha='center', fontsize=11, fontweight='bold', color=INK)
    fig.suptitle(T['titulo'], x=.01, y=.995, ha='left', fontsize=13, fontweight='bold', color=INK)
    fig.text(.01, .965, T['sub'], fontsize=9, color=MUTED)
    fig.tight_layout(rect=(0.02, 0, 1, .955)); fig.savefig(out, dpi=140); plt.close(fig)

desenhar('pt', OUT)
desenhar('en', os.path.join(FIGS, 'fig_antes_depois_en.png'))
print({G: EX[G]['subj'] for G in GROUPS})
