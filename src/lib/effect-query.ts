/**
 * Effect-Query Adapter
 *
 * Provides utilities for integrating Effect-based Result<T> pattern
 * with React Query's query and mutation functions.
 */

import type { UseMutationOptions } from '@tanstack/react-query';
import type { AppError, Result } from './effect-result';

/**
 * Wraps a Result<T> returning function to be used as React Query's queryFn.
 * Converts failure results to thrown errors for React Query's error handling.
 *
 * @param fn - Async function that returns Result<T>
 * @returns Function that returns T or throws Error
 */
export function effectQueryFn<T>(
  fn: () => Promise<Result<T>>
): () => Promise<T> {
  return async () => {
    const result = await fn();
    if (result.success === false) {
      throw new Error(result.error.message);
    }
    return result.data;
  };
}

/**
 * Wraps a Result<T> returning function with a data extractor.
 * Use when the result shape differs from standard Result<T>.
 *
 * @param fn - Async function that returns a custom result type
 * @param extractData - Function to extract data from the result
 * @returns Function that returns T or throws Error
 */
export function effectQueryFnWith<TInput, TOutput>(
  fn: (input: TInput) => Promise<{ success: boolean; error?: AppError; [key: string]: unknown }>,
  extractData: (result: Awaited<ReturnType<typeof fn>>) => TOutput
): (input: TInput) => Promise<TOutput> {
  return async (input: TInput) => {
    const result = await fn(input);
    if (result.success === false) {
      throw new Error(result.error?.message ?? 'Unknown error');
    }
    return extractData(result);
  };
}

/**
 * Creates mutation options for Effect-based mutation functions.
 *
 * @param fn - Async function that returns Result<TOutput>
 * @param options - Additional mutation options
 * @returns UseMutationOptions for React Query
 */
export function createMutationOptions<TInput, TOutput>(
  fn: (input: TInput) => Promise<Result<TOutput>>,
  options?: Omit<UseMutationOptions<TOutput, Error, TInput>, 'mutationFn'>
): UseMutationOptions<TOutput, Error, TInput> {
  return {
    mutationFn: async (input: TInput) => {
      const result = await fn(input);
      if (result.success === false) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    ...options,
  };
}

/**
 * Creates mutation options with custom result shape.
 *
 * @param fn - Async function with custom result type
 * @param extractData - Function to extract data from result
 * @param options - Additional mutation options
 * @returns UseMutationOptions for React Query
 */
export function createMutationOptionsWith<TInput, TResult extends { success: boolean; error?: AppError }, TOutput>(
  fn: (input: TInput) => Promise<TResult>,
  extractData: (result: TResult) => TOutput,
  options?: Omit<UseMutationOptions<TOutput, Error, TInput>, 'mutationFn'>
): UseMutationOptions<TOutput, Error, TInput> {
  return {
    mutationFn: async (input: TInput) => {
      const result = await fn(input);
      if (result.success === false) {
        throw new Error(result.error?.message ?? 'Unknown error');
      }
      return extractData(result);
    },
    ...options,
  };
}
