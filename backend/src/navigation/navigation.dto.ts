import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Optional, Trim } from '../common/dto/request.dto.js';
import { SuccessDto } from '../common/dto/response.dto.js';

export class FeatureDto {
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
}

export class MenuDto {
  @ApiProperty() code!: string;
  @ApiProperty({ enum: ['directory', 'page'] }) kind!: string;
  @ApiProperty() isSystem!: boolean;
  @ApiProperty({ type: String, nullable: true }) parentCode!: string | null;
  @ApiProperty({ type: String, nullable: true }) path!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) i18nKey!: string | null;
  @ApiProperty() icon!: string;
  @ApiProperty({ type: 'integer' }) sortOrder!: number;
  @ApiProperty({ enum: ['authenticated', 'platform', 'tenant'] })
  scope!: string;
  @ApiProperty({ enum: ['admin', 'user'] }) minRole!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: String, nullable: true }) featureCode!: string | null;
}

export class NavigationDto {
  @ApiProperty({ type: [MenuDto] }) menus!: MenuDto[];
  @ApiProperty({ type: [String] }) allowedPaths!: string[];
  @ApiProperty({ type: [String] }) permissions!: string[];
}

export class NavigationResponseDto extends SuccessDto {
  @ApiProperty({ type: NavigationDto }) data!: NavigationDto;
}
export class FeatureListResponseDto extends SuccessDto {
  @ApiProperty({ type: [FeatureDto] }) data!: FeatureDto[];
}
export class MenuListResponseDto extends SuccessDto {
  @ApiProperty({ type: [MenuDto] }) data!: MenuDto[];
}
export class TenantFeaturesResponseDto extends SuccessDto {
  @ApiProperty({ type: [String] }) data!: string[];
}
export class AssignFeaturesDto {
  @ApiProperty({ type: [String], maxItems: 100, uniqueItems: true })
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(/^[a-z0-9-]{1,64}$/, { each: true })
  featureCodes!: string[];
}
export class UpdateMenuDto {
  @ApiPropertyOptional({
    maxLength: 150,
    description: '语言包翻译键；留空显示菜单名称',
  })
  @Optional()
  @IsString()
  @MaxLength(150)
  @Matches(/^[a-zA-Z0-9_.-]*$/)
  i18nKey?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '父目录编码；null 表示根目录，省略表示保持原层级',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]{1,64}$/)
  parentCode?: string | null;
  @ApiProperty({ maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    maxLength: 64,
    description: '前端图标白名单编码；留空不显示图标',
  })
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9-]*$/)
  icon!: string;

  @ApiProperty({ type: 'integer', minimum: 0, maximum: 10000 })
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder!: number;

  @ApiProperty({
    description: '关闭后隐藏菜单入口；页面和接口仍按模块与角色授权',
  })
  @IsBoolean()
  isActive!: boolean;
}

export class CreateMenuDto extends UpdateMenuDto {
  @ApiProperty({ enum: ['directory', 'page'] })
  @IsIn(['directory', 'page'])
  kind!: 'directory' | 'page';

  @ApiPropertyOptional({
    enum: ['tenant', 'platform'],
    description: '新增目录时必填，页面所属端从注册表确定',
  })
  @ValidateIf((body) => body.kind === 'directory')
  @IsIn(['tenant', 'platform'])
  scope?: 'tenant' | 'platform';

  @ApiPropertyOptional({
    description: '新增页面菜单时必填，只能选择已注册页面',
  })
  @ValidateIf((body) => body.kind === 'page')
  @IsString()
  @Matches(/^[a-z0-9-]{1,64}$/)
  pageCode?: string;
}

export class RegisteredPageDto extends FeatureDto {
  @ApiProperty() path!: string;
  @ApiProperty({ enum: ['authenticated', 'platform', 'tenant'] })
  scope!: string;
  @ApiProperty({ type: String, nullable: true }) featureCode!: string | null;
  @ApiProperty({ enum: ['admin', 'user'] }) minRole!: string;
}

export class RegisteredPageListResponseDto extends SuccessDto {
  @ApiProperty({ type: [RegisteredPageDto] }) data!: RegisteredPageDto[];
}
export class MenuCodeParamDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9-]{1,64}$/)
  code!: string;
}
