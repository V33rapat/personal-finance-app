import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsString,
  Matches,
} from 'class-validator';

const RELEASE_ID_PATTERN = /^[a-z0-9][a-z0-9.-]{1,99}$/;

export class ReleaseAnnouncementIdsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(RELEASE_ID_PATTERN, { each: true })
  release_ids!: string[];
}
