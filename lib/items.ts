export type ItemInput = {
  name?: string;
  description?: string | null;
  cost?: number;
  imageUrl?: string | null;
  stock?: number | null;
  hidden?: boolean;
  position?: number;
};

export type ItemProblem = { field: string; message: string };

export function validateItem(input: ItemInput, requireName = true): ItemProblem | null {
  if (requireName || input.name !== undefined) {
    if (!input.name?.trim()) return { field: "name", message: "Give it a name." };
  }

  if (input.cost !== undefined) {
    if (!Number.isInteger(input.cost) || input.cost <= 0) {
      return { field: "cost", message: "Cost has to be a whole number above zero." };
    }
  } else if (requireName) {
    return { field: "cost", message: "Cost has to be a whole number above zero." };
  }

  if (input.stock !== undefined && input.stock !== null) {
    if (!Number.isInteger(input.stock) || input.stock < 0) {
      return { field: "stock", message: "Stock has to be a whole number, or empty for unlimited." };
    }
  }

  return null;
}

export function cleanItem(input: ItemInput) {
  return {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
    ...(input.cost !== undefined ? { cost: input.cost } : {}),
    ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl?.trim() || null } : {}),
    ...(input.stock !== undefined ? { stock: input.stock } : {}),
    ...(input.hidden !== undefined ? { hidden: input.hidden } : {}),
    ...(input.position !== undefined ? { position: input.position } : {}),
  };
}
