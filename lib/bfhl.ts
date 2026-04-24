export type Hierarchy = {
  root: string;
  tree: Record<string, unknown>;
  depth?: number;
  has_cycle?: true;
};

export type BfhlResponse = {
  user_id: string;
  email_id: string;
  college_roll_number: string;
  hierarchies: Hierarchy[];
  invalid_entries: string[];
  duplicate_edges: string[];
  summary: {
    total_trees: number;
    total_cycles: number;
    largest_tree_root: string;
  };
};

type Identity = {
  userId: string;
  emailId: string;
  collegeRollNumber: string;
};

type Edge = {
  parent: string;
  child: string;
  value: string;
  index: number;
};

const VALID_EDGE_PATTERN = /^[A-Z]->[A-Z]$/;

export function getIdentityFromEnv(): Identity {
  return {
    userId: process.env.BFHL_USER_ID ?? "fullname_ddmmyyyy",
    emailId: process.env.BFHL_EMAIL_ID ?? "email@example.com",
    collegeRollNumber: process.env.BFHL_COLLEGE_ROLL_NUMBER ?? "ROLL_NUMBER",
  };
}

export function processBfhlData(data: unknown[], identity: Identity): BfhlResponse {
  const invalidEntries: string[] = [];
  const duplicateEdges: string[] = [];
  const duplicateEdgeSet = new Set<string>();
  const seenEdges = new Set<string>();
  const candidateEdges: Edge[] = [];

  data.forEach((entry, index) => {
    const value = typeof entry === "string" ? entry.trim() : String(entry ?? "").trim();

    if (!VALID_EDGE_PATTERN.test(value)) {
      invalidEntries.push(value);
      return;
    }

    const [parent, child] = value.split("->");

    if (parent === child) {
      invalidEntries.push(value);
      return;
    }

    if (seenEdges.has(value)) {
      if (!duplicateEdgeSet.has(value)) {
        duplicateEdgeSet.add(value);
        duplicateEdges.push(value);
      }
      return;
    }

    seenEdges.add(value);
    candidateEdges.push({ parent, child, value, index });
  });

  const parentByChild = new Map<string, string>();
  const edges: Edge[] = [];

  for (const edge of candidateEdges) {
    if (parentByChild.has(edge.child)) {
      continue;
    }

    parentByChild.set(edge.child, edge.parent);
    edges.push(edge);
  }

  const childrenByParent = new Map<string, string[]>();
  const nodes = new Set<string>();
  const adjacency = new Map<string, Set<string>>();
  const firstSeenIndexByNode = new Map<string, number>();

  for (const edge of edges) {
    nodes.add(edge.parent);
    nodes.add(edge.child);
    firstSeenIndexByNode.set(
      edge.parent,
      Math.min(firstSeenIndexByNode.get(edge.parent) ?? edge.index, edge.index),
    );
    firstSeenIndexByNode.set(
      edge.child,
      Math.min(firstSeenIndexByNode.get(edge.child) ?? edge.index, edge.index),
    );

    if (!childrenByParent.has(edge.parent)) {
      childrenByParent.set(edge.parent, []);
    }
    childrenByParent.get(edge.parent)?.push(edge.child);

    if (!adjacency.has(edge.parent)) {
      adjacency.set(edge.parent, new Set());
    }
    if (!adjacency.has(edge.child)) {
      adjacency.set(edge.child, new Set());
    }
    adjacency.get(edge.parent)?.add(edge.child);
    adjacency.get(edge.child)?.add(edge.parent);
  }

  for (const children of childrenByParent.values()) {
    children.sort();
  }

  const components = getComponents(nodes, adjacency, firstSeenIndexByNode);
  const hierarchies = components.map((component) =>
    buildHierarchy(component, childrenByParent, parentByChild),
  );

  const nonCyclicTrees = hierarchies.filter((hierarchy) => !hierarchy.has_cycle);
  const largestTreeRoot = nonCyclicTrees.reduce((winner, hierarchy) => {
    if (!winner) {
      return hierarchy;
    }

    const winnerDepth = winner.depth ?? 0;
    const currentDepth = hierarchy.depth ?? 0;

    if (currentDepth > winnerDepth) {
      return hierarchy;
    }

    if (currentDepth === winnerDepth && hierarchy.root < winner.root) {
      return hierarchy;
    }

    return winner;
  }, undefined as Hierarchy | undefined);

  return {
    user_id: identity.userId,
    email_id: identity.emailId,
    college_roll_number: identity.collegeRollNumber,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: nonCyclicTrees.length,
      total_cycles: hierarchies.length - nonCyclicTrees.length,
      largest_tree_root: largestTreeRoot?.root ?? "",
    },
  };
}

function getComponents(
  nodes: Set<string>,
  adjacency: Map<string, Set<string>>,
  firstSeenIndexByNode: Map<string, number>,
) {
  const visited = new Set<string>();
  const components: Array<{ nodes: string[]; firstSeenIndex: number }> = [];

  const nodesByFirstAppearance = [...nodes].sort(
    (left, right) =>
      (firstSeenIndexByNode.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (firstSeenIndexByNode.get(right) ?? Number.MAX_SAFE_INTEGER) ||
      left.localeCompare(right),
  );

  for (const node of nodesByFirstAppearance) {
    if (visited.has(node)) {
      continue;
    }

    const component: string[] = [];
    const stack = [node];
    visited.add(node);

    while (stack.length > 0) {
      const current = stack.pop();

      if (!current) {
        continue;
      }

      component.push(current);

      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }

    const sortedComponent = component.sort();
    components.push({
      nodes: sortedComponent,
      firstSeenIndex: Math.min(
        ...sortedComponent.map((componentNode) => firstSeenIndexByNode.get(componentNode) ?? 0),
      ),
    });
  }

  return components
    .sort(
      (left, right) =>
        left.firstSeenIndex - right.firstSeenIndex ||
        selectRoot(left.nodes, new Map()).localeCompare(selectRoot(right.nodes, new Map())),
    )
    .map((component) => component.nodes);
}

function buildHierarchy(
  component: string[],
  childrenByParent: Map<string, string[]>,
  parentByChild: Map<string, string>,
): Hierarchy {
  const roots = component.filter((node) => !parentByChild.has(node)).sort();
  const root = roots[0] ?? component[0];
  const hasCycle = hasCycleInComponent(component, childrenByParent);

  if (hasCycle) {
    return {
      root,
      tree: {},
      has_cycle: true,
    };
  }

  return {
    root,
    tree: buildTree(root, childrenByParent),
    depth: getDepth(root, childrenByParent),
  };
}

function hasCycleInComponent(component: string[], childrenByParent: Map<string, string[]>) {
  const componentNodes = new Set(component);
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (node: string): boolean => {
    if (visiting.has(node)) {
      return true;
    }

    if (visited.has(node)) {
      return false;
    }

    visiting.add(node);

    for (const child of childrenByParent.get(node) ?? []) {
      if (componentNodes.has(child) && visit(child)) {
        return true;
      }
    }

    visiting.delete(node);
    visited.add(node);
    return false;
  };

  return component.some((node) => visit(node));
}

function buildTree(node: string, childrenByParent: Map<string, string[]>): Record<string, unknown> {
  const children = childrenByParent.get(node) ?? [];
  const nestedChildren: Record<string, unknown> = {};

  for (const child of children) {
    Object.assign(nestedChildren, buildTree(child, childrenByParent));
  }

  return {
    [node]: nestedChildren,
  };
}

function getDepth(node: string, childrenByParent: Map<string, string[]>): number {
  const children = childrenByParent.get(node) ?? [];

  if (children.length === 0) {
    return 1;
  }

  return 1 + Math.max(...children.map((child) => getDepth(child, childrenByParent)));
}

function selectRoot(component: string[], parentByChild: Map<string, string>) {
  return component.filter((node) => !parentByChild.has(node)).sort()[0] ?? component[0] ?? "";
}
