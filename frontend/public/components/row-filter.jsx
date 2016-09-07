import React from 'react';
import classnames from 'classnames';

import {Provider} from 'react-redux';
import {angulars} from './react-wrapper';
import actions from '../module/k8s/k8s-actions';

import {Firehose, inject} from './utils';

// A replacement for the StatusBox to just show empty stuff instead of the usual...
const Injector = ({children, data, filters}) => {
  data = data || [];
  return <div>{inject(children, {data, filters})}</div>;
}

const CheckBox = ({name, active, number, select}) => {
  const klass = classnames('row-filter--box clickable', {
    'row-filter--box__active': active, 'row-filter--box__empty': !number,
  });

  return <div onClick={select} className={klass}>
    <span key={number} className="row-filter--number-bubble">{number}</span> {name}
  </div>
};

class CheckBoxes extends React.Component {
  constructor (props) {
    super(props);
    this.state = {};
  }

  get storageKey() {
    return `row-filter--${this.props.type}`;
  }

  componentDidMount() {
    let selected;
    try {
      selected = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    } catch (ignored) {}

    if (_.isEmpty(selected) || !_.isArray(selected)) {
      selected = this.props.selected;
    }

    selected.forEach(i => this.select(i));
  }

  select (i) {
    if (!this.props.rowFilterItems[i]) {
      return;
    }
    const nextState = Object.assign({}, this.state);
    nextState[i] = !nextState[i];
    // ensure something is always active
    const total = _.values(nextState).reduce((a, i) => a + i, 0);
    if (total < 1) {
      return;
    }
    this.setState({
      [i]: !this.state[i],
    }, () => {
      const rowFilterItems = this.props.rowFilterItems || [];
      const selected = [];
      const filters = rowFilterItems.filter((item, i) => this.state[i] && selected.push(i)).map(i => i[1]);

      try {
        localStorage.setItem(this.storageKey, JSON.stringify(selected));
      } catch (ignored) {}

      this.props.applyFilter(new Set(filters));
    });
  };

  render () {
    const {data, rowFilterItems, reducer} = this.props;
    const numbers = {};
    _.each(data, o => {
      const phase = reducer(o);
      numbers[phase] = (numbers[phase] || 0 ) + 1;
    });

    const active = this.state;
    const checkboxes = _.map(rowFilterItems, (item, i) => {
      const [name, filter] = item;
      const number = numbers[filter] || 0;
      const props = {
        name, number,
        key: i,
        active: active[i],
        select: this.select.bind(this, i),
      };
      return <CheckBox {...props} />
    });

    return <div className="col-xs-12">
      <div className="row-filter">{checkboxes}</div>
    </div>
  }
}

export class RowFilter extends React.Component {
  constructor (props) {
    super(props);
    const {kinds, k8s} = angulars;
    const kind = kinds['POD'];
    this.k8sResource = k8s[kind.plural];
  }

  applyFilter (name, value) {
    const id = this.hose.id;
    if (!id) {
      return;
    }
    const {store} = angulars;
    store.dispatch(actions.filterList(id, name, value));
  }

  render () {
    const {type, items, reducer, selected} = this.props.rowFilter;

    const props = {
      selected, reducer, type,
      rowFilterItems: items,
      applyFilter: (filter) => {this.applyFilter(type, filter)},
    };

    return (
      <Provider store={angulars.store}>
      <Firehose ref={ref => this.hose = ref} isList={true} k8sResource={this.k8sResource} {...this.props}>
        <Injector>
          <CheckBoxes {...props} />
        </Injector>
      </Firehose>
      </Provider>
    );
  }
}
