import { EntityIntf } from '../database/entity.interface';

export interface TagGroup extends EntityIntf {
  alias: string;
  tags: Record<string /* Website Id */, string[]>;
  category?: string;
  /* Add a "groups" field in the future that will auto-apply other groups (recursively) - and check for circular references */
}
