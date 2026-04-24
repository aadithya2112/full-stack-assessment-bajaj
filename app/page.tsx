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
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-neutral-200 pb-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
              SRM Full Stack Engineering Challenge
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal text-neutral-950 sm:text-5xl">
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
            className="flex min-h-[560px] flex-col rounded-xl border border-neutral-200 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <h2 className="text-lg font-semibold">Input</h2>
              <button
                type="button"
                onClick={() => setInput(sampleInput)}
                className="h-9 rounded-lg border border-neutral-200 px-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
              >
                Reset sample
              </button>
            </div>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              spellCheck={false}
              className="min-h-0 flex-1 resize-none bg-neutral-50/50 p-5 font-mono text-sm leading-6 text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:bg-white"
              placeholder="A->B&#10;A->C&#10;B->D"
            />
            <div className="flex flex-col gap-3 border-t border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-neutral-500">{parsedCount} entries queued</p>
              <button
                type="submit"
                disabled={apiState.status === "loading"}
                className="h-11 rounded-lg bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                {apiState.status === "loading" ? "Processing..." : "Submit"}
              </button>
            </div>
          </form>

          <section className="min-h-[560px] rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-100 px-5 py-4">
              <h2 className="text-lg font-semibold">Response</h2>
            </div>
            <div className="p-5">
              {apiState.status === "idle" && <EmptyState />}
              {apiState.status === "loading" && (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-5 text-sm text-neutral-500">
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
    <div className="min-w-20 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm">
      <div className="text-xl font-semibold text-neutral-900">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50/50 p-5 text-sm text-neutral-500">
      No response yet.
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
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

      <details className="rounded-lg border border-neutral-200 bg-neutral-50/50">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-neutral-800 hover:text-neutral-950">
          Raw JSON
        </summary>
        <pre className="overflow-auto border-t border-neutral-200 p-4 text-xs leading-5 text-neutral-600">
          {JSON.stringify(response, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-neutral-900">{value}</div>
    </div>
  );
}

function HierarchyCard({ hierarchy }: { hierarchy: Hierarchy }) {
  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 bg-neutral-50/50 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">Root {hierarchy.root}</h3>
          <p className="text-sm text-neutral-500">
            {hierarchy.has_cycle ? "Cycle detected" : `Depth ${hierarchy.depth}`}
          </p>
        </div>
        <span
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
            hierarchy.has_cycle
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-neutral-100 text-neutral-700 border border-neutral-200"
          }`}
        >
          {hierarchy.has_cycle ? "Cycle" : "Tree"}
        </span>
      </div>
      <div className="p-5">
        {hierarchy.has_cycle ? (
          <p className="text-sm text-neutral-500">Tree omitted for cyclic groups.</p>
        ) : (
          <div className="overflow-auto py-1">
            <TreeView tree={hierarchy.tree} />
          </div>
        )}
      </div>
    </article>
  );
}

function TreeView({ tree, isRoot = true }: { tree: Record<string, unknown>; isRoot?: boolean }) {
  const entries = Object.entries(tree);

  if (entries.length === 0) {
    return null;
  }

  return (
    <ul className={`flex flex-col gap-1 ${!isRoot ? "pl-1" : ""}`}>
      {entries.map(([node, children], index) => {
        const isLast = index === entries.length - 1;
        const hasChildren = isRecord(children) && Object.keys(children).length > 0;

        return (
          <li key={node} className="relative flex flex-col items-start pt-1.5 pb-1.5">
            {!isRoot && (
              <>
                {/* Horizontal Line to node */}
                <div className="absolute left-[-16px] top-[22px] h-px w-4 bg-neutral-300" />
                
                {/* Vertical Line from parent */}
                <div
                  className={`absolute left-[-16px] top-0 w-px bg-neutral-300 ${
                    isLast ? "h-[22px]" : "h-full"
                  }`}
                />
              </>
            )}

            <div className="relative flex items-center gap-2">
              <span className="flex min-w-[2rem] items-center justify-center rounded-lg border border-neutral-200 bg-white px-2.5 py-1 font-mono text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50">
                {node}
              </span>
              {!hasChildren && (
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-neutral-400">
                  leaf
                </span>
              )}
            </div>
            
            {hasChildren && (
              <div className={!isRoot ? "ml-[1.125rem]" : "ml-4"}>
                <TreeView tree={children as Record<string, unknown>} isRoot={false} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function DetailList({ title, values }: { title: string; values: string[] }) {
  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {title}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.length === 0 ? (
          <span className="text-sm text-neutral-500">None</span>
        ) : (
          values.map((value) => (
            <span
              key={value}
              className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-mono text-sm text-neutral-700 shadow-sm"
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
