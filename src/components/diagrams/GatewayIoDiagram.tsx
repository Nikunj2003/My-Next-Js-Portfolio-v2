import DiagramFrame, { Arrow, Box, Caption, LayerLabel } from "./DiagramFrame";

const GatewayIoDiagram = ({ description }: { description: string }) => (
  <DiagramFrame
    title="Code intelligence gateway I/O path, before and after"
    description={description}
    viewBox="0 0 720 424"
  >
    {/* Before — both paths converge on the same throttled volume */}
    <LayerLabel x={16} y={20} text="Before" />
    <Box x={16} y={30} w={214} h={52} label="Every query" sub="reads the index" order={0} />
    <Box x={474} y={30} w={230} h={52} label="Scheduled re-index" sub="8 repos, every 30 min" order={0} />

    <Arrow d="M 123 82 L 260 128" order={1} />
    <Arrow d="M 589 82 L 452 128" order={1} />

    <Box
      x={244}
      y={130}
      w={232}
      h={56}
      label="Shared network volume"
      sub="burst credits drain, then throttles"
      accent
      order={2}
    />

    <Arrow d="M 360 186 L 360 216" order={3} />
    <Box x={196} y={218} w={328} h={46} label="Health check never answers in time" order={3} />
    <Caption x={534} y={246} text="read as an app crash loop" anchor="start" />

    {/* After — the hot path no longer touches shared storage */}
    <LayerLabel x={16} y={300} text="After" />
    <Box x={16} y={310} w={214} h={52} label="Every query" sub="reads local index" order={4} />
    <Box x={244} y={310} w={232} h={52} label="Gateway owns its sync" sub="shallow pull on its own interval" accent order={4} />
    <Box x={490} y={310} w={214} h={52} label="Local ephemeral" sub="rebuilt on boot" order={4} />

    <Arrow d="M 230 336 L 240 336" order={5} />
    <Arrow d="M 476 336 L 486 336" order={5} />

    <Caption x={360} y={392} text="startup is non-blocking, so health answers immediately and queries report warming up" />
  </DiagramFrame>
);

export default GatewayIoDiagram;
