"""Monta o painel (index.html na raiz do pacote) num arquivo único, que abre em qualquer navegador sem internet.

Junta: painel/modelo.html (estrutura e textos) + as tabelas de resultados/*.csv + a figura de antes/depois
+ a biblioteca d3 (painel/vendor) + os scripts dos gráficos (painel/*.js)."""
import os, csv, json, base64

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES, FIGS, PAINEL = (os.path.join(ROOT, p) for p in ('resultados', 'figuras', 'painel'))
TABELAS = ['fatorial', 'importancia', 'literatura', 'grade', 'coerencia', 'bandas', 'cv_escolhas', 'cv_teste', 'grupo_fora', 'amostra',
           'variaveis', 'stats_grupos', 'stats_condicoes', 'stats_dispositivos']
SCRIPTS = ['graficos_escolha_filtro.js', 'graficos_criterios_validacao.js', 'graficos_resumo_e_abas.js']

dados = {}
for t in TABELAS:
    with open(os.path.join(RES, t + '.csv'), encoding='utf-8') as fh:
        rows = list(csv.reader(fh))
    dados[t] = {'colunas': rows[0], 'linhas': rows[1:]}          # formato compacto; expandido no navegador
js_dados = json.dumps(dados, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
expand = ('window.__DADOS__ = {}; for (const [k, t] of Object.entries(__COMPACTO__)) '
          'window.__DADOS__[k] = t.linhas.map((l) => Object.fromEntries(t.colunas.map((c, i) => [c, l[i]])));')
ler = lambda p: open(p, encoding='utf-8').read()
partes = [f'<script>{ler(os.path.join(PAINEL, "vendor", "d3.min.js"))}</script>',
          f'<script>const __COMPACTO__ = {js_dados};\n{expand}</script>',
          f'<script>{ler(os.path.join(PAINEL, "runtime.js"))}</script>'] + [f'<script>{ler(os.path.join(PAINEL, s))}</script>' for s in SCRIPTS]
img = base64.b64encode(open(os.path.join(FIGS, 'fig_antes_depois.png'), 'rb').read()).decode()
html = ler(os.path.join(PAINEL, 'modelo.html')).replace('{{FIGURA_ANTES_DEPOIS}}', 'data:image/png;base64,' + img).replace('{{SCRIPTS}}', '\n'.join(partes))
out = os.path.join(ROOT, 'index.html')
open(out, 'w', encoding='utf-8').write(html)
print('painel:', out, f'{os.path.getsize(out) / 1e6:.1f} MB')
