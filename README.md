# Amethyst Finance

Interface de planejamento financeiro pessoal, estilo dashboard/SaaS, integrada a um backend real (FastAPI).

- Tema: Dark Mode em tons de roxo escuro (Deep Purple/Dark Violet), com destaques em verde (entradas) e vermelho/rosa (saídas).
- Estilo do layout: limpo, fluido e responsivo.

Estrutura principal:

1. **Header/Sidebar** — navegação entre Dashboard, Lançamentos, Tabela Dinâmica, Metas & Orçamentos, Configurações, e um filtro de período global (Mês/Ano).
2. **Dashboard** — cards de KPI (Saldo Total, Entradas, Saídas, Taxa de Poupança), gráfico de Entradas vs Saídas ao longo dos meses e gráfico de Saídas por Categoria.
3. **Lançamentos** — tabela estilo planilha (Data, Descrição, Categoria, Valor, Tipo, Forma de Pagamento) com busca, filtros e modal de inserção/edição.
4. **Tabela Dinâmica** — Categorias x Meses para análise acumulada de gastos.

Componentes em React (TanStack Start) com Tailwind CSS e Lucide Icons; estado de servidor via React Query, consumindo a API real.

## Development

Este projeto usa [Bun](https://bun.sh).

```sh
git clone <this-repository-url>
cd <repository-name>
bun install
bun run dev
```
