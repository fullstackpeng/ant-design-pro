import React from 'react';
import MenuManagement from './MenuManagement';

export default function PlatformNavigation() {
  return <MenuManagement scope="platform" includeAuthenticated />;
}
