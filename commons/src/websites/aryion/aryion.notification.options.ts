import { Expose } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { DefaultOptions } from '../../interfaces/submission/default-options.interface';
import { AryionNotificationOptions } from '../../interfaces/websites/aryion/aryion.notification.options.interface';
import { DefaultValue } from '../../models/decorators/default-value.decorator';
import { DefaultOptionsEntity } from '../../models/default-options.entity';

export class AryionNotificationOptionsEntity extends DefaultOptionsEntity implements AryionNotificationOptions {
  @Expose()
  @IsString()
  @DefaultValue('ALL')
  viewPermissions!: string;

  @Expose()
  @IsString()
  @DefaultValue('USER')
  commentPermissions!: string;

  constructor(entity?: Partial<AryionNotificationOptions>) {
    super(entity as DefaultOptions);
  }
}
