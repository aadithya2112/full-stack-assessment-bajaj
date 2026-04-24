"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { FormEvent, useMemo, useState } from "react";
import type { BfhlResponse, Hierarchy } from "@/lib/bfhl";

type HierarchyNodeData = {
  label: string;
  role: "root" | "branch" | "leaf";
};

type HierarchyFlowNode = Node<HierarchyNodeData>;
type HierarchyFlowEdge = Edge;

const nodeWidth = 84;
const nodeHeight = 42;
const columnGap = 180;
const rowGap = 86;

const sampleInput = `A->B
A->C
B->D
C->E
E->F
X->Y
Y->Z
Z->X
P->Q
Q->R
G->H
G->H
G->I
hello
1->2
A->`;

type ApiState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; response: BfhlResponse }
  | { status: "error"; message: string };

export default function Home() {
  const [input, setInput] = useState(sampleInput);
  const [apiState, setApiState] = useState<ApiState>({ status: "idle" });

  const parsedCount = useMemo(() => {
    try {
      return parseInput(input).length;
    } catch {
      return 0;
    }
  }, [input]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiState({ status: "loading" });

    let data: string[];

    try {
      data = parseInput(input);
    } catch (error) {
      setApiState({
        status: "error",
        message: error instanceof Error ? error.message : "Unable to parse input.",
      });
      return;
    }

    try {
      const response = await fetch("/bfhl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "The API returned an error.");
      }

      setApiState({ status: "success", response: payload });
    } catch (error) {
      setApiState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "The request failed. Please try again.",
      });
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f5f5] text-[#1f2328]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-[#d8dcdf] pb-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold tracking-normal text-[#111418] sm:text-5xl">
              BFHL hierarchy inspector
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Metric label="Entries" value={parsedCount.toString()} />
            <Metric
              label="Trees"
              value={
                apiState.status === "success"
                  ? apiState.response.summary.total_trees.toString()
                  : "-"
              }
            />
            <Metric
              label="Cycles"
              value={
                apiState.status === "success"
                  ? apiState.response.summary.total_cycles.toString()
                  : "-"
              }
            />
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <form
            onSubmit={handleSubmit}
            className="flex min-h-[560px] flex-col rounded-lg border border-[#d8dcdf] bg-white shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-[#e3e6e8] px-5 py-4">
              <h2 className="text-lg font-semibold">Input</h2>
              <button
                type="button"
                onClick={() => setInput(sampleInput)}
                className="h-9 rounded-md border border-[#cbd1d6] px-3 text-sm font-medium text-[#4b5563] transition hover:bg-[#f4f6f7]"
              >
                Reset sample
              </button>
            </div>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              spellCheck={false}
              className="min-h-0 flex-1 resize-none bg-[#fafbfb] p-5 font-mono text-sm leading-6 text-[#24292f] outline-none transition placeholder:text-[#8b949e] focus:bg-white"
              placeholder="A->B&#10;A->C&#10;B->D"
            />
            <div className="flex flex-col gap-3 border-t border-[#e3e6e8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#69727d]">{parsedCount} entries queued</p>
              <button
                type="submit"
                disabled={apiState.status === "loading"}
                className="h-11 rounded-md bg-[#2f3a45] px-5 text-sm font-semibold text-white transition hover:bg-[#1f2933] disabled:cursor-not-allowed disabled:bg-[#9aa3ad]"
              >
                {apiState.status === "loading" ? "Processing..." : "Submit"}
              </button>
            </div>
          </form>

          <section className="min-h-[560px] rounded-lg border border-[#d8dcdf] bg-white shadow-sm">
            <div className="border-b border-[#e3e6e8] px-5 py-4">
              <h2 className="text-lg font-semibold">Response</h2>
            </div>
            <div className="p-5">
              {apiState.status === "idle" && <EmptyState />}
              {apiState.status === "loading" && (
                <div className="rounded-lg border border-[#d8dcdf] bg-[#fafbfb] p-5 text-sm text-[#69727d]">
                  Processing hierarchy data...
                </div>
              )}
              {apiState.status === "error" && <ErrorState message={apiState.message} />}
              {apiState.status === "success" && (
                <ResponseView response={apiState.response} />
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-20 rounded-lg border border-[#d8dcdf] bg-white px-3 py-2 shadow-sm">
      <div className="text-xl font-semibold text-[#2f3a45]">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-[#69727d]">
        {label}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-[#cbd1d6] bg-[#fafbfb] p-5 text-sm text-[#69727d]">
      No response yet.
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-[#d6b9b5] bg-[#fbf6f5] p-5 text-sm font-medium text-[#8a3b34]">
      {message}
    </div>
  );
}

function ResponseView({ response }: { response: BfhlResponse }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryItem label="Largest root" value={response.summary.largest_tree_root || "-"} />
        <SummaryItem label="Invalid" value={response.invalid_entries.length.toString()} />
        <SummaryItem label="Duplicates" value={response.duplicate_edges.length.toString()} />
      </div>

      <div className="grid gap-4">
        {response.hierarchies.map((hierarchy) => (
          <HierarchyCard key={`${hierarchy.root}-${hierarchy.has_cycle ?? false}`} hierarchy={hierarchy} />
        ))}
      </div>

      <DetailList title="Invalid entries" values={response.invalid_entries} />
      <DetailList title="Duplicate edges" values={response.duplicate_edges} />

      <details className="rounded-lg border border-[#d8dcdf] bg-[#fafbfb]">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
          Raw JSON
        </summary>
        <pre className="overflow-auto border-t border-[#e3e6e8] p-4 text-xs leading-5 text-[#4b5563]">
          {JSON.stringify(response, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#d8dcdf] bg-[#fafbfb] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#69727d]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[#1f2328]">{value}</div>
    </div>
  );
}

function HierarchyCard({ hierarchy }: { hierarchy: Hierarchy }) {
  return (
    <article className="rounded-lg border border-[#d8dcdf] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Root {hierarchy.root}</h3>
          <p className="text-sm text-[#69727d]">
            {hierarchy.has_cycle ? "Cycle detected" : `Depth ${hierarchy.depth}`}
          </p>
        </div>
        <span
          className={`rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
            hierarchy.has_cycle
              ? "bg-[#fbf6f5] text-[#8a3b34]"
              : "bg-[#eef1f3] text-[#38434f]"
          }`}
        >
          {hierarchy.has_cycle ? "Cycle" : "Tree"}
        </span>
      </div>
      <div className="mt-4 rounded-md border border-[#e3e6e8] bg-[#fafbfb]">
        {hierarchy.has_cycle ? (
          <p className="p-4 text-sm text-[#69727d]">Tree omitted for cyclic groups.</p>
        ) : (
          <TreeView tree={hierarchy.tree} />
        )}
      </div>
    </article>
  );
}

function TreeView({ tree }: { tree: Record<string, unknown> }) {
  const { nodes, edges } = useMemo(() => buildFlowElements(tree), [tree]);

  if (nodes.length === 0) {
    return <span className="block p-4 font-mono text-sm text-[#69727d]">{`{}`}</span>;
  }

  return (
    <div className="h-[360px] overflow-hidden rounded-md">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.22 }}
        minZoom={0.25}
        maxZoom={1.6}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        panOnScroll
        zoomOnPinch
        zoomOnScroll
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        colorMode="light"
      >
        <Background color="#d8dcdf" gap={20} size={1.2} variant={BackgroundVariant.Dots} />
        <Controls
          className="!border !border-[#d8dcdf] !bg-white !shadow-sm"
          fitViewOptions={{ padding: 0.22 }}
          showInteractive={false}
        />
        {nodes.length >= 10 && (
          <MiniMap
            className="!border !border-[#d8dcdf] !bg-white !shadow-sm"
            nodeColor={(node) => getMiniMapNodeColor(node as HierarchyFlowNode)}
            nodeStrokeColor="#ffffff"
            nodeBorderRadius={6}
            pannable
            zoomable
          />
        )}
      </ReactFlow>
    </div>
  );
}

function DetailList({ title, values }: { title: string; values: string[] }) {
  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#69727d]">
        {title}
      </h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.length === 0 ? (
          <span className="text-sm text-[#69727d]">None</span>
        ) : (
          values.map((value) => (
            <span
              key={value}
              className="rounded-md bg-[#eef1f3] px-3 py-1 font-mono text-sm text-[#4b5563]"
            >
              {value || "(empty)"}
            </span>
          ))
        )}
      </div>
    </section>
  );
}

function parseInput(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);

    if (!Array.isArray(parsed)) {
      throw new Error("JSON input must be an array of strings.");
    }

    return parsed.map((entry) => String(entry));
  }

  return input
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildFlowElements(tree: Record<string, unknown>): {
  nodes: HierarchyFlowNode[];
  edges: HierarchyFlowEdge[];
} {
  const rootEntries = getSortedEntries(tree);

  if (rootEntries.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: HierarchyFlowNode[] = [];
  const edges: HierarchyFlowEdge[] = [];
  let leafCursor = 0;

  function visit(
    label: string,
    childrenValue: unknown,
    depth: number,
    path: string[],
    parentId?: string,
  ): number {
    const id = path.join(".");
    const childEntries = getSortedEntries(childrenValue);
    const childYPositions = childEntries.map(([childLabel, nestedChildren], index) =>
      visit(childLabel, nestedChildren, depth + 1, [...path, `${index}-${childLabel}`], id),
    );
    const y =
      childYPositions.length === 0
        ? leafCursor++ * rowGap
        : (childYPositions[0] + childYPositions[childYPositions.length - 1]) / 2;
    const role: HierarchyNodeData["role"] =
      parentId === undefined ? "root" : childEntries.length === 0 ? "leaf" : "branch";

    nodes.push({
      id,
      data: { label, role },
      position: { x: depth * columnGap, y },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      selectable: false,
      draggable: false,
      connectable: false,
      style: getNodeStyle(role),
      width: nodeWidth,
      height: nodeHeight,
    });

    if (parentId) {
      edges.push({
        id: `${parentId}->${id}`,
        source: parentId,
        target: id,
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#87919c",
          width: 16,
          height: 16,
        },
        selectable: false,
        style: {
          stroke: "#87919c",
          strokeWidth: 1.8,
        },
      });
    }

    return y;
  }

  rootEntries.forEach(([label, childrenValue], index) => {
    visit(label, childrenValue, 0, [`${index}-${label}`]);
    leafCursor += 0.6;
  });

  return { nodes, edges };
}

function getSortedEntries(value: unknown) {
  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
}

function getNodeStyle(role: HierarchyNodeData["role"]): HierarchyFlowNode["style"] {
  const sharedStyle = {
    width: nodeWidth,
    height: nodeHeight,
    borderRadius: 7,
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "solid",
    display: "flex",
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: 14,
    fontWeight: 700,
    justifyContent: "center",
    padding: "0 12px",
    textAlign: "center" as const,
  };

  if (role === "root") {
    return {
      ...sharedStyle,
      background: "#2f3a45",
      borderColor: "#2f3a45",
      boxShadow: "0 8px 18px rgba(31, 35, 40, 0.16)",
      color: "#ffffff",
    };
  }

  if (role === "branch") {
    return {
      ...sharedStyle,
      background: "#ffffff",
      borderColor: "#aeb7c1",
      boxShadow: "0 5px 14px rgba(31, 35, 40, 0.1)",
      color: "#2f3a45",
    };
  }

  return {
    ...sharedStyle,
    background: "#eef1f3",
    borderColor: "#cbd1d6",
    color: "#4b5563",
  };
}

function getMiniMapNodeColor(node: HierarchyFlowNode) {
  if (node.data.role === "root") {
    return "#2f3a45";
  }

  if (node.data.role === "branch") {
    return "#aeb7c1";
  }

  return "#d8dcdf";
}
