import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { FindCategoryDto } from './dto/find-category.dto';

@Controller('category')
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: FindCategoryDto) {
    return this.categoryService.findAll(req.user.sub, query);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateCategoryDto) {
    return this.categoryService.create(req.user.sub, dto);
  }
}