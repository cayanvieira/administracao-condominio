import { type FastifyInstance } from "fastify";
import main from "./main.ts";
import user from "./user.ts";

const Routers = (server: FastifyInstance) => {
  server.get("/", async () => {
    return { message: "Servidor Fastify funcionando!!" };
  });
  server.register(main, { prefix: "/main" })
  server.register(user, { prefix: "/user" })

};

export default Routers;
