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
        const { question } = request.body as { question: string };
        const response = await Service.AppointmentGraph.handleQuestion(question);
        return reply.send(response);
      } catch (error) {
        console.error("Error handling /chat request:", error);
        return reply.code(500);
      }
    },
  );
};

export default Routers;
