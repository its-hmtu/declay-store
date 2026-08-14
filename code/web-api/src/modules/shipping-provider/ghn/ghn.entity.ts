import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from 'sequelize';
import { sequelize } from '@/config/sequelize';

/** M-13a: bản sao dữ liệu địa giới GHN, làm nguồn cho dropdown địa chỉ. */

export class GhnProvinceModel extends Model<InferAttributes<GhnProvinceModel>, InferCreationAttributes<GhnProvinceModel>> {
  declare provinceId: number;
  declare name: string;
  declare code: CreationOptional<string | null>;
  declare syncedAt: CreationOptional<Date>;
}

GhnProvinceModel.init({
  provinceId: { type: DataTypes.INTEGER, primaryKey: true, field: 'province_id' },
  name: { type: DataTypes.STRING(255), allowNull: false },
  code: { type: DataTypes.STRING(20), allowNull: true },
  syncedAt: { type: DataTypes.DATE, field: 'synced_at' },
}, { sequelize, tableName: 'ghn_provinces', timestamps: false });

export class GhnDistrictModel extends Model<InferAttributes<GhnDistrictModel>, InferCreationAttributes<GhnDistrictModel>> {
  declare districtId: number;
  declare provinceId: number;
  declare name: string;
  declare supportType: CreationOptional<number>;
  declare syncedAt: CreationOptional<Date>;
}

GhnDistrictModel.init({
  districtId: { type: DataTypes.INTEGER, primaryKey: true, field: 'district_id' },
  provinceId: { type: DataTypes.INTEGER, allowNull: false, field: 'province_id' },
  name: { type: DataTypes.STRING(255), allowNull: false },
  supportType: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 3, field: 'support_type' },
  syncedAt: { type: DataTypes.DATE, field: 'synced_at' },
}, { sequelize, tableName: 'ghn_districts', timestamps: false });

export class GhnWardModel extends Model<InferAttributes<GhnWardModel>, InferCreationAttributes<GhnWardModel>> {
  declare wardCode: string;
  declare districtId: number;
  declare name: string;
  /** 0:Lock 1:Take/Pay 2:Deliver 3:Take/Deliver/Pay — phường cũng có thể bị khoá. */
  declare supportType: CreationOptional<number>;
  declare syncedAt: CreationOptional<Date>;
}

GhnWardModel.init({
  wardCode: { type: DataTypes.STRING(20), primaryKey: true, field: 'ward_code' },
  districtId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, field: 'district_id' },
  name: { type: DataTypes.STRING(255), allowNull: false },
  supportType: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 3, field: 'support_type' },
  syncedAt: { type: DataTypes.DATE, field: 'synced_at' },
}, { sequelize, tableName: 'ghn_wards', timestamps: false });

/** Dịch vụ khả dụng theo tuyến, cache lại từ /available-services. */
export class GhnServiceModel extends Model<InferAttributes<GhnServiceModel>, InferCreationAttributes<GhnServiceModel>> {
  declare fromDistrictId: number;
  declare toDistrictId: number;
  declare serviceId: number;
  declare serviceTypeId: number;
  declare shortName: CreationOptional<string | null>;
  declare syncedAt: CreationOptional<Date>;
}

GhnServiceModel.init({
  fromDistrictId: { type: DataTypes.INTEGER, primaryKey: true, field: 'from_district_id' },
  toDistrictId: { type: DataTypes.INTEGER, primaryKey: true, field: 'to_district_id' },
  serviceId: { type: DataTypes.INTEGER, primaryKey: true, field: 'service_id' },
  serviceTypeId: { type: DataTypes.SMALLINT, allowNull: false, field: 'service_type_id' },
  shortName: { type: DataTypes.STRING(60), allowNull: true, field: 'short_name' },
  syncedAt: { type: DataTypes.DATE, field: 'synced_at' },
}, { sequelize, tableName: 'ghn_services', timestamps: false });
