# Frequência Global do Responsável — Design

> Data: 2026-06-23
> Status: aprovado (aguardando revisão do spec)
> Escopo: app/mobile (tela responsável) + app/api-siediario (endpoints)

## Contexto

A tela de Frequência do app do responsável foi copiada da tela de Calendário:
mesmo grid mensal de dias coloridos, seletor de mês, modal de dia (morto, com
sobras de "atividades"). O componente até se chama `CalendarioEscolarScreen`.
O objetivo original era mostrar a frequência **global** do aluno — não um
calendário mês a mês.

Backend atual: `GET /frequencia?pesCodAluno&ano&mes` devolve presença
**por dia de um mês** (consolida `aula` + `presenca` da turma). Só essa tela
consome esse endpoint.

## Objetivo

Substituir o grid-calendário por um **dashboard de frequência global** (visão
do ano inteiro) + uma **visão diária** (presença por dia, com cada aula e
disciplina) acessível a partir do dashboard, sem reintroduzir o calendário.

## Escopo

**Incluído**
- Novo endpoint agregado de resumo anual.
- Novo endpoint de detalhe diário por mês.
- Reescrita da tela mobile `FrequenciaScreen` como dashboard.
- Nova sub-tela mobile `FrequenciaDiariaScreen` (visão diária).

**Excluído (YAGNI)**
- Edição/justificativa de faltas pelo responsável (read-only).
- Exportar/PDF.
- Notificação de falta (já existe fluxo de notificação de presença separado).
- Comparação entre alunos/turma.

## Decisões

1. **Cálculo da %**: `frequencia = presencas / total * 100`, onde
   `total = presencas + faltas + justificadas` (aulas **com registro**).
   Status `pendente` (sem registro) **não** entra no total.
2. **Faltas justificadas contam como falta** na % (regra legal BR de presença
   física), mas aparecem **separadas** nos totais.
3. **Mínimo exigido**: `param_regras_avaliacao.frequencia_minima` do segmento do
   aluno quando resolvível; **fallback 75%**.
4. **Faixas de status** (relativas ao mínimo `m`):
   - `freq ≥ m` → **Em dia** (verde)
   - `m − 5 ≤ freq < m` → **Atenção** (amarelo)
   - `freq < m − 5` → **Em risco de reprovação por falta** (vermelho)
5. **Visão diária não é calendário**: lista cronológica reversa de cards-dia
   (não um grid mensal). Cada card mostra as aulas do dia (disciplina + tempo +
   status). Absorve a ideia de "faltas recentes" — não há seção separada.
6. **Endpoint único de resumo** (não somar no cliente nem 12 requests).

## Modelo de dados (API)

### `GET /frequencia/resumo?pesCodAluno&ano`
Auth: JWT responsável; valida `pesCodAluno ∈ req.user.alunos` (403 senão).

```ts
interface ResumoFrequencia {
  geral: {
    total: number;          // aulas com registro
    presencas: number;
    faltas: number;
    justificadas: number;
    percentual: number;     // 0..100, 1 casa decimal
    minimo: number;         // ex 75
    status: "em_dia" | "atencao" | "risco";
  };
  porDisciplina: Array<{
    disciplina: string;
    total: number;
    presencas: number;
    faltas: number;
    justificadas: number;
    percentual: number;
    abaixoMinimo: boolean;
  }>;
  porPeriodo: Array<{
    ordem: number;          // 1,2,3
    nome: string;           // "1º Trimestre"
    total: number;
    presencas: number;
    faltas: number;
    justificadas: number;
    percentual: number;
  }>;
}
```

### `GET /frequencia/dias?pesCodAluno&ano&mes`
Auth idem. Devolve só dias com aulas registradas, **ordem reversa**.

```ts
interface DiaPresenca {
  data: string;             // ISO YYYY-MM-DD
  dia_semana: number;       // 1=Dom .. 7=Sáb
  resumo: { total: number; presencas: number; faltas: number; justificadas: number };
  aulas: Array<{
    tempo: number;          // tempoOrdem
    disciplina: string;
    status: "presente" | "falta" | "justificada";
    cor: string;            // hex casado com a legenda
  }>;
}
// resposta: DiaPresenca[]  (mais recente primeiro)
```

## Fontes (portal, read-only)

- `aula` (turma_cod, disciplina_cod, data, tempo_ordem) — aulas da turma.
- `presenca` (aula_id, matricula_cod, status) — status do aluno por aula.
- `disciplinas` (cod_legado → nome).
- `param_periodos` (ano → ordem, nome, data_inicio, data_fim) — trimestres.
- `param_regras_avaliacao` (ano, segmento_cod → frequencia_minima).
- `matriculas` via `resolverMatricula(alunoCod, ano)` → { matriculaCod, turmaCod }.

## Fluxo / pseudocódigo

### resumo(alunoCod, ano)
```
m = resolverMatricula(alunoCod, ano); if !m.turmaCod → vazio
rows = SELECT aula.data, aula.disciplina_cod, presenca.status
       FROM aula
       LEFT JOIN presenca ON presenca.aula_id = aula.id
                          AND presenca.matricula_cod = m.matriculaCod
       WHERE aula.turma_cod = m.turmaCod
         AND aula.data BETWEEN '{ano}-01-01' AND '{ano}-12-31'
periodos = param_periodos do ano (ordenados)
minimo = frequenciaMinima(segmento(aluno)) ?? 75

para cada row com status ∈ {presente, falta, falta_justificada}:
  acumula em geral, por disciplina (disciplina_cod→nome), por periodo (data ∈ [ini,fim])
percentual = presencas/total*100 (total>0; senão 0)
status = faixa(percentual, minimo)
```

### dias(alunoCod, ano, mes)
```
m = resolverMatricula(...)
intervalo = [ano-mes-01, ano-mes-ultimoDia]
rows = aula (turma, intervalo) LEFT JOIN presenca (matricula), com disciplina nome
agrupa por data; por dia monta aulas[] (tempo, disciplina, status, cor)
inclui só dias com ≥1 aula com status registrado
ordena datas desc
```

## UI

### Tela `FrequenciaScreen` (dashboard, rolável)
1. `AlunoCard` (mantém).
2. **Card herói**: arco/anel da % geral, label de status colorido,
   "mínimo exigido: m%".
3. **Totais**: chips Presenças · Faltas · Justificadas + total de aulas.
4. **Por disciplina**: lista; matéria + % + barra + nº faltas + ⚠ se abaixo.
5. **Por trimestre**: barra horizontal por trimestre com %.
6. **Botão "Presença dia a dia →"** → navega para `FrequenciaDiariaScreen`.

Remove: grid mensal, modal de dia, seletor de mês, legenda de calendário.

### Sub-tela `FrequenciaDiariaScreen` (visão diária)
- Seletor de **mês** (chips/dropdown horizontal — **não** grid).
- Lista cronológica reversa de **cards-dia**:
  ```
  ┌────────────────────────────────┐
  │ SEX · 12/06         3/4 presenças│
  │ ● 1º Matemática        presente  │
  │ ● 2º Português         presente  │
  │ ✕ 3º Ed. Física        falta     │
  │ ● 4º História          presente  │
  └────────────────────────────────┘
  ```
- Cores: presente verde, falta vermelho, justificada amarelo.
- Estado vazio quando o mês não tem aulas registradas.

Cores (casam dashboard + diária): presente `#22c55e`, falta `#ef4444`,
justificada `#eab308`.

## Edge cases

- **Sem matrícula/turma** → payloads vazios; tela mostra estado vazio amigável.
- **`total = 0`** (nenhum registro no ano/mês) → percentual 0, status neutro,
  mensagem "Sem registros de frequência ainda".
- **Sem `param_regras_avaliacao`** → mínimo 75%.
- **Sem `param_periodos`** → `porPeriodo` vazio; dashboard oculta a seção.
- **Divisão por zero** evitada (guard `total>0`).
- **Status `pendente`/aula futura** não contam.

## Segurança / LGPD

- Endpoints exigem JWT do responsável + checagem `pesCodAluno ∈ alunos`.
- Read-only; nenhum dado sensível novo exposto além de presença do próprio
  dependente.

## Testes

- Unit (service): consolidação geral; justificada conta como falta; % com
  total 0; agrupamento por disciplina; bucket por período; faixa de status nas
  3 fronteiras (m, m−5).
- Unit (dias): agrupamento por dia, ordem reversa, exclusão de pendente.
- Integração (rotas): 200 com dado; 403 aluno não vinculado; 422 query inválida.

## Riscos / dependências

- `presenca`/`aula` podem estar **vazias** para o aluno demo (ADRYAN). O plano
  deve incluir **seed** de aulas + presenças (junho/2026, turma 54307) para a
  demo renderizar.
- Resolução de **segmento do aluno** para o mínimo: best-effort; fallback 75%
  cobre o caso não resolvível.
