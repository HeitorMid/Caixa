# Inova Fit — Caixa (MVP)

Primeira versão funcional do sistema de caixa da academia Inova Fit.

## Como executar
1. Extraia o arquivo ZIP.
2. Abra `index.html` no navegador.
3. Os dados ficam salvos no `localStorage` do navegador.

## Incluído nesta versão
- Abertura de caixa por funcionário, turno e data
- Turnos fixos
- Mensalidades, incluindo plano trimestral de 3 meses por R$ 240,00
- Esquenta/diária
- Produtos do freezer
- Acréscimo automático de R$ 1 por unidade no freezer para débito/crédito
- Resumo do expediente por categoria: Mensalidades, Esquentas e Freezer, com Total Geral
- Histórico de caixas
- Reabertura de caixa por qualquer funcionário
- Resumo geral do dia
- Cadastro simples de nomes de funcionários
- Layout responsivo para computador e celular

## Próxima etapa recomendada
Trocar o `localStorage` por Firebase ou Supabase para sincronizar os dados entre os celulares/computadores da academia.

## Alteração da versão 3
- O Resumo Diário agora mostra um resumo por item/plano e uma listagem completa de todas as vendas do dia.
- Cada lançamento detalha horário, funcionário, turno, categoria, item, quantidade, forma de pagamento, valor unitário e total.

## Alteração da versão 4
- Agora é possível excluir uma venda lançada por engano.
- A exclusão está disponível nos últimos lançamentos, no Resumo Diário detalhado e nos detalhes de caixas finalizados.
- Antes de excluir, o sistema pede confirmação.
- Após a exclusão, subtotais e totais são recalculados automaticamente.


## Versão 5 — Firebase
- Estrutura preparada para Cloud Firestore.
- Sincronização em tempo real entre aparelhos.
- Autenticação anônima em segundo plano, sem tela de login.
- Cache local continua ativo como fallback.
- Migração inicial do localStorage para a nuvem quando o Firestore estiver vazio.
- Indicador visual do status da nuvem no topo.
- Incluídos `firebase-config.js`, `firebase-sync.js`, `firestore.rules`, `firebase.json` e `FIREBASE_SETUP.md`.

### Importante
A integração só entra em funcionamento depois que os dados reais do projeto Firebase forem colocados em `firebase-config.js` e os serviços Authentication/Firestore forem ativados.
