import type { RequestHandler } from 'express';

export interface ITag {
  id: number;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateTagData { name: string; slug?: string; }
export interface IUpdateTagData { name?: string; slug?: string; }

export interface ITagService {
  list(): Promise<ITag[]>;
  findById(id: number): Promise<ITag>;
  create(data: ICreateTagData): Promise<ITag>;
  update(id: number, data: IUpdateTagData): Promise<ITag>;
  remove(id: number): Promise<void>;
}

export interface ITagController {
  list: RequestHandler;
  adminList: RequestHandler;
  adminCreate: RequestHandler;
  adminUpdate: RequestHandler;
  adminRemove: RequestHandler;
}
