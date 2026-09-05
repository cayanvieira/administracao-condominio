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
          required: ["question"],
          properties: {
            question: { type: "string", minLength: 5 },
          },
        },
      },
    },
    async function (request, reply) {
      try {
        const { question, userId, data } = request.body as { question: string, userId: number , data :any};
        const response = await Service.BookGraph.handleQuestion(question, userId ,data);
        return reply.send(response);
      } catch (error) {
        console.error("Error handling /chat request:", error);
        return reply.code(500);
      }
    },
  );
};

export default Routers;
