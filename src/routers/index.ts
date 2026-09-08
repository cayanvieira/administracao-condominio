import { type FastifyInstance } from "fastify";
import main from "./main.ts";
import user from "./user.ts";
import condominium from "./condominium.ts";

const Routers = (server: FastifyInstance) => {
  server.get("/", async () => {
    return { message: "Servidor Fastify funcionando!!" };
  });
  server.register(main, { prefix: "/main" })
  server.register(user, { prefix: "/user" })
  server.register(condominium, { prefix: "/condominium" })

};

export default Routers;
