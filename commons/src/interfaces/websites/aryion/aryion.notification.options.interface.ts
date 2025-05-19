import { DefaultOptions } from '../../submission/default-options.interface';

export interface AryionNotificationOptions extends DefaultOptions {
    viewPermissions: string;
    commentPermissions: string;
}
