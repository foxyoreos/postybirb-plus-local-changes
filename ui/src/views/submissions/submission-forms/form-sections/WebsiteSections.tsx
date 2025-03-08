import React from 'react';
import _ from 'lodash';
import { SubmissionPart } from 'postybirb-commons';
import { loginStatusStore, LoginStatusStore } from '../../../../stores/login-status.store';
import { WebsiteRegistry } from '../../../../websites/website-registry';
import { Form, Typography, Tabs, Badge, Empty, Icon } from 'antd';
import { inject, observer } from 'mobx-react';
import { SubmissionType } from 'postybirb-commons';
import { FileSubmission } from 'postybirb-commons';
import { Submission } from 'postybirb-commons';
import { FormSubmissionPart } from '../interfaces/form-submission-part.interface';
import { Problems } from 'postybirb-commons';

interface WebsiteSectionsProps {
  loginStatusStore?: LoginStatusStore;
  onUpdate: (update: any) => void;
  parts: { [key: string]: FormSubmissionPart<any> };
  problems: Problems;
  removedParts: string[];
  submission?: Submission;
  submissionType: SubmissionType;
}

interface WebsiteSectionsState {
  checks: { [key: string]: boolean };
  expanded: { [key: string]: boolean };
}

@inject('loginStatusStore')
@observer
export default class WebsiteSections extends React.Component<WebsiteSectionsProps> {
  state: WebsiteSectionsState = {
    checks: {},
    expanded: {},
  };

  toggleSection(section: string) {
    this.setState((state: WebsiteSectionsState) => {
      return {
        checks: {
          [section]: !state.checks[section],
          ...state.checks,
        },
      };
    });
  }

  toggleWebsite(website: string) {
    this.setState((state: WebsiteSectionsState) => {
      return {
        expanded: {
          ...state.expanded,
          [website]: !state.expanded[website],
        },
      };
    });
  }

  render() {
    const props = this.props;
    const defaultPart = props.parts.default;
    const sections: JSX.Element[] = [];

    const parts = _.sortBy(
      Object.values(props.parts)
        .filter(p => !p.isDefault)
        .filter(p => !props.removedParts.includes(p.accountId)),
      'website'
    );

    const groups = _.groupBy(parts, 'website');

    Object.keys(groups).forEach(website => {
      const sortedChildren: Array<SubmissionPart<any>> = _.sortBy(groups[website], 'alias');

      const childrenSections = sortedChildren
        .map(child => {
          /* TODO: turn off rendering here, this will use the same amount of CPU stuff
          /* even when it's condensed. Let's just filter to get over it. */
          if (!this.state.expanded[website]) {
            return {
              alias: loginStatusStore!.getAliasForAccountId(child.accountId),
              problems: _.get(props.problems[child.accountId], 'problems', []),
              key: child.accountId,
            };
          }

          return {
            alias: loginStatusStore!.getAliasForAccountId(child.accountId),
            problems: _.get(props.problems[child.accountId], 'problems', []),
            key: child.accountId,
            form:
              this.props.submissionType === SubmissionType.FILE
                ? WebsiteRegistry.websites[child.website]?.FileSubmissionForm({
                    defaultData: defaultPart.data,
                    website: website,
                    part: child,
                    onUpdate: props.onUpdate,
                    problems: props.problems[child.accountId],
                    submission: props.submission! as FileSubmission
                  })
                : WebsiteRegistry.websites[child.website]?.NotificationSubmissionForm!({
                    defaultData: defaultPart.data,
                    website: website,
                    part: child,
                    onUpdate: props.onUpdate,
                    problems: props.problems[child.accountId],
                    submission: props.submission!
                  })
          };
        })
        .filter(section => section.form);

      sections.push(
        <Form.Item className="form-section jumpable-section">
          <Typography.Title style={{ marginBottom: '0' }} level={3} >
            <span onClick={this.toggleWebsite.bind(this, website)}>
              <span className="form-section-header nav-section-anchor" id={`#${website}`}>
                {WebsiteRegistry.find(website)?.name}
              </span>
              {this.state.expanded[website] ?
               <Icon type="caret-down" key="hide" /> :
               <Icon type="caret-right" key="expand" />
              }
            </span>
          </Typography.Title>
          {this.state.expanded[website] &&
          <Tabs>
            {childrenSections.map(section => (
              <Tabs.TabPane
                tab={
                  <span>
                    <input type="checkbox"
                         value={!!this.state.checks[`${website}-${section.alias}`] ? "checked" : undefined}
                         onChange={this.toggleSection.bind(this, `${website}-${section.alias}`)}/>

                    <span className="mr-1">{section.alias}</span>
                    {section.problems.length ? <Badge count={section.problems.length} /> : null}
                  </span>
                }
                key={section.key}
              >
                {loginStatusStore.getWebsiteLoginStatusForAccountId(section.key) ? (
                  section.form
                ) : (
                  <Empty
                    description={<Typography.Text type="danger">Not logged in.</Typography.Text>}
                  />
                )}
              </Tabs.TabPane>
            ))}
          </Tabs>
        }
        </Form.Item>
      );
    });

    return sections;
  }
}
