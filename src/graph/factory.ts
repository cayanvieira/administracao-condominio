import { buildScheduleGraph } from './graph.ts';

export function buildGraph() {
  return buildScheduleGraph();
}

export const graph = async () => {
  return buildGraph();
};

export default graph;
