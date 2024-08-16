import React from 'react';
import _ from 'lodash';
import './TagGroup.css';
import { inject, observer } from 'mobx-react';
import { TagGroupStore } from '../../stores/tag-group.store';
import { TagGroup } from 'postybirb-commons';
import TagGroupService from '../../services/tag-group.service';
import TagInput from '../submissions/submission-forms/form-components/TagInput';
import { Input, Button, message, Popconfirm, Spin, Empty, Card, Icon } from 'antd';
import { TagData } from 'postybirb-commons';
import { WebsiteRegistry } from '../../websites/website-registry';
import { uiStore } from '../../stores/ui.store'

interface Props {
  tagGroupStore?: TagGroupStore;
}

@inject('tagGroupStore')
@observer
export default class TagGroups extends React.Component<Props> {
  createNewGroup() {
    TagGroupService.create({
      alias: 'New Tag Group',
      tags: {
        "default": [],
      }
    });
  }

  render() {
    const groups = this.props.tagGroupStore!.groups;
    return (
      <div>
        {groups.length ? (
          <div>
            <Button className="mb-2" type="primary" onClick={this.createNewGroup}>
              Add New Group
            </Button>
            {groups.map(g => (
              <div className="tag-group-display">
                <TagGroupInput key={g._id} {...g} />
              </div>
            ))}
          </div>
        ) : (
          <Empty description={<span>No tag groups</span>}>
            <Button type="primary" onClick={this.createNewGroup}>
              Create Tag Group
            </Button>
          </Empty>
        )}
      </div>
    );
  }
}

interface TagGroupInputState {
  touched: boolean;
  saving: boolean;
  tagGroup: Partial<TagGroup>;
}

class TagGroupInput extends React.Component<TagGroup, TagGroupInputState> {
  state: TagGroupInputState = {
    touched: false,
    saving: false,
    tagGroup: {
      alias: '',
      tags: {
        "default": [],
      }
    },
  };

  private original!: TagGroup;

  constructor(props: TagGroup) {
    super(props);
    this.original = _.cloneDeep(props);
    /* Conversion to default group */
    const tagGroup = _.cloneDeep(props);

    console.log(tagGroup.tags, tagGroup.tags.constructor);
    // @ts-ignore
    if (tagGroup.tags.constructor === Array) {
      tagGroup.tags = {

        // @ts-ignore
        "default": tagGroup.tags,
      };
    }
   
    this.state.tagGroup = tagGroup;
  }

  handleTagChange = (website: string, update: TagData) => {
    const copy = _.cloneDeep(this.state.tagGroup);
    copy.tags = copy.tags || {};
    copy.tags[website] = update.value;
    this.setState({ touched: !_.isEqual(copy, this.original), tagGroup: copy });
  };

  handleNameChange = ({ target }) => {
    const copy = _.cloneDeep(this.state.tagGroup);
    copy.alias = target.value.trim();
    this.setState({ touched: !_.isEqual(copy, this.original), tagGroup: copy });
  };

  onSave = () => {
    if (!this.state.touched) {
      message.info('No changes to save.');
      return;
    }

    this.setState({ saving: true });
    TagGroupService.update(this.state.tagGroup as TagGroup)
      .then(() => {
        this.setState({ saving: false, touched: false });
        message.success('Tag group updated.');
      })
      .catch(err => {
        this.setState({ saving: false });
        message.error('Name cannot be empty.');
      });
  };

  onDelete = () => {
    TagGroupService.deleteTagGroup(this.props._id)
      .then(() => {
        message.success('Tag group removed.');
      })
      .catch(() => {
        message.error('Failed to remove tag group.');
      });
  };

  render() {
    console.log(uiStore);
    return (
      <div>
        <Spin spinning={this.state.saving} delay={500}>
          <Card
            size="small"
            bodyStyle={{ overflow: 'auto', maxHeight: '200px' }}
            title={
              <Input
                defaultValue={this.state.tagGroup.alias}
                required={true}
                onBlur={this.handleNameChange}
                placeholder="Name"
              />
            }
            actions={[
              <Icon type="save" key="save" onClick={this.onSave} />,
              <Popconfirm title="Are you sure?" onConfirm={this.onDelete}>
                <Icon type="delete" key="delete" />
              </Popconfirm>
            ]}
          >

            {WebsiteRegistry.getAllAsArray()
             .filter(website => website.supportsTags)
             // @ts-ignore
             .concat([{ supportsTags: true, name: "Default", internalName: "default" }])
             .map(website => (
               <div className="flex mb-1">
                 <div className="flex-1">
                   <strong>{website.name}</strong>
                 </div>
                 <div className="flex-1">
                   <TagInput
                     onChange={this.handleTagChange.bind(this, website.internalName)}
                     hideExtend={true}
                     hideExtra={true}
                     hideTagGroup={true}
                     defaultValue={{ extendDefault: false, value: (() => {
                       // @ts-ignore
                       return this?.state?.tagGroup?.tags[website?.internalName] || [];
                     })() }}
                   />
                 </div>
               </div>
             ))}

          </Card>
        </Spin>
      </div>
    );
  }
}
