import { Dropdown, Form, Icon, Input, Menu, Select, Switch, Tag, Tooltip, Typography } from 'antd';
import _ from 'lodash';
import { inject, observer } from 'mobx-react';
import { TagData } from 'postybirb-commons';
import React from 'react';
import { TagGroup } from 'postybirb-commons';
import { TagGroupStore } from '../../../../stores/tag-group.store';

const { Text } = Typography;

export interface TagOptions {
  maxTags?: number;
  minTags?: number;
  mode?: 'count' | 'length';
  maxLength?: number;
}

interface Props {
  defaultValue: TagData;
  defaultTags?: TagData;
  onChange: (change: TagData) => void;
  label?: string;
  hideExtend?: boolean;
  hideExtra?: boolean;
  hideTagGroup?: boolean;
  tagOptions?: TagOptions;
  website?: string;
  searchProvider?: (value: string) => Promise<string[]>;
}

interface State {
  suggestions: string[];
  loading: boolean;
}

export default class TagInput extends React.Component<Props, State> {
  state: State = {
    suggestions: [],
    loading: false,
  };

  groupedTags: { [tag: string]: boolean } = {};

  private data: TagData = {
    extendDefault: true,
    value: []
  };

  options: TagOptions = {
    maxTags: 200,
    mode: 'count'
  };

  constructor(props: Props) {
    super(props);
    if (props.defaultValue) {
      this.data = props.defaultValue;
    }

    this.groupedTags = {};
    this.options = {
      ...this.options,
      ...props.tagOptions
    };
  }

  changeExtendDefault = (checked: boolean) => {
    this.data.extendDefault = checked;
    this.update();
  };

  handleTagChange = (tags: string[]) => {
    this.data.value = this.filterTags(tags);
    this.update();
  };

  filterTags(tags: string[]) {
    let filteredTags = tags.map(tag =>
      tag.trim().replace(/("|;|\\|\[|\]|\{|\}|\||!|@|\$|%|\^|\*|\+|=|<|>||`|~)/g, '')
    );

    const filter = this.props.defaultTags ? this.props.defaultTags.value : [];
    if (this.data.extendDefault) {
      filteredTags = filteredTags.filter(tag => !filter.includes(tag));
    }

    return _.uniq(filteredTags);
  }

  update() {
    this.props.onChange({
      extendDefault: this.data.extendDefault,
      value: this.filterTags(this.data.value)
    });
  }

  onKeyDown = (e: React.KeyboardEvent) => {
    const illegalKeys: string = '";|\\[]{}=*^%$!`~<>+';
    if (illegalKeys.includes(e.key)) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  onSearch = _.debounce((value: string) => {
    const searchTerm = value?.trim();
    if (this.props.searchProvider && searchTerm && searchTerm.length > 2) {
      this.setState({ loading: true });
      this.props
        .searchProvider(searchTerm)
        .then(suggestions => this.setState({ suggestions: suggestions || [] }))
        .finally(() => this.setState({ loading: false }));
    }
  }, 200);

  render() {
    this.data = this.props.defaultValue;
    const tagSwitch = this.props.hideExtend ? null : (
      <div>
        <span className="mr-2">
          <Switch
            size="small"
            checked={this.props.defaultValue.extendDefault}
            onChange={this.changeExtendDefault}
          />
        </span>
        <span>Combine with default</span>
      </div>
    );

    const selectOptions = _.uniq([
      ...(this.state.suggestions || []),
      ...(this.props.defaultValue.value || [])
    ]).map(tag => (
      <Select.Option
        key={tag}
        value={tag}
        label={<span className={this.groupedTags[tag] ? 'TagInput__Tag--grouped' : ''}>{tag}</span>}
       >
        <span className={this.groupedTags[tag] ? 'TagInput__Tag--grouped' : ''}>#{tag}</span>
      </Select.Option>
    ));
    return (
      <Form.Item label={this.props.label} required={!!this.options.minTags}>
        {tagSwitch}
        <div className="flex">
          <Select
            mode="tags"
            style={{ flex: 10 }}
            tokenSeparators={[',']}
            onChange={this.handleTagChange}
            value={this.props.defaultValue.value}
            placeholder="Separate tags with ,"
            allowClear
            onInputKeyDown={this.onKeyDown}
            onSearch={this.onSearch}
            loading={this.state.loading}
            optionLabelProp="label"
          >
            {selectOptions}
          </Select>
          <div className="m-auto">
            <Typography.Text copyable={{ text: this.props.defaultValue.value.join(', ') }} />
          </div>
        </div>

        <div className="flex">
          {this.props.hideTagGroup ? null : (
            <TagGroupSelect
              website={this.props.website}
              onSelect={tags => this.handleTagChange([...this.props.defaultValue.value, ...tags])}
            />
          )}
          {this.props.hideExtend ? null : (
            <Help
              options={this.options}
              defaultValue={this.props.defaultValue}
              defaultTags={this.props.defaultTags}
            />
          )}
        </div>
      </Form.Item>
    );
  }
}

interface HelpProps {
  options: TagOptions;
  defaultTags?: TagData;
  defaultValue: TagData;
}

const Help: React.SFC<HelpProps> = props => {
  const { options, defaultTags, defaultValue } = props;
  const tags = [...defaultValue.value];
  if (defaultTags && defaultValue.extendDefault) {
    tags.push(...defaultTags.value);
  }

  let count: number = 0;
  if (options.mode === 'count') {
    count = tags.length;
  } else if (options.mode === 'length') {
    count = tags.join(' ').length;
  }

  const max = options.mode === 'count' ? options.maxTags || 200 : options.maxLength || 255;

  return (
    <div className="flex text-gray-600" style={{ flex: 10 }}>
      <div className="flex-grow">
        {options.minTags ? `Requires at least ${options.minTags} tag(s)` : ''}
      </div>
      <div className="text-right">
        <Text type={count > max ? 'danger' : 'secondary'}>
          {count} /{max}
        </Text>
      </div>
    </div>
  );
};

interface TagGroupSelectProps {
  onSelect: (tags: string[], name?: string, full?: any) => void;
  tagGroupStore?: TagGroupStore;
  informGroupedTags?: (tags) => void;
  website?: string;
}

interface TagGroupSelectState {
  filter: string;
  visible: boolean;
}

@inject('tagGroupStore')
@observer
export class TagGroupSelect extends React.Component<TagGroupSelectProps, TagGroupSelectState> {
  state: TagGroupSelectState = {
    visible: false,
    filter: ''
  };

  constructor(props: TagGroupSelectProps) {
    super(props);
    this.getParentTags = this.getParentTags.bind(this);
    this.getParentGroups = this.getParentGroups.bind(this);
  }

  /* I'm kind of desperate to improve performance, and the fact is that react triggering
   * re-renders of a multi-hundred-item menu does actually waste time when we're returning
   * DOM objects. So... let's fix that if we can and only render menu items when it's
   * actually necessary. >w< */
  handleVisibilityChange = (visible) => {
    this.setState({ visible });
  }

  getParentGroups (group: TagGroup, visited: string[]) {
     let groupLookup = this.props.tagGroupStore!.groups.reduce((result, group) => {
      result[group._id] = group;
      return result;
    }, {});

    const clone = _.cloneDeep(group.tags);
    if (!group.groups) {
      return clone;
    }

    if (visited.indexOf(group._id) !== -1) { return {}; }
    visited.push(group._id);
    return group.groups.reduce((result, id: string) => {
      let group = groupLookup[id];
      let parents = this.getParentGroups(group, [...visited]);
      return Object.keys(parents).reduce((result, key) => {
        result[key] = result[key] || [];
        result[key] = [...result[key], ...parents[key]];
        return result;
      }, clone);
    }, clone);

    //return [...result, ...getParentTags(group, [...visited], website)];
    /* }, [...(group.tags[this.props.website as string] || []), ...group.tags['default']]); */
  }

  getParentTags (group: TagGroup, visited: string[], website: string) {
    let groupLookup = this.props.tagGroupStore!.groups.reduce((result, group) => {
      result[group._id] = group;
      return result;
    }, {});


    if(!group.groups) {
      return  [
        ...(group.tags[website] || []),
        ...group.tags['default']
      ];
    }

    if (visited.indexOf(group._id) !== -1) { return []; }

    visited.push(group._id);
    return group.groups.reduce((result: string[], id: string) => {
      let group = groupLookup[id];

      return [...result, ...this.getParentTags(group, [...visited], website)];
    }, [...(group.tags[this.props.website as string] || []), ...group.tags['default']]);
  }

  render() {
    /* if (this.props.informGroupedTags) {
     *   let map = this.props.tagGroupStore!.groups.reduce((result, group) => {
     *     if (!this.props.website || !group.tags[this.props.website]) {
     *       return result;
     *     }

     *     let tags = [...group.tags['default'], ...group.tags[this.props.website]];
     *     tags.forEach((tag) => {
     *       result[tag] = true;
     *     });

     *     return result;
     *   }, {});

     *   this.props.informGroupedTags(map);
     * } */

    const filteredGroups = (() => {
      const groups = this.props.tagGroupStore!.groups;
      if (!this.state.visible) { return groups; } /* skip computation if the menu isn't being shown. */
      if (!this.state.filter) {
        return groups;
      }

      return groups.filter(g => g.alias.toLowerCase().includes(this.state.filter));
    })();

    const menu = (
      <Menu mode="inline" style={{ maxHeight: '33vh', overflow: 'auto', padding: '0' }}>
        <div
          className="sticky top-0 z-10"
          style={{ background: 'inherit', minWidth: 300 }}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Input.Search
            autoFocus
            allowClear
            placeholder="Search"
            value={this.state.filter}
            onChange={e => this.setState({ filter: e.target.value.toLowerCase() })}
          />
        </div>
        {this.state.visible && filteredGroups.map(g => {
           /* let tags = g.tags['default'] || [];
               if (this.props.website && g.tags[this.props.website]) {
               tags = [...g.tags[this.props.website], ...g.tags['default']];
               } */

           return (
             <Menu.Item key={g._id}>
             {/* <Tooltip
                 placement="right"
                 title={
                 <div>
                 {tags.map(tag => (
                 <Tag>{tag}</Tag>
                 ))}
                 </div>
                 }
                 > */}
                 <a
                   onClick={e => {
                     /* let tagMap = Object.keys(g.tags).reduce((result, key) => {
                         result[key] = getParentTags(g, [], key);
                         return result;
                         }, {}); */
                     /* We don't need to compute the actual tags attached to this until the group is clicked on. */
                     let tagMap = this.getParentGroups(g, []);
                     this.props.onSelect(tagMap[this.props.website as string] || [], g.alias, tagMap);
                     e.preventDefault();
                     e.stopPropagation();
                   }}
                 >
                   {g.alias}
                 </a>
             {/* </Tooltip> */}
             </Menu.Item>
           );
         })}
      </Menu>
    );

    return (
      <div className="mr-2">
        <Dropdown overlay={menu}
                  trigger={['click']}
                  onVisibleChange={this.handleVisibilityChange}
                  visible={this.state.visible}>
          <a className="ant-dropdown-link text-link" href="#">
            Apply Tag Group <Icon type="down" />
          </a>
        </Dropdown>
      </div>
    );
  }
}
