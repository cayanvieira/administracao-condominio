# Condominium Management with AI through Natural Language

<p align="center">
  <a href="README.md">
    <img src="https://img.shields.io/badge/Portugu%C3%AAs-Change%20to%20PT-BR-28a745?style=for-the-badge" alt="Português" />
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/English-Selected-007ACC?style=for-the-badge" alt="English" />
  </a>
</p>

This project is under development and represents an automation solution for condominium management using natural language processing, agent orchestration, and database integration.

The main idea is to allow residents or the condominium administrator to perform actions through natural language text, such as reserving a space, canceling a reservation, receiving notifications, and registering a complaint, without needing to interact directly with forms or complex dashboards.

## Current project status

The project is currently in the user intent identification stage. This means that when a message arrives in the system, the AI classifies the text and determines which action the user wants to perform.

At the moment, the architecture already includes the initial flow:

- receiving the user's message;
- identifying context and intent;
- extracting relevant data such as service, date, time, user, and reason;
- preparing the graph state to route the next stage.

The identified intent may be one of the following:

- schedule
- cancel
- consult
- notify
- complaint
- unknown

This stage is implemented in the main graph of the application and is structured through processing nodes with support from prompts and model classification through OpenRouter.

## Current workflow architecture

The system uses a state-graph approach with LangGraph to control the conversation flow and determine which stage should be executed next.

### Main structure

- `src/graph/graph.ts` — main graph definition
- `src/graph/nodes/identifyIntentNode.ts` — node responsible for identifying intent
- `src/prompts/v1/identifyIntent.ts` — classification prompts and schema
- `src/services` — domain services such as users, condominium, scheduling, and external integration
- `src/database` — database configuration and migrations

### How it works today

1. The user sends a message in natural language.
2. The system captures this text and the author context.
3. The AI analyzes the message and identifies the intent.
4. The intent and extracted data are stored in the graph state.
5. The next phase of the flow will be selected based on this classification.

## Current phase: intent identification

The phase the project is in today focuses on understanding what the user wants to do. The system is already able to distinguish examples such as:

- “I want to reserve the party area for Saturday at 6pm” → scheduling intent
- “Cancel the salon reservation for tomorrow” → cancellation intent
- “I need to warn about a problem in the pool” → notification intent
- “I want to file a complaint about the lobby” → complaint intent
- “I would like to check my reservations” → consultation intent

This stage is essential because from it the rest of the system can decide which action to execute safely.

## Upcoming stages

The next phases are responsible for transforming the identified intention into concrete actions inside the condominium, always using natural language as the interface.

### 1. Reservation of services or areas

The next step will allow the system to finalize the scheduling of a service or space.

Examples:

- “Reserve the meeting room for tomorrow at 3pm”
- “Schedule apartment cleaning for Friday”
- “I want to book the barbecue area for the weekend”

At this stage, the application should:

- validate the requested service or area;
- check availability;
- confirm the time and date;
- register the reservation in the database;
- respond to the user with clear confirmation.

### 2. Reservation cancellation

After the reservation is created, the system will need to allow cancellations through natural language.

Examples:

- “Cancel my party area reservation”
- “Remove the salon booking for today”
- “I want to cancel the cleaning service”

The logic should verify:

- whether the reservation exists;
- whether the user is authorized to cancel it;
- whether the cancellation can be processed within the correct deadline;
- whether the system should send a confirmation notification.

### 3. Event or notice notifications

An important feature for condominium management is the communication of notices, alerts, and notifications.

Examples:

- “Tell everyone there will be maintenance on the elevator”
- “Notify residents about the condominium meeting”
- “Send a message about the parking lot closure”

At this stage, the system can:

- identify the type of notification;
- define the target audience;
- create the message in natural language;
- record the notice in the system and, if necessary, trigger communication.

### 4. Complaint registration

One of the most relevant features of the system is allowing residents to report problems in a simple way, without filling out long forms.

Examples:

- “I want to file a complaint about the neighbor’s noise”
- “There is a problem with the elevator, I need to complain”
- “I report a failure in the lobby”

The final stage of this flow should:

- classify the complaint category;
- extract a description of the problem;
- associate the user or responsible unit;
- save the record in the database;
- return a response confirming receipt of the complaint.

## Overall solution vision

The project combines three key pillars:

1. Natural language for user interaction
2. Intention and decision flow through processing graphs
3. Persistence and data management with a relational database

This model allows the system to evolve into an intelligent condominium assistant with more natural communication and automated processes.

## Technologies used

- Node.js
- TypeScript
- Fastify
- LangGraph
- LangChain
- OpenRouter
- PostgreSQL
- Knex
- Zod

## How to run the project

### Prerequisites

- Node.js installed
- PostgreSQL configured
- `.env` file with the required variables

### Installation

```bash
npm install
```

### Database migration

```bash
npm run db:migrate
```

### Populate the database with initial data

```bash
npm run db:seed
```

### Run in development mode

```bash
npm run dev
```

## Project goal

The main goal is to create a conversational assistant for condominium administration, capable of interpreting messages in natural language and transforming requests into real actions such as:

- scheduling services;
- canceling reservations;
- sending notifications;
- registering complaints;
- answering consultations and guidance.

## Conclusion

So far, the project has already advanced successfully through the user intent identification stage. This is the starting point for building a complete condominium automation flow, where natural language will be used to perform practical and useful operations in everyday management.

The next steps are to complete the orchestration for reserving, canceling, notifying, and registering complaints, transforming the identified intent into concrete and organized actions within the system.
