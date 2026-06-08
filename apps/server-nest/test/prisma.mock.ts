// Minimal in-memory PrismaService stand-in for unit tests.
// Only the surface the services under test touch is implemented.

type AnyRow = Record<string, unknown> & { id?: string };

type Where = Record<string, unknown>;

function matches(row: AnyRow, where: Where | undefined): boolean {
  if (!where) return true;

  return Object.entries(where).every(([key, value]) => {
    if (value === undefined) return true;

    if (key === "AND" && Array.isArray(value)) {
      return value.every((clause) => matches(row, clause as Where));
    }
    if (key === "OR" && Array.isArray(value)) {
      return value.some((clause) => matches(row, clause as Where));
    }
    if (key === "NOT") {
      return !matches(row, value as Where);
    }

    const rowValue = row[key];

    if (value === null) return rowValue === null || rowValue === undefined;

    if (typeof value === "object" && value !== null) {
      const filter = value as {
        in?: unknown[];
        gte?: number | Date;
        lt?: number | Date;
        contains?: string;
        not?: unknown;
      };
      if (filter.in) return filter.in.includes(rowValue as unknown);
      if (filter.gte !== undefined && rowValue !== undefined) {
        return (rowValue as number | Date) >= filter.gte;
      }
      if (filter.lt !== undefined && rowValue !== undefined) {
        return (rowValue as number | Date) < filter.lt;
      }
      if (filter.contains !== undefined && typeof rowValue === "string") {
        return rowValue.includes(filter.contains);
      }
      if ("not" in filter) {
        if (filter.not === null) return rowValue !== null && rowValue !== undefined;
        return rowValue !== filter.not;
      }
      // Nested relation match (e.g. where.product.familyId)
      if (rowValue && typeof rowValue === "object") {
        return matches(rowValue as AnyRow, filter as Where);
      }
      return false;
    }

    return rowValue === value;
  });
}

interface TableOptions {
  // Some tables don't have an `id` column we need to auto-generate; pass false
  // to disable.
  generateId?: boolean;
}

function createTable<T extends AnyRow>(seed: T[] = [], options: TableOptions = {}) {
  const generateId = options.generateId !== false;
  const rows: T[] = [...seed];
  let counter = rows.length;

  const findMany = jest.fn(
    async (args?: {
      where?: Where;
      orderBy?: Record<string, "asc" | "desc">;
      take?: number;
      skip?: number;
      cursor?: { id?: string };
    }) => {
      let result = rows.filter((row) => matches(row, args?.where));
      if (args?.orderBy) {
        const [[key, direction]] = Object.entries(args.orderBy);
        result = [...result].sort((a, b) => {
          const av = (a[key] as number | string | Date | undefined) ?? "";
          const bv = (b[key] as number | string | Date | undefined) ?? "";
          if (av < bv) return direction === "asc" ? -1 : 1;
          if (av > bv) return direction === "asc" ? 1 : -1;
          return 0;
        });
      }

      if (args?.cursor?.id) {
        const cursorIdx = result.findIndex((row) => row.id === args.cursor!.id);
        if (cursorIdx === -1) {
          result = [];
        } else {
          result = result.slice(cursorIdx + (args.skip ?? 0));
        }
      } else if (args?.skip) {
        result = result.slice(args.skip);
      }

      if (typeof args?.take === "number") {
        result = result.slice(0, args.take);
      }

      return result;
    },
  );

  const findFirst = jest.fn(async (args?: { where?: Where }) => {
    return rows.find((row) => matches(row, args?.where)) ?? null;
  });

  const findUnique = jest.fn(async (args: { where: Where; include?: Record<string, unknown> }) => {
    const row = rows.find((row) => matches(row, args.where));
    if (!row) return null;
    if (!args.include) return row;
    return { ...row };
  });

  const count = jest.fn(async (args?: { where?: Where }) => {
    return rows.filter((row) => matches(row, args?.where)).length;
  });

  const create = jest.fn(async (args: { data: Partial<T> }) => {
    const row = {
      ...(generateId ? { id: `id_${++counter}` } : {}),
      ...args.data,
    } as T;
    rows.push(row);
    return row;
  });

  const update = jest.fn(async (args: { where: Where; data: Partial<T> }) => {
    const idx = rows.findIndex((row) => matches(row, args.where));
    if (idx === -1) throw new Error("Record not found");
    rows[idx] = { ...rows[idx], ...args.data };
    return rows[idx];
  });

  const upsert = jest.fn(
    async (args: { where: Where; create: Partial<T>; update: Partial<T> }) => {
      const idx = rows.findIndex((row) => matches(row, args.where));
      if (idx === -1) {
        const row = {
          ...(generateId ? { id: `id_${++counter}` } : {}),
          ...args.create,
        } as T;
        rows.push(row);
        return row;
      }
      rows[idx] = { ...rows[idx], ...args.update };
      return rows[idx];
    },
  );

  const deleteOne = jest.fn(async (args: { where: Where }) => {
    const idx = rows.findIndex((row) => matches(row, args.where));
    if (idx === -1) throw new Error("Record not found");
    const [removed] = rows.splice(idx, 1);
    return removed;
  });

  const deleteMany = jest.fn(async (args?: { where?: Where }) => {
    const before = rows.length;
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      if (matches(rows[i], args?.where)) rows.splice(i, 1);
    }
    return { count: before - rows.length };
  });

  const updateMany = jest.fn(async (args: { where?: Where; data: Partial<T> }) => {
    let touched = 0;
    rows.forEach((row, idx) => {
      if (matches(row, args.where)) {
        rows[idx] = { ...row, ...args.data };
        touched += 1;
      }
    });
    return { count: touched };
  });

  const createMany = jest.fn(async (args: { data: Array<Partial<T>> }) => {
    for (const data of args.data) {
      rows.push({
        ...(generateId ? { id: `id_${++counter}` } : {}),
        ...data,
      } as T);
    }
    return { count: args.data.length };
  });

  return {
    rows,
    findMany,
    findFirst,
    findUnique,
    count,
    create,
    update,
    upsert,
    delete: deleteOne,
    deleteMany,
    updateMany,
    createMany,
  };
}

export interface PrismaMock {
  family: ReturnType<typeof createTable>;
  familyMember: ReturnType<typeof createTable>;
  familyAddress: ReturnType<typeof createTable>;
  product: ReturnType<typeof createTable>;
  productBatch: ReturnType<typeof createTable>;
  pet: ReturnType<typeof createTable>;
  stockLog: ReturnType<typeof createTable>;
  reminder: ReturnType<typeof createTable>;
  restockItem: ReturnType<typeof createTable>;
  notificationSettings: ReturnType<typeof createTable>;
  userProfile: ReturnType<typeof createTable>;
  $transaction: jest.Mock;
}

export function createPrismaMock(initial: {
  family?: AnyRow[];
  familyMember?: AnyRow[];
  familyAddress?: AnyRow[];
  product?: AnyRow[];
  productBatch?: AnyRow[];
  pet?: AnyRow[];
  stockLog?: AnyRow[];
  reminder?: AnyRow[];
  restockItem?: AnyRow[];
  notificationSettings?: AnyRow[];
  userProfile?: AnyRow[];
} = {}): PrismaMock {
  const mock: PrismaMock = {
    family: createTable(initial.family ?? []),
    familyMember: createTable(initial.familyMember ?? []),
    familyAddress: createTable(initial.familyAddress ?? [], { generateId: false }),
    product: createTable(initial.product ?? []),
    productBatch: createTable(initial.productBatch ?? []),
    pet: createTable(initial.pet ?? []),
    stockLog: createTable(initial.stockLog ?? []),
    reminder: createTable(initial.reminder ?? []),
    restockItem: createTable(initial.restockItem ?? []),
    notificationSettings: createTable(initial.notificationSettings ?? [], { generateId: false }),
    userProfile: createTable(initial.userProfile ?? []),
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(mock)),
  };

  // Make family.findUnique honor `include: { members, address }` so service
  // methods that rely on the relation graph (e.g. FamilyService.toOverview)
  // can compute member counts and address shapes correctly.
  mock.family.findUnique.mockImplementation(
    async (args: { where: Where; include?: { members?: unknown; address?: unknown } }) => {
      const row = mock.family.rows.find((candidate) => matches(candidate, args.where));
      if (!row) return null;
      if (!args.include) return row;
      const familyId = row.id as string;
      const next: Record<string, unknown> = { ...row };
      if (args.include.members) {
        next.members = mock.familyMember.rows
          .filter((member) => member.familyId === familyId)
          .sort((a, b) => {
            const aTime = (a.createdAt as Date | undefined)?.getTime() ?? 0;
            const bTime = (b.createdAt as Date | undefined)?.getTime() ?? 0;
            return aTime - bTime;
          });
      }
      if (args.include.address) {
        next.address =
          mock.familyAddress.rows.find((addr) => addr.familyId === familyId) ?? null;
      }
      return next;
    },
  );

  return mock;
}
