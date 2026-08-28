import { HumanMessage } from "langchain";
import { buildGraph } from "../../graph/factory.ts";

const graph = buildGraph();

export class BookGraphService {
  async handleQuestion(question: string, userId?: number) {
    const response = await graph.invoke({
      messages: [new HumanMessage(question)],
      author: userId 
    });
    return response;
  }
}
