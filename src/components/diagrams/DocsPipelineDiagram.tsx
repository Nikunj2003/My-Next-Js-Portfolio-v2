import DiagramFrame, { Arrow, Box, Caption, LayerLabel } from "./DiagramFrame";

const DocsPipelineDiagram = ({ description }: { description: string }) => (
  <DiagramFrame
    title="Documentation pipeline with a blocking clarification gate"
    description={description}
    viewBox="0 0 720 446"
  >
    <LayerLabel x={16} y={20} text="Context enrichment" />
    <Box x={16} y={30} w={222} h={54} label="Deep ticket pull" sub="linked tickets · bounded search" order={0} />
    <Box x={250} y={30} w={220} h={54} label="Codebase search" sub="two queries minimum" order={0} />
    <Box x={482} y={30} w={222} h={54} label="Consolidate" sub="deduplicate the pool" order={0} />

    <Arrow d="M 238 57 L 246 57" order={0} />
    <Arrow d="M 470 57 L 478 57" order={0} />

    <Arrow d="M 360 84 L 360 122" order={1} />
    <Caption x={370} y={108} text="nothing is drafted yet" anchor="start" />

    <LayerLabel x={16} y={140} text="Gate" />
    <Box
      x={16}
      y={150}
      w={688}
      h={58}
      label="Clarification questions"
      sub="numbered, specific, and answered before drafting begins"
      accent
      order={2}
    />

    <Arrow d="M 200 208 L 200 250" order={3} />
    <Arrow d="M 520 208 L 520 250" order={3} />
    <Caption x={196} y={234} text="answered" anchor="end" />
    <Caption x={532} y={234} text="not applicable" anchor="start" />

    <LayerLabel x={16} y={268} text="Draft" />
    <Box x={16} y={278} w={340} h={54} label="Delta-only draft" sub="impacted articles only" order={3} />
    <Box x={368} y={278} w={336} h={54} label="Style rules" sub="distilled from published notes" order={3} />

    <Arrow d="M 360 332 L 360 370" order={4} />

    <LayerLabel x={16} y={388} text="Review" />
    <Box
      x={16}
      y={378}
      w={688}
      h={54}
      label="Proposed as a pull request"
      sub="rendered for review — never published on trust"
      accent
      order={4}
    />
  </DiagramFrame>
);

export default DocsPipelineDiagram;
