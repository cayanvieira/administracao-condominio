import { type FastifyInstance } from "fastify";
import Services from "../services/index.ts";
import { ACL, acl } from "../middleware/acl.ts";
import { authenticate } from "../middleware/auth.ts";

const Service = new Services();

const Routers = (server: FastifyInstance) => {
  server.post(
    "/chat",
    {
      onRequest: [authenticate],
      preHandler: [acl(ACL.main.chat)],
      schema: {
        body: {
          type: "object",
          required: ["question", "userId", "condominiumIds"],
          properties: {
            question: { type: "string", minLength: 5 },
            userId: { type: "number", minimum: 1 },
            condominiumIds: { type: "array", items: { type: "number", minimum: 1 }, minItems: 1 },
          },
        },
      },
    },
    async function (request, reply) {
      try {
        const { question, userId, condominiumIds, data } = request.body as {
          question: string
          userId: number
          condominiumIds?: number[]
          data: any
        };
        const response = await Service.ScheduleGraph.handleQuestion(question, userId, condominiumIds, data);
        return reply.send(response);
      } catch (error) {
        console.error("Error handling /chat request:", error);
        return reply.code(500);
      }
    },
  );
};

export default Routers;
