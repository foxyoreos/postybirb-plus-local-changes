import { EntityIntf } from '../database/entity.interface';

export interface TagGroup extends EntityIntf {
  alias: string;
  tags: Record<string /* Website Id */, string[]>;
  category?: string;
  groups?: string[]; /* Check for circular references when applied, don't worry about keeping the database clean. */
  related?: string[]; /* For user-specified suggestions - if a tag group is here, it'll get suggested whenever this one is applied */
  auto_hide?: boolean; /* Will hide this group from the group selector unless its parent is present. */
  suggest?: boolean; /* Whether or not to suggest this group (can be extended with more rules) */
  suggestWhen?: string[]; /* Suggest this group when these groups are present. */
  suggestWhenNot?: string[]; /* Suggest this group when these groups are NOT present. */
}
