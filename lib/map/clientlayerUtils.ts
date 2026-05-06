import { cyrb53, CYRB53_MAX_HASH } from "../utils/cyrb53.js";

export function nodeIdToStartAngle(nodeId: string) {
  return (cyrb53(nodeId) / CYRB53_MAX_HASH) * 2 * Math.PI;
}
