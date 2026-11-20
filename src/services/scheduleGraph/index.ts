import { HumanMessage } from "langchain";
import { buildGraph } from "../../graph/factory.ts";

const graph = buildGraph();

export class ScheduleGraphService {
  async handleQuestion(
    question: string,
    userId?: number,
    condominiumIds?: number[],
    data?: any,
    timezoneOffsetMinutes = 0,
  ) {
    const response = await graph.invoke({
      messages: [new HumanMessage(question)],
      userId,
      condominiumIds,
      data,
      timezoneOffsetMinutes,
    });
    return response;
  }
}
