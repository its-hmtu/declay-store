'use client';

import { useEffect, useState } from 'react';
import { ghnApi } from '@/lib/api';
import { useT } from '@/lib/i18n/LocaleProvider';

export interface VietnamAddressValue {
  provinceId: number | null;
  districtId: number | null;
  wardCode: string | null;
  /** Tên hiển thị, gửi kèm để lưu vào địa chỉ và in lên vận đơn. */
  provinceName: string;
  districtName: string;
  wardName: string;
}

export const emptyVietnamAddress: VietnamAddressValue = {
  provinceId: null, districtId: null, wardCode: null,
  provinceName: '', districtName: '', wardName: '',
};

/**
 * M-13c: chọn Tỉnh/Thành → Quận/Huyện → Phường/Xã từ dữ liệu địa giới của GHN.
 *
 * Vì sao là dropdown chứ không phải ô nhập tự do: GHN tính phí theo mã số
 * (`district_id`, `ward_code`), không theo tên. Ô nhập tự do sẽ tạo ra
 * "Q.1" / "Quận 1" / "Quan 1" — không tra được mã, không tính được phí.
 *
 * Quận GHN không giao tới được đánh dấu và khoá chọn ngay tại đây, thay vì để
 * khách điền hết form rồi mới báo lỗi ở bước cuối.
 */
export default function VietnamAddressSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: VietnamAddressValue;
  onChange: (next: VietnamAddressValue) => void;
  disabled?: boolean;
}) {
  const { t } = useT();
  const [provinces, setProvinces] = useState<{ provinceId: number; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ districtId: number; name: string; canDeliver: boolean }[]>([]);
  const [wards, setWards] = useState<{ wardCode: string; name: string; canDeliver: boolean }[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    ghnApi.provinces()
      .then(({ data }) => { setProvinces(data); setError(false); })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (!value.provinceId) { setDistricts([]); return; }
    ghnApi.districts(value.provinceId)
      .then(({ data }) => setDistricts(data))
      .catch(() => setDistricts([]));
  }, [value.provinceId]);

  useEffect(() => {
    if (!value.districtId) { setWards([]); return; }
    ghnApi.wards(value.districtId)
      .then(({ data }) => setWards(data))
      .catch(() => setWards([]));
  }, [value.districtId]);

  const selectCls =
    'w-full px-3 py-2.5 border border-border rounded-lg bg-surface text-text text-sm ' +
    'focus:outline-none focus:border-brand disabled:opacity-50 disabled:cursor-not-allowed';

  if (error) {
    return (
      <p className="text-sm text-error">{t('address.unavailable')}</p>
    );
  }

  return (
    <div className="grid sm:grid-cols-3 gap-2">
      <select
        className={selectCls}
        disabled={disabled}
        value={value.provinceId ?? ''}
        onChange={(e) => {
          const id = Number(e.target.value) || null;
          const name = provinces.find((p) => p.provinceId === id)?.name ?? '';
          // Đổi tỉnh thì quận/phường cũ không còn hợp lệ — xoá luôn.
          onChange({ ...emptyVietnamAddress, provinceId: id, provinceName: name });
        }}
      >
        <option value="">{t('address.province')}</option>
        {provinces.map((p) => (
          <option key={p.provinceId} value={p.provinceId}>{p.name}</option>
        ))}
      </select>

      <select
        className={selectCls}
        disabled={disabled || !value.provinceId}
        value={value.districtId ?? ''}
        onChange={(e) => {
          const id = Number(e.target.value) || null;
          const name = districts.find((d) => d.districtId === id)?.name ?? '';
          onChange({
            ...value, districtId: id, districtName: name,
            wardCode: null, wardName: '',
          });
        }}
      >
        <option value="">{t('address.district')}</option>
        {districts.map((d) => (
          <option key={d.districtId} value={d.districtId} disabled={!d.canDeliver}>
            {d.name}{d.canDeliver ? '' : ` — ${t('address.notServed')}`}
          </option>
        ))}
      </select>

      <select
        className={selectCls}
        disabled={disabled || !value.districtId}
        value={value.wardCode ?? ''}
        onChange={(e) => {
          const code = e.target.value || null;
          const name = wards.find((w) => w.wardCode === code)?.name ?? '';
          onChange({ ...value, wardCode: code, wardName: name });
        }}
      >
        <option value="">{t('address.ward')}</option>
        {wards.map((w) => (
          <option key={w.wardCode} value={w.wardCode} disabled={!w.canDeliver}>
            {w.name}{w.canDeliver ? '' : ` — ${t('address.notServed')}`}
          </option>
        ))}
      </select>
    </div>
  );
}
