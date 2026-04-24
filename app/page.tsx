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
    <main className="min-h-screen bg-[#f7f4ee] text-[#22211f]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-[#d8d2c8] pb-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#716b60]">
              SRM Full Stack Engineering Challenge
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal text-[#181714] sm:text-5xl">
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
            className="flex min-h-[560px] flex-col rounded-lg border border-[#d8d2c8] bg-white shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-[#e6e0d6] px-5 py-4">
              <h2 className="text-lg font-semibold">Input</h2>
              <button
                type="button"
                onClick={() => setInput(sampleInput)}
                className="h-9 rounded-md border border-[#c7beb0] px-3 text-sm font-medium text-[#4a443b] transition hover:bg-[#f1ece4]"
              >
                Reset sample
              </button>
            </div>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              spellCheck={false}
              className="min-h-0 flex-1 resize-none bg-[#fffdf9] p-5 font-mono text-sm leading-6 text-[#25221d] outline-none transition placeholder:text-[#9a9285] focus:bg-white"
              placeholder="A->B&#10;A->C&#10;B->D"
            />
            <div className="flex flex-col gap-3 border-t border-[#e6e0d6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#716b60]">
                Accepts newline, comma, or JSON-array input.
              </p>
              <button
                type="submit"
                disabled={apiState.status === "loading"}
                className="h-11 rounded-md bg-[#1f6f68] px-5 text-sm font-semibold text-white transition hover:bg-[#195c56] disabled:cursor-not-allowed disabled:bg-[#98aaa6]"
              >
                {apiState.status === "loading" ? "Processing..." : "Submit"}
              </button>
            </div>
          </form>

          <section className="min-h-[560px] rounded-lg border border-[#d8d2c8] bg-white shadow-sm">
            <div className="border-b border-[#e6e0d6] px-5 py-4">
              <h2 className="text-lg font-semibold">Response</h2>
            </div>
            <div className="p-5">
              {apiState.status === "idle" && <EmptyState />}
              {apiState.status === "loading" && (
                <div className="rounded-lg border border-[#d8d2c8] bg-[#fffdf9] p-5 text-sm text-[#716b60]">
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
    <div className="min-w-20 rounded-lg border border-[#d8d2c8] bg-white px-3 py-2 shadow-sm">
      <div className="text-xl font-semibold text-[#1f6f68]">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-[#716b60]">
        {label}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-[#cfc6b8] bg-[#fffdf9] p-5 text-sm text-[#716b60]">
      Submit an edge list to inspect the generated hierarchies.
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-[#e0b2a9] bg-[#fff8f5] p-5 text-sm font-medium text-[#9f3d2d]">
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

      <details className="rounded-lg border border-[#d8d2c8] bg-[#fffdf9]">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
          Raw JSON
        </summary>
        <pre className="overflow-auto border-t border-[#e6e0d6] p-4 text-xs leading-5 text-[#4a443b]">
          {JSON.stringify(response, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#d8d2c8] bg-[#fffdf9] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#716b60]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[#22211f]">{value}</div>
    </div>
  );
}

function HierarchyCard({ hierarchy }: { hierarchy: Hierarchy }) {
  return (
    <article className="rounded-lg border border-[#d8d2c8] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Root {hierarchy.root}</h3>
          <p className="text-sm text-[#716b60]">
            {hierarchy.has_cycle ? "Cycle detected" : `Depth ${hierarchy.depth}`}
          </p>
        </div>
        <span
          className={`rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
            hierarchy.has_cycle
              ? "bg-[#fff0ea] text-[#9f3d2d]"
              : "bg-[#eaf5f1] text-[#1f6f68]"
          }`}
        >
          {hierarchy.has_cycle ? "Cycle" : "Tree"}
        </span>
      </div>
      <div className="mt-4 rounded-md bg-[#f7f4ee] p-4">
        {hierarchy.has_cycle ? (
          <p className="text-sm text-[#716b60]">Tree omitted for cyclic groups.</p>
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
    return <span className="font-mono text-sm text-[#716b60]">{`{}`}</span>;
  }

  return (
    <ul className="space-y-2">
      {entries.map(([node, children]) => (
        <li key={node}>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-white font-mono text-sm font-semibold text-[#1f6f68] shadow-sm">
              {node}
            </span>
            {isRecord(children) && Object.keys(children).length === 0 && (
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#716b60]">
                leaf
              </span>
            )}
          </div>
          {isRecord(children) && Object.keys(children).length > 0 && (
            <div className="ml-4 mt-2 border-l border-[#cfc6b8] pl-4">
              <TreeView tree={children} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function DetailList({ title, values }: { title: string; values: string[] }) {
  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#716b60]">
        {title}
      </h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.length === 0 ? (
          <span className="text-sm text-[#716b60]">None</span>
        ) : (
          values.map((value) => (
            <span
              key={value}
              className="rounded-md bg-[#f7f4ee] px-3 py-1 font-mono text-sm text-[#4a443b]"
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
