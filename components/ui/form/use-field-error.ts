import { useFormState } from 'react-hook-form';
import { useFormContext } from './form';

export function useFieldError(name: string) {
  const formContext = useFormContext();
  const control = formContext?.control;

  const { errors } = useFormState({
    control,
    name: name as any,
  });

  if (!name) return undefined;
  const error = (errors as any)?.[name];
  return (error?.message as string) || undefined;
}