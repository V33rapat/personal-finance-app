import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, transaction_type } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { FindCategoryDto } from './dto/find-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, query: FindCategoryDto) {
    return this.prisma.categories.findMany({
      where:{
        AND: [
          {
            OR: [
              { user_id: userId },
              { user_id: null, is_system: true }
            ],
          },
          query.type ? { type: query.type } : {},
          query.search?.trim() ? { 
            name: { 
              contains: query.search.trim(),
              mode: 'insensitive',
            }, 
          } 
        : {},
        ],
      },
      orderBy: [
        { is_system: 'desc' },
        { name: 'asc' },
      ],
    });
  }
  
  async create(userId: string, dto: CreateCategoryDto) {
    const name = dto.name.trim();

    const existingCategory = await this.prisma.categories.findFirst({
      where: { 
        name: { equals: name, mode: 'insensitive' },
        type: dto.type,
        OR: [
          { user_id: userId },
          { user_id: null, is_system: true }
        ],
      },
    });

    if (existingCategory) {
      return existingCategory;
    }

    try {
      return await this.prisma.categories.create({
        data: {
          user_id: userId,
          name,
          type: dto.type as transaction_type,
          color: dto.color,
          icon: dto.icon,
          is_system: false,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Category already exists');
      }

      throw error;
    }
  }

  async delete(userId: string, id: string) {
    const category = await this.prisma.categories.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.is_system || category.user_id !== userId) {
      throw new ForbiddenException('You cannot delete this category');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.transaction_templates.updateMany({
        where: {
          user_id: userId,
          category_id: id,
        },
        data: {
          category_id: null,
        },
      });

      await tx.transactions.updateMany({
        where: {
          category_id: id,
          wallets: {
            user_id: userId,
          },
        },
        data: {
          category_id: null,
        },
      });

      return tx.categories.delete({
        where: { id },
      });
    });
  }
}
