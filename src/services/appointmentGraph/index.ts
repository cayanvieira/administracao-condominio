import { HumanMessage } from "langchain";
import { buildGraph } from "../../graph/factory.ts";

const graph = buildGraph();

export class AppointmentGraphService {
  async handleQuestion(question: string) {
    const response = await graph.invoke({
      messages: [new HumanMessage(question)],
    });
    return response;
  }
}
