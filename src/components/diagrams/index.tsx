import type { CaseStudy } from "@/data/case-studies";
import DocsPipelineDiagram from "./DocsPipelineDiagram";
import EvalFlowDiagram from "./EvalFlowDiagram";
import GatewayIoDiagram from "./GatewayIoDiagram";
import KgRagDiagram from "./KgRagDiagram";
import McpRegistryDiagram from "./McpRegistryDiagram";

/** Resolves a case study's diagram key to its component. */
const CaseStudyDiagram = ({ diagram, description }: { diagram: CaseStudy["diagram"]; description: string }) => {
  if (diagram === "eval") return <EvalFlowDiagram description={description} />;
  if (diagram === "mcp") return <McpRegistryDiagram description={description} />;
  if (diagram === "kgrag") return <KgRagDiagram description={description} />;
  if (diagram === "docs") return <DocsPipelineDiagram description={description} />;
  if (diagram === "gateway") return <GatewayIoDiagram description={description} />;
  return null;
};

export default CaseStudyDiagram;
