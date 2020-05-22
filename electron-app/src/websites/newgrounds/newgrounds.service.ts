import { Injectable } from '@nestjs/common';
import { nativeImage } from 'electron';
import * as gifFrames from 'gif-frames';
import UserAccountEntity from 'src/account/models/user-account.entity';
import ImageManipulator from 'src/file-manipulation/manipulators/image.manipulator';
import Http from 'src/http/http.util';
import { FileSubmissionType } from 'src/submission/file-submission/enums/file-submission-type.enum';
import { FileRecord } from 'src/submission/file-submission/interfaces/file-record.interface';
import { FileSubmission } from 'src/submission/file-submission/interfaces/file-submission.interface';
import { Submission } from 'src/submission/interfaces/submission.interface';
import { CancellationToken } from 'src/submission/post/cancellation/cancellation-token';
import { FilePostData } from 'src/submission/post/interfaces/file-post-data.interface';
import { PostData } from 'src/submission/post/interfaces/post-data.interface';
import { PostResponse } from 'src/submission/post/interfaces/post-response.interface';
import { DefaultOptions } from 'src/submission/submission-part/interfaces/default-options.interface';
import { SubmissionPart } from 'src/submission/submission-part/interfaces/submission-part.interface';
import { ValidationParts } from 'src/submission/validator/interfaces/validation-parts.interface';
import FileSize from 'src/utils/filesize.util';
import HtmlParserUtil from 'src/utils/html-parser.util';
import WebsiteValidator from 'src/utils/website-validator.util';
import { v1 } from 'uuid';
import { GenericDefaultNotificationOptions } from '../generic/generic.defaults';
import { LoginResponse } from '../interfaces/login-response.interface';
import { ScalingOptions } from '../interfaces/scaling-options.interface';
import { Website } from '../website.base';
import { NewgroundsDefaultFileOptions } from './newgrounds.defaults';
import { NewgroundsFileOptions } from './newgrounds.interface';

@Injectable()
export class Newgrounds extends Website {
  readonly BASE_URL: string = 'https://www.newgrounds.com';
  readonly acceptsFiles = ['jpeg', 'jpg', 'png', 'gif', 'bmp'];
  readonly fileSubmissionOptions = NewgroundsDefaultFileOptions;
  readonly notificationSubmissionOptions = GenericDefaultNotificationOptions;
  readonly usernameShortcuts = [
    {
      key: 'ng',
      url: 'https://$1.newgrounds.com',
    },
  ];

  async checkLoginStatus(data: UserAccountEntity): Promise<LoginResponse> {
    const status: LoginResponse = { loggedIn: false, username: null };
    const res = await Http.get<string>(this.BASE_URL, data._id);
    if (!res.body.includes('passport_login')) {
      status.loggedIn = true;
      status.username = res.body.match(/"name":"(.*?)"/)[1];
    }
    return status;
  }

  getScalingOptions(file: FileRecord): ScalingOptions {
    return { maxSize: FileSize.MBtoBytes(40) };
  }

  parseDescription(text: string) {
    return text.replace(/<div/gm, '<p').replace(/<\/div>/gm, '</p>');
  }

  async postNotificationSubmission(
    cancellationToken: CancellationToken,
    data: PostData<Submission, DefaultOptions>,
  ): Promise<PostResponse> {
    const page = await Http.get<string>(`${this.BASE_URL}/account/news/post`, data.part.accountId);
    this.verifyResponse(page);

    this.checkCancelled(cancellationToken);
    const post = await Http.post<string>(
      `${this.BASE_URL}/account/news/post`,
      data.part.accountId,
      {
        type: 'multipart',
        data: {
          post_id: '',
          userkey: HtmlParserUtil.getInputValue(page.body, 'userkey'),
          subject: data.title,
          emoticon: '6',
          comments_pref: '1',
          tag: '',
          'tags[]': this.formatTags(data.tags),
          body: `<p>${data.description}</p>`,
        },
        requestOptions: { qsStringifyOptions: { arrayFormat: 'repeat' } },
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Origin: 'https://www.newgrounds.com',
          Referer: `https://www.newgrounds.com/account/news/post`,
          'Accept-Encoding': 'gzip, deflate, br',
          Accept: '*',
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    this.verifyResponse(post);
    try {
      const json: { url: string } = JSON.parse(post.body);
      if (json.url) {
        return this.createPostResponse({ source: `https:${json.url}` });
      }
    } catch {}

    return Promise.reject(this.createPostResponse({ additionalInfo: post.body }));
  }

  async postFileSubmission(
    cancellationToken: CancellationToken,
    data: FilePostData<NewgroundsFileOptions>,
  ): Promise<PostResponse> {
    const page = await Http.get<string>(`${this.BASE_URL}/art/submit/create`, data.part.accountId);
    this.verifyResponse(page, 'Get page');

    const userkey = HtmlParserUtil.getInputValue(page.body, 'userkey');
    this.checkCancelled(cancellationToken);
    const parkFile = await Http.post<{
      success: boolean;
      parked_id: string;
      parked_url: string;
      errors: string[];
    }>(`${this.BASE_URL}/parkfile`, data.part.accountId, {
      type: 'multipart',
      requestOptions: { json: true },
      data: {
        userkey,
        qquuid: v1(),
        qqfilename: data.primary.file.options.filename,
        qqtotalfilesize: data.primary.file.value.length,
        qqfile: data.primary.file,
      },
      headers: {
        Origin: 'https://www.newgrounds.com',
        Referer: `https://www.newgrounds.com/art/submit/create`,
        'Accept-Encoding': 'gzip, deflate, br',
        Accept: 'application/json',
        'Content-Type': 'multipart/form-data',
        TE: 'Trailers',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    this.verifyResponse(parkFile, 'Verify park');
    if (!parkFile.body.success) {
      return Promise.reject(
        this.createPostResponse({
          additionalInfo: parkFile.body,
          message: parkFile.body.errors.join(' '),
        }),
      );
    }

    let thumbfile = data.thumbnail ? data.thumbnail : data.primary.file;
    if (!data.thumbnail && data.primary.file.options.contentType === 'image/gif') {
      const [frame0] = await gifFrames({ url: data.primary.file.value, frames: 0 });
      thumbfile = {
        value: frame0.getImage().read(),
        options: {
          filename: 'thumbnail.jpg',
          contentType: 'image/jpg',
        },
      };
    }

    const { height, width } = nativeImage.createFromBuffer(thumbfile.value).getSize();

    const { options } = data;
    const form: any = {
      userkey,
      title: data.title,
      description: `<p>${data.description}</p>`,
      thumbnail: thumbfile,
      cc_commercial: options.commercial ? 'yes' : 'no',
      cc_modification: options.modification ? 'yes' : 'no',
      category_id: options.category,
      nudity: options.nudity,
      violence: options.violence,
      language_textual: options.explicitText,
      adult_themes: options.adultThemes,
      encoder: 2,
      thumb_crop_width: width,
      thumb_crop_height: height,
      thumb_top_x: 0,
      thumb_top_y: 0,
      thumb_animation_frame: 0,
      'tags[]': this.formatTags(data.tags),
      parked_id: parkFile.body.parked_id,
      parked_url: parkFile.body.parked_url,
    };

    if (options.creativeCommons) {
      form.use_creative_commons = '1';
    }

    if (!options.sketch) {
      form.public = '1';
    }

    const newCookies: any = {};
    parkFile.response.headers['set-cookie'].forEach(cookie => {
      const cookieParts = cookie.split(';')[0].split('=');
      return (newCookies[cookieParts[0]] = cookieParts[1]);
    });
    this.checkCancelled(cancellationToken);
    const post = await Http.post<{ succes: boolean; url: string; errors: string[] }>(
      `${this.BASE_URL}/art/submit/create`,
      undefined,
      {
        type: 'multipart',
        data: form,
        skipCookies: true,
        requestOptions: { json: true, qsStringifyOptions: { arrayFormat: 'repeat' } },
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Origin: 'https://www.newgrounds.com',
          Referer: `https://www.newgrounds.com/art/submit/create`,
          'Accept-Encoding': 'gzip, deflate, br',
          Accept: '*',
          'Content-Type': 'multipart/form-data',
          TE: 'Trailers',
          cookie: Object.entries(newCookies)
            .map(([key, value]) => `${key}=${value}`)
            .join('; '),
        },
      },
    );

    if (post.body.url) {
      return this.createPostResponse({ source: `https:${post.body.url}` });
    } else {
      try {
        return Promise.reject(
          this.createPostResponse({
            additionalInfo: post.body,
            message: post.body.errors.join(' '),
          }),
        );
      } catch {}
      return Promise.reject({ additionalInfo: post.body });
    }
  }

  formatTags(tags: string[]): any {
    return super
      .formatTags(tags, { spaceReplacer: '-' })
      .map(tag => {
        return tag.replace(/(\(|\)|:|#|;|\]|\[|')/g, '').replace(/_/g, '-');
      })
      .slice(0, 12);
  }

  validateFileSubmission(
    submission: FileSubmission,
    submissionPart: SubmissionPart<NewgroundsFileOptions>,
    defaultPart: SubmissionPart<DefaultOptions>,
  ): ValidationParts {
    const problems: string[] = [];
    const warnings: string[] = [];
    const isAutoscaling: boolean = submissionPart.data.autoScale;

    if (!submissionPart.data.nudity) {
      problems.push('Must select a Nudity value.');
    }

    if (!submissionPart.data.violence) {
      problems.push('Must select a Violence value.');
    }

    if (!submissionPart.data.explicitText) {
      problems.push('Must select an Explicit Text value.');
    }

    if (!submissionPart.data.adultThemes) {
      problems.push('Must select an Adult Themes value.');
    }

    if (!WebsiteValidator.supportsFileType(submission.primary, this.acceptsFiles)) {
      problems.push(
        `Does not support file format: (${submission.primary.name}) ${submission.primary.mimetype}.`,
      );
    }

    const { type, size, name } = submission.primary;
    let maxMB: number = 40;
    if (FileSize.MBtoBytes(maxMB) < size) {
      if (
        isAutoscaling &&
        type === FileSubmissionType.IMAGE &&
        ImageManipulator.isMimeType(submission.primary.mimetype)
      ) {
        warnings.push(`${name} will be scaled down to ${maxMB}MB`);
      } else {
        problems.push(`Newgrounds limits ${submission.primary.mimetype} to ${maxMB}MB`);
      }
    }

    return { problems, warnings };
  }
}