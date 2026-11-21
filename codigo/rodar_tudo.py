"""Roda a análise inteira, na ordem, e monta o painel. Uso: python codigo/rodar_tudo.py"""
import os, sys, subprocess, time
AQUI = os.path.dirname(os.path.abspath(__file__))
ETAPAS = ['01_fatorial_440_filtros.py', '02_nota_e_ranking.py', '03_coerencia_e_validacao.py', '04_exportar_coerencia_e_validacao.py',
          '05_filtros_da_literatura.py', '06_variaveis_e_estatistica.py', '07_figura_antes_depois.py', '08_montar_painel.py']
for e in ETAPAS:
    t0 = time.time(); print(f'\n=== {e} ===', flush=True)
    subprocess.run([sys.executable, os.path.join(AQUI, e)], check=True)
    print(f'--- {e}: {time.time() - t0:.0f} s', flush=True)
