import { lazy } from 'react';

export const Home = lazy(() => import('@/pages/Home/Home'));
export const Login = lazy(() => import('@/pages/Login/Login'));
export const Library = lazy(() => import('@/pages/Library/Library'));
export const TierList = lazy(() => import('@/pages/TierList/TierList'));
export const TierListEditor = lazy(() => import('@/pages/TierListEditor/TierListEditor'));
export const Recommendations = lazy(() => import('@/pages/Recommendations/Recommendations'));
export const Profile = lazy(() => import('@/pages/Profile/Profile'));
export const Social = lazy(() => import('@/pages/Social/Social'));
export const NotFound = lazy(() => import('@/pages/NotFound/NotFound'));
export const Admin = lazy(() => import('@/pages/Admin/Admin'));
export const PatchNotes = lazy(() => import('@/pages/PatchNotes/PatchNotes'));
export const ItchCallback = lazy(() => import('@/pages/ItchCallback/ItchCallback'));
