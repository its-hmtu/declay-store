import AccountShell from '@/components/storefront/account/AccountShell';

export const metadata = { title: 'Account' };

// M-32: layout khu vực Tài khoản — sidebar nhóm dùng chung (tham khảo Home Depot).
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
