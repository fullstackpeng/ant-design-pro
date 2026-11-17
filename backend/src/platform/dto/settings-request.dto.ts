import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateBy,
} from 'class-validator';
import { Trim } from '../../common/dto/request.dto.js';
import { SITE_LOCALES } from '../settings.constants.js';

// Images may use HTTP(S) or an absolute path on this site's origin; blank hides the image.
const ImageLocation = () =>
  ValidateBy({
    name: 'imageLocation',
    validator: {
      validate(value: unknown) {
        if (typeof value !== 'string') return false;
        if (
          /[\\\s]/.test(value) ||
          Array.from(value).some(
            (character) =>
              character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
          )
        )
          return false;
        if (!value) return true;
        try {
          const url = new URL(value, 'https://site.invalid');
          return (
            !url.username &&
            !url.password &&
            ((/^https?:\/\//i.test(value) &&
              ['http:', 'https:'].includes(url.protocol)) ||
              (value.startsWith('/') &&
                !value.startsWith('//') &&
                url.origin === 'https://site.invalid'))
          );
        } catch {
          return false;
        }
      },
      defaultMessage: () =>
        '图片地址必须为 HTTP(S) 地址、站内绝对路径或空字符串',
    },
  });

export class UpdateSiteSettingsDto {
  @ApiProperty({ maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;
  @ApiProperty({ maxLength: 2048 })
  @Trim()
  @IsString()
  @MaxLength(2048)
  @ImageLocation()
  logo!: string;
  @ApiProperty({ maxLength: 2048 })
  @Trim()
  @IsString()
  @MaxLength(2048)
  @ImageLocation()
  loginBackground!: string;
  @ApiProperty({ maxLength: 200 })
  @Trim()
  @IsString()
  @MaxLength(200)
  footerText!: string;
  @ApiProperty({ pattern: '^#[0-9a-fA-F]{6}$' })
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  colorPrimary!: string;
  @ApiProperty({ enum: [...SITE_LOCALES] })
  @IsIn(SITE_LOCALES)
  defaultLocale!: string;
  @ApiProperty({
    type: 'integer',
    minimum: 0,
    description: '读取时的版本，避免覆盖其他管理员的修改',
  })
  @IsInt()
  @Min(0)
  revision!: number;
}
