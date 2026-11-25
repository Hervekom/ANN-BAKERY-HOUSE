import {
  AdminReviewsResponse,
  AdminStatusResponse,
  CustomerReview,
  CustomerUser,
  PublicReviewsResponse,
  ReviewStatus,
} from '../types/account';

// Keep Bearer tokens exclusively in JS memory (never in localStorage or sessionStorage).
let customerToken: string | null = null;
let adminToken: string | null = null;

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  tokenKind: 'none' | 'customer' | 'admin' = 'none',
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token =
    tokenKind === 'customer' ? customerToken : tokenKind === 'admin' ? adminToken : null;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : 'Request could not be completed. Please try again.';
    throw new Error(message);
  }

  return data as T;
}

export function clearCustomerToken(): void {
  customerToken = null;
}

export function clearAdminToken(): void {
  adminToken = null;
}

export async function registerCustomer(payload: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<CustomerUser> {
  const result = await apiRequest<{ token: string; user: CustomerUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  customerToken = result.token;
  return result.user;
}

export async function loginCustomer(payload: {
  email: string;
  password: string;
}): Promise<CustomerUser> {
  const result = await apiRequest<{ token: string; user: CustomerUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  customerToken = result.token;
  return result.user;
}

export async function logoutCustomer(): Promise<void> {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' }, 'customer');
  } finally {
    customerToken = null;
  }
}

export async function updateCustomerProfile(name: string): Promise<CustomerUser> {
  const result = await apiRequest<{ user: CustomerUser }>(
    '/api/auth/profile',
    {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    },
    'customer',
  );
  return result.user;
}

export async function changeCustomerPassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    '/api/auth/change-password',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    'customer',
  );
}

export async function requestPasswordReset(
  email: string,
): Promise<{ emailDeliveryConfigured: boolean; message: string }> {
  return apiRequest<{ emailDeliveryConfigured: boolean; message: string }>(
    '/api/auth/forgot-password',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
  );
}

export async function fetchApprovedReviews(): Promise<PublicReviewsResponse> {
  return apiRequest<PublicReviewsResponse>('/api/reviews');
}

export async function fetchMyReviews(): Promise<CustomerReview[]> {
  if (!customerToken) return [];
  const result = await apiRequest<{ reviews: CustomerReview[] }>(
    '/api/reviews/mine',
    {},
    'customer',
  );
  return result.reviews;
}

export async function createReview(payload: {
  rating: number;
  productId: string | null;
  comment: string;
}): Promise<CustomerReview> {
  const result = await apiRequest<{ review: CustomerReview }>(
    '/api/reviews',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    'customer',
  );
  return result.review;
}

export async function updateReview(
  reviewId: string,
  payload: {
    rating: number;
    productId: string | null;
    comment: string;
  },
): Promise<CustomerReview> {
  const result = await apiRequest<{ review: CustomerReview }>(
    `/api/reviews/${encodeURIComponent(reviewId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    'customer',
  );
  return result.review;
}

export async function deleteReview(reviewId: string): Promise<void> {
  await apiRequest<{ ok: boolean }>(
    `/api/reviews/${encodeURIComponent(reviewId)}`,
    { method: 'DELETE' },
    'customer',
  );
}

export async function fetchAdminStatus(): Promise<AdminStatusResponse> {
  return apiRequest<AdminStatusResponse>('/api/admin/status', {}, 'admin');
}

export async function bootstrapAdminPasscode(payload: {
  passcode: string;
  confirmPasscode: string;
}): Promise<void> {
  const result = await apiRequest<{ token: string }>('/api/admin/bootstrap', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  adminToken = result.token;
}

export async function loginAdminModerator(passcode: string): Promise<void> {
  const result = await apiRequest<{ token: string }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ passcode }),
  });
  adminToken = result.token;
}

export async function fetchAdminReviews(
  status: 'all' | ReviewStatus = 'all',
): Promise<AdminReviewsResponse> {
  return apiRequest<AdminReviewsResponse>(
    `/api/admin/reviews?status=${encodeURIComponent(status)}`,
    {},
    'admin',
  );
}

export async function moderateAdminReview(
  reviewId: string,
  status: ReviewStatus,
): Promise<void> {
  await apiRequest(
    `/api/admin/reviews/${encodeURIComponent(reviewId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    'admin',
  );
}

export async function deleteAdminReview(reviewId: string): Promise<void> {
  await apiRequest(
    `/api/admin/reviews/${encodeURIComponent(reviewId)}`,
    { method: 'DELETE' },
    'admin',
  );
}
