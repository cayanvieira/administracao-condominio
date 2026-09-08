import { HumanMessage } from "langchain";
import { buildGraph } from "../../graph/factory.ts";

const graph = buildGraph();

export class BookGraphService {
  async handleQuestion(question: string, userId?: number, condominiumId?: number, data?: any) {
    const response = await graph.invoke({
      messages: [new HumanMessage(question)],
      userId: userId,
      condominiumId,
      data
    });
    return response;
  }
}
