import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isFile(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}
