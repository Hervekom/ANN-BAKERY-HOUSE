import {
  AdminReviewsResponse,
  AdminStatusResponse,
  CustomerReview,
  CustomerUser,
  PublicReviewsResponse,
  ReviewStatus,
} from '../types/account';
import { supabase } from '../lib/supabase';

// Keep Bearer tokens exclusively in JS memory (never in localStorage or sessionStorage).
// NOTE: For Supabase Auth, the client handles the session. These tokens are kept
// for compatibility with any remaining legacy /api endpoints.
let customerToken: string | null = null;
let adminToken: string | null = null;

function toCustomerUser(user: any, profile?: any): CustomerUser {
  return {
    id: user.id,
    name: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || 'Customer',
    email: user.email || '',
    role: (user.app_metadata?.role as any) || 'customer',
    createdAt: user.created_at,
  };
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  tokenKind: 'none' | 'customer' | 'admin' = 'none',
): Promise<T> {
  // If we are using Supabase, we should ideally get the session token here.
  // For now, we preserve the legacy memory-token behavior to avoid breaking
  // the admin moderator or reviews endpoints if they still rely on server.ts.
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
  if (!supabase) throw new Error('Supabase is not configured.');

  if (payload.password !== payload.confirmPassword) {
    throw new Error('Password and password confirmation do not match.');
  }

  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.name.trim(),
      },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error('Account creation failed.');

  // If email confirmation is required, the session will be null.
  if (!data.session) {
    throw new Error('Account created! Please check your email to confirm your account before signing in.');
  }

  return toCustomerUser(data.user);
}

export async function loginCustomer(payload: {
  email: string;
  password: string;
}): Promise<CustomerUser> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });

  if (error) throw error;
  if (!data.user) throw new Error('Sign in failed.');

  return toCustomerUser(data.user);
}

export async function logoutCustomer(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  customerToken = null;
}

export async function updateCustomerProfile(name: string): Promise<CustomerUser> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('You must be signed in to update your profile.');

  // 1. Update auth metadata (for the session)
  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: name.trim() },
  });
  if (authError) throw authError;

  // 2. Update the public.profiles table (for RLS and other queries)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: name.trim() })
    .eq('id', user.id)
    .select()
    .single();

  if (profileError) throw profileError;

  return toCustomerUser(user, profile);
}

export async function changeCustomerPassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ message: string }> {
  if (!supabase) throw new Error('Supabase is not configured.');

  if (payload.newPassword !== payload.confirmPassword) {
    throw new Error('New password and confirmation do not match.');
  }

  const { error } = await supabase.auth.updateUser({
    password: payload.newPassword,
  });

  if (error) throw error;

  return { message: 'Your password has been updated securely.' };
}

export async function requestPasswordReset(
  email: string,
): Promise<{ emailDeliveryConfigured: boolean; message: string }> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) throw error;

  return {
    emailDeliveryConfigured: true,
    message: 'If an account exists for this email, you will receive a password reset link shortly.',
  };
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
