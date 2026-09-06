import DiagramFrame, { Arrow, Box, Caption, LayerLabel } from "./DiagramFrame";

const EvalFlowDiagram = ({ description }: { description: string }) => (
  <DiagramFrame title="LLM evaluation platform architecture" description={description} viewBox="0 0 720 430">
    <LayerLabel x={16} y={20} text="Layer 0 · Producers" />
    <Box x={16} y={30} w={150} h={52} label="n8n workflows" sub="workflow + node spans"  order={0} />
    <Box x={182} y={30} w={150} h={52} label="Agents + MCP" sub="tool call spans"  order={0} />
    <Box x={348} y={30} w={150} h={52} label="Retrieval" sub="doc IDs · mode"  order={0} />
    <Box x={514} y={30} w={190} h={52} label="Skills + automations" sub="run spans"  order={0} />

    <Arrow d="M 91 82 L 91 118"  order={0} />
    <Arrow d="M 257 82 L 257 118"  order={0} />
    <Arrow d="M 423 82 L 423 118"  order={0} />
    <Arrow d="M 609 82 L 609 118"  order={0} />

    <LayerLabel x={16} y={136} text="The chokepoint" />
    <Box x={16} y={146} w={688} h={54} label="LiteLLM gateway" sub="no workflow or agent calls a model directly" accent  order={1} />
    <Caption x={360} y={216} text="one callback line here instruments every model call in the org at once" />

    <Arrow d="M 360 222 L 360 250"  order={2} />

    <LayerLabel x={16} y={268} text="Layer 1 · Ingest" />
    <Box x={140} y={252} w={440} h={50} label="OpenTelemetry collector" sub="PII redaction · sampling · batching · fan-out" accent  order={2} />

    <Arrow d="M 360 302 L 360 330"  order={3} />

    <LayerLabel x={16} y={348} text="Layer 2 · Backend" />
    <Box x={16} y={332} w={330} h={54} label="Langfuse" sub="traces · golden datasets · prompt registry · scores"  order={3} />
    <Box x={362} y={332} w={342} h={54} label="Grafana + Prometheus" sub="ops spans · infra health"  order={3} />

    <Arrow d="M 181 386 L 181 404"  order={4} />
    <LayerLabel x={16} y={422} text="Layer 3 · Gates" />
    <Box x={140} y={396} w={440} h={30} label="Eval harness → Jenkins CI gate" accent  order={4} />
  </DiagramFrame>
);

export default EvalFlowDiagram;
