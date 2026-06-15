import React, { startTransition } from "react";
import {
  useNavigate,
  useLocation,
  useSearchParams as useSearchParamsRR,
} from "react-router-dom";

// 1. Fully-compatible Link Component with startTransition for buttery smooth UX
export interface LinkProps extends Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> {
  href: string;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, onClick, ...props }, ref) => {
    const navigate = useNavigate();

    const handleClick = (
      e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    ) => {
      if (onClick) onClick(e);
      if (
        !e.defaultPrevented &&
        e.button === 0 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey
      ) {
        e.preventDefault();
        startTransition(() => {
          navigate(href);
        });
      }
    };

    return <a href={`#${href}`} onClick={handleClick} {...props} ref={ref} />;
  },
);
Link.displayName = "Link";

// 2. Fully-compatible useRouter Hook
export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (url: string) => startTransition(() => navigate(url)),
    replace: (url: string) =>
      startTransition(() => navigate(url, { replace: true })),
    back: () => startTransition(() => navigate(-1)),
    forward: () => startTransition(() => navigate(1)),
  };
}

// 3. Fully-compatible usePathname Hook
export function usePathname() {
  const location = useLocation();
  return location.pathname;
}

// 4. Fully-compatible useSearchParams Hook
export function useSearchParams() {
  const [searchParams] = useSearchParamsRR();
  return searchParams;
}
