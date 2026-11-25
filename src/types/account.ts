export type AccountRole = 'customer' | 'admin';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  createdAt: string;
}

export interface CustomerReview {
  id: string;
  userId: string;
  authorName: string;
  rating: number;
  productId: string | null;
  productName: string | null;
  comment: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReview extends CustomerReview {
  authorEmail: string;
  moderatedAt: string | null;
}

export interface PublicReviewsResponse {
  reviews: CustomerReview[];
  stats: {
    approvedCount: number;
    averageRating: number | null;
  };
}

export interface AdminReviewsResponse {
  reviews: AdminReview[];
  summary: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
}

export interface AdminStatusResponse {
  configured: boolean;
  source: 'env' | 'claimed' | 'unclaimed';
  authenticated: boolean;
}
