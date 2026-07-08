# Tests

## Chạy nhanh (unit — không cần DB/Redis)
```
npm install
npm test           # vitest run (tests/unit/**)
npm run test:watch
```
Bao phủ: `requireRole` (W-05/W-06), `sanitizeAuditBody` (W-09), rate limiters (W-10).

## Integration (cần Postgres test)
Luồng tiền/kho nhạy cảm nên chạy trên một DB dùng-một-lần, không phải DB dev.
```
# 1) Trỏ DB_* vào một Postgres test rỗng, rồi chạy migration:
DB_NAME=declay_test npm run migrate
# 2) Chạy suite integration (opt-in tường minh):
RUN_DB_TESTS=true DB_NAME=declay_test npm run test:integration
```
Hiện có: `stock-oversell.integration.test.ts` — kiểm bất biến chống oversell (W-02/W-03)
bằng hai lần trừ tồn đồng thời trên đơn vị cuối cùng: chỉ một thành công, tồn không âm.

> Mở rộng gợi ý (theo `docs/business-analysis/06-uat-test-cases.md`): idempotency webhook
> (TC-PAY-03), reservation hết hạn (TC-PAY-05), phân quyền qua HTTP bằng supertest
> (TC-ADM-*). Các test HTTP cần thêm Redis + Stripe test key.
