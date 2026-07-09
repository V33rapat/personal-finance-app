import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, transaction_type } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionTemplateDto } from './dto/create-transaction-template.dto';
import { FindTransactionTemplateDto } from './dto/find-transaction-template.dto';
import { UpdateTransactionTemplateDto } from './dto/update-transaction-template.dto';

@Injectable()
export class TransactionTemplateService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, query: FindTransactionTemplateDto) {
    return this.prisma.transaction_templates.findMany({
      where: {
        user_id: userId,
        is_active: true,
        ...(query.type ? { type: query.type } : {}),
      },
      include: { categories: true },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(userId: string, id: string) {
    const template = await this.prisma.transaction_templates.findFirst({
      where: {
        id,
        user_id: userId,
        is_active: true,
      },
      include: { categories: true },
    });

    if (!template) {
      throw new NotFoundException('Transaction template not found');
    }

    return template;
  }

  async create(userId: string, dto: CreateTransactionTemplateDto) {
    const name = this.normalizeName(dto.name);
    const categoryId = await this.resolveCategoryId(
      userId,
      dto.category_id,
      dto.type,
    );

    const existing = await this.prisma.transaction_templates.findFirst({
      where: {
        user_id: userId,
        name: { equals: name, mode: 'insensitive' },
        type: dto.type,
      },
    });

    if (existing?.is_active) {
      throw new ConflictException('Transaction template already exists');
    }

    if (existing) {
      return this.prisma.transaction_templates.update({
        where: { id: existing.id },
        data: {
          name,
          default_amount: dto.default_amount,
          category_id: categoryId,
          note: dto.note?.trim() || null,
          is_active: true,
          updated_at: new Date(),
        },
        include: { categories: true },
      });
    }

    try {
      return await this.prisma.transaction_templates.create({
        data: {
          user_id: userId,
          name,
          type: dto.type as transaction_type,
          default_amount: dto.default_amount,
          category_id: categoryId,
          note: dto.note?.trim() || null,
          is_active: true,
        },
        include: { categories: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Transaction template already exists');
      }

      throw error;
    }
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTransactionTemplateDto,
  ) {
    const template = await this.findOne(userId, id);
    const nextName =
      dto.name !== undefined ? this.normalizeName(dto.name) : template.name;
    const nextType = dto.type ?? template.type;
    const nextCategoryId =
      dto.category_id !== undefined ? dto.category_id : template.category_id;
    const categoryId = await this.resolveCategoryId(
      userId,
      nextCategoryId,
      nextType,
    );

    const duplicate = await this.prisma.transaction_templates.findFirst({
      where: {
        id: { not: id },
        user_id: userId,
        name: { equals: nextName, mode: 'insensitive' },
        type: nextType,
        is_active: true,
      },
    });

    if (duplicate) {
      throw new ConflictException('Transaction template already exists');
    }

    return this.prisma.transaction_templates.update({
      where: { id },
      data: {
        name: nextName,
        type: nextType,
        ...(dto.default_amount !== undefined && {
          default_amount: dto.default_amount,
        }),
        category_id: categoryId,
        ...(dto.note !== undefined && { note: dto.note?.trim() || null }),
        updated_at: new Date(),
      },
      include: { categories: true },
    });
  }

  async delete(userId: string, id: string) {
    const template = await this.findOne(userId, id);

    if (template.user_id !== userId) {
      throw new ForbiddenException('You cannot delete this template');
    }

    return this.prisma.transaction_templates.update({
      where: { id },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
      include: { categories: true },
    });
  }

  private async resolveCategoryId(
    userId: string,
    categoryId: string | null | undefined,
    type: 'expense' | 'income',
  ) {
    if (!categoryId) {
      return null;
    }

    const category = await this.prisma.categories.findFirst({
      where: {
        id: categoryId,
        type,
        OR: [
          { user_id: userId },
          { user_id: null, is_system: true },
        ],
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category.id;
  }

  private normalizeName(name: string) {
    const trimmedName = name.trim();

    if (!trimmedName) {
      throw new BadRequestException('Template name is required');
    }

    return trimmedName;
  }
}
