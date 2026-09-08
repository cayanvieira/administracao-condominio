import { type FastifyInstance } from "fastify";
import Services from "../services/index.ts";

const Service = new Services();

const Routers = (server: FastifyInstance) => {
  server.post(
    "/chat",
    {
      schema: {
        body: {
          type: "object",
          required: ["question", "userId", "condominiumId"],
          properties: {
            question: { type: "string", minLength: 5 },
            userId: { type: "number", minimum: 1 },
            condominiumId: { type: "number", minimum: 1 },
          },
        },
      },
    },
    async function (request, reply) {
      try {
        const { question, userId, condominiumId, data } = request.body as {
          question: string
          userId: number
          condominiumId?: number
          data: any
        };
        const response = await Service.ScheduleGraph.handleQuestion(question, userId, condominiumId, data);
        return reply.send(response);
      } catch (error) {
        console.error("Error handling /chat request:", error);
        return reply.code(500);
      }
    },
  );
};

export default Routers;
