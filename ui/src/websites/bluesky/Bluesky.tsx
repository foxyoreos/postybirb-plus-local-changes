import { Checkbox, Form, Input, Select, Radio } from 'antd';
import {
  FileSubmission,
  BlueskyFileOptions,
  BlueskyNotificationOptions,
  Submission,
  SubmissionRating
} from 'postybirb-commons';
import React from 'react';
import { WebsiteSectionProps } from '../form-sections/website-form-section.interface';
import GenericFileSubmissionSection from '../generic/GenericFileSubmissionSection';
import { GenericSelectProps } from '../generic/GenericSelectProps';
import GenericSubmissionSection from '../generic/GenericSubmissionSection';
import { LoginDialogProps } from '../interfaces/website.interface';
import { WebsiteImpl } from '../website.base';
import BlueskyLogin from './BlueskyLogin';

export class Bluesky extends WebsiteImpl {
  internalName: string = 'Bluesky';
  name: string = 'Bluesky';
  supportsAdditionalFiles: boolean = true;
  supportsTags: boolean = true;
  supportsParentId: boolean = true;
  loginUrl: string = '';

  LoginDialog = (props: LoginDialogProps) => <BlueskyLogin {...props} />;

  FileSubmissionForm = (props: WebsiteSectionProps<FileSubmission, BlueskyFileOptions>) => (
    <BlueskyFileSubmissionForm
      key={props.part.accountId}
      {...props}
      tagOptions={{ show: true }}
      hideThumbnailOptions={true}
    />
  );

  NotificationSubmissionForm = (
    props: WebsiteSectionProps<Submission, BlueskyNotificationOptions>
  ) => (
    <BlueskyNotificationSubmissionForm
      key={props.part.accountId}
      {...props}
      tagOptions={{ show: true }}
    />
  );
}

class BlueskyNotificationSubmissionForm extends GenericSubmissionSection<
BlueskyNotificationOptions
> {
  renderLeftForm(data: BlueskyNotificationOptions) {
    const elements = super.renderLeftForm(data);
    elements.push(
      <Form.Item label="Label Rating">
        <Radio.Group
          className="w-full"
          buttonStyle="solid"
          value={data.label_rating}
          onChange={this.setValue.bind(this, 'label_rating')}
        >
          <Radio.Button value={''}>Suitable for all ages</Radio.Button>
          <Radio.Button value={'sexual'}>Adult: Suggestive</Radio.Button>
          <Radio.Button value={'nudity'}>Adult: Nudity</Radio.Button>
          <Radio.Button value={'porn'}>Adult: Porn</Radio.Button>
          <Radio.Button value={'graphic-media'}>Graphic Media</Radio.Button>
          <Radio.Button value={'sexual graphic-media'}>Suggestive and Graphic Media</Radio.Button>
          <Radio.Button value={'nudity graphic-media'}>Nudity and Graphic Media</Radio.Button>
          <Radio.Button value={'porn graphic-media'}>Porn and Graphic Media</Radio.Button>
        </Radio.Group>
      </Form.Item>,
      <Form.Item label="Who can reply?">
        <Select
          {...GenericSelectProps}
          className="w-full"
          value={data.threadgate || ''}
          onChange={this.setValue.bind(this, 'threadgate')}
        >
          <Select.Option value={''}>Everybody</Select.Option>
          <Select.Option value={'nobody'}>Nobody</Select.Option>
          <Select.Option value={'mention'}>Mentioned Users</Select.Option>
          <Select.Option value={'following'}>Followed Users</Select.Option>
          <Select.Option value={'mention,following'}>Mentioned & Followed Users</Select.Option>
        </Select>
      </Form.Item>,
      <Form.Item label="Reply To Post URL">
        <Input value={data.replyToUrl} onChange={this.handleValueChange.bind(this, 'replyToUrl')} />
        <p>Will be filled with the URL of the parent submission.</p>
      </Form.Item>
    );
    return elements;
  }
}

export class BlueskyFileSubmissionForm extends GenericFileSubmissionSection<BlueskyFileOptions> {
  renderLeftForm(data: BlueskyFileOptions) {
    const elements = super.renderLeftForm(data);
    elements.push(
      <Form.Item label="Label Rating">
        <Select
          {...GenericSelectProps}
          className="w-full"
          value={data.label_rating}
          onChange={this.setValue.bind(this, 'label_rating')}
        >
          <Select.Option value={''}>Suitable for all ages</Select.Option>
          <Select.Option value={'sexual'}>Adult: Suggestive</Select.Option>
          <Select.Option value={'nudity'}>Adult: Nudity</Select.Option>
          <Select.Option value={'porn'}>Adult: Porn</Select.Option>
          <Select.Option value={'graphic-media'}>Graphic Media</Select.Option>
          <Select.Option value={'sexual graphic-media'}>Suggestive and Graphic Media</Select.Option>
          <Select.Option value={'nudity graphic-media'}>Nudity and Graphic Media</Select.Option>
          <Select.Option value={'porn graphic-media'}>Porn and Graphic Media</Select.Option>
        </Select>
      </Form.Item>,
      <Form.Item label="Who can reply?">
      <Select
        {...GenericSelectProps}
        className="w-full"
        value={data.threadgate || ''}
        onChange={this.setValue.bind(this, 'threadgate')}
      >
        <Select.Option value={''}>Everybody</Select.Option>
        <Select.Option value={'nobody'}>Nobody</Select.Option>
        <Select.Option value={'mention'}>Mentioned Users</Select.Option>
        <Select.Option value={'following'}>Followed Users</Select.Option>
        <Select.Option value={'mention,following'}>Mentioned & Followed Users</Select.Option>
      </Select>
    </Form.Item>,
      <Form.Item label="Reply To Post URL">
        <Input value={data.replyToUrl} onChange={this.handleValueChange.bind(this, 'replyToUrl')} />
        <p>Will be filled with the URL of the parent submission.</p>
      </Form.Item>,
    );
    return elements;
  }
}
