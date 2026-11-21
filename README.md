# Como filtrar o sinal do celular para avaliar o equilíbrio

Este pacote reúne tudo de uma análise do sinal de aceleração do celular, registrado ao mesmo tempo que uma plataforma de força em testes de equilíbrio estático: os dados, o código, os resultados e um painel interativo.

**Pergunta:** qual filtro deixa o sinal do celular mais útil para avaliar o equilíbrio? E como os filtros usados em estudos anteriores se saem nesses mesmos dados?

**Para ver os resultados**, abra `index.html` em qualquer navegador (computador, Android ou iPhone). O arquivo funciona sozinho, sem internet. O botão **PT | EN** no canto das abas troca o idioma do painel. Também dá para abrir direto em inglês com `index.html?lang=en`.

*English:* open `index.html` in any browser and use the **PT | EN** switch (or add `?lang=en` to the address) to read the dashboard in English. The code, data and this README are in Portuguese.

---

## 1. O que tem em cada pasta

```
index.html            painel interativo (arquivo único, abre offline)
README.md             este texto
requirements.txt      bibliotecas Python necessárias
dados/
  participantes.csv   um participante por linha (código, grupo, celular, sessões, tentativas)
  tentativas.csv      índice das 371 tentativas e o arquivo de sinal de cada uma
  sinais/             um CSV por tentativa: tempo, COP AP/ML (cm), aceleração AP/ML (m/s²), a 100 Hz
codigo/               análise em etapas numeradas (ver seção 4)
resultados/           tabelas geradas pelo código; o painel usa só estas tabelas
  intermediarios/     arquivos grandes de trabalho (podem ser apagados e refeitos)
figuras/              figuras estáticas (PNG)
painel/               peças do painel: modelo HTML, scripts dos gráficos, biblioteca d3
```

## 2. Dados

| Grupo | Participantes | Tentativas | Protocolo | Celular |
|---|---|---|---|---|
| Jovens | 27 | 82 | 1 tentativa por condição, 30 s. Teste e reteste em dias diferentes (14 fizeram as duas sessões) | 50 Hz, aceleração com gravidade |
| Idosos | 30 | 180 | 3 tentativas por condição, 45 s (analisados 30 s) | 100 Hz, aceleração linear |
| Idosos com risco de quedas | 19 | 109 | 3 tentativas por condição, 45 s (analisados 30 s) | 100 Hz, aceleração linear |

- **Condições:** olhos abertos (OA) e olhos fechados (OF). Um idoso com risco de quedas só tem OA.
- **Sem nomes:** os participantes aparecem só por código (J01… jovens, I01… idosos, R01… idosos com risco de quedas). A chave que liga código e nome não está no pacote.
- **Exclusões:** dois jovens ficaram de fora. Um tinha HTLV, então não é jovem saudável. O outro não tinha os arquivos OA/OF da sessão de teste.
- **Preparo dos sinais:** os arquivos `.mat` originais foram lidos e os sinais da plataforma e do celular foram sincronizados por interpolação numa base de tempo comum de 100 Hz. Os CSVs de `dados/sinais/` já saem desse passo. Os arquivos `.mat` não vão no pacote porque os nomes dos participantes aparecem nas pastas e nos arquivos.
- **Unidades:** COP = centro de pressão da plataforma, em cm. Aceleração do celular em m/s². AP = anteroposterior. ML = mediolateral.

## 3. O que foi feito

### 3.1 Por que filtrar, e por que não converter para deslocamento

O celular mede aceleração, e a plataforma mede deslocamento do centro de pressão. Tentar integrar a aceleração duas vezes para chegar a deslocamento não funcionou: a deriva lenta explode e o resultado não se parece com o COP.

O que funciona é outra coisa. Na faixa em que o corpo oscila, o celular mede principalmente a inclinação do tronco em relação à gravidade, que é proporcional ao deslocamento. Então, filtrando os dois sinais na mesma banda, eles passam a andar juntos. A questão passa a ser qual banda usar.

### 3.2 Processamento comum a todos os filtros (`codigo/comum.py`)

Em cada tentativa, para os dois instrumentos e os dois eixos:

1. Usar os primeiros 30 s (ou 20 s, quando a duração está sendo testada).
2. Remover a tendência linear.
3. Aplicar um filtro Butterworth: passa-alta e/ou passa-baixa, com fase zero (`sosfiltfilt`) ou causal (`sosfilt`).
4. Descartar 1 s em cada borda, para eliminar o transiente do filtro.
5. Acertar o sinal da aceleração (+1 ou −1) por eixo e por aparelho, para que correlacione positivamente com o COP.

### 3.3 Os 440 filtros testados (`01_fatorial_440_filtros.py`)

Os 440 filtros são todas as combinações de:

| Fator | Valores | Combinações |
|---|---|---|
| Passa-alta | nenhum, 0,05, 0,1, 0,2, 0,3, 0,5, 0,7 Hz | 55 bandas válidas (passa-alta < passa-baixa) |
| Passa-baixa | 0,7, 1, 1,5, 2, 3, 5, 10 Hz, nenhum | (incluídas nas 55 bandas) |
| Ordem | 2ª ou 4ª | × 2 |
| Fase | zero ou causal | × 2 |
| Duração | 30 ou 20 s | × 2 |

### 3.4 Como cada filtro é avaliado: quatro critérios (`comum.py`, função `crit`)

1. **Concordância com a plataforma.** É a média de três números: a correlação ponto a ponto AP (mediana dos participantes), a correlação ponto a ponto ML, e a correlação de Spearman da área da elipse entre participantes, calculada dentro de cada grupo.
2. **Confiabilidade.** ICC(3,1) do log da área da elipse do celular. Nos jovens, teste × reteste. Nos idosos, as três tentativas. O critério é a média dos dois.
3. **Efeito de fechar os olhos.** d pareado do log(área OF / área OA), calculado em cada grupo e depois tirada a média. Um bom filtro deve mostrar que fechar os olhos aumenta a oscilação.
4. **Separação entre grupos.** AUC da área com olhos abertos na direção esperada (jovens < idosos < risco de quedas), com a média dos três pares.

**Nota de 0 a 100 (`02_nota_e_ranking.py`):** cada critério é reescalado de 0 (pior dos 440 filtros) a 100 (melhor). A nota é a média dos quatro. Usar vários critérios evita uma armadilha: escolhendo só pela concordância, o filtro vencedor é uma banda estreitíssima, em torno de 0,5–0,7 Hz. Nela os dois sinais ficam parecidos, mas ela perde a capacidade de distinguir condições e grupos.

### 3.5 Resultado principal

- O **melhor filtro encontrado** foi **0,7–1,5 Hz, 4ª ordem, fase zero, 30 s**, com nota 84. Sem filtro, a nota é 40 (posição 405 de 440).
- **O que mais pesa é a banda.** A passa-alta muda a nota em cerca de 29 pontos, e a passa-baixa em cerca de 20. Ordem, fase e duração mudam menos de 3 pontos. Ver a aba "Escolha do filtro".
- **Ressalva:** a banda 0,7–1,5 Hz tira muita oscilação lenta. Com ela, a própria plataforma passa a separar menos idosos de idosos com risco de quedas. É o melhor filtro para o celular, mas não necessariamente para a plataforma.

### 3.6 Validação (`03_coerencia_e_validacao.py`, `04_exportar_coerencia_e_validacao.py`)

Esta etapa usa as 55 bandas com 2ª ordem, fase zero e 30 s.

- **Coerência:** a coerência quadrática entre celular e plataforma por frequência (Welch, segmentos de 1024 amostras). Ela mostra em que faixa os dois sinais têm algo em comum (coerência ≥ 0,5).
- **Validação cruzada metade/metade:** 300 divisões aleatórias dos participantes, estratificadas por grupo. Em cada divisão, o filtro é escolhido numa metade e avaliado na outra, o que evita escolher e avaliar nos mesmos dados. A escolha é feita de duas formas: pelos quatro critérios ou só pela concordância.
- **Deixar um grupo de fora:** o filtro é escolhido com dois grupos e testado no terceiro.
- Os filtros fixos 0,1–2 e 0,2–2 Hz aparecem nessa etapa só como candidatos de uma análise anterior, para comparação.

### 3.7 Filtros usados na literatura (`05_filtros_da_literatura.py`)

Sete filtros publicados em estudos com celular ou acelerômetro foram aplicados a estes dados e avaliados com a mesma nota. Eles estão numerados pela nota:

| Nº | Estudo | Filtro | Nota | Posição entre os 440 |
|---|---|---|---|---|
| ★ | Melhor encontrado aqui | 0,7–1,5 Hz, 4ª ordem, fase zero | 84,1 | 1º |
| [1] | [Validação de celular em posições arbitrárias (2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12073742/) | 0,12–2 Hz | 70,9 | 117º |
| [2] | [App de equilíbrio Kinesis](https://cdn.clinicaltrials.gov/large-docs/20/NCT06977620/Prot_000.pdf) | 0,1–5 Hz | 64,2 | 176º |
| [3] | [Acelerômetro triaxial, idosos × jovens](https://www.researchgate.net/publication/51103306_Postural_sway_parameters_using_a_triaxial_accelerometer_Comparing_elderly_and_young_healthy_adults) | 0,3–20 Hz | 54,1 | 266º |
| [4] | [App de celular para instabilidade postural (Sensors 2025)](https://doi.org/10.3390/s25051505) | passa-baixa 10 Hz | 43,3 | 363º |
| [5] | [Celular na lombar, risco de quedas (Applied Sciences 2026)](https://www.mdpi.com/2076-3417/16/22/11247) | passa-baixa 6 Hz | 42,6 | 371º |
| [6] | [Mancini et al. 2012 (ISway)](https://jneuroengrehab.biomedcentral.com/articles/10.1186/1743-0003-9-59) | passa-baixa 3,5 Hz | 41,1 | 399º |
| [7] | [Revisão sistemática de filtros em celulares](https://www.researchgate.net/publication/362975117_Use_of_Filters_to_Smooth_Out_Signals_Collected_through_Mobile_Devices_in_the_Static_and_Dynamic_Balance_Assessment_A_Systematic_Review) | passa-baixa 4 Hz (o mais usado) | 40,8 | 401º |
| — | Sem filtro | — | 39,8 | 405º |

**O que a tabela mostra:** filtros que só cortam as altas frequências quase não melhoram em relação a não filtrar. O que faz diferença é o passa-alta, que remove a deriva lenta.

**Ressalva:** quando a ordem do filtro não estava clara no trecho consultado do estudo, foi assumida 4ª ordem. Isso pesa menos de 1 ponto na nota. Antes de citar, confira os detalhes de filtragem direto em cada texto.

### 3.8 Variáveis posturais e estatística (`06_variaveis_e_estatistica.py`)

Cada participante entra com a 1ª tentativa (idosos) ou a sessão de teste (jovens). As variáveis são calculadas com 9 filtros: sem filtro, os 7 da literatura e o melhor encontrado.

- **Variáveis:** área da elipse de 95%, RMS e amplitude em AP e ML, velocidade média do traçado e frequência mediana AP e ML. No celular, as mesmas contas são feitas sobre a aceleração, por isso as unidades são de aceleração. Só as frequências têm a mesma unidade (Hz) nos dois instrumentos.
- **Entre grupos:** Kruskal-Wallis com ε², e Mann-Whitney par a par com correção de Holm e r bisserial de postos.
- **Entre condições (OA × OF):** Wilcoxon pareado com r bisserial de postos pareado.
- **Entre aparelhos:** Spearman entre celular e plataforma. Para as frequências medianas, também Bland-Altman (viés e limites de concordância em Hz). Jovens e idosos são analisados separadamente, porque usaram celulares diferentes.

## 4. Como refazer tudo

Precisa de Python 3.10 ou mais recente.

```bash
pip install -r requirements.txt
python codigo/rodar_tudo.py
```

O script roda as etapas na ordem e, no fim, recria o `index.html`. Leva cerca de 15 a 20 minutos; a etapa 01 (440 filtros) é a mais demorada.

| Etapa | O que faz | Gera |
|---|---|---|
| `comum.py` | lê os dados; funções de filtragem, área da elipse, ICC, AUC e critérios | — |
| `01_fatorial_440_filtros.py` | avalia os 440 filtros nos quatro critérios | `resultados/intermediarios/fatorial.json` |
| `02_nota_e_ranking.py` | nota 0–100, ranking, importância dos fatores | `fatorial.csv`, `importancia.csv`, figuras |
| `03_coerencia_e_validacao.py` | coerência, validação cruzada e grupo de fora | `intermediarios/validacao.json` |
| `04_exportar_coerencia_e_validacao.py` | transforma o resultado anterior em tabelas | `grade.csv`, `coerencia.csv`, `bandas.csv`, `cv_*.csv`, `grupo_fora.csv`, `amostra.csv` |
| `05_filtros_da_literatura.py` | aplica e avalia os 7 filtros publicados | `literatura.csv` |
| `06_variaveis_e_estatistica.py` | variáveis por participante e estatística | `variaveis.csv`, `stats_*.csv` |
| `07_figura_antes_depois.py` | figura de exemplo, um participante típico por grupo (PT e EN) | `figuras/fig_antes_depois.png`, `fig_antes_depois_en.png` |
| `08_montar_painel.py` | junta modelo, tabelas, figura e scripts num arquivo só | `index.html` |

Os resultados desta pasta foram gerados exatamente assim, a partir de `dados/`. Em relação à primeira versão da análise, feita direto nos `.mat`, as diferenças só aparecem na 4ª casa decimal, por causa do arredondamento dos sinais ao gravar os CSVs.

Para mudar só o painel (textos ou gráficos), edite os arquivos da pasta `painel/` (a tradução para o inglês fica em `painel/traducao_en.js`) e rode `python codigo/08_montar_painel.py`. É instantâneo.

## 5. Abas do painel e de onde vêm os números

| Aba | Conteúdo | Tabelas |
|---|---|---|
| Resumo | antes/depois, notas, comparação de ranking com a literatura | `fatorial`, `literatura` |
| Escolha do filtro | importância dos fatores, ranking dos 440, posição de cada estudo, mapa da nota | `fatorial`, `importancia`, `literatura` |
| Coerência e critérios | coerência por frequência, mapa de cada critério, comparação de dois filtros | `coerencia`, `bandas`, `grade` |
| Validação | validação cruzada e grupo de fora | `cv_escolhas`, `cv_teste`, `grupo_fora` |
| Grupos | variáveis por grupo, estatística, todos os filtros lado a lado | `variaveis`, `stats_grupos` |
| Olhos abertos × fechados | efeito de fechar os olhos, por participante e por filtro | `variaveis`, `stats_condicoes` |
| Celular × plataforma | concordância entre aparelhos por filtro, dispersão, Bland-Altman | `variaveis`, `stats_dispositivos` |
| Amostra e definições | amostra e definição dos critérios | `amostra` |

## 6. Limitações

- Jovens e idosos usaram celulares diferentes (50 Hz com gravidade × 100 Hz linear). Diferenças entre jovens e idosos no celular podem ter parte de origem no aparelho. Por isso as comparações entre aparelhos são feitas separadamente por grupo.
- A confiabilidade mede coisas diferentes nos dois grupos: dias diferentes nos jovens, tentativas no mesmo dia nos idosos.
- A nota depende dos quatro critérios escolhidos e de pesos iguais entre eles. Outro conjunto de critérios pode mudar a ordem dos filtros próximos do topo. A região de bandas boas (passa-alta 0,2–0,7 Hz, passa-baixa 1,5–2 Hz) é estável.
