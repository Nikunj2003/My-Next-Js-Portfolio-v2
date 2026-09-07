import DiagramFrame, { Arrow, Box, Caption, LayerLabel } from "./DiagramFrame";

const KgRagDiagram = ({ description }: { description: string }) => (
  <DiagramFrame title="Knowledge graph RAG layers" description={description} viewBox="0 0 720 430">
    <LayerLabel x={16} y={20} text="Sources · 4 ETL pipelines, each incremental" />
    <Box x={16} y={30} w={166} h={46} label="Test cases"  order={0} />
    <Box x={198} y={30} w={166} h={46} label="Support docs"  order={0} />
    <Box x={380} y={30} w={156} h={46} label="RCA items"  order={0} />
    <Box x={552} y={30} w={152} h={46} label="Release notes"  order={0} />

    <Arrow d="M 99 76 L 99 110"  order={0} />
    <Arrow d="M 281 76 L 281 110"  order={0} />
    <Arrow d="M 458 76 L 458 110"  order={0} />
    <Arrow d="M 628 76 L 628 110"  order={0} />

    <LayerLabel x={16} y={128} text="L1 · Ingestion integrity" />
    <Box x={16} y={138} w={688} h={44} label="Nightly assertions" sub="source parity · duplicate + stale scan · idempotency probe · freshness lag"  order={1} />

    <Arrow d="M 360 182 L 360 210"  order={2} />

    <LayerLabel x={16} y={228} text="L2 · Extraction quality" />
    <Box x={16} y={238} w={336} h={50} label="Entity + relation extraction" sub="gated on human annotation" accent  order={2} />
    <Box x={368} y={238} w={336} h={50} label="Graph + vector store" sub="Neo4j · pgvector · tenant-scoped" accent  order={2} />

    <Arrow d="M 360 288 L 360 316"  order={3} />

    <LayerLabel x={16} y={334} text="L3 · Retrieval · 5 modes" />
    <Box x={16} y={344} w={128} h={44} label="naive"  order={3} />
    <Box x={156} y={344} w={128} h={44} label="local"  order={3} />
    <Box x={296} y={344} w={128} h={44} label="global"  order={3} />
    <Box x={436} y={344} w={128} h={44} label="hybrid"  order={3} />
    <Box x={576} y={344} w={128} h={44} label="mix"  order={3} />
    <Caption x={360} y={406} text="scored on retrieval accuracy · ranking quality · context precision, per mode per question type" />

    <Arrow d="M 360 410 L 360 424"  order={4} />
    <LayerLabel x={16} y={428} text="L4 answer quality · L5 operations" />
  </DiagramFrame>
);

export default KgRagDiagram;
