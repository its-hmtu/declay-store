'use client';

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { usePathname } from 'next/navigation';
import { cartApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import { guestSession } from '@/lib/guest';
import type { Cart } from '@/lib/types';

/**
 * M-20: trạng thái giỏ hàng dùng chung cho toàn ứng dụng.
 *
 * Vì sao cần: trước đây mỗi màn hình tự gọi API giỏ hàng riêng, và badge trên
 * Header chỉ nạp lại khi ĐỔI TRANG. Thêm hàng xong mà đứng yên tại chỗ thì con
 * số không nhúc nhích — khách tưởng thao tác hỏng và bấm thêm lần nữa.
 *
 * Nay chỉ có MỘT nguồn sự thật: thêm hàng ở bất kỳ đâu cũng cập nhật badge,
 * ngăn kéo giỏ hàng và trang giỏ hàng cùng lúc.
 */

interface CartContextValue {
  cart: Cart | null;
  /** Tổng số lượng sản phẩm, dùng cho badge. */
  count: number;
  loading: boolean;
  /** Ngăn kéo giỏ hàng đang mở hay không. */
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  /** Nạp lại giỏ từ máy chủ. */
  refresh: () => Promise<void>;
  /** Thêm hàng rồi mở ngăn kéo — dùng ở trang sản phẩm và wishlist. */
  addItem: (variantId: number, quantity?: number) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function countCartItems(cart: Cart | null): number {
  return cart?.items?.reduce((n, i) => n + i.quantity, 0) ?? 0;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refresh = useCallback(async () => {
    const token = auth.getToken() ?? undefined;
    // Chưa đăng nhập và cũng chưa có phiên khách vãng lai thì chắc chắn giỏ rỗng
    // — gọi API lúc này chỉ tạo ra một phiên khách rỗng vô ích.
    if (!token && !guestSession.peek()) { setCart(null); return; }
    setLoading(true);
    try {
      const res = await cartApi.get(token);
      setCart(res.data);
    } catch {
      // Giỏ hỏng không được phép làm sập trang; giữ nguyên giá trị cũ.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Nạp lại khi đổi trang: đơn hàng đặt xong sẽ dọn giỏ ở phía máy chủ, nên
  // badge phải phản ánh điều đó khi khách rời trang thanh toán.
  useEffect(() => { refresh(); }, [pathname, refresh]);

  const addItem = useCallback(async (variantId: number, quantity = 1) => {
    const token = auth.getToken() ?? undefined;
    await cartApi.add(token, variantId, quantity);
    await refresh();
    setDrawerOpen(true);
  }, [refresh]);

  const updateItem = useCallback(async (itemId: number, quantity: number) => {
    const token = auth.getToken() ?? undefined;
    const res = await cartApi.update(token, itemId, quantity);
    setCart(res.data);
  }, []);

  const removeItem = useCallback(async (itemId: number) => {
    const token = auth.getToken() ?? undefined;
    const res = await cartApi.remove(token, itemId);
    setCart(res.data);
  }, []);

  const value = useMemo<CartContextValue>(() => ({
    cart,
    count: countCartItems(cart),
    loading,
    drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
    refresh,
    addItem,
    updateItem,
    removeItem,
  }), [cart, loading, drawerOpen, refresh, addItem, updateItem, removeItem]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart phải nằm trong CartProvider');
  return ctx;
}
