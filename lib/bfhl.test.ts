import { describe, expect, test } from "bun:test";
import { processBfhlData } from "./bfhl";

const identity = {
  userId: "johndoe_17091999",
  emailId: "john.doe@college.edu",
  collegeRollNumber: "21CS1001",
};

describe("processBfhlData", () => {
  test("matches the question paper example", () => {
    expect(
      processBfhlData(
        [
          "A->B",
          "A->C",
          "B->D",
          "C->E",
          "E->F",
          "X->Y",
          "Y->Z",
          "Z->X",
          "P->Q",
          "Q->R",
          "G->H",
          "G->H",
          "G->I",
          "hello",
          "1->2",
          "A->",
        ],
        identity,
      ),
    ).toEqual({
      user_id: "johndoe_17091999",
      email_id: "john.doe@college.edu",
      college_roll_number: "21CS1001",
      hierarchies: [
        {
          root: "A",
          tree: { A: { B: { D: {} }, C: { E: { F: {} } } } },
          depth: 4,
        },
        {
          root: "X",
          tree: {},
          has_cycle: true,
        },
        {
          root: "P",
          tree: { P: { Q: { R: {} } } },
          depth: 3,
        },
        {
          root: "G",
          tree: { G: { H: {}, I: {} } },
          depth: 2,
        },
      ],
      invalid_entries: ["hello", "1->2", "A->"],
      duplicate_edges: ["G->H"],
      summary: {
        total_trees: 3,
        total_cycles: 1,
        largest_tree_root: "A",
      },
    });
  });

  test("trims input, rejects self loops, and reports duplicate edges once", () => {
    const response = processBfhlData(
      [" A->B ", "A->B", "A->B", "A->A", "", "AB->C"],
      identity,
    );

    expect(response.invalid_entries).toEqual(["A->A", "", "AB->C"]);
    expect(response.duplicate_edges).toEqual(["A->B"]);
    expect(response.hierarchies).toEqual([
      {
        root: "A",
        tree: { A: { B: {} } },
        depth: 2,
      },
    ]);
  });

  test("keeps the first parent in a multi-parent case", () => {
    expect(processBfhlData(["A->D", "B->D", "B->E"], identity).hierarchies).toEqual([
      {
        root: "A",
        tree: { A: { D: {} } },
        depth: 2,
      },
      {
        root: "B",
        tree: { B: { E: {} } },
        depth: 2,
      },
    ]);
  });

  test("uses lexicographic root tiebreakers for largest tree", () => {
    const response = processBfhlData(["B->C", "A->D"], identity);

    expect(response.summary.largest_tree_root).toBe("A");
  });
});
