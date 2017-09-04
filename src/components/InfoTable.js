import React, { Component } from 'react';
import PropTypes from 'prop-types';
import DataTable from 'react-md/lib/DataTables/DataTable';
import TableHeader from 'react-md/lib/DataTables/TableHeader';
import TableBody from 'react-md/lib/DataTables/TableBody';
import TableRow from 'react-md/lib/DataTables/TableRow';
import TableColumn from 'react-md/lib/DataTables/TableColumn';
import IconSeparator from 'react-md/lib/Helpers/IconSeparator';
import FontIcon from 'react-md/lib/FontIcons';
import TextField from 'react-md/lib/TextFields';

class Header extends Component {
  constructor(props) {
    super(props);
  }

  static get propTypes() {
    return {
      headers: PropTypes.array,
      sortedIndex: PropTypes.number,
      sortIconClass: PropTypes.string,
      onSort: PropTypes.func,
      ASC: PropTypes.bool
    };
  }

  static get defaultProps() {
    return {
      headers: []
    };
  }

  shouldComponentUpdate(prevProps) {
    if (this.props.sortedIndex !== prevProps.sortedIndex || this.props.ASC !== prevProps.ASC || this.props.headers !== prevProps.headers) {
      return true;
    }

    return false;
  }

  render() {
    let sortIconClass = this.props.ASC ? 'rotate-90' : 'rotate-270';
    return (
      <TableHeader>
        <TableRow>
          {this.props.headers.map((header, i) => <TableColumn
            key={header.id}
            onClick={this.props.onSort.bind({}, i)}
            className="cursor-pointer"
          >
            <IconSeparator label={header.name} iconBefore>
              <FontIcon className={this.props.sortedIndex === i ? sortIconClass + ' md-background--secondary round' : ''}>arrow_forward</FontIcon>
            </IconSeparator>
          </TableColumn>)}
        </TableRow>
      </TableHeader>);
  }
}

class Body extends Component {
  constructor(props) {
    super(props);
  }

  static get propTypes() {
    return {
      values: PropTypes.array
    };
  }

  static get defaultProps() {
    return {
      values: []
    };
  }

  componentDidUpdate(prevProps, prevState) {
    console.log('componentDidUpdate', prevProps, prevState);
  }
  /**
   * @todo this.props.values и prevProps.values всегда равны (хотя не должны), из-за чего нельзя правильно составить условие
   * 
   * @param {any} prevProps 
   * @returns 
   * @memberof Body
   */
  shouldComponentUpdate(prevProps) {
    console.log(this.props.values);
    console.log(prevProps.values);
    if (this.props.values !== prevProps.values) {
      return true;
    }

    return true;
  }
  render() {
    return (
      <TableBody>
        {this.props.values.map((rows, i) =>
          <TableRow key={i}>
            {rows.map((column, i2) =>
              <TableColumn key={i2} className="prevent-grow">{column}</TableColumn>)}
          </TableRow>
        )}
      </TableBody>);

  }
}

const sort = (ar, i, ASC) => ar.sort((a, b) => (a[i] - b[i]) * (ASC ? 1 : -1));

export default class InfoTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      sortedData: sort(this.props.tabData.values, 0, true),
      sortedIndex: 0,
      ASC: true,
      searchText: ''
    };
  }

  static get propTypes() {
    return {
      tabData: PropTypes.object
    };
  }

  static get defaultProps() {
    return {
      tabData: []
    };
  }

  shouldComponentUpdate(prevProps, prevStates) {
    if (this.props.tabData !== prevProps.tabData) {
      return true;
    }
    if (this.state.sortedIndex !== prevStates.sortedIndex || this.state.ASC !== prevStates.ASC || this.state.searchText !== prevStates.searchText) {
      return true;
    }

    return false;
  }

  handlerChangeText = e => {
    var filteredData = [...sort(this.props.tabData.values, this.state.sortedIndex, this.state.ASC)];
    var sortedData = filteredData.filter(obj => {
      let find = 0;
      obj.map(v => {
        if (v.indexOf(e) + 1) {
          find++;
        }
      });
      return find;
    });

    this.setState({ ...this.state, searchText: e, sortedData });
  }

  handlerClearText = () => {
    this.setState({ ...this.state, searchText: "", sortedData: sort(this.props.tabData.values, this.state.sortedIndex, this.state.ASC) });
  }

  handlerSort = (i) => {
    let ASC = this.state.sortedIndex === i ? !this.state.ASC : true;

    this.setState({
      sortedData: sort(this.state.sortedData, i, ASC),
      sortedIndex: i,
      ASC
    });
  };

  //   <TextField
  //   key="search"
  //   id="searchText"
  //   label="поиск"
  //   type="text"
  //   size={15}
  //   fullWidth={false}
  //   value={this.state.searchText}
  //   helpText="Введите текст для поиска"
  //   lineDirection="center"
  //   inlineIndicator={<FontIcon className={'cursor-default'} onClick={this.handlerClearText}>{'clear'}</FontIcon>}
  //   className="table-search"
  //   helpOnFocus={true}
  //   onChange={this.handlerChangeText}
  // />
  render() {
    return <DataTable plain>
      <Header headers={this.props.tabData.headers[0]} onSort={this.handlerSort} sortedIndex={this.state.sortedIndex} ASC={this.state.ASC} />
      <Body values={this.state.sortedData} />
    </DataTable>;
  }
}