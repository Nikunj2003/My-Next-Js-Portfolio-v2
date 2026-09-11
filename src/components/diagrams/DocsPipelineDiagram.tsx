import DiagramFrame, { Arrow, Box, LayerLabel } from "./DiagramFrame";

const DocsPipelineDiagram = ({ description }: { description: string }) => (
  <DiagramFrame
    title="Jira to Zendesk documentation workflow with Quill review"
    description={description}
    viewBox="0 0 720 594"
  >
    <LayerLabel x={16} y={20} text="Automatic trigger" />
    <Box x={16} y={30} w={328} h={54} label="Jira ticket completed" sub="status reaches Done" order={0} />
    <Arrow d="M 344 57 L 372 57" order={0} />
    <Box x={376} y={30} w={328} h={54} label="Documentation agent starts" sub="gather context before drafting" order={0} />

    <Arrow d="M 540 84 L 540 132 L 126 132 L 126 136" order={1} />
    <LayerLabel x={16} y={126} text="Context enrichment" />
    <Box x={16} y={140} w={220} h={54} label="Deep ticket pull" sub="linked tickets · bounded search" order={1} />
    <Arrow d="M 236 167 L 246 167" order={1} />
    <Box x={250} y={140} w={220} h={54} label="Codebase search" sub="two queries minimum" order={1} />
    <Arrow d="M 470 167 L 480 167" order={1} />
    <Box x={484} y={140} w={220} h={54} label="Consolidate" sub="deduplicate the context" order={1} />

    <Arrow d="M 594 194 L 594 210 L 360 210 L 360 246" order={2} />
    <LayerLabel x={16} y={236} text="Clarification gate" />
    <Box x={16} y={250} w={688} h={54} label="Resolve open questions" sub="drafting waits until clarification is complete" accent order={2} />

    <Arrow d="M 360 304 L 360 320 L 180 320 L 180 356" order={3} />
    <LayerLabel x={16} y={346} text="Authoring in GitHub" />
    <Box x={16} y={360} w={328} h={54} label="Create or update documentation" sub="agent writes the relevant articles" order={3} />
    <Arrow d="M 344 387 L 372 387" order={3} />
    <Box x={376} y={360} w={328} h={54} label="Open documentation PR" sub="changes proposed for human review" order={3} />

    <Arrow d="M 540 414 L 540 462 L 126 462 L 126 466" order={4} />
    <LayerLabel x={16} y={456} text="Human review and publication" />
    <Box x={16} y={470} w={220} h={64} label="Review in Quill" sub="inspect · edit · approve" accent order={4} />
    <Arrow d="M 236 502 L 246 502" order={4} />
    <Box x={250} y={470} w={220} h={64} label="Merge GitHub PR" sub="reviewed documentation" order={4} />
    <Arrow d="M 470 502 L 480 502" order={4} />
    <Box x={484} y={470} w={220} h={64} label="Sync to Zendesk" sub="publish the merged changes" order={4} />
    <LayerLabel x={16} y={574} text="Quill is the review app within this workflow" />
  </DiagramFrame>
);

export default DocsPipelineDiagram;
