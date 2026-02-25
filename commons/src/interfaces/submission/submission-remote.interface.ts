import { EntityIntf } from '../database/entity.interface';
export interface SubmissionRemote extends EntityIntf {
    name: string;
    remotes: string[];
}
