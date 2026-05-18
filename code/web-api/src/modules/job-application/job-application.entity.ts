import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';
import Job from '@/modules/job/job.entity';

export type ApplicationStatus = 'received' | 'reviewing' | 'interview' | 'hired' | 'rejected';

class JobApplication extends Model<InferAttributes<JobApplication>, InferCreationAttributes<JobApplication>> {
  declare id: CreationOptional<number>;
  declare jobId: number;
  declare applicantName: string;
  declare email: string;
  declare cvUrl: CreationOptional<string | null>;
  declare coverLetter: CreationOptional<string | null>;
  declare status: CreationOptional<ApplicationStatus>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

JobApplication.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    jobId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'job_id',
      references: { model: 'jobs', key: 'id' },
      onDelete: 'CASCADE',
    },
    applicantName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'applicant_name',
    },
    email: { type: DataTypes.STRING(255), allowNull: false },
    cvUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'cv_url',
    },
    coverLetter: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'cover_letter',
    },
    status: {
      type: DataTypes.ENUM('received', 'reviewing', 'interview', 'hired', 'rejected'),
      allowNull: false,
      defaultValue: 'received',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  {
    sequelize,
    tableName: 'job_applications',
    modelName: 'JobApplication',
    timestamps: true,
    underscored: true,
  },
);

Job.hasMany(JobApplication, { foreignKey: 'jobId', as: 'applications', onDelete: 'CASCADE' });
JobApplication.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

export default JobApplication;
