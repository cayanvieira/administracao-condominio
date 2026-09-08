# Administração de Condomínio com IA por Linguagem Natural

<p align="center">
  <a href="#">
    <img src="https://img.shields.io/badge/Portugu%C3%AAs-Selecionado-28a745?style=for-the-badge" alt="Português" />
  </a>
  <a href="README.en.md">
    <img src="https://img.shields.io/badge/English-Change%20to%20EN-007ACC?style=for-the-badge" alt="English" />
  </a>
</p>

Este projeto está em desenvolvimento e representa uma solução de automação para administração de condomínio usando processamento de linguagem natural, orquestração de agentes e integração com banco de dados.

A ideia central é permitir que o morador ou síndico realize ações por texto em linguagem natural, como reservar um espaço, cancelar uma reserva, receber notificações e registrar uma reclamação, sem a necessidade de interagir diretamente com formulários ou painéis complexos.

## Status atual do projeto

O projeto está na etapa de identificação da intenção do usuário. Isso significa que, quando uma mensagem chega ao sistema, a IA classifica o texto e determina qual ação o usuário deseja realizar.

Atualmente, a arquitetura já contempla a etapa inicial do fluxo:

- recebimento da mensagem do usuário;
- identificação do contexto e da intenção;
- extração de dados relevantes, como serviço, data, hora, usuário e motivo;
- preparação do estado do grafo para encaminhar a próxima etapa.

A intenção identificada pode ser uma das seguintes:

- schedule
- cancel
- consult
- notify
- complaint
- unknown

Essa etapa é implementada no grafo principal da aplicação e está estruturada em nós de processamento, com apoio de prompts e classificação usando modelos via OpenRouter.

## Arquitetura do fluxo atual

O sistema utiliza uma abordagem baseada em grafos de estados, com o pacote LangGraph para controlar o fluxo da conversa e determinar qual etapa será executada em seguida.

### Estrutura principal

- `src/graph/graph.ts` — definição do grafo principal
- `src/graph/nodes/identifyIntentNode.ts` — nó responsável por identificar a intenção
- `src/prompts/v1/identifyIntent.ts` — prompts e schema de classificação
- `src/services` — serviços de domínio, como usuários, condomínios, agendamento e integração externa
- `src/database` — configuração e migrações do banco

### Como funciona hoje

1. O usuário envia uma mensagem em linguagem natural.
2. O sistema captura esse texto e o contexto do autor.
3. A IA analisa a mensagem e identifica a intenção.
4. A intenção e os dados extraídos são armazenados no estado do grafo.
5. A próxima fase do fluxo será escolhida com base nessa classificação.

## Fase atual: identificação da intenção

A fase em que o projeto se encontra hoje está focada em entender o que o usuário quer fazer. O sistema já é capaz de distinguir, por exemplo:

- “Quero reservar a área de festas para sábado às 18h” → intenção de agendamento
- “Cancelar a reserva do salão para amanhã” → intenção de cancelamento
- “Preciso avisar sobre um problema na piscina” → intenção de notificação
- “Quero registrar uma reclamação sobre a portaria” → intenção de denúncia
- “Gostaria de consultar minhas reservas” → intenção de consulta

Essa etapa é essencial, porque a partir dela o restante do sistema pode decidir qual ação executar com segurança.

## Etapas que virão a seguir

As próximas etapas são responsáveis por transformar a intenção identificada em ações concretas dentro do condomínio, sempre usando linguagem natural como interface.

### 1. Reserva de serviços ou áreas

A próxima etapa será permitir que o sistema finalize o agendamento de um serviço ou espaço.

Exemplos de uso:

- “Reserve a sala de reuniões para amanhã às 15h”
- “Agende a limpeza do apartamento para sexta”
- “Quero reservar a churrasqueira no fim de semana”

Nesta fase, a aplicação deverá:

- validar o serviço ou espaço solicitado;
- verificar disponibilidade;
- confirmar o horário e a data;
- registrar a reserva no banco de dados;
- responder ao usuário com confirmação clara.

### 2. Cancelamento de reserva

Depois da criação da reserva, o sistema precisará permitir o cancelamento por texto natural.

Exemplos:

- “Cancela minha reserva da área de festas”
- “Remova o agendamento do salão para hoje”
- “Quero cancelar o serviço de limpeza”

A lógica deve verificar:

- se a reserva existe;
- se o usuário tem autorização para cancelar;
- se o cancelamento pode ser processado no prazo correto;
- se o sistema deve enviar notificação sobre a confirmação.

### 3. Notificação de eventos ou avisos

Uma funcionalidade importante para gestão condominial é a comunicação de avisos, alertas e notificações.

Exemplos:

- “Avise a todos que haverá manutenção no elevador”
- “Notifique os moradores sobre a reunião do condomínio”
- “Envie uma mensagem sobre a interdição do estacionamento”

Nesta etapa, o sistema pode:

- identificar o tipo de notificação;
- definir o público-alvo;
- criar a mensagem em linguagem natural;
- registrar o aviso no sistema e, se necessário, disparar a comunicação.

### 4. Registro de reclamação

Uma das funções mais relevantes do sistema é permitir que moradores relatem problemas de forma simples, sem precisar preencher formulários longos.

Exemplos:

- “Quero registrar uma reclamação sobre o barulho do vizinho”
- “Há um problema no elevador, preciso reclamar”
- “Reporto uma falha na portaria”

A etapa final desse fluxo deve:

- classificar a categoria da reclamação;
- extrair descrição do problema;
- associar o usuário ou unidade responsável;
- salvar o registro na base de dados;
- retornar uma resposta confirmando o recebimento da denúncia.

## Visão geral da solução

O projeto combina três pilares fundamentais:

1. Linguagem natural para interação com o usuário
2. Fluxo de intenção e decisão por grafos de processamento
3. Persistência e gestão de dados por banco relacional

Esse modelo permite evoluir o sistema para um assistente inteligente de condomínio, com comunicação mais natural e processos automatizados.

## Tecnologias utilizadas

- Node.js
- TypeScript
- Fastify
- LangGraph
- LangChain
- OpenRouter
- PostgreSQL
- Knex
- Zod
- JWT, bcryptjs e Nodemailer

## Como executar o projeto

### Pré-requisitos

- Node.js instalado
- PostgreSQL configurado
- arquivo `.env` com as variáveis necessárias

### Instalação

```bash
npm install
```

### Migração do banco

```bash
npm run db:migrate
```

### Autenticação

A API possui as seguintes rotas com prefixo `/user`:

- `POST /user/register` — recebe `name`, `email`, `senha`, `document` e `role` (`sindico`, `morador` ou `funcionario`), cria a conta inativa e envia um código de verificação de 5 dígitos por email;
- `GET /user/verify?email=...&code=...` — rota usada pelo link enviado no email para ativar a conta;
- `POST /user/resend-verification` — reenvia o código para uma conta ainda inativa;
- `POST /user/login` — retorna um JWT somente depois da ativação da conta.

Configure `JWT_SECRET`, `APP_URL`, `MAIL_FROM` e as variáveis `SMTP_*` no `.env`. O código de verificação expira em 15 minutos.
O envio é centralizado em `EmailService` para que outros serviços possam reutilizar a mesma configuração SMTP.
Na estrutura de dados, `users` contém o email e `accounts` contém `id` (`accountId`), `user_id` (`userId`), senha, status e dados de verificação.

### Popular o banco com dados iniciais

```bash
npm run db:seed
```

### Executar em modo de desenvolvimento

```bash
npm run dev
```

## Objetivo do projeto

O objetivo principal é criar um assistente conversacional para administração condominial, capaz de interpretar mensagens em linguagem natural e transformar pedidos em ações reais, como:

- agendar serviços;
- cancelar reservas;
- enviar notificações;
- registrar reclamações;
- responder consultas e orientações.

## Conclusão

Até o momento, o projeto já avançou com sucesso na fase de identificação da intenção do usuário. Essa etapa é o ponto de partida para construir um fluxo completo de automação condominial, onde a linguagem natural será usada para realizar operações práticas e úteis no dia a dia do condomínio.

As próximas etapas consistem em concluir a orquestração para reservar, cancelar, notificar e registrar reclamações, transformando a intenção identificada em ações concretas e organizadas dentro do sistema.
