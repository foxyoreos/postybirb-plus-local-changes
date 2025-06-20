import { Dropdown, Form, Icon, Input, Select, Modal, Button } from 'antd';
import _ from 'lodash';
import { inject, observer } from 'mobx-react';
import { TagData } from 'postybirb-commons';
import React from 'react';
import { TagGroup } from 'postybirb-commons';
import { TagGroupStore } from '../../../../stores/tag-group.store';
const { OptGroup, Option } = Select;

interface Props {
    image: string;
    acceptCallback: (map: any) => void;
    tagGroupStore?: TagGroupStore;
}

interface State {
    groups: string[];
    visible: boolean;
    search: string;
    hiding: { [key:string]: boolean; };
    suggestions: TagGroup[];
    filteredGroups: TagGroup[];
    filteredCategories: string[];
}

@inject('tagGroupStore')
@observer
export default class MultiGroup extends React.Component<Props, State> {
    state: State = {
        groups: [],
        visible: false,
        search: '',
        hiding: {},
        suggestions: [],
        filteredGroups: [],
        filteredCategories: [],
    };

    constructor(props: Props) {
        super(props);
        this.state.suggestions = this.getSuggestions([]);
    }

    setSearch(value) {
        const groups = this.props.tagGroupStore!.groups;
        let filteredGroups: TagGroup[] = [];
        if (value) {
            filteredGroups = groups.filter((group) => {
                return group.alias.toLowerCase().indexOf(value.toLowerCase()) >= 0;
            }).sort((a, b) => {
                return a.alias.length - b.alias.length;
            });
        }

        this.setState({ search: value, filteredGroups: filteredGroups });
    }

    componentDidUpdate(prevProps, prevState) {

        /* A good way for us to memoize suggestions. They're expensive to calculate
         * and we only want to recompute them when we need to :3 */
        if (prevState.hiding !== this.state.hiding ||
            prevState.groups !== this.state.groups) {
            this.setState({ suggestions: this.getSuggestions(this.state.groups) });
        }
    }

    toggleModal() {
        this.setState({ visible: !this.state.visible });
    }

    addGroup(groups) {
        /* Also reset search (the callback doesn't get called when the search is reset) */
        const next = _.uniq([...this.state.groups, ...groups]);
        /* const suggestions = this.getSuggestions(next); */
        this.setState({ groups: next, search: '' });
    }

    removeGroup(group) {
        const next = _.without(this.state.groups, group);
        /* const suggestions = this.getSuggestions(next); */
        this.setState({ groups: next });
    }

    toggleGroupHide(group, hide) {
        this.setState({ hiding: { ...this.state.hiding, [group]: hide } });
    }

    getSuggestions(currentGroups: string[]): TagGroup[] {
        const groups = this.props.tagGroupStore!.groups;
        const groupsApplied = currentGroups.reduce((result, g) => {
            result[g] = true;
            return result;
        }, {});

        const suggestions: TagGroup[] = groups.reduce((result: TagGroup[], group) => {
           if (groupsApplied[group._id]) { /* If group is already applied */
               return result;
           }

            if (this.state.hiding[group._id]) { /* If group is actively hidden */
                return result;
            }

            if (!group.suggest) { /* only groups that have suggestions enabled. */
                return result;
            }

            /* check if any are enabled */
            const suggestWhen = (() => {
                if (!group.suggestWhen || !group.suggestWhen.length) { return true; }
                return group.suggestWhen.reduce((result, id) => {
                    return result || groupsApplied[id];
                }, false);
            })();

            const suggestWhenNot = (() => {
                if (!group.suggestWhenNot || !group.suggestWhenNot.length) { return true; }
                return group.suggestWhenNot.reduce((result, id) => {
                    return result && !groupsApplied[id];
                }, true);
            })();

            if (suggestWhen && suggestWhenNot) {
                result.push(group);
            }

            return result;
        }, []);

        return suggestions;
    }

    render() {
        const groups = this.props.tagGroupStore!.groups;
        const groupMap = groups.reduce((result, group) => {
            result[group._id] = group;
            return result;
        }, {});

        const groupsApplied = this.state.groups.reduce((result, g) => {
            result[g] = true;
            return result;
        }, {});

        const shouldShow = (group) => {
            if (this.state.search) {
                return true;
            }

            /* First quick check to see if we can hide based on immediate properties */
            if (this.state.hiding[group._id]) {
                return false;
            }

            if (!group.groups || group.groups.length === 0) {
                return true;
            }

            let parentsApplied = _.some(group.groups, (g) => !!groupsApplied[g]);
            if (!parentsApplied) { return false; }

            let parents = getParentIds(group._id, []);
            let parentsHidden = _.some(parents, parent => !!this.state.hiding[parent]);
            return !parentsHidden;
        }

        const hiddenList = Object.keys(this.state.hiding).reduce((result: any[], key) => {
            if (!groupMap[key]) {
                console.log(key, groupMap);
                return result;
            }
            if (this.state.hiding[key]) {
                result.push({ id: key, name: groupMap[key].alias });
            }

            return result;
        }, []);

        const getParentIds = (id: string, visited: string[]) => {
            const group = groupMap[id];
            if (!group) { return []; } /* gracefully handle groups that don't exist or that were deleted */
            if (visited.indexOf(id) !== -1) { return []; }

            visited.push(id);
            if (!group.groups) { return [id]; }
            return group.groups.reduce((result, parent) => {
                return [...result, ...getParentIds(parent, [...visited])];
            }, [id]);
        }

        const getParentGroups = (group: TagGroup, visited: string[]) => {
            const clone = _.cloneDeep(group.tags);
            if (!group.groups) {
                return clone;
            }

            if (visited.indexOf(group._id) !== -1) { return {}; }
            visited.push(group._id);
            return group.groups.reduce((result, id: string) => {
                let group = groupMap[id];
                let parents = getParentGroups(group, [...visited]);
                return Object.keys(parents).reduce((result, key) => {
                    result[key] = result[key] || [];
                    result[key] = [...result[key], ...parents[key]];
                    return result;
                }, clone);
            }, clone);
        }

        return (
            <div>
                <Button type="primary" onClick={this.toggleModal.bind(this)}>Apply Groups</Button>
                <Modal
                    title="Apply Groups"
                    visible={this.state.visible}
                    className="MultiGroup"
                    width={725}
                    onOk={
                    ()=>{
                        this.props.acceptCallback(this.state.groups.map(g => {
                            return groupMap[g].tags;
                            //return getParentGroups(groupMap[g], []);
                        }));
                        this.toggleModal();
                    }}
                    onCancel={()=>{this.toggleModal()}}
                >
                    {/* Should add a form here */}

                  <div className="MultiGroup__Preview">
                      <img className="MultiGroup__Preview__Image"
                           src={this.props.image} />
                  </div>

                  <Select
                      mode="multiple"
                      className="flex-1"
                      style={{ width: '100%', minWidth: '20em', }}
                      tokenSeparators={[',']}
                      onSelect={(group)=>this.addGroup(getParentIds(group, []))}
                      onDeselect={(group=>this.removeGroup(group))}
                      value={this.state.groups}
                      filterOption={false}
                      placeholder="Separate groups with ,"
                      onSearch={this.setSearch.bind(this)}
                      onBlur={this.setSearch.bind(this, '')}
                      allowClear
                  >
                      {(() => {
                          /* filterOption={(input, option) => ((option.props.label as string || '').toLowerCase().indexOf(input.toLowerCase()) >= 0)} */
                          if (this.state.search) {
                              return this.state.filteredGroups.map(group => (
                                  <Option
                                      key={group._id}
                                      value={group._id}
                                      label={group.alias}
                                  >
                                      <span onClick={(evt)=>{
                                          this.toggleGroupHide(group._id, true);
                                          evt.preventDefault();
                                          evt.stopPropagation();
                                          return false;
                                      }}>(-)</span>
                                      <span>{group.alias}</span>
                                  </Option>
                              ));
                          }

                          const categories = groups.reduce((result, group) => {
                              let category = group.category || 'default';
                              result[category] = result[category] || [];
                              result[category].push(group);
                              return result;
                          }, {});

                          return Object.keys(categories).map(category => (
                              <OptGroup key={category} label={category}>
                                  {categories[category].map((group) => (
                                      <Option
                                          className={shouldShow(group) ? "" : "GroupSelect__option--hidden"}
                                          key={group._id}
                                          value={group._id}
                                          label={group.alias}
                                      >
                                          <span onClick={(evt)=>{
                                              this.toggleGroupHide(group._id, true);
                                              evt.preventDefault();
                                              evt.stopPropagation();
                                              return false;
                                          }}>(-)</span>
                                          <span>{group.alias}</span>
                                      </Option>
                                  ))}
                              </OptGroup>
                      ))})()}
                  </Select>

                  <div className="MultiGroup__Hiding">
                      <h5>Hiding</h5>
                      {hiddenList.length ? hiddenList.map(item => (
                          <>
                            <a href="#" onClick={(evt) => {
                                this.toggleGroupHide(item.id, false);
                                evt.preventDefault();
                                return false;
                            }}>{item.name}</a>
                        <span>, </span>
                        </>
                    )) : 'None'}
                </div>

                <div className="MultiGroup__Suggestions">
                    <h5>Tag Suggestions</h5>
                    {this.state.suggestions.length ? this.state.suggestions.map((group) => (
                        <>
                            <span onClick={(evt)=>{
                                this.toggleGroupHide(group._id, true);
                                evt.preventDefault();
                                evt.stopPropagation();
                                return false;
                            }}>(-)</span>
                            <a href="#" onClick={(evt) => {
                                this.addGroup(getParentIds(group._id, []));
                                evt.preventDefault();
                                return false;
                            }}>{group.alias}</a>
                            <span>, </span>
                        </>
                    )) : 'None'}
                </div>
            </Modal>
        </div>);
    }
}
