import { IsString, IsNotEmpty, IsObject } from 'class-validator';
import Entity from '../../database/models/entity.model';
import { TagGroup } from 'postybirb-commons';

export default class TagGroupEntity extends Entity implements TagGroup {
  @IsString()
  @IsNotEmpty()
  alias: string;

  @IsObject()
  @IsNotEmpty()
  tags: Record<string /* Website Id */, string[]>;

  constructor(partial?: Partial<TagGroup>) {
    super(partial);
  }
}
