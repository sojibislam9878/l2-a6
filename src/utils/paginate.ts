export type PaginationInput = {
  page?: number | undefined;
  limit?: number | undefined;
  sortBy?: string | undefined;
  sortOrder?: "asc" | "desc" | undefined;
};

export type Pagination = {
  skip: number;
  take: number;
  page: number;
  limit: number;
  orderBy: Record<string, "asc" | "desc">;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export const buildPagination = (
  input: PaginationInput,
  allowedSortFields: readonly string[],
  defaultSortBy: string,
): Pagination => {
  const page = input.page ?? 1;
  const limit = input.limit ?? 10;
  const sortBy =
    input.sortBy !== undefined && allowedSortFields.includes(input.sortBy)
      ? input.sortBy
      : defaultSortBy;
  const sortOrder = input.sortOrder ?? "desc";

  return {
    skip: (page - 1) * limit,
    take: limit,
    page,
    limit,
    orderBy: { [sortBy]: sortOrder },
  };
};

export const buildMeta = (page: number, limit: number, total: number): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});
