import { Injectable } from '@nestjs/common';
import generator, { Entity, Response } from 'megalodon';
import {
  DefaultOptions,
  FileRecord,
  FileSubmission,
  FileSubmissionType,
  MegalodonAccountData,
  MastodonFileOptions,
  MastodonNotificationOptions,
  PostResponse,
  Submission,
  SubmissionPart,
  SubmissionRating,
} from 'postybirb-commons';
import { ScalingOptions } from '../interfaces/scaling-options.interface';
import UserAccountEntity from 'src/server//account/models/user-account.entity';
import { PlaintextParser } from 'src/server/description-parsing/plaintext/plaintext.parser';
import ImageManipulator from 'src/server/file-manipulation/manipulators/image.manipulator';
import Http from 'src/server/http/http.util';
import { CancellationToken } from 'src/server/submission/post/cancellation/cancellation-token';
import {
  FilePostData,
  PostFile,
} from 'src/server/submission/post/interfaces/file-post-data.interface';
import { PostData } from 'src/server/submission/post/interfaces/post-data.interface';
import { ValidationParts } from 'src/server/submission/validator/interfaces/validation-parts.interface';
import FileSize from 'src/server/utils/filesize.util';
import FormContent from 'src/server/utils/form-content.util';
import WebsiteValidator from 'src/server/utils/website-validator.util';
import { LoginResponse } from '../interfaces/login-response.interface';
import { Website } from '../website.base';
import _ from 'lodash';
import WaitUtil from 'src/server/utils/wait.util';
import { FileManagerService } from 'src/server/file-manager/file-manager.service';

const INFO_KEY = 'INSTANCE INFO';

export abstract class Megalodon extends Website {
  constructor(private readonly fileRepository: FileManagerService) {
    super();
  }

  readonly megalodonService = 'mastodon'; // Set this as appropriate in your constructor
  readonly maxCharLength = 500; // Set this off the instance information!

  readonly BASE_URL: string;
  readonly enableAdvertisement = false;
  readonly acceptsAdditionalFiles = true;
  readonly defaultDescriptionParser = PlaintextParser.parse;
  readonly acceptsFiles = [ // Override, or extend this list in your inherited classes! 
    'png',
    'jpeg',
    'jpg',
    'gif',
    'webp',
    'm4v',
    'mov'
  ];

  // Boiler plate login check code across all versions of services using the megalodon library
  async checkLoginStatus(data: UserAccountEntity): Promise<LoginResponse> {
    const status: LoginResponse = { loggedIn: false, username: null };
    const accountData: MegalodonAccountData = data.data;
    if (accountData && accountData.token) {
      await this.getAndStoreInstanceInfo(data._id, accountData);

      status.loggedIn = true;
      status.username = accountData.username;
    }
    return status;
  }

  private async getAndStoreInstanceInfo(profileId: string, data: MegalodonAccountData) {
    const client = generator(this.megalodonService, data.website, data.token);
    const instance = await client.getInstance();

    this.storeAccountInformation(profileId, INFO_KEY, instance.data);
  }

  // TODO: Refactor

  getScalingOptions(file: FileRecord, accountId: string): ScalingOptions {
    const instanceInfo: MastodonInstanceInfo = this.getAccountInfo(accountId, INFO_KEY);
    if (instanceInfo?.configuration?.media_attachments) {
      const maxPixels =
        file.type === FileSubmissionType.IMAGE
          ? instanceInfo.configuration.media_attachments.image_matrix_limit
          : instanceInfo.configuration.media_attachments.video_matrix_limit;

      return {
        maxHeight: Math.round(Math.sqrt(maxPixels * (file.width / file.height))),
        maxWidth: Math.round(Math.sqrt(maxPixels * (file.height / file.width))),
        maxSize:
          file.type === FileSubmissionType.IMAGE
            ? instanceInfo.configuration.media_attachments.image_size_limit
            : instanceInfo.configuration.media_attachments.video_size_limit,
      };
    } else if (instanceInfo?.upload_limit) {
      return {
        maxSize: instanceInfo?.upload_limit,
      };
    } else {
      return undefined;
    }
  }

  // TODO: Add common uploadMedia code from Pleroma codebase

  // TODO: Refactor

  async postFileSubmission(
    cancellationToken: CancellationToken,
    data: FilePostData<MastodonFileOptions>,
    accountData: MegalodonAccountData,
  ): Promise<PostResponse> {
    const M = generator('mastodon', accountData.website, accountData.token);

    const files = [data.primary, ...data.additional];
    const uploadedMedias: string[] = [];
    for (const file of files) {
      this.checkCancelled(cancellationToken);
      uploadedMedias.push(await this.uploadMedia(accountData, file.file, data.options.altText));
    }

    const instanceInfo: MastodonInstanceInfo = this.getAccountInfo(data.part.accountId, INFO_KEY);
    const chunkCount =
      instanceInfo?.configuration?.statuses?.max_media_attachments ??
      instanceInfo?.max_media_attachments ??
      (instanceInfo?.upload_limit ? 1000 : 4);
    const maxChars =
      instanceInfo?.configuration?.statuses?.max_characters ?? instanceInfo?.max_toot_chars ?? 500;

    const isSensitive = data.rating !== SubmissionRating.GENERAL;
    const chunks = _.chunk(uploadedMedias, chunkCount);
    let status = `${data.options.useTitle && data.title ? `${data.title}\n` : ''}${
      data.description
    }`.substring(0, maxChars);
    let lastId = '';
    let source = '';
    const replyToId = this.getPostIdFromUrl(data.options.replyToUrl);

    for (let i = 0; i < chunks.length; i++) {
      this.checkCancelled(cancellationToken);
      const statusOptions: any = {
        sensitive: isSensitive,
        visibility: data.options.visibility || 'public',
        media_ids: chunks[i],
      };

      if (i !== 0) {
        statusOptions.in_reply_to_id = lastId;
      } else if (replyToId) {
        statusOptions.in_reply_to_id = replyToId;
      }

      if (data.options.spoilerText) {
        statusOptions.spoiler_text = data.options.spoilerText;
      }

      status = this.appendTags(this.formatTags(data.tags), status, maxChars);

      try {
        const result = (await M.postStatus(status, statusOptions)).data as Entity.Status;
        if (!source) source = result.url;
        lastId = result.id;
      } catch (err) {
        return Promise.reject(
          this.createPostResponse({
            message: err.message,
            stack: err.stack,
            additionalInfo: { chunkNumber: i },
          }),
        );
      }
    }

    this.checkCancelled(cancellationToken);

    return this.createPostResponse({ source });
  }

  // TODO: Refactor

  async postNotificationSubmission(
    cancellationToken: CancellationToken,
    data: PostData<Submission, MastodonNotificationOptions>,
    accountData: MegalodonAccountData,
  ): Promise<PostResponse> {
    const M = generator('mastodon', accountData.website, accountData.token);
    const instanceInfo: MastodonInstanceInfo = this.getAccountInfo(data.part.accountId, INFO_KEY);
    const maxChars = instanceInfo?.configuration?.statuses?.max_characters ?? 500;

    const isSensitive = data.rating !== SubmissionRating.GENERAL;
    const statusOptions: any = {
      sensitive: isSensitive,
      visibility: data.options.visibility || 'public',
    };
    let status = `${data.options.useTitle && data.title ? `${data.title}\n` : ''}${
      data.description
    }`;
    if (data.options.spoilerText) {
      statusOptions.spoiler_text = data.options.spoilerText;
    }
    status = this.appendTags(this.formatTags(data.tags), status, maxChars);

    const replyToId = this.getPostIdFromUrl(data.options.replyToUrl);
    if (replyToId) {
      statusOptions.in_reply_to_id = replyToId;
    }

    this.checkCancelled(cancellationToken);
    try {
      const result = (await M.postStatus(status, statusOptions)).data as Entity.Status;
      return this.createPostResponse({ source: result.url });
    } catch (error) {
      return Promise.reject(this.createPostResponse(error));
    }
  }

  // TODO: Make sure this has the strip preceeding space ?
  formatTags(tags: string[]) {
    return this.parseTags(
      tags
        .map(tag => tag.replace(/[^a-z0-9]/gi, ' '))
        .map(tag =>
          tag
            .split(' ')
            .join(''),
        ),
      { spaceReplacer: '_' },
    ).map(tag => `#${tag}`);
  }

  // TODO REFACTOR

  validateFileSubmission(
    submission: FileSubmission,
    submissionPart: SubmissionPart<MastodonFileOptions>,
    defaultPart: SubmissionPart<DefaultOptions>,
  ): ValidationParts {
    const problems: string[] = [];
    const warnings: string[] = [];
    const isAutoscaling: boolean = submissionPart.data.autoScale;

    const description = this.defaultDescriptionParser(
      FormContent.getDescription(defaultPart.data.description, submissionPart.data.description),
    );

    const instanceInfo: MastodonInstanceInfo = this.getAccountInfo(
      submissionPart.accountId,
      INFO_KEY,
    );
    const maxChars = instanceInfo?.configuration?.statuses?.max_characters ?? 500;

    if (description.length > maxChars) {
      warnings.push(
        `Max description length allowed is ${maxChars} characters (for this instance).`,
      );
    }

    const files = [
      submission.primary,
      ...(submission.additional || []).filter(
        f => !f.ignoredAccounts!.includes(submissionPart.accountId),
      ),
    ];

    files.forEach(file => {
      const { type, size, name, mimetype } = file;
      if (!WebsiteValidator.supportsFileType(file, this.acceptsFiles)) {
        problems.push(`Does not support file format: (${name}) ${mimetype}.`);
      }

      const scalingOptions = this.getScalingOptions(file, submissionPart.accountId);

      if (scalingOptions && scalingOptions.maxSize < size) {
        if (
          isAutoscaling &&
          type === FileSubmissionType.IMAGE &&
          ImageManipulator.isMimeType(mimetype)
        ) {
          warnings.push(
            `${name} will be scaled down to ${FileSize.BytesToMB(scalingOptions.maxSize)}MB`,
          );
        } else {
          problems.push(
            `This instance limits ${mimetype} to ${FileSize.BytesToMB(scalingOptions.maxSize)}MB`,
          );
        }
      }

      if (
        scalingOptions &&
        isAutoscaling &&
        type === FileSubmissionType.IMAGE &&
        scalingOptions.maxWidth &&
        scalingOptions.maxHeight &&
        (file.height > scalingOptions.maxHeight || file.width > scalingOptions.maxWidth)
      ) {
        warnings.push(
          `${name} will be scaled down to a maximum size of ${scalingOptions.maxWidth}x${scalingOptions.maxHeight}, while maintaining aspect ratio`,
        );
      }
    });

    if (
      (submissionPart.data.tags.value.length > 1 || defaultPart.data.tags.value.length > 1) &&
      submissionPart.data.visibility != 'public'
    ) {
      warnings.push(
        `This post won't be listed under any hashtag as it is not public. Only public posts can be searched by hashtag.`,
      );
    }

    this.validateReplyToUrl(problems, submissionPart.data.replyToUrl);

    return { problems, warnings };
  }

  validateNotificationSubmission(
    submission: Submission,
    submissionPart: SubmissionPart<MastodonNotificationOptions>,
    defaultPart: SubmissionPart<DefaultOptions>,
  ): ValidationParts {
    const problems = [];
    const warnings = [];

    const description = this.defaultDescriptionParser(
      FormContent.getDescription(defaultPart.data.description, submissionPart.data.description),
    );

    if (description.length > this.maxCharLength) {
      warnings.push(
        `Max description length allowed is ${this.maxCharLength} characters.`,
      );
    }

    this.validateReplyToUrl(problems, submissionPart.data.replyToUrl);

    return { problems, warnings };
  }

  private validateReplyToUrl(problems: string[], url?: string): void {
    if(url?.trim() && !this.getPostIdFromUrl(url)) {
      problems.push("Invalid post URL to reply to.");
    }
  }

  abstract getPostIdFromUrl(url: string): string | null;

}
