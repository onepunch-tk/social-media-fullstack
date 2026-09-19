import type { RequestFailedError } from '@shared/application/errors/request-failed.error';
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

// query,mutation 의 에러 타입 고정시키기 ApiClientError | null
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: RequestFailedError;
  }
}
