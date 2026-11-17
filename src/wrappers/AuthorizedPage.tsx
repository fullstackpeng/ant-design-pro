import { Navigate, Outlet, useLocation, useModel } from '@umijs/max';
import React, { useEffect, useState } from 'react';
import Loading from '@/loading';
import Forbidden from '@/pages/exception/403';
import { currentNavigation, menuTarget } from '@/services/navigation';

export default function AuthorizedPage() {
  const { initialState, setInitialState } = useModel('@@initialState');
  const { pathname } = useLocation();
  const [checked, setChecked] = useState<{
    path: string;
    allowed: boolean;
    target?: string;
  }>();

  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    const refresh = async () => {
      const current = ++generation;
      try {
        const { data } = await currentNavigation();
        if (cancelled || current !== generation) return;
        setInitialState((state) => ({ ...state, navigation: data }));
        setChecked({
          path: pathname,
          allowed: data.allowedPaths.includes(
            pathname.replace(/\/$/, '') || '/',
          ),
          target: menuTarget(data.menus, pathname.replace(/\/$/, '') || '/'),
        });
      } catch {
        if (!cancelled && current === generation) {
          setInitialState((state) => ({ ...state, navigation: undefined }));
          setChecked({ path: pathname, allowed: false });
        }
      }
    };
    void refresh();
    window.addEventListener('focus', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refresh);
    };
  }, [pathname]);

  if (!initialState?.currentUser || checked?.path !== pathname)
    return <Loading />;
  if (!checked.allowed) return <Forbidden />;
  return checked.target && checked.target !== pathname.replace(/\/$/, '') ? (
    <Navigate to={checked.target} replace />
  ) : (
    <Outlet />
  );
}
