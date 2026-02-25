import React from 'react';
import _ from 'lodash';
import './TagGroup.css';
import { inject, observer } from 'mobx-react';
import { TagGroupStore } from '../../stores/tag-group.store';
import { TagGroup } from 'postybirb-commons';
import TagGroupService from '../../services/tag-group.service';
import TagInput from '../submissions/submission-forms/form-components/TagInput';
import { Input, Button, message, Popconfirm, Spin, Empty, Card, Icon, Select, Collapse, Checkbox } from 'antd';
import { TagData } from 'postybirb-commons';
import { WebsiteRegistry } from '../../websites/website-registry';
import { LoginStatusStore } from '../../stores/login-status.store';
import { uiStore } from '../../stores/ui.store'

interface Props {
  tagGroupStore?: TagGroupStore;
  loginStatusStore?: LoginStatusStore;
}

interface TagGroupsState {
  filter: string;
}

@inject('tagGroupStore', 'loginStatusStore')
@observer
export default class TagGroups extends React.Component<Props> {
  state: TagGroupsState = {
    filter: ''
  };

  createNewGroup() {
    TagGroupService.create({
      alias: this.state.filter || ` 0${_.uniqueId()}`,
      tags: {
        "default": [],
      }
    });
  }

  render() {
    const groups = this.props.tagGroupStore!.groups;
    const accounts = (this.props.loginStatusStore!.statuses || []).reduce((result, account) => {
      result[account.website] = true;
      return result;
    }, {});

    const filteredGroups = groups.filter(g => g.alias.toLowerCase().includes(this.state.filter.toLowerCase()));

    const categories = filteredGroups.reduce((result, group) => {
      let category = group.category || 'default';
      result[category] = result[category] || [];
      result[category].push(group);
      return result;
    }, {});

    return (
      <div>
        <Button className="mb-2" type="primary" onClick={this.createNewGroup.bind(this)}>
          Add New Group
        </Button>
        {groups.length ? (
          <div>
            <Input.Search
              autoFocus
              allowClear
              placeholder="Search"
              value={this.state.filter}
              onChange={e => this.setState({ filter: e.target.value })}
            />
            <Collapse>
              {Object.keys(categories).map(category => (
                <Collapse.Panel key={category} header={category}>
                  {categories[category].map(g => (
                    <div className="tag-group-display">
                      <TagGroupInput key={g._id} accountMap={accounts} loginStatusStore={this.props.loginStatusStore} tagGroup={g} groups={groups}/>
                    </div>
                  ))}
                </Collapse.Panel>))}
            </Collapse>
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
  open: boolean;
  tagGroup: Partial<TagGroup>;
}

interface TagGroupProps {
  tagGroup: TagGroup;
  groups: TagGroup[];
  loginStatusStore?: LoginStatusStore;
  accountMap: { [name: string]: boolean };
}

class TagGroupInput extends React.Component<TagGroupProps, TagGroupInputState> {
  state: TagGroupInputState = {
    touched: false,
    saving: false,
    open: false,
    tagGroup: {
      alias: '',
      tags: {
        "default": [],
      }
    },
  };

  private original!: TagGroup;
  private websites!: any[];

  constructor(props: TagGroupProps) {
    super(props);
    this.original = _.cloneDeep(props.tagGroup);
    this.websites = WebsiteRegistry.getAllAsArray();
    /* Conversion to default group */
    const tagGroup = _.cloneDeep(props.tagGroup);
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

  handleTagGroupChange = (update: string[]) => {
    const copy = _.cloneDeep(this.state.tagGroup);
    copy.groups = [...update];
    this.setState({ touched: !_.isEqual(copy, this.original), tagGroup: copy })
  };

  handleSuggestWhenChange = (update: string[]) => {
    const copy = _.cloneDeep(this.state.tagGroup);
    copy.suggestWhen = [...update];
    this.setState({ touched: !_.isEqual(copy, this.original), tagGroup: copy })
  };

  handleSuggestWhenNotChange = (update: string[]) => {
    const copy = _.cloneDeep(this.state.tagGroup);
    copy.suggestWhenNot = [...update];
    this.setState({ touched: !_.isEqual(copy, this.original), tagGroup: copy })
  };

  handleNameChange = ({ target }) => {
    const copy = _.cloneDeep(this.state.tagGroup);
    copy.alias = target.value.trim();
    this.setState({ touched: !_.isEqual(copy, this.original), tagGroup: copy });
  };

  handleCategoryChange = ({ target  }) => {
    const copy = _.cloneDeep(this.state.tagGroup);
    copy.category = target.value.trim();
    this.setState({ touched: !_.isEqual(copy, this.original), tagGroup: copy });
  };

  handleSuggestChange = ({ target  }) => {
    const copy = _.cloneDeep(this.state.tagGroup);
    copy.suggest = target.checked;
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

  toggle = () => {
    this.setState((state) => ({ open: !state.open }));
  }


  onDelete = () => {
    TagGroupService.deleteTagGroup(this.props.tagGroup._id)
      .then(() => {
        message.success('Tag group removed.');
      })
      .catch(() => {
        message.error('Failed to remove tag group.');
      });
  };

  render() {

    let filteredGroups = this.props.groups.filter((group) => group._id !== this.state.tagGroup._id);
    let category = this.state.tagGroup.category || '';

    return (
      <div>
        <Spin spinning={this.state.saving} delay={500}>
          <Card
            size="small"
            bodyStyle={{ overflow: 'auto', maxHeight: '200px' }}
            title={
              <div style={{ display: 'flex', placeItems: 'center' }}>
                <Checkbox
                  checked={!!this.state.tagGroup.suggest}
                  onChange={this.handleSuggestChange.bind(this)}>
                </Checkbox>
                <Input
                  defaultValue={this.state.tagGroup.alias}
                  style={{width: 'calc(100% - 1.75em)', marginRight: '0.25em' }}
                  required={true}
                  onBlur={this.handleNameChange}
                  placeholder="Name"
                />
                               {this.state.open ?
                                <Icon type="caret-down" key="hide" onClick={this.toggle} /> :
                                <Icon type="caret-right" key="expand" onClick={this.toggle} />}
              </div>
            }
            actions={[
              this.state.touched ?
                (<Icon type="save" key="save" onClick={this.onSave} />) :
                (<Icon type="check" key="save" onClick={this.onSave} />),
              <Popconfirm title="Are you sure?" onConfirm={this.onDelete}>
                <Icon type="delete" key="delete" />
              </Popconfirm>
            ]}
          >

            {this.state.open && (
              <>
                <div className="flex mb-1">
                  <div className="flex-1">
                    <strong>Category</strong>
              </div>
              <Input
                defaultValue={category}
                className="flex-1"
                required={false}
                onBlur={this.handleCategoryChange}
                placeholder="Category"/>
              </div>

              <div className="flex mb-1">
                <div className="flex-1">
                  <strong>Parent Groups</strong>
                </div>
                <Select
                  mode="multiple"
                  className="flex-1"
                  tokenSeparators={[',']}
                  onChange={this.handleTagGroupChange.bind(this)}
                  value={this.state.tagGroup.groups}
                  placeholder="Separate groups with ,"
                  filterOption={(input, option) => {
                    const label = option.props.label as string || '';
                    return label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
                  }}
                  allowClear
                >
                  {filteredGroups.map((group) => (
                    <Select.Option
                    key={group._id}
                    value={group._id}
                    label={group.alias}
                    >
                    <span>{group.alias}</span>
                    </Select.Option>
                  ))}
                </Select>
              </div>

              {/* Positive Suggestions */}
              {this.state.tagGroup.suggest && (
              <div className="flex mb-1">
                <div className="flex-1">
                  <strong>Suggest When ANY Applied</strong>
                </div>
                <Select
                  mode="multiple"
                  className="flex-1"
                  tokenSeparators={[',']}
                  onChange={this.handleSuggestWhenChange.bind(this)}
                  value={this.state.tagGroup.suggestWhen}
                  placeholder="Separate groups with ,"
                  filterOption={(input, option) => ((option.props.label as string || '').toLowerCase().indexOf(input.toLowerCase()) >= 0)}
                  allowClear
                >
                  {filteredGroups.map((group) => (
                    <Select.Option
                    key={group._id}
                    value={group._id}
                    label={group.alias}
                    >
                    <span>{group.alias}</span>
                    </Select.Option>
                  ))}
                </Select>
              </div>)}

              {/* Negative Suggestions */}
              {this.state.tagGroup.suggest && (
                <div className="flex mb-1">
                  <div className="flex-1">
                    <strong>Suggest When ALL NOT Applied</strong>
                  </div>
                  <Select
                    mode="multiple"
                    className="flex-1"
                    tokenSeparators={[',']}
                    onChange={this.handleSuggestWhenNotChange.bind(this)}
                    value={this.state.tagGroup.suggestWhenNot}
                    placeholder="Separate groups with ,"
                    filterOption={(input, option) => ((option.props.label as string || '').toLowerCase().indexOf(input.toLowerCase()) >= 0)}
                    allowClear
                  >
                    {filteredGroups.map((group) => (
                      <Select.Option
                      key={group._id}
                      value={group._id}
                      label={group.alias}
                      >
                      <span>{group.alias}</span>
                      </Select.Option>
                    ))}
                  </Select>
                </div>)}

                {this.state.tagGroup.suggest && (
                  <div className="flex mb-1">
                    <i>Will only be shown when both conditions are satisfied</i>
                  </div>
                )}
              </>
            )}
            {this.state.open && this.websites
             .filter(website => website.supportsTags)
             .filter(website => {
               return !!this.props.accountMap[website.internalName];
             })
             // @ts-ignore
             .concat([{ supportsTags: true, name: "Default", internalName: "default" }])
             .map(website => (
               <div className="flex mb-1 TagGroup__site">
                 <div className="flex-1">
                   <strong>{website.name}</strong>
                 </div>
                 <div className="flex-1">
                   <TagInput
                     onChange={this.handleTagChange.bind(this, website.internalName)}
                     hideExtend={true}
                     hideExtra={true}
                     hideTagGroup={true}
                     searchProvider={website.searchProvider}
                     website={website.internalName}
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
