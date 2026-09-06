import DiagramFrame, { Arrow, Box, Caption, LayerLabel } from "./DiagramFrame";

const McpRegistryDiagram = ({ description }: { description: string }) => (
  <DiagramFrame title="Governed MCP registry authorization path" description={description} viewBox="0 0 720 400">
    <LayerLabel x={16} y={20} text="Clients" />
    <Box x={16} y={30} w={210} h={52} label="Desktop extension" sub="download · double-click · no terminal" accent  order={0} />
    <Box x={242} y={30} w={210} h={52} label="Agent runtimes" sub="Office OS agents"  order={0} />
    <Box x={468} y={30} w={236} h={52} label="CLI clients" sub="engineers"  order={0} />

    <Arrow d="M 121 82 L 121 116"  order={0} />
    <Arrow d="M 347 82 L 347 116"  order={0} />
    <Arrow d="M 586 82 L 586 116"  order={0} />
    <Caption x={360} y={104} text="identity travels with the request" />

    <LayerLabel x={16} y={134} text="Gateway" />
    <Box x={16} y={144} w={688} h={56} label="Auth + RBAC resolution" sub="OAuth2 · scoped keys · tenant scope · audit attribution" accent  order={1} />

    <Arrow d="M 200 200 L 200 236"  order={2} />
    <Arrow d="M 520 200 L 520 236"  order={2} />

    <LayerLabel x={16} y={254} text="Per-tool decision" />
    <Box x={70} y={238} w={260} h={48} label="Permitted" sub="tool executes, call attributed"  order={2} />
    <Box x={390} y={238} w={260} h={48} label="Denied" sub="explicit refusal, never a silent empty result"  order={2} />

    <Arrow d="M 200 286 L 200 320"  order={3} />

    <LayerLabel x={16} y={338} text="Registry · 14 servers" />
    <Box x={16} y={322} w={222} h={52} label="9 delivered by me" sub="read + write paths, tiered" accent  order={3} />
    <Box x={254} y={322} w={200} h={52} label="5 by teammates" sub="same registry policy"  order={3} />
    <Box x={470} y={322} w={234} h={52} label="Canonical registry" sub="source of truth · drift corrected"  order={3} />
  </DiagramFrame>
);

export default McpRegistryDiagram;
