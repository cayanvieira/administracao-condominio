import { type FastifyInstance } from "fastify";
import main from "./main.ts";
import user from "./user.ts";
import condominium from "./condominium.ts";
import schedule from "./schedule.ts";
import corsPlugin from "../plugins/cors.ts";
import jwtPlugin from "../plugins/jwt.ts";
import { ACL, acl } from "../middleware/acl.ts";

const Routers = (server: FastifyInstance) => {
  server.register(corsPlugin)
  server.register(jwtPlugin)

  server.get("/", { preHandler: [acl(ACL.root)] }, async () => {
    return { message: "Servidor Fastify funcionando!!" };
  });
  server.register(user, { prefix: "/user" })
  server.register(main, { prefix: "/main" })
  server.register(condominium, { prefix: "/condominium" })
  server.register(schedule, { prefix: "/condominium" })

};

export default Routers;
