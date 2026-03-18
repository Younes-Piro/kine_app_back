import type { PropsWithChildren } from 'react';

import { cn } from '@/lib/utils';

interface PageWrapperProps extends PropsWithChildren {
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return <div className={cn('page-wrapper', className)}>{children}</div>;
}
