/* Tradução do painel para o inglês (botão PT | EN).
 * Funciona sobre o texto já desenhado: cada nó de texto da página passa por uma lista de frases PT → EN
 * (a mais longa primeiro), depois por algumas regras (ordinais, "OA/OF") e, por fim, a vírgula decimal vira ponto.
 * Um observador traduz também o que os gráficos desenham depois (troca de filtro, dicas do mouse etc.).
 * Os valores internos (filtros, grupos nos CSVs) continuam em português; só o que aparece na tela muda. */
(function () {
  const KEY = 'painel_idioma';
  const qs = new URLSearchParams(location.search).get('lang');
  let stored = null; try { stored = localStorage.getItem(KEY); } catch (e) { /* ok */ }
  const LANG = qs === 'en' || qs === 'pt' ? qs : stored || ((navigator.language || 'pt').toLowerCase().startsWith('pt') ? 'pt' : 'en');
  window.__LANG__ = LANG;

  // ---------- botão PT | EN ----------
  const nav = document.querySelector('.fx-tabs');
  if (nav) {
    const box = document.createElement('div'); box.className = 'fx-lang'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Idioma / Language');
    ['pt', 'en'].forEach((l) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = l.toUpperCase(); b.className = 'fx-langbtn' + (l === LANG ? ' fx-langbtn-on' : '');
      b.setAttribute('aria-pressed', l === LANG ? 'true' : 'false'); b.dataset.noTr = '1';
      b.addEventListener('click', () => {
        if (l === LANG) return;
        try { localStorage.setItem(KEY, l); } catch (e) { /* ok */ }
        const u = new URL(location.href); u.searchParams.set('lang', l); location.href = u.toString();
      });
      box.appendChild(b);
    });
    nav.appendChild(box);
  }
  if (LANG !== 'en') return;

  document.documentElement.lang = 'en';
  const img = document.querySelector('img[data-src-en]'); if (img) { img.src = img.dataset.srcEn; img.alt = 'AP trajectory and time series of the platform and the phone, without filter and with the 0.7–1.5 Hz filter, in a young adult, an older adult and an older adult at fall risk'; }

  // Frases inteiras (textos fixos) e pedaços (rótulos, dados, dicas). A ordem não importa: as mais longas são tentadas primeiro.
  const F = {
    // ---- títulos e textos fixos ----
    'Filtragem do celular × plataforma — todas as comparações': 'Phone × force-platform filtering — all comparisons',
    'Filtragem do sinal do celular × plataforma de força': 'Filtering the smartphone signal × force platform',
    'Numa nota de 0 a 100, o celular sem filtro ficou com': 'On a 0–100 score, the unfiltered phone signal scored',
    '. Os filtros usados em estudos anteriores ficaram entre': '. Filters used in previous studies scored between',
    '; os que só cortam as altas frequências quase não melhoram em relação a não filtrar. O melhor filtro encontrado aqui (': '; those that only cut high frequencies barely improve on no filtering. The best filter found here (',
    ') chegou a': ') reached',
    'Todos os resultados usam só o celular, com tendência linear removida, 30 s por tentativa e 1 s descartado em cada borda depois de filtrar.': 'All results use the phone only, with linear trend removed, 30 s per trial and 1 s discarded at each edge after filtering.',
    'Antes e depois do filtro, no mesmo participante': 'Before and after filtering, in the same participant',
    'Plataforma em azul e celular em laranja, um participante típico de cada grupo, olhos abertos. Sem filtro as duas linhas não se parecem; com o melhor filtro encontrado (0,7–1,5 Hz) passam a andar juntas. Para sobrepor as trajetórias, o celular foi convertido para cm por regressão no próprio registro.': 'Platform in blue and phone in orange, one typical participant per group, eyes open. Without filtering the two lines do not look alike; with the best filter found (0.7–1.5 Hz) they move together. To overlay the trajectories, the phone signal was converted to cm by regression on the same recording.',
    'Em resumo: a nota de 0 a 100 dos 440 filtros': 'Summary: the 0–100 score of the 440 filters',
    'A nota junta os quatro critérios (concordância com a plataforma, confiabilidade, efeito de fechar os olhos e separação entre grupos). Cada critério vai de 0 (pior filtro) a 100 (melhor filtro) e a nota é a média dos quatro.': 'The score combines the four criteria (agreement with the platform, reliability, eyes-closed effect and group separation). Each criterion is rescaled from 0 (worst filter) to 100 (best filter) and the score is the mean of the four.',
    'Sem filtro (posição': 'No filter (rank',
    'Melhor filtro da literatura:': 'Best filter from the literature:',
    '(posição equivalente': '(equivalent rank',
    'Melhor filtro encontrado:': 'Best filter found:',
    'Comparação de ranking: filtros da literatura × melhor filtro encontrado': 'Ranking comparison: filters from the literature × best filter found',
    'Cada filtro publicado foi aplicado aos dados e recebeu a nota na mesma escala dos 440 filtros testados; a posição é onde ele ficaria no ranking. Os estudos estão numerados de [1] a [7] pela nota, e esses números são usados em todas as abas. Passe o mouse (ou toque) para ver os quatro critérios.': 'Each published filter was applied to these data and scored on the same scale as the 440 filters tested; the rank is where it would fall in the ranking. Studies are numbered [1] to [7] by score, and these numbers are used in every tab. Hover (or tap) to see the four criteria.',
    'Nº': 'No.', 'Estudo': 'Study', 'Filtro usado': 'Filter used', 'Posição no ranking (de 440)': 'Rank (of 440)',
    'O que mais pesa na escolha do filtro': 'What matters most when choosing the filter',
    'Quanto a nota média muda entre o pior e o melhor valor de cada fator. A banda (passa-alta e passa-baixa) decide quase tudo; ordem, fase e duração mudam pouco.': 'How much the mean score changes between the worst and best value of each factor. The band (high-pass and low-pass) decides almost everything; order, phase and duration change little.',
    'Nota média em cada valor do fator (o melhor valor está marcado).': 'Mean score at each level of the factor (best level marked).',
    'Ranking dos 440 filtros': 'Ranking of the 440 filters',
    'Barras = nota. Passe o mouse para ver os quatro critérios. Em vermelho, o melhor filtro encontrado (1º lugar); em cinza, sem filtro, que aparece sempre, mesmo fora do topo. Onde cada filtro da literatura cairia está no gráfico logo abaixo.': 'Bars = score. Hover to see the four criteria. In red, the best filter found (#1); in grey, no filter, always shown even outside the top. Where each literature filter would fall is shown in the chart below.',
    'Onde os filtros da literatura cairiam no ranking': 'Where the literature filters would fall in the ranking',
    'Linha cinza = nota dos 440 filtros testados, do 1º ao 440º. Os pontos numerados são os filtros publicados, colocados na posição que teriam no ranking; ★ = melhor filtro encontrado. Os que só cortam altas frequências ([4] a [7]) ficam no fim, colados em "sem filtro".': 'Grey line = score of the 440 filters tested, from #1 to #440. Numbered points are the published filters, placed at the rank they would have; ★ = best filter found. Those that only cut high frequencies ([4] to [7]) end up at the bottom, next to "no filter".',
    'Mapa da nota por banda': 'Score map by band',
    'Mais escuro = nota maior. Troque ordem, fase e duração: o desenho do mapa quase não muda, porque a banda é o que importa. Contorno vermelho = melhor filtro encontrado (aparece com 4ª ordem, fase zero e 30 s).': 'Darker = higher score. Change order, phase and duration: the map barely changes, because the band is what matters. Red outline = best filter found (shown with 4th order, zero phase and 30 s).',
    'Em que frequências o celular acompanha a plataforma': 'At which frequencies the phone follows the platform',
    'Coerência = quanto os dois sinais variam juntos em cada frequência (0 = nada em comum, 1 = idênticos). Olhos abertos, todas as tentativas. A faixa sombreada é a banda do melhor filtro encontrado (0,7–1,5 Hz); a linha pontilhada marca 0,5.': 'Coherence = how much the two signals vary together at each frequency (0 = nothing in common, 1 = identical). Eyes open, all trials. The shaded band is the band of the best filter found (0.7–1.5 Hz); the dotted line marks 0.5.',
    'Coerência ≥ 0,5 de (Hz)': 'Coherence ≥ 0.5 from (Hz)', 'até (Hz)': 'to (Hz)',
    'Mapa de filtros: cada critério em 55 combinações': 'Filter map: each criterion across 55 combinations',
    'Linhas = passa-alta; colunas = passa-baixa (2ª ordem, fase zero, 30 s). Contorno vermelho = banda do melhor filtro encontrado (0,7–1,5 Hz); tracejado = sem filtro; ★ = melhor valor do critério. Escolha "plataforma" para ver como a própria plataforma responde ao mesmo filtro.': 'Rows = high-pass; columns = low-pass (2nd order, zero phase, 30 s). Red outline = band of the best filter found (0.7–1.5 Hz); dashed = no filter; ★ = best value of the criterion. Choose "platform" to see how the platform itself responds to the same filter.',
    'Comparar dois filtros em todos os critérios': 'Compare two filters on every criterion',
    'Filtro A (passa-alta–passa-baixa, Hz)': 'Filter A (high-pass–low-pass, Hz)',
    'Validação cruzada: escolher em metade, testar na outra': 'Cross-validation: choose on one half, test on the other',
    '300 divisões aleatórias dos participantes em duas metades, estratificadas por grupo. Em cada divisão o filtro é escolhido numa metade e avaliado na outra. Os filtros fixos 0,1–2 e 0,2–2 Hz aparecem aqui só como candidatos de uma análise anterior, não como referência.': '300 random splits of the participants into two halves, stratified by group. In each split the filter is chosen on one half and evaluated on the other. The fixed 0.1–2 and 0.2–2 Hz filters appear here only as candidates from an earlier analysis, not as a reference.',
    'Como o filtro foi escolhido': 'How the filter was chosen',
    'Pelos quatro critérios (posto médio)': 'By the four criteria (mean rank)',
    'Só pela concordância com a plataforma': 'By agreement with the platform only',
    'Desempenho na metade de teste (ponto = mediana das 300 divisões; linha = intervalo de 95%).': 'Performance on the test half (dot = median of the 300 splits; line = 95% interval).',
    'Deixar um grupo de fora': 'Leave one group out',
    'O filtro é escolhido com dois grupos e avaliado no terceiro, que não participou da escolha.': 'The filter is chosen with two groups and evaluated on the third, which took no part in the choice.',
    'Grupo de teste': 'Test group', 'Filtro escolhido': 'Chosen filter', 'Escolhido': 'Chosen', 'Melhor possível': 'Best possible',
    'Variáveis posturais: jovens × idosos × risco de quedas': 'Postural variables: young × older adults × fall risk',
    '1ª tentativa (idosos) ou sessão de teste (jovens). Caixa = intervalo interquartil; traço = mediana. Estatística: Kruskal-Wallis e comparações par a par de Mann-Whitney com correção de Holm; r = tamanho do efeito (0,1 pequeno, 0,3 médio, 0,5 grande).': '1st trial (older adults) or test session (young adults). Box = interquartile range; line = median. Statistics: Kruskal-Wallis and pairwise Mann-Whitney comparisons with Holm correction; r = effect size (0.1 small, 0.3 medium, 0.5 large).',
    'O celular encontra as mesmas diferenças entre grupos que a plataforma?': 'Does the phone find the same group differences as the platform?',
    'ε² de cada variável na plataforma e no celular, para o filtro e a condição escolhidos acima. Bolinha cheia = p < 0,05.': 'ε² of each variable on the platform and the phone, for the filter and condition chosen above. Filled dot = p < 0.05.',
    'Todos os filtros lado a lado: quanto os grupos diferem (ε²)': 'All filters side by side: how much the groups differ (ε²)',
    'Cada coluna é o celular com um filtro; a primeira (tracejada) é a plataforma sem filtro, a referência. Mais escuro = grupos mais diferentes; * = p < 0,05 no Kruskal-Wallis. Condição escolhida acima.': 'Each column is the phone with one filter; the first (dashed) is the unfiltered platform, the reference. Darker = groups more different; * = p < 0.05 in the Kruskal-Wallis test. Condition chosen above.',
    'Wilcoxon pareado. Razão = mediana de OF/OA por participante. r = correlação bisserial de postos pareada (positivo = maior de olhos fechados). Em negrito, p < 0,05.': 'Paired Wilcoxon. Ratio = median of EC/EO per participant. r = matched-pairs rank-biserial correlation (positive = higher with eyes closed). Bold, p < 0.05.',
    'O celular vê o mesmo efeito de fechar os olhos que a plataforma?': 'Does the phone see the same eyes-closed effect as the platform?',
    'r de cada variável na plataforma e no celular. Bolinha cheia = p < 0,05.': 'r of each variable on the platform and the phone. Filled dot = p < 0.05.',
    'Todos os filtros lado a lado: efeito de fechar os olhos (r)': 'All filters side by side: eyes-closed effect (r)',
    'Cada coluna é o celular com um filtro; a primeira (tracejada) é a plataforma sem filtro, a referência. Mais escuro = efeito maior; cor alternativa = valor negativo (maior de olhos abertos); * = p < 0,05 no Wilcoxon. Grupo escolhido acima.': 'Each column is the phone with one filter; the first (dashed) is the unfiltered platform, the reference. Darker = larger effect; alternate colour = negative value (higher with eyes open); * = p < 0.05 in the Wilcoxon test. Group chosen above.',
    'Cada participante, de olhos abertos para fechados': 'Each participant, from eyes open to eyes closed',
    'Uma linha por participante (cor = grupo; linhas que sobem mais fortes). Linha grossa = mediana.': 'One line per participant (colour = group; rising lines are stronger). Thick line = median.',
    'Celular × plataforma em cada variável': 'Phone × platform for each variable',
    'ρ de Spearman entre os dois instrumentos (participantes ordenados do mesmo jeito = 1), com cada filtro aplicado aos dois. Mais escuro = mais concordância; * = p < 0,05. Jovens e idosos calculados separadamente, porque usaram celulares diferentes.': 'Spearman ρ between the two instruments (participants ranked the same way = 1), with each filter applied to both. Darker = more agreement; * = p < 0.05. Young and older adults are computed separately because they used different phones.',
    'Idosos (com e sem risco)': 'Older adults (with and without fall risk)',
    'Participante a participante': 'Participant by participant',
    'Cor = grupo. Nas frequências (mesma unidade nos dois instrumentos) a linha tracejada marca valores iguais.': 'Colour = group. For frequencies (same unit on both instruments) the dashed line marks equal values.',
    'Frequência mediana: concordância em Hz (Bland-Altman)': 'Median frequency: agreement in Hz (Bland-Altman)',
    'Só as frequências têm a mesma unidade nos dois instrumentos. Viés = média de celular − plataforma; limites = viés ± 1,96 desvio-padrão. Condição e filtro escolhidos acima.': 'Only frequencies share the same unit on both instruments. Bias = mean of phone − platform; limits = bias ± 1.96 standard deviations. Condition and filter chosen above.',
    'Viés (Hz)': 'Bias (Hz)', 'Limite inferior': 'Lower limit', 'Limite superior': 'Upper limit',
    'Nas abas Grupos, Olhos abertos × fechados e Celular × plataforma, cada participante entra com a 1ª tentativa (idosos) ou a sessão de teste (jovens), para que todos os grupos tenham a mesma quantidade de registro. Um idoso com risco de quedas só tem olhos abertos.': 'In the Groups, Eyes open × closed and Phone × platform tabs, each participant contributes the 1st trial (older adults) or the test session (young adults), so that every group has the same amount of recording. One older adult at fall risk has eyes open only.',
    'Definições dos critérios': 'Criteria definitions',
    ': média de três números — correlação ponto a ponto AP e ML entre celular e plataforma (mediana dos participantes) e correlação de Spearman da área da elipse entre participantes, dentro de cada grupo.': ': mean of three numbers — sample-by-sample AP and ML correlation between phone and platform (median across participants) and the Spearman correlation of ellipse area across participants, within each group.',
    ': ICC(3,1) do log da área do celular. Jovens: teste × reteste em dias diferentes. Idosos: três tentativas no mesmo dia.': ': ICC(3,1) of the log of the phone ellipse area. Young adults: test × retest on different days. Older adults: three trials on the same day.',
    ': d pareado do log da razão olhos fechados / olhos abertos, em cada grupo.': ': paired d of the log of the eyes closed / eyes open ratio, in each group.',
    ': AUC da área com olhos abertos, na direção esperada (o grupo mais velho ou de maior risco oscila mais).': ': AUC of the eyes-open area in the expected direction (the older or higher-risk group sways more).',
    ': nos jovens, aceleração com gravidade a 50 Hz; nos idosos, aceleração linear a 100 Hz. O ganho celular/plataforma na banda filtrada foi parecido nos dois (0,10–0,12 m/s² por cm no AP).': ': young adults, acceleration including gravity at 50 Hz; older adults, linear acceleration at 100 Hz. The phone/platform gain in the filtered band was similar in both (0.10–0.12 m/s² per cm in AP).',
    ': área da elipse de 95%, RMS e amplitude (máximo − mínimo) em cada eixo, velocidade média do traçado (comprimento da trajetória ÷ tempo) e frequência mediana (metade da potência do sinal abaixo dela, até 10 Hz). No celular, as mesmas contas são feitas sobre a aceleração, por isso as unidades são de aceleração; só as frequências têm a mesma unidade nos dois instrumentos.': ': 95% ellipse area, RMS and range (max − min) in each axis, mean sway velocity (path length ÷ time) and median frequency (half of the signal power below it, up to 10 Hz). For the phone, the same computations are done on acceleration, so the units are acceleration units; only frequencies share the same unit on both instruments.',
    'Painel gerado por': 'Dashboard built by', 'a partir das tabelas da pasta': 'from the tables in the folder',
    '. Participantes identificados só por código (J = jovens, I = idosos, R = idosos com risco de quedas).': '. Participants identified by code only (J = young adults, I = older adults, R = older adults at fall risk).',
    // ---- abas, controles, cabeçalhos ----
    'Resumo': 'Summary', 'Escolha do filtro': 'Filter choice', 'Coerência e critérios': 'Coherence and criteria', 'Validação': 'Validation',
    'Olhos abertos × fechados': 'Eyes open × closed', 'Olhos abertos × olhos fechados': 'Eyes open × eyes closed', 'Celular × plataforma': 'Phone × platform', 'Amostra e definições': 'Sample and definitions',
    'Ordem': 'Order', 'Todas': 'All', 'Fase': 'Phase', 'Zero': 'Zero', 'Causal': 'Causal', 'Duração': 'Duration', 'Mostrar': 'Show',
    '15 melhores': 'Top 15', '30 melhores': 'Top 30', '60 melhores': 'Top 60', 'Eixo': 'Axis', 'Anteroposterior (AP)': 'Anteroposterior (AP)', 'Mediolateral (ML)': 'Mediolateral (ML)',
    'Instrumento': 'Instrument', 'Critério': 'Criterion', 'Filtro B': 'Filter B', 'Celular A': 'Phone A', 'Celular B': 'Phone B', 'Plataforma A': 'Platform A', 'Plataforma B': 'Platform B',
    'Condição': 'Condition', 'Variável': 'Variable', 'Variáveis': 'Variables', 'Mediana OA': 'Median EO', 'Mediana OF': 'Median EC', 'Razão OF/OA': 'Ratio EC/EO',
    'Aumentou em': 'Increased in', 'Leitura': 'Interpretation', 'Amostra': 'Sample', 'Participantes': 'Participants', 'Protocolo': 'Protocol', 'Tentativas': 'Trials',
    'e': 'and', 'Comparação': 'Comparison', 'Tamanho do efeito r': 'Effect size r', 'Estudos:': 'Studies:', 'Literatura': 'Literature',
    // ---- critérios ----
    'Concordância com a plataforma (média)': 'Agreement with the platform (mean)', 'Confiabilidade (média)': 'Reliability (mean)',
    'Confiabilidade idosos (3 tentativas)': 'Reliability, older adults (3 trials)', 'Confiabilidade jovens (teste × reteste)': 'Reliability, young adults (test × retest)',
    'Correlação ponto a ponto': 'Sample-by-sample correlation', 'Spearman da área entre participantes': 'Spearman of area across participants',
    'Efeito de fechar os olhos (média dos grupos)': 'Eyes-closed effect (mean of groups)', 'Separação entre grupos (AUC média)': 'Group separation (mean AUC)',
    'Efeito de fechar os olhos (r; positivo = maior de olhos fechados)': 'Eyes-closed effect (r; positive = higher with eyes closed)',
    'Efeito de fechar os olhos': 'Eyes-closed effect', 'Separação entre grupos': 'Group separation', 'Separação de grupos': 'Group separation',
    'Efeito dos olhos': 'Eyes-closed effect', 'Concordância': 'Agreement', 'Confiabilidade': 'Reliability', 'Olhos': 'Eyes',
    'Escolha pelos quatro critérios': 'Chosen by the four criteria', 'Escolha só pela concordância': 'Chosen by agreement only',
    'Quatro critérios': 'Four criteria', 'Só concordância': 'Agreement only', 'Fixo': 'Fixed',
    // ---- grupos, condições, instrumentos ----
    'Idosos com risco de quedas': 'Older adults at fall risk', 'idosos com risco de quedas': 'older adults at fall risk', 'Idosos (todos)': 'Older adults (all)',
    'Risco de quedas': 'Fall risk', 'Jovens': 'Young adults', 'Idosos': 'Older adults', 'Grupos': 'Groups', 'Grupo': 'Group', 'Todos': 'All',
    'Olhos abertos': 'Eyes open', 'Olhos fechados': 'Eyes closed', 'olhos abertos': 'eyes open', 'olhos fechados': 'eyes closed',
    'Plataforma sem filtro (referência)': 'Unfiltered platform (reference)', 'Plataforma': 'Platform', 'plataforma': 'platform', 'Celular': 'Phone', 'celular': 'phone',
    // ---- variáveis ----
    'Área da elipse 95%': '95% ellipse area', 'Velocidade média do traçado': 'Mean sway velocity', 'Frequência mediana': 'Median frequency', 'Amplitude': 'Range',
    // ---- filtros ----
    'Sem filtro': 'No filter', 'sem filtro': 'no filter', 'Melhor encontrado aqui': 'Best found here', 'Melhor encontrado': 'Best found', '★ Melhor encontrado': '★ Best found', '★ Melhor': '★ Best',
    '★ = melhor filtro encontrado': '★ = best filter found', 'Sinal bruto (só tendência removida)': 'Raw signal (trend removed only)',
    'Passa-banda': 'Band-pass', 'Passa-baixa': 'Low-pass', 'passa-baixa': 'low-pass', 'Passa-alta': 'High-pass', 'passa-alta': 'high-pass',
    'fase zero': 'zero phase', 'fase causal': 'causal phase', 'nenhum': 'none', '(o mais usado)': '(most used)', 'Filtro': 'Filter',
    // ---- estudos ----
    'Validação de celular em posições arbitrárias (2025)': 'Phone validation in arbitrary positions (2025)', 'Validação 2025': 'Validation 2025',
    'App de equilíbrio Kinesis': 'Kinesis balance app', 'Acelerômetro triaxial, idosos × jovens': 'Triaxial accelerometer, older × young adults', 'Acelerômetro triaxial': 'Triaxial accelerometer',
    'App de celular para instabilidade postural (Sensors 2025)': 'Phone app for postural instability (Sensors 2025)',
    'Celular na lombar, risco de quedas (Applied Sciences 2026)': 'Phone on the lower back, fall risk (Applied Sciences 2026)',
    'Revisão sistemática de filtros em celulares': 'Systematic review of filters in phones', 'Revisão sistemática': 'Systematic review',
    // ---- amostra ----
    '1 tentativa por condição, 30 s; teste e reteste (14 com as duas sessões)': '1 trial per condition, 30 s; test and retest (14 with both sessions)',
    '3 tentativas por condição, 45 s (analisados 30 s)': '3 trials per condition, 45 s (30 s analysed)',
    'Celular, 100 Hz (aceleração linear)': 'Phone, 100 Hz (linear acceleration)', 'Celular, 50 Hz (aceleração com gravidade)': 'Phone, 50 Hz (acceleration including gravity)',
    // ---- gráficos, dicas, leituras ----
    'Frequência (Hz, escala log)': 'Frequency (Hz, log scale)', 'Nota (0–100)': 'Score (0–100)',
    'Posição no ranking dos 440 filtros (1º = melhor)': 'Rank among the 440 filters (#1 = best)',
    'ε² do Kruskal-Wallis (quanto os grupos diferem)': 'Kruskal-Wallis ε² (how much the groups differ)',
    'muda a nota em': 'changes the score by', 'pontos': 'points', 'nota média': 'mean score', 'Nota': 'Score', 'posição': 'rank',
    'Escolhido em': 'Chosen in', 'das divisões': 'of splits', 'de 440': 'of 440',
    'sem diferença': 'no difference', 'maior de olhos fechados': 'higher with eyes closed', 'maior de olhos abertos': 'higher with eyes open', 'maior': 'higher',
    '(efeito grande)': '(large effect)', '(efeito médio)': '(medium effect)', '(efeito pequeno)': '(small effect)',
    'Não foi possível carregar estes dados.': 'Could not load these data.', 'Critério indisponível para este instrumento.': 'Criterion not available for this instrument.',
  };
  const RULES = [
    [/(\d)ª ordem/g, (m, d) => ({1: '1st', 2: '2nd', 3: '3rd'}[d] || d + 'th') + ' order'],
    [/(\d)ª/g, (m, d) => ({1: '1st', 2: '2nd', 3: '3rd'}[d] || d + 'th')],
    [/(\d+)º/g, '#$1'],
    [/(^|[^A-Za-z])OA(?![A-Za-z])/g, '$1EO'], [/(^|[^A-Za-z])OF(?![A-Za-z])/g, '$1EC'],
    [/(\d),(\d)/g, '$1.$2'],
  ];
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keys = Object.keys(F).sort((a, b) => b.length - a.length);
  const RE = new RegExp('(^|[^\\p{L}])(' + keys.map(esc).join('|') + ')(?![\\p{L}])', 'gu');
  const norm = (s) => s.replace(/\s+/g, ' ');
  function tr(s) {
    let o = norm(s).replace(RE, (m, pre, k) => pre + F[k]);
    RULES.forEach(([re, rep]) => { o = o.replace(re, rep); });
    return o;
  }
  const skip = (n) => { const p = n.parentElement; return !p || p.closest('script, style, code, [data-no-tr]'); };
  function walk(root) {
    if (root.nodeType === 3) { if (!skip(root)) { const t = tr(root.nodeValue); if (t !== norm(root.nodeValue)) root.nodeValue = t; } return; }
    if (root.nodeType !== 1 || root.matches('script, style')) return;
    const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes = [];
    while (it.nextNode()) nodes.push(it.currentNode);
    nodes.forEach((n) => { if (skip(n) || !/[A-Za-zÀ-ú\d]/.test(n.nodeValue)) return; const t = tr(n.nodeValue); if (t !== norm(n.nodeValue)) n.nodeValue = t; });
  }
  document.title = tr(document.title);
  walk(document.body);
  new MutationObserver((muts) => muts.forEach((m) => {
    if (m.type === 'characterData') walk(m.target); else m.addedNodes.forEach(walk);
  })).observe(document.body, {childList: true, subtree: true, characterData: true});
})();
