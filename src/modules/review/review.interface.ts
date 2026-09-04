export type IReviewFilters = {
  page?: number | undefined;
  limit?: number | undefined;
  sortOrder?: "asc" | "desc" | undefined;
};

export type IReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  farmer: {
    id: string;
    name: string;
  };
};
