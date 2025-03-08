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
}

@inject('tagGroupStore')
@observer
export default class MultiGroup extends React.Component<Props, State> {
    state: State = {
        groups: [],
        visible: false,
        search: '',
        hiding: {},
    };

    constructor(props: Props) {
        super(props);
    }

    setSearch(value) {
        this.setState({ search: value });
    }

    toggleModal() {
        this.setState({ visible: !this.state.visible });
    }

    addGroup(groups) {
        /* Also reset search (the callback doesn't get called when the search is reset) */
        this.setState({ groups: _.uniq([...this.state.groups, ...groups]), search: '' });
    }

    removeGroup(group) {
        this.setState({ groups: _.without(this.state.groups, group) })
    }

    toggleGroupHide(group, hide) {
        this.setState({ hiding: { ...this.state.hiding, [group]: hide } });
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

        const categories = groups.reduce((result, group) => {
            let category = group.category || 'default';
            result[category] = result[category] || [];
            result[category].push(group);
            return result;
        }, {});

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

        return (<div>
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
                  placeholder="Separate groups with ,"
                  onSearch={this.setSearch.bind(this)}
                  filterOption={(input, option) => ((option.props.label as string || '').toLowerCase().indexOf(input.toLowerCase()) >= 0)}
                  allowClear
                >
                  {Object.keys(categories).map(category => (
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
                  ))}
                </Select>

                <div className="MultiGroup__Hiding">
                  Hiding {hiddenList.map(item => (
                      <>
                        <a href="#" onClick={(evt) => {
                            this.toggleGroupHide(item.id, false);
                            evt.preventDefault();
                            return false;
                        }}>{item.name}</a>
                        <span>, </span>
                      </>
                  ))}
                </div>
            </Modal>
        </div>);
    }
}
