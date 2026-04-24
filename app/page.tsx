"use client";

import { FormEvent, useMemo, useState } from "react";
import type { BfhlResponse, Hierarchy } from "@/lib/bfhl";

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
      <div className="mt-4 overflow-x-auto rounded-md border border-[#e3e6e8] bg-[#fafbfb] p-4">
        {hierarchy.has_cycle ? (
          <p className="text-sm text-[#69727d]">Tree omitted for cyclic groups.</p>
        ) : (
          <TreeView tree={hierarchy.tree} />
        )}
      </div>
    </article>
  );
}

function TreeView({ tree }: { tree: Record<string, unknown> }) {
  const entries = Object.entries(tree);

  if (entries.length === 0) {
    return <span className="font-mono text-sm text-[#69727d]">{`{}`}</span>;
  }

  return (
    <ul className="min-w-max space-y-3">
      {entries.map(([node, children]) => (
        <TreeBranch key={node} childrenValue={children} isRoot node={node} />
      ))}
    </ul>
  );
}

function TreeBranch({
  childrenValue,
  isRoot = false,
  node,
}: {
  childrenValue: unknown;
  isRoot?: boolean;
  node: string;
}) {
  const childEntries = isRecord(childrenValue) ? Object.entries(childrenValue) : [];

  return (
    <li className={`relative ${isRoot ? "" : "pl-6"}`}>
      {!isRoot && <span className="absolute left-0 top-4 h-px w-4 bg-[#cbd1d6]" />}
      <div className="flex items-center gap-3">
        <span
          className={`size-2 rounded-full ${isRoot ? "bg-[#2f3a45]" : "bg-[#9aa3ad]"}`}
          aria-hidden="true"
        />
        <span className="flex min-w-9 items-center justify-center rounded-md border border-[#cbd1d6] bg-white px-2.5 py-1.5 font-mono text-sm font-semibold text-[#2f3a45] shadow-sm">
          {node}
        </span>
        {childEntries.length === 0 && (
          <span className="rounded-full border border-[#d8dcdf] bg-white px-2 py-0.5 text-xs font-medium text-[#69727d]">
            leaf
          </span>
        )}
      </div>
      {childEntries.length > 0 && (
        <div className="ml-[3px] mt-3 border-l border-[#cbd1d6] pl-4">
          <ul className="space-y-3">
            {childEntries.map(([childNode, nestedChildren]) => (
              <TreeBranch
                key={childNode}
                childrenValue={nestedChildren}
                node={childNode}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
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
