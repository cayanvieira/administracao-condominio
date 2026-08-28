import { type FastifyInstance } from "fastify";
import main from "./main.ts";

const Routers = (server: FastifyInstance) => {
  server.get("/", async () => {
    return { message: "Servidor Fastify funcionando!!" };
  });
  server.register(main, { prefix: "/main" })

};

export default Routers;
