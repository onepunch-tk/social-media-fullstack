import type { RequestFailedError } from '@shared/application/errors/request-failed.error';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
export function applyRequestError<T extends FieldValues>(
  error: RequestFailedError,
  form: Pick<UseFormReturn<T>, 'setError' | 'getValues'>,
) {
  const known = new Set(Object.keys(form.getValues()));
  const isField = (name: string): name is Path<T> => known.has(name);

  let applied = false;
  for (const [name, message] of Object.entries(error.fields)) {
    if (!isField(name)) continue;
    form.setError(name, { type: 'server', message });
    applied = true;
  }

  if (!applied) form.setError('root.server', { type: 'server', message: error.message });
}
