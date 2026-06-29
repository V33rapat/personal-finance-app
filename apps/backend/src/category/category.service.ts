import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, transaction_type } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-cateogry.dto';
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
}